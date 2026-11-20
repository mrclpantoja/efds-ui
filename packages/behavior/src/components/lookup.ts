import { format, getMessages } from '../core/config';
import { closeIcon, describeBy, emit, ensureId, focusEl, normalizeText, uid } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { toLookupItem, type LookupItem } from '../core/fields';
import { createErrorSlot } from '../core/error-slot';
import { createAnnouncer } from '../core/status';

const SEARCH_DEBOUNCE_MS = 250;

interface LookupColumn {
  key: string;
  label: string;
}

/** `fetch` aceita só o que a especificação define; `edsLoader` é lido pelo PageLoader. */
type FetchInit = RequestInit & { edsLoader?: false };

function toList(json: unknown): LookupItem[] {
  const list = Array.isArray(json)
    ? json
    : json && typeof json === 'object'
      ? ((json as Record<string, unknown>).items ??
        (json as Record<string, unknown>).data ??
        (json as Record<string, unknown>).results)
      : [];
  if (!Array.isArray(list)) return [];
  return list.map(toLookupItem).filter((item): item is LookupItem => item !== null);
}

const withQuery = (template: string, key: string, value: string): string =>
  template.includes(`{${key}}`)
    ? template.replaceAll(`{${key}}`, encodeURIComponent(value))
    : `${template}${encodeURIComponent(value)}`;

async function getJson(
  url: string,
  signal: AbortSignal,
): Promise<{ status: number; json: unknown }> {
  const init: FetchInit = { signal, headers: { Accept: 'application/json' }, edsLoader: false };
  const response = await fetch(url, init);
  if (response.status === 404) return { status: 404, json: null };
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { status: response.status, json: (await response.json()) as unknown };
}

/**
 * Lookup de entidade: `.eds-lookup[data-eds-lookup]` com o campo de código (`.eds-lookup-code`), o
 * botão de busca (`[data-eds-lookup-open]` ou o primeiro `button`) e a descrição
 * (`output.eds-lookup-description`). Ao sair do campo, o código vira descrição; o botão abre um
 * modal com busca e tabela, e escolher devolve código e descrição e o foco ao campo.
 *
 * Fonte dos dados (nenhuma é obrigatória, nada é chamado sem o autor configurar):
 * - `data-eds-lookup-items`: JSON `[{ "code": "10", "description": "…" }]` (lista local);
 * - `data-eds-lookup-source`: URL em que a busca é acrescentada (`/api/clientes?q=`) ou tem `{q}`;
 * - `data-eds-lookup-resolve`: URL de um código (`…?codigo=` ou `{code}`); sem ela, a busca da fonte
 *   é usada e vale o código exato.
 * Outros atributos: `data-eds-lookup-dialog` (id de um diálogo seu, com `[data-eds-lookup-search]` e
 * `tbody[data-eds-lookup-results]`), `data-eds-lookup-title`, `data-eds-lookup-columns` (JSON
 * `[{ "key", "label" }]`). Evento `eds:lookup-change` (`{ code, description, item }`).
 */
export const lookupBehavior: Behavior = {
  name: 'lookup',
  selector: '[data-eds-lookup]',
  bind(root) {
    const input =
      root.querySelector<HTMLInputElement>('input.eds-lookup-code') ??
      root.querySelector<HTMLInputElement>('input:not([type="hidden"])');
    const opener =
      root.querySelector<HTMLButtonElement>('[data-eds-lookup-open]') ??
      root.querySelector<HTMLButtonElement>('button');
    const output = root.querySelector<HTMLElement>('.eds-lookup-description');
    if (!input) return;

    const ac = new AbortController();
    const { signal } = ac;
    const undo: (() => void)[] = [];
    const m = getMessages();

    const source = root.getAttribute('data-eds-lookup-source') ?? '';
    const resolveUrl = root.getAttribute('data-eds-lookup-resolve') ?? '';
    let local: LookupItem[] | null = null;
    const itemsAttr = root.getAttribute('data-eds-lookup-items');
    if (itemsAttr) {
      try {
        local = toList(JSON.parse(itemsAttr));
      } catch {
        local = null;
      }
    }
    let columns: LookupColumn[] = [
      { key: 'code', label: m.lookupCode },
      { key: 'description', label: m.lookupDescription },
    ];
    const columnsAttr = root.getAttribute('data-eds-lookup-columns');
    if (columnsAttr) {
      try {
        const parsed = JSON.parse(columnsAttr) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          columns = parsed
            .filter((c): c is LookupColumn => !!c && typeof (c as LookupColumn).key === 'string')
            .map((c) => ({ key: c.key, label: String(c.label ?? c.key) }));
        }
      } catch {
        /* mantém as colunas padrão */
      }
    }

    // ---- Busca e resolução ----------------------------------------------------------------
    const search = async (query: string, sig: AbortSignal): Promise<LookupItem[]> => {
      if (local) {
        const q = normalizeText(query.trim());
        return local.filter(
          (item) =>
            q === '' ||
            normalizeText(
              `${item.code} ${item.description} ${Object.values(item.raw).join(' ')}`,
            ).includes(q),
        );
      }
      if (source === '') return [];
      return toList((await getJson(withQuery(source, 'q', query), sig)).json);
    };
    const resolve = async (code: string, sig: AbortSignal): Promise<LookupItem | null> => {
      const wanted = code.trim().toLowerCase();
      if (local) return local.find((i) => i.code.toLowerCase() === wanted) ?? null;
      if (resolveUrl !== '') {
        const { status, json } = await getJson(withQuery(resolveUrl, 'code', code.trim()), sig);
        if (status === 404) return null;
        const list = toList(
          Array.isArray(json) || (json && typeof json === 'object' && 'items' in json)
            ? json
            : [json],
        );
        return list.find((i) => i.code.toLowerCase() === wanted) ?? list[0] ?? null;
      }
      const found = await search(code.trim(), sig);
      return found.find((i) => i.code.toLowerCase() === wanted) ?? null;
    };

    // ---- Descrição e erro -----------------------------------------------------------------
    const placeholder = output?.textContent ?? '';
    // A descrição só entra no `aria-describedby` quando existe: o travessão do estado vazio não é lido.
    if (output) {
      ensureId(output, 'lookup-desc');
      describeBy(input, output.id, input.value.trim() !== '');
      undo.push(() => describeBy(input, output.id, false));
    }
    const slot = createErrorSlot(input, () => root);
    const clearError = () => slot.clear();
    const showError = (message: string) => void slot.show(message);
    const setDescription = (text: string) => {
      if (!output) return;
      output.textContent = text === '' ? placeholder : text;
      describeBy(input, output.id, text !== '');
      if (text === '') output.setAttribute('data-empty', 'true');
      else output.removeAttribute('data-empty');
    };
    undo.push(clearError);

    let resolvedCode = input.value;
    let resolving: AbortController | null = null;
    const notify = (item: LookupItem | null, code: string) => {
      emit(root, 'lookup-change', {
        code,
        description: item?.description ?? '',
        item: item?.raw ?? null,
      });
    };

    const applyCode = async (code: string) => {
      resolving?.abort();
      const trimmed = code.trim();
      resolvedCode = input.value;
      if (trimmed === '') {
        clearError();
        setDescription('');
        notify(null, '');
        return;
      }
      if (!local && source === '' && resolveUrl === '') return;
      const controller = new AbortController();
      resolving = controller;
      output?.setAttribute('aria-busy', 'true');
      if (output) output.textContent = m.lookupLoading;
      try {
        const item = await resolve(trimmed, controller.signal);
        if (controller.signal.aborted) return;
        output?.removeAttribute('aria-busy');
        if (item) {
          clearError();
          setDescription(item.description);
          notify(item, item.code);
        } else {
          setDescription('');
          showError(getMessages().lookupNotFound);
          notify(null, trimmed);
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        )
          return;
        output?.removeAttribute('aria-busy');
        setDescription('');
        showError(getMessages().lookupError);
      }
    };

    const onChange = () => {
      if (input.value !== resolvedCode) void applyCode(input.value);
    };
    input.addEventListener('change', onChange, { signal });
    input.addEventListener(
      'keydown',
      (event) => {
        // Enter confirma o código (e só envia o formulário quando já está resolvido).
        if (event.key === 'Enter' && input.value !== resolvedCode) {
          event.preventDefault();
          void applyCode(input.value);
        }
      },
      { signal },
    );
    // Valor inicial já preenchido: descreve sem avisar quem escuta.
    if (input.value.trim() !== '' && (local || source !== '' || resolveUrl !== '')) {
      const controller = new AbortController();
      resolving = controller;
      void resolve(input.value.trim(), controller.signal)
        .then((item) => {
          if (controller.signal.aborted || !item) return;
          setDescription(item.description);
        })
        .catch(() => undefined);
    }
    undo.push(() => resolving?.abort());

    // ---- Diálogo de busca -----------------------------------------------------------------
    const dialogId = root.getAttribute('data-eds-lookup-dialog');
    let dialog = dialogId ? document.getElementById(dialogId) : null;
    let searchInput = dialog?.querySelector<HTMLInputElement>('[data-eds-lookup-search]') ?? null;
    let results = dialog?.querySelector<HTMLElement>('[data-eds-lookup-results]') ?? null;
    if (!(dialog instanceof HTMLDialogElement) || !searchInput || !results) {
      const built = buildDialog(
        root.getAttribute('data-eds-lookup-title') ??
          opener?.getAttribute('aria-label') ??
          m.lookupTitle,
        columns,
      );
      root.append(built.dialog);
      undo.push(() => built.dialog.remove());
      dialog = built.dialog;
      searchInput = built.search;
      results = built.results;
    }
    const dlg = dialog as HTMLDialogElement;
    const searchField = searchInput;
    const body = results;
    const status = dlg.querySelector<HTMLElement>('[role="status"]');
    const announcer = createAnnouncer(status);
    undo.push(() => announcer.dispose());
    const errorBox = dlg.querySelector<HTMLElement>('[data-eds-lookup-error]');
    let searching: AbortController | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const setError = (message: string | null) => {
      if (!errorBox) return;
      const text = errorBox.querySelector<HTMLElement>('[data-eds-lookup-error-text]');
      if (text) text.textContent = message ?? '';
      errorBox.hidden = message === null;
    };

    const select = (item: LookupItem) => {
      input.value = item.code;
      resolvedCode = item.code;
      clearError();
      setDescription(item.description);
      dlg.close();
      notify(item, item.code);
      focusEl(input);
    };

    const render = (items: LookupItem[]) => {
      body.replaceChildren();
      for (const item of items) {
        const row = document.createElement('tr');
        row.setAttribute('data-code', item.code);
        for (const column of columns) {
          const cell = document.createElement('td');
          // Descrições longas quebram linha (a tabela do diálogo não rola a 320 px até o botão).
          if (column.key !== 'code') cell.className = 'eds-table-wrap-text';
          const v =
            column.key === 'code'
              ? item.code
              : column.key === 'description'
                ? item.description
                : item.raw[column.key];
          cell.textContent = v === undefined || v === null ? '' : String(v);
          row.append(cell);
        }
        const actions = document.createElement('td');
        actions.className = 'eds-table-actions';
        const pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'eds-button eds-button-secondary eds-button-sm';
        pickBtn.textContent = getMessages().lookupSelect;
        pickBtn.setAttribute(
          'aria-label',
          format(getMessages().lookupSelectLabel, {
            code: item.code,
            description: item.description,
          }),
        );
        pickBtn.addEventListener('click', () => select(item));
        actions.append(pickBtn);
        row.append(actions);
        body.append(row);
      }
    };

    const runSearch = async () => {
      searching?.abort();
      const controller = new AbortController();
      searching = controller;
      setError(null);
      body.closest('.eds-table-wrap')?.setAttribute('aria-busy', 'true');
      announcer.say(getMessages().lookupLoading);
      try {
        const items = await search(searchField.value, controller.signal);
        if (controller.signal.aborted) return;
        render(items);
        const msgs = getMessages();
        announcer.say(
          items.length === 0
            ? msgs.comboNoResults
            : items.length === 1
              ? msgs.comboResultsOne
              : format(msgs.comboResultsMany, { count: items.length }),
        );
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        )
          return;
        body.replaceChildren();
        setError(getMessages().lookupError);
        announcer.say(getMessages().lookupError);
      } finally {
        if (!controller.signal.aborted)
          body.closest('.eds-table-wrap')?.removeAttribute('aria-busy');
      }
    };

    searchField.addEventListener(
      'input',
      () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => void runSearch(), SEARCH_DEBOUNCE_MS);
      },
      { signal },
    );
    searchField.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (debounce) clearTimeout(debounce);
          void runSearch();
        }
      },
      { signal },
    );
    errorBox
      ?.querySelector('button')
      ?.addEventListener('click', () => void runSearch(), { signal });
    for (const close of dlg.querySelectorAll('[data-eds-close]')) {
      close.addEventListener('click', () => dlg.close(), { signal });
    }

    opener?.addEventListener(
      'click',
      () => {
        if (dlg.open || input.disabled || input.readOnly) return;
        searchField.value = '';
        body.replaceChildren();
        dlg.showModal();
        focusEl(searchField);
        void runSearch();
      },
      { signal },
    );
    dlg.addEventListener(
      'close',
      () => {
        searching?.abort();
        if (debounce) clearTimeout(debounce);
        announcer.say('');
      },
      { signal },
    );

    return () => {
      ac.abort();
      if (debounce) clearTimeout(debounce);
      searching?.abort();
      for (const stop of undo.reverse()) stop();
    };
  },
};

/** Diálogo padrão: título, busca, estado, erro com "Tentar de novo" e tabela com "Selecionar". */
function buildDialog(
  title: string,
  columns: LookupColumn[],
): { dialog: HTMLDialogElement; search: HTMLInputElement; results: HTMLElement } {
  const m = getMessages();
  const id = uid('lookup');
  const dialog = document.createElement('dialog');
  dialog.className = 'eds-modal eds-lookup-dialog';
  dialog.setAttribute('aria-labelledby', `${id}-title`);

  const header = document.createElement('header');
  header.className = 'eds-modal-header';
  const h = document.createElement('h2');
  h.className = 'eds-modal-title';
  h.id = `${id}-title`;
  h.textContent = title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'eds-button eds-button-ghost eds-button-icon';
  close.setAttribute('aria-label', m.lookupClose);
  close.setAttribute('data-eds-close', '');
  close.append(closeIcon());
  header.append(h, close);

  const body = document.createElement('div');
  body.className = 'eds-modal-body eds-stack eds-gap-4';

  const field = document.createElement('div');
  field.className = 'eds-field';
  const label = document.createElement('label');
  label.className = 'eds-label';
  label.htmlFor = `${id}-q`;
  label.textContent = m.lookupSearch;
  const search = document.createElement('input');
  search.className = 'eds-input';
  search.type = 'search';
  search.id = `${id}-q`;
  search.autocomplete = 'off';
  search.setAttribute('data-eds-lookup-search', '');
  field.append(label, search);

  const status = document.createElement('p');
  status.className = 'eds-visually-hidden';
  status.setAttribute('role', 'status');

  const error = document.createElement('p');
  error.className = 'eds-error';
  error.hidden = true;
  error.setAttribute('data-eds-lookup-error', '');
  const errorText = document.createElement('span');
  errorText.setAttribute('data-eds-lookup-error-text', '');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'eds-button eds-button-ghost eds-button-sm';
  retry.textContent = m.lookupRetry;
  error.append(errorText, ' ', retry);

  const wrap = document.createElement('div');
  wrap.className = 'eds-table-wrap eds-lookup-results';
  const table = document.createElement('table');
  table.className = 'eds-table';
  const caption = document.createElement('caption');
  caption.className = 'eds-table-caption eds-visually-hidden';
  caption.textContent = title;
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const column of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column.label;
    headRow.append(th);
  }
  const actionsHead = document.createElement('th');
  actionsHead.scope = 'col';
  actionsHead.className = 'eds-table-actions';
  const hidden = document.createElement('span');
  hidden.className = 'eds-visually-hidden';
  hidden.textContent = m.lookupSelect;
  actionsHead.append(hidden);
  headRow.append(actionsHead);
  thead.append(headRow);
  const results = document.createElement('tbody');
  results.setAttribute('data-eds-lookup-results', '');
  table.append(caption, thead, results);
  wrap.append(table);

  body.append(field, status, error, wrap);
  dialog.append(header, body);
  return { dialog, search, results };
}

export function initLookup(root: ParentNode = document): () => void {
  return bindAll(root, [lookupBehavior]);
}
