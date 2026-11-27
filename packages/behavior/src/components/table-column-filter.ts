import { emit, describeBy, hidePopover, uid } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import {
  isEmptyFilter,
  matchColumnFilter,
  parseDate,
  parseNumber,
  type FilterValue,
} from '../core/data';
import {
  columnIndex,
  columnLabel,
  headerOf,
  hubFor,
  isRemote,
  type TableHub,
} from '../core/table-hub';
import { popoverBehavior } from './popover';
import { cellFilterValue, refreshRows, removeRowSource, setRowSource } from '../core/table-rows';

type FilterType = 'text' | 'select' | 'number' | 'date';

const SOURCE = 'columns';
const users = new WeakMap<HTMLTableElement, number>();

/** Predicado das linhas para os filtros por coluna aplicados no hub. */
function registerSource(table: HTMLTableElement, hub: TableHub): void {
  setRowSource(table, SOURCE, (row) => {
    for (const [key, filter] of Object.entries(hub.query.filters)) {
      if (isEmptyFilter(filter)) continue;
      const index = columnIndex(table, key);
      if (index < 0) continue;
      if (!matchColumnFilter(cellFilterValue(row.cells[index]), filter)) return false;
    }
    return true;
  });
}

/** Texto curto de um filtro para o chip (e a descrição). */
export function describeFilter(filter: FilterValue): string {
  const m = getMessages();
  if (typeof filter === 'string') return filter;
  if (Array.isArray(filter)) return filter.join(', ');
  if (filter.gte && filter.lte)
    return format(m.filterChipRange, { min: filter.gte, max: filter.lte });
  if (filter.gte) return format(m.filterChipGte, { min: filter.gte });
  return format(m.filterChipLte, { max: filter.lte ?? '' });
}

/**
 * Aplica (ou remove, com `value` nulo) o filtro de uma coluna: emite `eds:table-column-filter`
 * (cancelável), atualiza o estado e filtra as linhas (local) ou pede a consulta (remota).
 * Devolve `false` se o app cancelou (ele filtra no servidor e chama `setState`).
 */
export function applyColumnFilter(
  hub: TableHub,
  key: string,
  value: FilterValue | null,
  reason: 'filter' | 'chip' | 'clear' = 'filter',
): boolean {
  const table = hub.table;
  const filters = { ...hub.query.filters };
  if (value === null || isEmptyFilter(value)) delete filters[key];
  else filters[key] = value;
  const had = key in hub.query.filters;
  const detail = {
    key,
    value: key in filters ? (filters[key] ?? null) : null,
    filters,
    count: undefined as number | undefined,
  };
  const proceed = emit(table, 'table-column-filter', detail, true);
  hub.query.filters = filters;
  hub.query.page = 1;
  hub.fire('filters');
  if (!proceed) return false;
  if (isRemote(table)) {
    hub.request(reason);
    return true;
  }
  const count = refreshRows(table);
  const th = headerOf(table, key);
  const column = columnLabel(th);
  const m = getMessages();
  if (key in filters) hub.announce(format(m.columnFilterApplied, { column, count }));
  else if (had) hub.announce(format(m.columnFilterCleared, { column, count }));
  return true;
}

/** `form[data-eds-column-filter="text|select|number|date"]` dentro do `th`: filtro por coluna. */
export const columnFilterBehavior: Behavior = {
  name: 'table-column-filter',
  selector: 'form[data-eds-column-filter]',
  bind(el) {
    const form = el as HTMLFormElement;
    const th = form.closest('th');
    const table = th?.closest('table');
    if (!th || !table) return;
    const key = th.getAttribute('data-eds-col');
    if (!key) return;
    const type = (form.getAttribute('data-eds-column-filter') || 'text') as FilterType;
    const hub = hubFor(table);
    const ac = new AbortController();
    const { signal } = ac;
    const popover = form.closest<HTMLElement>('[popover]');
    const button = th.querySelector<HTMLElement>('.eds-table-filter-btn');
    const activeSuffix = () => getMessages().columnFilterActive;
    // O nome base nunca leva o sufixo (o markup do servidor pode já trazê-lo).
    let baseLabel = button?.getAttribute('aria-label') ?? '';
    const tail = activeSuffix();
    while (tail !== '' && baseLabel.endsWith(tail)) baseLabel = baseLabel.slice(0, -tail.length);
    const fields = () =>
      Array.from(form.elements).filter(
        (f): f is HTMLInputElement | HTMLSelectElement =>
          (f instanceof HTMLInputElement || f instanceof HTMLSelectElement) &&
          f.name !== '' &&
          f.type !== 'submit' &&
          f.type !== 'reset' &&
          f.type !== 'button',
      );
    const bound = (name: string) => (/\[(gte|lte)\]$/.exec(name)?.[1] ?? '') as 'gte' | 'lte' | '';

    // Posiciona o balão junto ao botão e sincroniza aria-expanded (o markup não precisa de data-eds-popover).
    const stopPopover =
      button &&
      popover &&
      !button.hasAttribute('data-eds-popover') &&
      button.hasAttribute('popovertarget')
        ? popoverBehavior.bind(button)
        : undefined;
    users.set(table, (users.get(table) ?? 0) + 1);
    registerSource(table, hub);

    /** Valor dos campos do formulário. */
    const read = (): FilterValue | null => {
      if (type === 'number' || type === 'date') {
        const range: { gte?: string; lte?: string } = {};
        for (const f of fields()) {
          const b = bound(f.name);
          const raw = f.value.trim();
          if (!b || raw === '') continue;
          const n = type === 'number' ? parseNumber(raw) : null;
          range[b] = n !== null ? String(n) : raw;
        }
        return isEmptyFilter(range) ? null : range;
      }
      if (type === 'select') {
        const picked: string[] = [];
        for (const f of fields()) {
          if (f instanceof HTMLSelectElement) {
            for (const o of Array.from(f.selectedOptions)) if (o.value !== '') picked.push(o.value);
          } else if ((f.type === 'checkbox' || f.type === 'radio') && f.checked && f.value !== '') {
            picked.push(f.value);
          }
        }
        return picked.length > 0 ? picked : null;
      }
      const text = fields()[0]?.value.trim() ?? '';
      return text === '' ? null : text;
    };

    /** Grava um valor nos campos (o aplicado volta ao abrir de novo). */
    const write = (value: FilterValue | null | undefined) => {
      for (const f of fields()) {
        if (type === 'number' || type === 'date') {
          const b = bound(f.name);
          const range = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
          (f as HTMLInputElement).value = b ? (range[b] ?? '') : '';
        } else if (type === 'select') {
          const list = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
          if (f instanceof HTMLSelectElement) {
            for (const o of Array.from(f.options)) o.selected = list.includes(o.value);
          } else (f as HTMLInputElement).checked = list.includes(f.value);
        } else {
          (f as HTMLInputElement).value = typeof value === 'string' ? value : '';
        }
      }
    };

    // ---- Erro (faixa invertida) ------------------------------------------------------
    let error: HTMLElement | null = null;
    const showError = (message: string | null) => {
      for (const f of fields()) {
        if (message) f.setAttribute('aria-invalid', 'true');
        else f.removeAttribute('aria-invalid');
      }
      if (!message) {
        for (const f of fields()) if (error) describeBy(f, error.id, false);
        error?.remove();
        error = null;
        return;
      }
      if (!error) {
        error = form.ownerDocument.createElement('p');
        error.id = uid('filter-error');
        error.className = 'eds-error';
        form.querySelector('.eds-table-filter-actions')?.before(error);
        if (!error.isConnected) form.append(error);
      }
      error.textContent = message;
      for (const f of fields()) describeBy(f, (error as HTMLElement).id, true);
    };

    const validate = (value: FilterValue | null): boolean => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
      const lo = value.gte !== undefined ? (parseNumber(value.gte) ?? parseDate(value.gte)) : null;
      const hi = value.lte !== undefined ? (parseNumber(value.lte) ?? parseDate(value.lte)) : null;
      if (lo !== null && hi !== null && lo > hi) {
        showError(getMessages().columnFilterRangeInvalid);
        fields()
          .find((f) => bound(f.name) === 'gte')
          ?.focus();
        return false;
      }
      return true;
    };

    // ---- Indicador de filtro ativo -----------------------------------------------------
    const syncIndicator = () => {
      const active = !isEmptyFilter(hub.query.filters[key]);
      th.toggleAttribute('data-eds-filtered', active);
      if (!button) return;
      button.toggleAttribute('data-active', active);
      const suffix = activeSuffix();
      if (baseLabel) {
        button.setAttribute('aria-label', baseLabel + (active ? suffix : ''));
        // Com aria-label, o texto oculto do markup só duplicaria o aviso.
        for (const span of button.querySelectorAll('.eds-visually-hidden')) {
          const plain = (text: string | null) => (text ?? '').replace(',', '').trim();
          if (plain(span.textContent) === plain(suffix)) span.remove();
        }
      } else {
        const existing = button.querySelector('.eds-table-filter-state');
        if (active && !existing) {
          const span = form.ownerDocument.createElement('span');
          span.className = 'eds-visually-hidden eds-table-filter-state';
          span.textContent = suffix;
          button.append(span);
        } else if (!active) existing?.remove();
      }
    };

    const sync = () => {
      write(hub.query.filters[key]);
      showError(null);
      syncIndicator();
    };

    // Estado inicial: o que o servidor já deixou nos campos.
    const initial = read();
    if (initial && isEmptyFilter(hub.query.filters[key])) {
      hub.query.filters = { ...hub.query.filters, [key]: initial };
      if (!isRemote(table)) refreshRows(table);
    }
    syncIndicator();
    hub.fire('filters');

    const commit = (value: FilterValue | null, reason: 'filter' | 'clear') => {
      applyColumnFilter(hub, key, value, reason);
      if (popover) hidePopover(popover);
      button?.focus();
    };

    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        const value = read();
        showError(null);
        if (!validate(value)) return;
        commit(value, 'filter');
      },
      { signal },
    );
    form.addEventListener(
      'click',
      (event) => {
        const clear = (event.target as Element).closest('[data-eds-filter-clear]');
        if (!clear || !form.contains(clear)) return;
        event.preventDefault();
        write(null);
        showError(null);
        commit(null, 'clear');
      },
      { signal },
    );
    // Esc num campo de busca só limpa o texto: aqui ele fecha o filtro sem aplicar.
    form.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        if (popover) hidePopover(popover);
        button?.focus();
      },
      { signal },
    );
    form.addEventListener(
      'input',
      () => {
        if (error) showError(null);
      },
      { signal },
    );
    // Ao abrir, e ao fechar sem aplicar (Esc, clique fora), os campos mostram o valor aplicado.
    popover?.addEventListener(
      'beforetoggle',
      (event) => {
        if ((event as ToggleEvent).newState === 'open') sync();
      },
      { signal },
    );
    popover?.addEventListener(
      'toggle',
      (event) => {
        if ((event as ToggleEvent).newState === 'closed') sync();
      },
      { signal },
    );

    const stops = [hub.on('sync', sync), hub.on('filters', syncIndicator)];

    return () => {
      ac.abort();
      for (const stop of stops) stop();
      stopPopover?.();
      const left = (users.get(table) ?? 1) - 1;
      users.set(table, left);
      if (left <= 0) removeRowSource(table, SOURCE);
    };
  },
};

/** Descrição de um filtro com o nome da coluna ("Total: de 100 a 500"). */
function chipText(table: HTMLTableElement, key: string, filter: FilterValue): string {
  return `${columnLabel(headerOf(table, key)) || key}: ${describeFilter(filter)}`;
}

/** `ul[data-eds-table-chips="ID"]`: um chip por filtro aplicado; remover devolve o foco. */
export const tableChipsBehavior: Behavior = {
  name: 'table-chips',
  selector: 'ul[data-eds-table-chips]',
  bind(el) {
    const list = el as HTMLUListElement;
    const doc = list.ownerDocument;
    const ac = new AbortController();
    const id = list.getAttribute('data-eds-table-chips');
    const found = id ? doc.getElementById(id) : null;
    const table =
      found instanceof HTMLTableElement ? found : (found?.querySelector('table') ?? null);
    if (!table) return;
    const hub = hubFor(table);
    if (!list.hasAttribute('aria-label'))
      list.setAttribute('aria-label', getMessages().filterChipsLabel);

    const render = () => {
      const m = getMessages();
      const items: HTMLLIElement[] = [];
      for (const [key, filter] of Object.entries(hub.query.filters)) {
        if (isEmptyFilter(filter)) continue;
        const text = chipText(table, key, filter);
        const li = doc.createElement('li');
        const chip = doc.createElement('button');
        chip.type = 'button';
        chip.className = 'eds-chip';
        chip.setAttribute('data-eds-chip-remove', key);
        chip.append(doc.createTextNode(text));
        const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M4 4l8 8M12 4l-8 8');
        svg.append(path);
        chip.setAttribute('aria-label', format(m.filterChipRemove, { label: text }));
        chip.append(svg);
        li.append(chip);
        items.push(li);
      }
      list.replaceChildren(...items);
      list.hidden = items.length === 0;
    };
    render();

    list.addEventListener(
      'click',
      (event) => {
        const chip = (event.target as Element).closest<HTMLElement>('[data-eds-chip-remove]');
        const key = chip?.getAttribute('data-eds-chip-remove');
        if (!chip || !key) return;
        const chips = Array.from(list.querySelectorAll<HTMLElement>('[data-eds-chip-remove]'));
        const at = chips.indexOf(chip);
        applyColumnFilter(hub, key, null, 'chip');
        const rest = Array.from(list.querySelectorAll<HTMLElement>('[data-eds-chip-remove]'));
        const next = rest[Math.min(at, rest.length - 1)];
        if (next) next.focus();
        else headerOf(table, key)?.querySelector<HTMLElement>('.eds-table-filter-btn')?.focus();
      },
      { signal: ac.signal },
    );
    const stops = [hub.on('filters', render), hub.on('sync', render)];
    return () => {
      ac.abort();
      for (const stop of stops) stop();
    };
  },
};

export function initTableColumnFilter(root: ParentNode = document): () => void {
  return bindAll(root, [columnFilterBehavior, tableChipsBehavior]);
}
