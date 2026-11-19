import { format, getMessages } from '../core/config';
import {
  emit,
  ensureId,
  hidePopover,
  normalizeText,
  safeMatches,
  showPopover,
  uid,
} from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;
const STATUS_MS = 500;
const LOADING_STATUS_MS = 400;
const DEFAULT_MIN_CHARS = 2;

/** `fetch` aceita só o que a especificação define; `edsLoader` é lido pelo PageLoader. */
type FetchInit = RequestInit & { edsLoader?: false };

/**
 * Combobox (APG "list autocomplete"): filtro local sem acento/caixa ou fonte remota
 * (`data-eds-source`), popup em `popover="manual"` posicionado por `--_combobox-x/-y/-width`
 * e `data-placement`. Destaque por `aria-activedescendant`; a seleção grava o campo hidden.
 */
export const comboboxBehavior: Behavior = {
  name: 'combobox',
  selector: '.eds-combobox',
  bind(root) {
    const input = root.querySelector<HTMLInputElement>('input[role="combobox"]');
    const popup = root.querySelector<HTMLElement>('.eds-combobox-popup');
    const listbox = root.querySelector<HTMLElement>('[role="listbox"]');
    if (!input || !popup || !listbox) return;
    const hidden = root.querySelector<HTMLInputElement>('input[type="hidden"]');
    const empty = root.querySelector<HTMLElement>('.eds-combobox-empty');
    const loading = root.querySelector<HTMLElement>('.eds-combobox-loading');
    const status = root.querySelector<HTMLElement>('[role="status"]');
    const source = root.getAttribute('data-eds-source');
    const minChars = Number(root.getAttribute('data-eds-min-chars') ?? DEFAULT_MIN_CHARS);
    const emptyText = empty?.textContent ?? '';

    const ac = new AbortController();
    const { signal } = ac;

    input.setAttribute('aria-autocomplete', input.getAttribute('aria-autocomplete') ?? 'list');
    if (!input.hasAttribute('aria-expanded')) input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', ensureId(listbox, 'combobox-list'));
    if (!input.hasAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');

    let open = false;
    let highlighted: HTMLElement | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let statusTimer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let currentValue = hidden?.value ?? '';
    let errored = false;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    const options = () => Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
    const visibleOptions = () => options().filter((o) => !o.hidden);
    const enabledOptions = () =>
      visibleOptions().filter((o) => o.getAttribute('aria-disabled') !== 'true');
    const labelOf = (option: HTMLElement) => (option.textContent ?? '').trim();
    const valueOf = (option: HTMLElement) =>
      option.getAttribute('data-value') ?? option.getAttribute('value') ?? labelOf(option);

    for (const option of options()) ensureId(option, 'combobox-opt');

    // Listbox sem nome: usa o label do campo.
    if (
      !listbox.hasAttribute('aria-label') &&
      !listbox.hasAttribute('aria-labelledby') &&
      input.id
    ) {
      const label = Array.from(root.ownerDocument.querySelectorAll('label')).find(
        (l) => l.htmlFor === input.id,
      );
      if (label) listbox.setAttribute('aria-labelledby', ensureId(label, 'combobox-label'));
    }

    // Texto sem escolha não é valor: o formulário avisa em vez de enviar o rótulo digitado.
    const freeText = root.hasAttribute('data-eds-free-text');
    const syncValidity = () => {
      const invalid = !freeText && input.value !== '' && currentValue === '';
      input.setCustomValidity(invalid ? getMessages().comboboxInvalid : '');
    };

    // ---- Estado visual ---------------------------------------------------------------------
    const markCurrent = () => {
      for (const option of options()) {
        if (currentValue !== '' && valueOf(option) === currentValue) {
          option.setAttribute('data-current', '');
        } else option.removeAttribute('data-current');
      }
    };

    const setHighlight = (option: HTMLElement | null, scroll = true) => {
      if (highlighted && highlighted !== option) highlighted.removeAttribute('aria-selected');
      highlighted = option;
      if (option) {
        option.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', option.id);
        if (scroll && typeof option.scrollIntoView === 'function')
          option.scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    };

    const announce = (text: string) => {
      if (status) status.textContent = text;
    };

    const resultsText = () => {
      const m = getMessages();
      const count = enabledOptions().length;
      return count === 0
        ? m.comboNoResults
        : count === 1
          ? m.comboResultsOne
          : format(m.comboResultsMany, { count });
    };

    /** Anuncia a contagem depois de uma pausa na digitação (nada ao navegar por setas). */
    const scheduleStatus = () => {
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        statusTimer = null;
        if (open) announce(resultsText());
      }, STATUS_MS);
    };

    const refreshEmpty = () => {
      if (!empty) return;
      if (!errored) empty.textContent = emptyText;
      const loadingNow = loading ? !loading.hidden : false;
      empty.hidden = errored ? false : visibleOptions().length > 0 || loadingNow;
    };

    // ---- Posição ---------------------------------------------------------------------------
    const position = () => {
      if (!open) return;
      const rect = input.getBoundingClientRect();
      const height = popup.getBoundingClientRect().height;
      const below = window.innerHeight - rect.bottom;
      const above = rect.top;
      const top = height > below && above > below;
      popup.style.setProperty('--_combobox-x', `${Math.round(rect.left)}px`);
      popup.style.setProperty('--_combobox-width', `${Math.round(rect.width)}px`);
      popup.style.setProperty('--_combobox-y', `${Math.round(top ? rect.top : rect.bottom)}px`);
      if (top) popup.setAttribute('data-placement', 'top');
      else popup.removeAttribute('data-placement');
    };

    const onViewportChange = () => position();

    const openPopup = () => {
      if (open) return;
      open = true;
      input.setAttribute('aria-expanded', 'true');
      showPopover(popup);
      position();
      window.addEventListener('resize', onViewportChange);
      window.addEventListener('scroll', onViewportChange, true);
    };

    const closePopup = () => {
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = null;
      if (!open) return;
      open = false;
      setHighlight(null);
      input.setAttribute('aria-expanded', 'false');
      hidePopover(popup);
      announce('');
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };

    // ---- Dados -----------------------------------------------------------------------------
    const filterLocal = (query: string) => {
      const needle = normalizeText(query.trim());
      for (const option of options()) {
        option.hidden = needle !== '' && !normalizeText(labelOf(option)).includes(needle);
      }
    };

    const renderRemote = (items: ComboboxOption[]) => {
      listbox.textContent = '';
      for (const item of items) {
        const li = document.createElement('li');
        li.id = uid('combobox-opt');
        li.className = 'eds-combobox-option';
        li.setAttribute('role', 'option');
        li.setAttribute('data-value', item.value);
        if (item.disabled) li.setAttribute('aria-disabled', 'true');
        li.textContent = item.label;
        listbox.append(li);
      }
      markCurrent();
    };

    const setLoading = (on: boolean) => {
      if (loading) loading.hidden = !on;
      if (on) popup.setAttribute('aria-busy', 'true');
      else popup.removeAttribute('aria-busy');
    };

    const abortRemote = () => {
      if (debounce) clearTimeout(debounce);
      debounce = null;
      if (loadingTimer) clearTimeout(loadingTimer);
      loadingTimer = null;
      controller?.abort();
      controller = null;
      setLoading(false);
    };

    const fetchRemote = async (query: string) => {
      if (!source) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      errored = false;
      setLoading(true);
      setHighlight(null);
      refreshEmpty();
      if (document.activeElement === input) openPopup();
      // Carregando só é anunciado se demorar (resposta rápida não deve falar).
      loadingTimer = setTimeout(() => {
        loadingTimer = null;
        if (controller === current) announce(getMessages().comboLoading);
      }, LOADING_STATUS_MS);
      try {
        const init: FetchInit = {
          signal: current.signal,
          headers: { Accept: 'application/json' },
          // O Combobox tem loading próprio: o PageLoader automático não deve disparar.
          edsLoader: false,
        };
        const response = await fetch(source + encodeURIComponent(query), init);
        if (!response.ok) throw new Error(String(response.status));
        const data: unknown = await response.json();
        if (current.signal.aborted) return;
        const items = (Array.isArray(data) ? data : [])
          .filter(
            (item): item is { value: unknown; label: unknown; disabled?: unknown } =>
              typeof item === 'object' && item !== null && 'value' in item && 'label' in item,
          )
          .map((item) => ({
            value: String(item.value),
            label: String(item.label),
            disabled: item.disabled === true,
          }));
        if (loadingTimer) clearTimeout(loadingTimer);
        loadingTimer = null;
        renderRemote(items);
        setLoading(false);
        refreshEmpty();
        if (document.activeElement === input) {
          openPopup();
          position();
          scheduleStatus();
        }
      } catch {
        if (current.signal.aborted) return;
        if (loadingTimer) clearTimeout(loadingTimer);
        loadingTimer = null;
        renderRemote([]);
        setLoading(false);
        errored = true;
        const message = getMessages().comboError;
        if (empty) {
          empty.textContent = message;
          empty.hidden = false;
        }
        if (document.activeElement === input) openPopup();
        announce(message);
      } finally {
        if (controller === current) controller = null;
      }
    };

    const search = () => {
      const query = input.value;
      // Erro antigo some assim que o usuário volta a digitar.
      if (errored) {
        errored = false;
        if (empty) {
          empty.textContent = emptyText;
          empty.hidden = true;
        }
      }
      if (!source) {
        filterLocal(query);
        refreshEmpty();
        openPopup();
        position();
        scheduleStatus();
        return;
      }
      abortRemote();
      if (query.trim().length < minChars) {
        renderRemote([]);
        errored = false;
        refreshEmpty();
        closePopup();
        return;
      }
      debounce = setTimeout(() => {
        debounce = null;
        void fetchRemote(query);
      }, DEBOUNCE_MS);
    };

    // ---- Seleção ---------------------------------------------------------------------------
    const commit = (value: string, label: string) => {
      currentValue = value;
      if (hidden) {
        hidden.value = value;
        hidden.setAttribute('data-value', value);
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }
      markCurrent();
      syncValidity();
      emit(root, 'combobox-change', { value, label });
    };

    const select = (option: HTMLElement) => {
      if (option.getAttribute('aria-disabled') === 'true') return;
      const label = labelOf(option);
      input.value = label;
      if (!source) filterLocal('');
      commit(valueOf(option), label);
      closePopup();
      announce(format(getMessages().comboSelected, { label }));
    };

    const move = (delta: 1 | -1) => {
      const list = enabledOptions();
      if (list.length === 0) return;
      const index = highlighted ? list.indexOf(highlighted) : -1;
      // Sem dar a volta: para no primeiro/último.
      const next = index < 0 ? (delta > 0 ? 0 : list.length - 1) : index + delta;
      setHighlight(list[Math.min(Math.max(next, 0), list.length - 1)] ?? null);
    };

    /** Abre sem digitar (setas): com o texto igual à escolha atual mostra todas as opções. */
    const openFromArrow = (): boolean => {
      if (source && options().length === 0 && !errored) return false;
      if (!source) {
        const chosen = options().find((o) => o.hasAttribute('data-current'));
        filterLocal(chosen && labelOf(chosen) === input.value ? '' : input.value);
        refreshEmpty();
      }
      openPopup();
      position();
      return true;
    };

    // ---- Eventos ---------------------------------------------------------------------------
    input.addEventListener(
      'input',
      () => {
        if (freeText) {
          // Texto livre: o hidden acompanha o que foi digitado.
          commit(input.value, input.value);
        } else if (currentValue !== '') {
          // Editar o texto depois de escolher desfaz a escolha.
          commit('', '');
        }
        syncValidity();
        setHighlight(null);
        search();
      },
      { signal },
    );

    input.addEventListener(
      'keydown',
      (event) => {
        if (event.isComposing) return;
        // Buscando: a lista ainda vai mudar; setas e Enter esperam (e Enter não envia o formulário).
        const busy = popup.getAttribute('aria-busy') === 'true';
        if (busy && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
          event.preventDefault();
          return;
        }
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            if (!open) {
              if (openFromArrow() && !event.altKey) move(1);
            } else if (!event.altKey) move(1);
            break;
          case 'ArrowUp':
            if (event.altKey) {
              event.preventDefault();
              closePopup();
            } else if (!open) {
              event.preventDefault();
              if (openFromArrow()) move(-1);
            } else {
              event.preventDefault();
              move(-1);
            }
            break;
          case 'Enter':
            if (open && highlighted) {
              event.preventDefault();
              select(highlighted);
            } else if (open) {
              // Sem destaque: fecha a lista e deixa o formulário seguir, como fechada.
              closePopup();
            }
            break;
          case 'Escape':
            if (open) {
              event.preventDefault();
              event.stopPropagation();
              abortRemote();
              closePopup();
            } else if (input.value !== '') {
              event.preventDefault();
              event.stopPropagation();
              input.value = '';
              if (currentValue !== '') commit('', '');
              syncValidity();
              if (!source) filterLocal('');
            }
            break;
          case 'Tab':
            closePopup();
            break;
          default:
        }
      },
      { signal },
    );

    input.addEventListener(
      'click',
      () => {
        if (!open && !input.disabled && !input.readOnly) openFromArrow();
      },
      { signal },
    );

    input.addEventListener(
      'blur',
      () => {
        abortRemote();
        closePopup();
      },
      { signal },
    );

    // O foco fica no input: o pointerdown nas opções não pode tirá-lo dali.
    popup.addEventListener('pointerdown', (event) => event.preventDefault(), { signal });
    popup.addEventListener(
      'click',
      (event) => {
        const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
        if (option && listbox.contains(option)) select(option);
      },
      { signal },
    );

    // O mouse move o destaque (sem rolar a lista, que o próprio mouse está rolando).
    popup.addEventListener(
      'pointermove',
      (event) => {
        const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
        if (!option || !listbox.contains(option) || option === highlighted) return;
        if (option.getAttribute('aria-disabled') === 'true') return;
        setHighlight(option, false);
      },
      { signal },
    );

    // Estado inicial: valor do hidden -> texto e marca de "escolhida".
    if (currentValue !== '') {
      markCurrent();
      const chosen = options().find((o) => o.hasAttribute('data-current'));
      if (chosen && input.value === '') input.value = labelOf(chosen);
    }
    if (safeMatches(popup, ':popover-open')) hidePopover(popup);
    syncValidity();

    return () => {
      input.setCustomValidity('');
      ac.abort();
      abortRemote();
      if (statusTimer) clearTimeout(statusTimer);
      closePopup();
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  },
};

export function initCombobox(root: ParentNode = document): () => void {
  return bindAll(root, [comboboxBehavior]);
}
