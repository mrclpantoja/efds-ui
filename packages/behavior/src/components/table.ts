import { emit, ensureId, uid, watchScrollRegion } from '../core/dom';
import { format, getLocale, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import {
  parseDate,
  parseNumber,
  sortByCriteria,
  sortValues,
  type SortCriterion,
  type SortDirection,
} from '../core/data';
import {
  columnLabel,
  headerOf,
  hubFor,
  isRemote,
  statusRegion,
  tableController,
  tableFor,
  type TableHub,
} from '../core/table-hub';

export type { SortDirection, SortCriterion };
export { tableController };

const cellValue = (cell: Element | undefined): string => {
  if (!cell) return '';
  return (cell.getAttribute('data-sort-value') ?? cell.textContent ?? '').trim();
};

export { parseDate, parseNumber };

/** Ordena as linhas por uma coluna; vazios ficam por último. Estável. */
export function sortRows(
  rows: HTMLTableRowElement[],
  column: number,
  direction: SortDirection,
): HTMLTableRowElement[] {
  return sortValues(rows, (row) => cellValue(row.cells[column]), direction, getLocale());
}

type SortMode = 'off' | 'shift' | 'add';

function sortMode(table: HTMLElement): SortMode {
  if (!table.hasAttribute('data-eds-sort-multi')) return 'off';
  return table.getAttribute('data-eds-sort-multi') === 'add' ? 'add' : 'shift';
}

/** Texto do botão de ordenação, sem a ordem e a dica que o behavior acrescenta. */
const sortLabel = (button: Element): string => columnLabel(button);

const keyOf = (th: HTMLTableCellElement): string =>
  th.getAttribute('data-eds-col') ?? String(th.cellIndex);

/** Cabeçalhos ordenáveis (têm `.eds-table-sort`). */
const sortHeaders = (table: HTMLTableElement): HTMLTableCellElement[] =>
  Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).filter((th) =>
    th.querySelector('.eds-table-sort'),
  );

/** Ordenação lida do markup (`data-sort-order`/`-dir` ou o `aria-sort` do primário). */
function readSort(table: HTMLTableElement): SortCriterion[] {
  const out: { order: number; criterion: SortCriterion }[] = [];
  for (const th of sortHeaders(table)) {
    const dir = th.getAttribute('data-sort-dir') ?? th.getAttribute('aria-sort');
    if (dir !== 'ascending' && dir !== 'descending') continue;
    const order = Number(th.getAttribute('data-sort-order')) || 1;
    out.push({ order, criterion: { key: keyOf(th), direction: dir } });
  }
  return out.sort((a, b) => a.order - b.order).map((o) => o.criterion);
}

/** Texto da ordenação completa para o leitor de tela. */
function describeSort(table: HTMLTableElement, sort: SortCriterion[]): string {
  const m = getMessages();
  const named = sort.map((c) => ({
    column: columnLabel(
      headerOf(table, c.key) ?? sortHeaders(table).find((h) => keyOf(h) === c.key),
    ),
    direction: c.direction === 'ascending' ? m.tableSortAscending : m.tableSortDescending,
  }));
  if (named.length === 1)
    return format(m.tableSortedBy, named[0] as { column: string; direction: string });
  const criteria = named.map((n) => `${n.column}, ${n.direction}`).join(`, ${m.tableSortThen} `);
  return format(m.tableSortedByMany, { criteria });
}

/** Grava `aria-sort`, `data-eds-sort-*`, o número da prioridade e o texto oculto dos secundários. */
function applySortMarkup(table: HTMLTableElement, sort: SortCriterion[]): void {
  const m = getMessages();
  const doc = table.ownerDocument;
  for (const th of sortHeaders(table)) {
    const key = keyOf(th);
    const index = sort.findIndex((c) => c.key === key);
    const button = th.querySelector<HTMLElement>('.eds-table-sort');
    button?.querySelector(':scope > .eds-table-sort-order')?.remove();
    button?.querySelector(':scope > .eds-table-sort-text')?.remove();
    if (index < 0) {
      th.setAttribute('aria-sort', 'none');
      th.removeAttribute('data-sort-dir');
      th.removeAttribute('data-sort-order');
      continue;
    }
    const criterion = sort[index] as SortCriterion;
    if (index === 0) th.setAttribute('aria-sort', criterion.direction);
    else th.removeAttribute('aria-sort');
    th.setAttribute('data-sort-dir', criterion.direction);
    th.setAttribute('data-sort-order', String(index + 1));
    if (button && sort.length > 1) {
      const badge = doc.createElement('span');
      badge.className = 'eds-table-sort-order';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = String(index + 1);
      button.append(badge);
      if (index > 0) {
        const text = doc.createElement('span');
        text.className = 'eds-visually-hidden eds-table-sort-text';
        text.textContent = format(m.tableSortOrderLabel, {
          order: index + 1,
          direction:
            criterion.direction === 'ascending' ? m.tableSortAscending : m.tableSortDescending,
        });
        button.append(text);
      }
    }
  }
}

/**
 * Tabela: ordenação no cliente (`button.eds-table-sort` em `th`, `eds:table-sort` cancelável;
 * ordenação múltipla com `data-eds-sort-multi`), seleção (`input[data-eds-select-all]` /
 * `input[data-eds-select-row]`), anúncio no `[role=status]`, controlador (`tableController`) e
 * região rolável focável só quando rola.
 */
export const tableBehavior: Behavior = {
  name: 'table',
  selector: 'table.eds-table',
  bind(table) {
    if (!(table instanceof HTMLTableElement)) return;
    const ac = new AbortController();
    const { signal } = ac;
    const hub: TableHub = hubFor(table);
    statusRegion(table);
    const messages = () => getMessages();
    const announce = (text: string) => hub.announce(text);

    // ---- Região rolável ----------------------------------------------------------------
    const wrap = table.closest<HTMLElement>('.eds-table-wrap');
    const caption = table.querySelector('caption');
    const stopScroll =
      wrap && caption
        ? watchScrollRegion(wrap, () => ensureId(caption, 'table-caption'))
        : () => undefined;

    // ---- Ordenação ---------------------------------------------------------------------
    hub.query.sort = readSort(table);
    let hint: HTMLElement | null = null;
    const syncHint = () => {
      const mode = sortMode(table);
      if (mode !== 'shift') {
        hint?.remove();
        hint = null;
        return;
      }
      if (!hint) {
        hint = table.ownerDocument.createElement('p');
        hint.id = uid('sort-hint');
        hint.className = 'eds-visually-hidden';
        hint.textContent = messages().tableSortHint;
        (wrap ?? table).after(hint);
      }
      for (const th of sortHeaders(table)) {
        const button = th.querySelector<HTMLElement>('.eds-table-sort');
        if (!button) continue;
        const ids = (button.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
        if (!ids.includes(hint.id))
          button.setAttribute('aria-describedby', [...ids, hint.id].join(' '));
      }
    };
    syncHint();
    if (hub.query.sort.length > 1) applySortMarkup(table, hub.query.sort);

    const sortMax = () => Math.max(1, Number(table.getAttribute('data-eds-sort-max')) || 3);

    /** Aplica a ordenação local nas linhas (a menos que a tabela seja remota). */
    const sortLocal = (sort: SortCriterion[]) => {
      const body = table.tBodies[0];
      if (!body || sort.length === 0) return;
      const rows = Array.from(body.rows).filter((row) => !row.querySelector('.eds-table-empty'));
      const index = new Map<string, number>();
      for (const th of sortHeaders(table)) index.set(keyOf(th), th.cellIndex);
      // Uma única inserção: as linhas vão para um fragmento e voltam de uma vez.
      const fragment = body.ownerDocument.createDocumentFragment();
      const ordered = sortByCriteria(
        rows,
        sort,
        (row, key) => cellValue(row.cells[index.get(key) ?? -1]),
        getLocale(),
      );
      for (const row of ordered) fragment.append(row);
      body.append(fragment);
    };

    const commitSort = (sort: SortCriterion[], user: boolean) => {
      hub.query.sort = sort;
      if (isRemote(table)) hub.query.page = 1;
      applySortMarkup(table, sort);
      if (!isRemote(table)) sortLocal(sort);
      if (user) {
        if (isRemote(table)) hub.request('sort');
        hub.fire('sort', sort);
      }
    };

    /** Acionou a ordenação da coluna `th`. `additive` = acrescenta à ordenação. */
    const activate = (th: HTMLTableCellElement, button: HTMLElement, additive: boolean) => {
      const key = keyOf(th);
      const current = readSort(table);
      const label = sortLabel(button);
      const m = messages();
      const at = current.findIndex((c) => c.key === key);
      let next: SortCriterion[];
      let reason: 'replace' | 'add' | 'toggle' | 'remove' = 'replace';
      let direction: SortDirection = 'ascending';
      const multi = sortMode(table) !== 'off';
      if (multi && additive) {
        if (at < 0) {
          if (current.length >= sortMax()) {
            announce(format(m.tableSortMaxReached, { max: sortMax() }));
            return;
          }
          next = [...current, { key, direction: 'ascending' }];
          reason = 'add';
        } else if ((current[at] as SortCriterion).direction === 'ascending') {
          direction = 'descending';
          next = current.map((c, i) => (i === at ? { key, direction } : c));
          reason = 'toggle';
        } else {
          direction = 'descending';
          next = current.filter((_, i) => i !== at);
          reason = 'remove';
        }
      } else {
        const primary = current[0];
        direction =
          primary?.key === key && primary.direction === 'ascending' ? 'descending' : 'ascending';
        next = [{ key, direction }];
        reason = primary?.key === key ? 'toggle' : 'replace';
      }
      const detail = {
        column: th.cellIndex,
        label,
        direction: (next.find((c) => c.key === key) ?? { direction }).direction,
        th,
        key: th.getAttribute('data-eds-col'),
        sort: next,
        multi: multi && additive,
        reason,
      };
      // Com preventDefault o consumidor ordena (e atualiza aria-sort) no servidor.
      if (!emit(table, 'table-sort', detail, true)) return;
      commitSort(next, true);
      if (isRemote(table)) return;
      announce(
        reason === 'remove'
          ? format(m.tableSortRemoved, { column: label })
          : describeSort(table, next),
      );
    };

    const clearSort = () => {
      const detail = {
        column: -1,
        label: '',
        direction: 'ascending' as SortDirection,
        th: null,
        key: null,
        sort: [] as SortCriterion[],
        multi: false,
        reason: 'clear' as const,
      };
      if (!emit(table, 'table-sort', detail, true)) return;
      commitSort([], true);
      announce(messages().tableSortCleared);
    };
    const stopClear = hub.on('sort-clear', clearSort);

    // Atalho de teclado: Shift+Enter / Shift+Espaço acrescenta (o `shiftKey` do clique gerado por
    // teclado não é confiável entre navegadores). O clique que sobra é engolido.
    let swallow: Element | null = null;
    table.addEventListener(
      'keydown',
      (event) => {
        if (!event.shiftKey || (event.key !== 'Enter' && event.key !== ' ')) return;
        const button = (event.target as Element).closest<HTMLElement>('.eds-table-sort');
        const th = button?.closest('th');
        if (!button || !th || !table.contains(th) || sortMode(table) !== 'shift') return;
        event.preventDefault();
        swallow = button;
        activate(th, button, true);
      },
      { signal },
    );
    table.addEventListener(
      'keyup',
      () => {
        if (swallow) setTimeout(() => (swallow = null), 0);
      },
      { signal },
    );

    table.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element).closest<HTMLElement>('.eds-table-sort');
        const th = button?.closest('th');
        if (!button || !th || !table.contains(th)) return;
        if (swallow === button) {
          event.preventDefault();
          return;
        }
        // Link de ordenação: sem JS ele navega; com JS numa tabela remota o behavior compõe a URL.
        if (button instanceof HTMLAnchorElement) {
          if (!isRemote(table)) return;
          event.preventDefault();
        }
        activate(
          th,
          button,
          sortMode(table) === 'add' || (sortMode(table) === 'shift' && event.shiftKey),
        );
      },
      { signal },
    );

    // ---- Seleção -----------------------------------------------------------------------
    const selectAll = () => table.querySelector<HTMLInputElement>('input[data-eds-select-all]');
    const allBoxes = () =>
      Array.from(table.querySelectorAll<HTMLInputElement>('input[data-eds-select-row]'));
    // Regra com filtro: o cabeçalho, "selecionar todos" e a contagem olham só as linhas
    // visíveis; uma linha oculta e marcada continua marcada (e segue no envio do form).
    const rowBoxes = () => allBoxes().filter((box) => !box.closest('tr')?.hidden);

    const syncAll = (): number => {
      const boxes = rowBoxes().filter((box) => !box.disabled);
      const checked = boxes.filter((box) => box.checked).length;
      const all = selectAll();
      if (all) {
        all.checked = boxes.length > 0 && checked === boxes.length;
        all.indeterminate = checked > 0 && checked < boxes.length;
      }
      return checked;
    };

    let checkedTotal = 0;
    const announceSelection = (count: number) => {
      const m = messages();
      // Linhas marcadas e ocultas pelo filtro: diz as da busca e o total (4.1.3).
      const total = checkedTotal;
      if (total !== count) {
        announce(
          count === 0
            ? format(m.tableSelectedInSearchNone, { total })
            : count === 1
              ? format(m.tableSelectedInSearchOne, { total })
              : format(m.tableSelectedInSearchMany, { count, total }),
        );
        return;
      }
      announce(
        count === 0
          ? m.tableSelectedNone
          : count === 1
            ? m.tableSelectedOne
            : format(m.tableSelectedMany, { count }),
      );
    };

    const selectedRows = () =>
      rowBoxes()
        .filter((box) => box.checked)
        .map((box) => box.closest('tr'))
        .filter((row): row is HTMLTableRowElement => row !== null);

    hub.getSelection = () => {
      const rows = selectedRows();
      return {
        count: rows.length,
        ids: rows.map((r) => r.getAttribute('data-eds-row-id')).filter((id): id is string => !!id),
        scope: hub.scope,
      };
    };

    /** Anuncia (se `user`) e emite `eds:table-select-change`. */
    const publish = (user: boolean) => {
      const count = syncAll();
      checkedTotal = allBoxes().filter((box) => box.checked).length;
      if (user) announceSelection(count);
      const rows = selectedRows();
      const ids = rows
        .map((row) => row.getAttribute('data-eds-row-id'))
        .filter((id): id is string => !!id);
      emit(table, 'table-select-change', {
        count,
        rows,
        total: checkedTotal,
        ids,
        scope: hub.scope,
      });
    };

    hub.clearSelection = () => {
      for (const box of allBoxes()) box.checked = false;
      hub.scope = 'page';
      publish(false);
    };

    table.addEventListener(
      'change',
      (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !table.contains(input)) return;
        if (input.hasAttribute('data-eds-select-all')) {
          for (const box of rowBoxes()) if (!box.disabled) box.checked = input.checked;
        } else if (!input.hasAttribute('data-eds-select-row')) return;
        // Qualquer mudança de linha volta o alcance para a página.
        hub.scope = 'page';
        publish(true);
      },
      { signal },
    );
    // O filtro mudou as linhas visíveis: o cabeçalho reflete as visíveis.
    table.addEventListener('eds:table-filter', () => void syncAll(), { signal });
    syncAll();

    // ---- Controlador -------------------------------------------------------------------
    const stopSync = hub.on('sync', (keys) => {
      if (Array.isArray(keys) && keys.includes('sort')) {
        applySortMarkup(table, hub.query.sort);
        if (!isRemote(table)) sortLocal(hub.query.sort);
      }
    });
    // Coluna oculta que estava na ordenação sai dela.
    const stopHidden = hub.on('column-hidden', (id) => {
      const current = readSort(table);
      if (!current.some((c) => c.key === id)) return;
      commitSort(
        current.filter((c) => c.key !== id),
        true,
      );
      announce(
        format(messages().tableSortRemoved, {
          column: columnLabel(headerOf(table, String(id))) || String(id),
        }),
      );
    });
    hub.ready = true;

    return () => {
      ac.abort();
      stopScroll();
      stopClear();
      stopSync();
      stopHidden();
      hint?.remove();
      hub.ready = false;
    };
  },
};

/** `button[data-eds-sort-clear]`: remove toda a ordenação; o foco permanece no botão. */
export const sortClearBehavior: Behavior = {
  name: 'table-sort-clear',
  selector: '[data-eds-sort-clear]',
  bind(button) {
    const ac = new AbortController();
    button.addEventListener(
      'click',
      () => {
        const table = tableFor(
          button,
          'data-eds-sort-clear',
          'table.eds-table[data-eds-sort-multi]',
        );
        if (table) hubFor(table).fire('sort-clear');
      },
      { signal: ac.signal },
    );
    return () => ac.abort();
  },
};

export function initTable(root: ParentNode = document): () => void {
  return bindAll(root, [tableBehavior, sortClearBehavior]);
}
