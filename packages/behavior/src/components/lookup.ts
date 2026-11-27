import { format, getMessages } from '../core/config';
import {
  closeIcon,
  describeBy,
  emit,
  ensureId,
  flag,
  focusEl,
  hidePopover,
  normalizeText,
  showPopover,
  uid,
} from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { toLookupItem, type LookupItem } from '../core/fields';
import { createErrorSlot } from '../core/error-slot';
import { createAnnouncer } from '../core/status';

const SEARCH_DEBOUNCE_MS = 250;
const STATUS_MS = 500;
const LOADING_STATUS_MS = 400;
/** Teto de opções no autocompletar (a busca avançada do diálogo não tem teto). */
const MAX_SUGGESTIONS = 50;

/** Controle programático do Lookup (`EDS.lookup(el)`): o app devolve o cadastro feito por ele. */
export interface LookupController {
  /** Preenche código e descrição (como se tivessem sido escolhidos); `null` limpa o campo. */
  setValue: (
    value: { code: string; description?: string; [key: string]: unknown } | null,
    options?: { focus?: boolean },
  ) => void;
  clear: () => void;
  getValue: () => { code: string; description: string };
}

const controllers = new WeakMap<Element, LookupController>();

/** Controlador do Lookup que contém (ou é) `el`; `null` se não houver um ligado. */
export function lookupController(el: Element | null | undefined): LookupController | null {
  const root = el?.closest('[data-eds-lookup]');
  return (root && controllers.get(root)) ?? null;
}

interface LookupColumn {
  key: string;
  label: string;
  /** Coluna secundária: some (`.eds-table-hide-narrow`) quando a tabela do diálogo fica estreita. */
  hideNarrow?: boolean;
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
 * - `<script type="application/json" data-eds-lookup-items>`: JSON `[{ "code": "10", "description": "…" }]`
 *   (lista local);
 * - `data-eds-source`: URL em que a busca é acrescentada (`/api/clientes?q=`) ou tem `{q}`;
 * - `data-eds-lookup-resolve`: URL de um código (`…?codigo=` ou `{code}`); sem ela, a busca da fonte
 *   é usada e vale o código exato.
 * Outros atributos: `data-eds-lookup-dialog` (id de um diálogo seu, com `[data-eds-lookup-search]` e
 * `tbody[data-eds-lookup-results]`), `data-eds-lookup-title`, `data-eds-lookup-columns` (JSON
 * `[{ "key", "label", "hideNarrow"? }]`). Evento `eds:lookup-change` (`{ code, description, item }`).
 *
 * Autocompletar (ligado quando há lista local ou `data-eds-source`; desligue com
 * `data-eds-lookup-autocomplete="false"`): digitar no campo busca por código OU nome e abre uma lista
 * (APG combobox "list autocomplete", visual do Combobox). `data-eds-lookup-create="Cadastrar novo…"`
 * acrescenta a opção final quando nada é encontrado (`data-eds-lookup-create-always`: sempre),
 * que dispara o evento cancelável `eds:lookup-create` (`{ text }`); o app cadastra e devolve o
 * resultado por `EDS.lookup(el).setValue({ code, description })`. `data-eds-min-chars` (padrão 1).
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

    const source = root.getAttribute('data-eds-source') ?? '';
    const resolveUrl = root.getAttribute('data-eds-lookup-resolve') ?? '';
    let local: LookupItem[] | null = null;
    const itemsScript = root.querySelector<HTMLScriptElement>(
      'script[type="application/json"][data-eds-lookup-items]',
    );
    if (itemsScript) {
      try {
        local = toList(JSON.parse(itemsScript.textContent ?? '[]'));
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
            .map((c) => ({
              key: c.key,
              label: String(c.label ?? c.key),
              hideNarrow: c.hideNarrow === true,
            }));
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
      if (text === '') output.setAttribute('data-empty', '');
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

    const applyItem = (item: LookupItem) => {
      input.value = item.code;
      resolvedCode = item.code;
      clearError();
      setDescription(item.description);
      notify(item, item.code);
    };

    let autoKey: (event: KeyboardEvent) => boolean = () => false;
    let closeAuto: () => void = () => undefined;

    const applyCode = async (code: string) => {
      resolving?.abort();
      closeAuto();
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
        if (event.isComposing || autoKey(event)) return;
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
      dlg.close();
      applyItem(item);
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
          const cellClasses = [];
          if (column.key !== 'code') cellClasses.push('eds-table-wrap-text');
          if (column.hideNarrow) cellClasses.push('eds-table-hide-narrow');
          if (cellClasses.length) cell.className = cellClasses.join(' ');
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
            ? msgs.comboboxResultsNone
            : items.length === 1
              ? msgs.comboboxResultsOne
              : format(msgs.comboboxResultsMany, { count: items.length }),
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
        closeAuto();
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

    // ---- Autocompletar no campo (APG combobox "list autocomplete") ---------------------------
    const canAuto =
      flag(root, 'data-eds-lookup-autocomplete', true) && (local !== null || source !== '');
    if (canAuto) {
      const createAttr = root.getAttribute('data-eds-lookup-create');
      const createAlways = flag(root, 'data-eds-lookup-create-always');
      const minChars = Math.max(1, Number(root.getAttribute('data-eds-min-chars') ?? 1) || 1);
      const listId = uid('lookup-list');

      const popup = document.createElement('div');
      popup.className = 'eds-combobox-popup';
      popup.setAttribute('popover', 'manual');
      const listbox = document.createElement('ul');
      listbox.className = 'eds-combobox-listbox';
      listbox.id = listId;
      listbox.setAttribute('role', 'listbox');
      const label = input.id
        ? Array.from(root.ownerDocument.querySelectorAll('label')).find(
            (l) => l.htmlFor === input.id,
          )
        : undefined;
      if (label) listbox.setAttribute('aria-labelledby', ensureId(label, 'lookup-label'));
      else listbox.setAttribute('aria-label', input.getAttribute('aria-label') ?? m.lookupTitle);
      const emptyEl = document.createElement('p');
      emptyEl.className = 'eds-combobox-empty';
      emptyEl.hidden = true;
      const loadingEl = document.createElement('p');
      loadingEl.className = 'eds-combobox-loading';
      loadingEl.hidden = true;
      const spinner = document.createElement('span');
      spinner.className = 'eds-spinner eds-spinner-sm';
      spinner.setAttribute('aria-hidden', 'true');
      loadingEl.append(spinner, ` ${m.lookupLoading}`);
      popup.append(listbox, emptyEl, loadingEl);
      const statusEl = document.createElement('span');
      statusEl.className = 'eds-visually-hidden';
      statusEl.setAttribute('role', 'status');
      root.append(popup, statusEl);
      const say = createAnnouncer(statusEl);

      const priorRole = input.getAttribute('role');
      const priorAutocomplete = input.getAttribute('aria-autocomplete');
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', listId);

      const suggestions = new Map<string, LookupItem>();
      let open = false;
      let highlighted: HTMLElement | null = null;
      let ctl: AbortController | null = null;
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let statusTimer: ReturnType<typeof setTimeout> | null = null;
      let loadingTimer: ReturnType<typeof setTimeout> | null = null;

      const optionEls = () => Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));

      const setHighlight = (option: HTMLElement | null, scroll = true) => {
        if (highlighted && highlighted !== option) highlighted.removeAttribute('aria-selected');
        highlighted = option;
        if (option) {
          option.setAttribute('aria-selected', 'true');
          input.setAttribute('aria-activedescendant', option.id);
          if (scroll && typeof option.scrollIntoView === 'function')
            option.scrollIntoView({ block: 'nearest' });
        } else input.removeAttribute('aria-activedescendant');
      };

      const position = () => {
        if (!open) return;
        const box = root.getBoundingClientRect();
        const field = input.getBoundingClientRect();
        const height = popup.getBoundingClientRect().height;
        const below = window.innerHeight - field.bottom;
        const top = height > below && field.top > below;
        const popupWidth = popup.offsetWidth;
        const x =
          popupWidth > 0
            ? Math.max(0, Math.min(box.left, window.innerWidth - popupWidth))
            : box.left;
        popup.style.setProperty('--_combobox-x', `${Math.round(x)}px`);
        popup.style.setProperty('--_combobox-width', `${Math.round(box.width)}px`);
        popup.style.setProperty('--_combobox-y', `${Math.round(top ? field.top : field.bottom)}px`);
        if (top) popup.setAttribute('data-placement', 'top');
        else popup.removeAttribute('data-placement');
      };
      let frame = 0;
      const onViewport = () => {
        if (typeof requestAnimationFrame !== 'function') return position();
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          position();
        });
      };

      const openPopup = () => {
        if (open || input.readOnly || input.disabled) return;
        open = true;
        input.setAttribute('aria-expanded', 'true');
        showPopover(popup);
        position();
        window.addEventListener('resize', onViewport);
        window.addEventListener('scroll', onViewport, true);
      };
      const closePopup = () => {
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = null;
        if (!open) return;
        open = false;
        setHighlight(null);
        input.setAttribute('aria-expanded', 'false');
        hidePopover(popup);
        say.say('');
        window.removeEventListener('resize', onViewport);
        window.removeEventListener('scroll', onViewport, true);
        if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
        frame = 0;
      };
      const abortSearch = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = null;
        if (loadingTimer) clearTimeout(loadingTimer);
        loadingTimer = null;
        ctl?.abort();
        ctl = null;
        loadingEl.hidden = true;
        popup.removeAttribute('aria-busy');
      };
      closeAuto = () => {
        abortSearch();
        closePopup();
      };

      const render = (items: LookupItem[], text: string) => {
        listbox.textContent = '';
        suggestions.clear();
        for (const item of items.slice(0, MAX_SUGGESTIONS)) {
          const li = document.createElement('li');
          li.id = uid('lookup-opt');
          li.className = 'eds-combobox-option';
          li.setAttribute('role', 'option');
          li.setAttribute('data-value', item.code);
          const code = document.createElement('span');
          code.className = 'eds-combobox-option-code';
          code.textContent = item.code;
          const name = document.createElement('span');
          name.className = 'eds-combobox-option-text';
          name.textContent = item.description;
          li.append(code, name);
          suggestions.set(li.id, item);
          listbox.append(li);
        }
        if (createAttr !== null && text !== '' && (createAlways || items.length === 0)) {
          const li = document.createElement('li');
          li.id = uid('lookup-opt');
          li.className = 'eds-combobox-option eds-combobox-option-create';
          li.setAttribute('role', 'option');
          li.setAttribute('data-create', '');
          li.textContent = createAttr.trim() === '' ? getMessages().lookupCreate : createAttr;
          listbox.append(li);
        }
        emptyEl.textContent = getMessages().comboboxResultsNone;
        emptyEl.hidden = listbox.children.length > 0;
      };

      const resultsText = (count: number) => {
        const msgs = getMessages();
        return count === 0
          ? msgs.comboboxResultsNone
          : count === 1
            ? msgs.comboboxResultsOne
            : format(msgs.comboboxResultsMany, { count });
      };

      const run = async () => {
        ctl?.abort();
        const text = input.value.trim();
        if (text.length < minChars) {
          closeAuto();
          return;
        }
        const current = new AbortController();
        ctl = current;
        popup.setAttribute('aria-busy', 'true');
        if (source !== '') {
          loadingEl.hidden = false;
          if (loadingTimer) clearTimeout(loadingTimer);
          loadingTimer = setTimeout(() => {
            loadingTimer = null;
            if (ctl === current) say.say(getMessages().lookupLoading);
          }, LOADING_STATUS_MS);
        }
        try {
          const found = await search(text, current.signal);
          if (current.signal.aborted) return;
          render(found, text);
          if (document.activeElement === input) {
            openPopup();
            position();
            if (statusTimer) clearTimeout(statusTimer);
            statusTimer = setTimeout(() => {
              statusTimer = null;
              if (open) say.say(resultsText(suggestions.size));
            }, STATUS_MS);
          }
        } catch (error) {
          if (
            current.signal.aborted ||
            (error instanceof DOMException && error.name === 'AbortError')
          )
            return;
          render([], '');
          emptyEl.textContent = getMessages().lookupError;
          emptyEl.hidden = false;
          if (document.activeElement === input) openPopup();
          say.say(getMessages().lookupError);
        } finally {
          if (ctl === current) {
            ctl = null;
            if (loadingTimer) clearTimeout(loadingTimer);
            loadingTimer = null;
            loadingEl.hidden = true;
            popup.removeAttribute('aria-busy');
          }
        }
      };

      const choose = (option: HTMLElement) => {
        if (option.hasAttribute('data-create')) {
          const text = input.value.trim();
          closeAuto();
          // O texto vai ao cadastro: sair do campo não deve acusar "código não encontrado".
          resolvedCode = input.value;
          emit(root, 'lookup-create', { text }, true);
          return;
        }
        const item = suggestions.get(option.id);
        if (!item) return;
        closeAuto();
        applyItem(item);
      };

      const move = (delta: 1 | -1) => {
        const list = optionEls();
        if (list.length === 0) return;
        const index = highlighted ? list.indexOf(highlighted) : -1;
        const next = index < 0 ? (delta > 0 ? 0 : list.length - 1) : index + delta;
        setHighlight(list[Math.min(Math.max(next, 0), list.length - 1)] ?? null);
      };

      autoKey = (event) => {
        const busy = popup.getAttribute('aria-busy') === 'true';
        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowUp': {
            event.preventDefault();
            if (input.readOnly || busy) return true;
            const down = event.key === 'ArrowDown';
            if (!open) {
              if (optionEls().length === 0) {
                void run();
                return true;
              }
              openPopup();
              position();
              if (!event.altKey) move(down ? 1 : -1);
            } else if (event.altKey && !down) closePopup();
            else if (!event.altKey) move(down ? 1 : -1);
            return true;
          }
          case 'Enter':
            if (open && busy) {
              event.preventDefault();
              return true;
            }
            if (open && highlighted) {
              event.preventDefault();
              choose(highlighted);
              return true;
            }
            if (open) closeAuto();
            return false;
          case 'Escape':
            if (open) {
              event.preventDefault();
              event.stopPropagation();
              closeAuto();
              return true;
            }
            return false;
          case 'Tab':
            closeAuto();
            return false;
          default:
            return false;
        }
      };

      input.addEventListener(
        'input',
        () => {
          setHighlight(null);
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = null;
          if (input.value.trim().length < minChars) {
            closeAuto();
            return;
          }
          if (local) void run();
          else
            debounceTimer = setTimeout(() => {
              debounceTimer = null;
              void run();
            }, SEARCH_DEBOUNCE_MS);
        },
        { signal },
      );
      input.addEventListener('blur', () => closeAuto(), { signal });
      popup.addEventListener('pointerdown', (event) => event.preventDefault(), { signal });
      popup.addEventListener(
        'click',
        (event) => {
          const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
          if (option && listbox.contains(option)) choose(option);
        },
        { signal },
      );
      popup.addEventListener(
        'pointermove',
        (event) => {
          const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
          if (option && listbox.contains(option) && option !== highlighted)
            setHighlight(option, false);
        },
        { signal },
      );

      undo.push(() => {
        closeAuto();
        say.dispose();
        popup.remove();
        statusEl.remove();
        for (const [name, prior] of [
          ['role', priorRole],
          ['aria-autocomplete', priorAutocomplete],
        ] as const) {
          if (prior === null) input.removeAttribute(name);
          else input.setAttribute(name, prior);
        }
        input.removeAttribute('aria-expanded');
        input.removeAttribute('aria-controls');
        input.removeAttribute('aria-activedescendant');
      });
    }

    // ---- Controle programático ------------------------------------------------------------
    const controller: LookupController = {
      setValue(value, options) {
        resolving?.abort();
        closeAuto();
        const item = value ? toLookupItem(value) : null;
        if (!item) {
          input.value = '';
          resolvedCode = '';
          clearError();
          setDescription('');
          notify(null, '');
        } else applyItem(item);
        if (options?.focus !== false) focusEl(input);
      },
      clear() {
        controller.setValue(null, { focus: false });
      },
      getValue() {
        return {
          code: input.value.trim(),
          description: output?.hasAttribute('data-empty') ? '' : (output?.textContent ?? ''),
        };
      },
    };
    controllers.set(root, controller);
    undo.push(() => controllers.delete(root));

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
  dialog.className = 'eds-modal eds-modal-lg eds-lookup-dialog';
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
    if (column.hideNarrow) th.className = 'eds-table-hide-narrow';
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
