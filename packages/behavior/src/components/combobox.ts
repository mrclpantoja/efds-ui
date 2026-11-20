import { format, getMessages } from '../core/config';
import {
  closeIcon,
  describeBy,
  emit,
  ensureId,
  hidePopover,
  normalizeText,
  safeMatches,
  showPopover,
  uid,
} from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

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
    // Modo múltiplo (MultiSelect): escolhidas em `selected`, destaque em `data-active`.
    const multiple = root.hasAttribute('data-eds-multiple');
    const control = root.querySelector<HTMLElement>('.eds-combobox-control');
    const maxSelected = Number(root.getAttribute('data-eds-max-selected') ?? 0);
    const highlightAttr = multiple ? 'data-active' : 'aria-selected';
    const selected = new Map<string, string>();
    const anchor = control ?? input;

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
      refreshError();
    };

    // Erro visível e associado (3.3.1): <p class="eds-error"> logo após o .eds-combobox, com
    // aria-invalid e aria-describedby; some quando o campo volta a ser válido.
    let errorEl: HTMLElement | null = null;
    const showError = (message: string) => {
      if (message === '') return;
      input.setAttribute('aria-invalid', 'true');
      if (!errorEl) {
        errorEl = root.ownerDocument.createElement('p');
        errorEl.className = 'eds-error';
        errorEl.id = `${ensureId(input, 'combobox')}-err`;
        root.after(errorEl);
      }
      describeBy(input, errorEl.id, true);
      if (errorEl.textContent !== message) {
        errorEl.textContent = message;
        announce(message);
      }
    };
    const clearError = () => {
      if (!errorEl) return;
      describeBy(input, errorEl.id, false);
      errorEl.remove();
      errorEl = null;
      input.removeAttribute('aria-invalid');
    };
    const refreshError = (): void => {
      if (!errorEl) return;
      if (input.validity.valid) clearError();
      else if (input.validationMessage !== errorEl.textContent) {
        // O motivo mudou (ex.: de "escolha uma opção" para "campo obrigatório").
        clearError();
      }
    };
    /** Enter e saída do campo com texto que não é opção (só o combobox simples). */
    const flagUnchosen = () => {
      if (!multiple && input.validity.customError) showError(input.validationMessage);
    };
    input.addEventListener('invalid', () => showError(input.validationMessage), { signal });

    // ---- Estado visual ---------------------------------------------------------------------
    const markCurrent = () => {
      for (const option of options()) {
        if (currentValue !== '' && valueOf(option) === currentValue) {
          option.setAttribute('data-current', '');
        } else option.removeAttribute('data-current');
      }
    };

    const setHighlight = (option: HTMLElement | null, scroll = true) => {
      if (highlighted && highlighted !== option) highlighted.removeAttribute(highlightAttr);
      highlighted = option;
      if (option) {
        option.setAttribute(highlightAttr, multiple ? '' : 'true');
        input.setAttribute('aria-activedescendant', option.id);
        if (scroll && typeof option.scrollIntoView === 'function')
          option.scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    };

    const announcer = createAnnouncer(status);
    const announce = announcer.say;

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
      const rect = anchor.getBoundingClientRect();
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
      if (multiple) syncOptions();
      else markCurrent();
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

    // ---- Modo múltiplo -----------------------------------------------------------------------
    const initialHiddenName =
      root.querySelector<HTMLInputElement>('input[type="hidden"]')?.getAttribute('name') ?? '';
    const hiddenName = (): string => {
      const raw = root.getAttribute('data-eds-name') ?? initialHiddenName;
      if (!raw) return '';
      return raw.endsWith('[]') ? raw : `${raw}[]`;
    };

    const maxText = () => {
      const m = getMessages();
      return maxSelected === 1
        ? m.comboMaxReachedOne
        : format(m.comboMaxReached, { max: maxSelected });
    };

    const maxReached = () => maxSelected > 0 && selected.size >= maxSelected;

    const selectionSummary = () => {
      const m = getMessages();
      const count = selected.size;
      return count === 0
        ? m.selectedNone
        : count === 1
          ? m.selectedOne
          : format(m.selectedMany, { count });
    };

    /** `aria-selected` = escolhida; ao atingir o máximo, as demais ficam `aria-disabled`. */
    function syncOptions(): void {
      const full = maxReached();
      for (const option of options()) {
        const chosen = selected.has(valueOf(option));
        option.setAttribute('aria-selected', chosen ? 'true' : 'false');
        if (full && !chosen && option.getAttribute('aria-disabled') !== 'true') {
          option.setAttribute('aria-disabled', 'true');
          option.setAttribute('data-eds-max', '');
        } else if ((!full || chosen) && option.hasAttribute('data-eds-max')) {
          option.removeAttribute('data-eds-max');
          option.removeAttribute('aria-disabled');
        }
      }
    }

    const syncMultiValidity = () => {
      const required = input.getAttribute('aria-required') === 'true' || input.required;
      input.setCustomValidity(
        required && selected.size === 0 ? getMessages().comboMultiRequired : '',
      );
      refreshError();
    };

    const tagsList = (): HTMLElement | null => {
      const existing = root.querySelector<HTMLElement>('.eds-combobox-tags');
      if (existing || !control) return existing;
      const ul = document.createElement('ul');
      ul.className = 'eds-combobox-tags';
      control.insertBefore(ul, input);
      return ul;
    };

    const removeButtons = () =>
      Array.from(root.querySelectorAll<HTMLButtonElement>('.eds-combobox-tag-remove'));

    const renderTags = () => {
      const ul = tagsList();
      if (!ul) return;
      ul.textContent = '';
      ul.hidden = selected.size === 0;
      for (const [value, label] of selected) {
        const li = document.createElement('li');
        li.className = 'eds-combobox-tag';
        li.setAttribute('data-value', value);
        const text = document.createElement('span');
        text.textContent = label;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'eds-combobox-tag-remove';
        button.disabled = input.disabled;
        button.setAttribute('aria-label', format(getMessages().comboTagRemove, { label }));
        button.append(closeIcon());
        li.append(text, button);
        ul.append(li);
      }
    };

    const renderHidden = () => {
      const name = hiddenName();
      for (const h of root.querySelectorAll('input[type="hidden"]')) h.remove();
      for (const value of selected.keys()) {
        const h = document.createElement('input');
        h.type = 'hidden';
        h.name = name;
        h.value = value;
        popup.before(h);
      }
    };

    const commitMultiple = () => {
      renderHidden();
      renderTags();
      syncOptions();
      syncMultiValidity();
      root.dispatchEvent(new Event('input', { bubbles: true }));
      root.dispatchEvent(new Event('change', { bubbles: true }));
      emit(root, 'combobox-change', {
        values: [...selected.keys()],
        labels: [...selected.values()],
      });
    };

    const toggle = (value: string, label: string): boolean => {
      const m = getMessages();
      if (selected.has(value)) {
        selected.delete(value);
        commitMultiple();
        announce(`${format(m.comboMultiRemoved, { label })} ${selectionSummary()}`);
        return true;
      }
      if (maxReached()) {
        announce(maxText());
        return false;
      }
      selected.set(value, label);
      commitMultiple();
      const limit = maxReached() ? ` ${maxText()}` : '';
      announce(`${format(m.comboMultiSelected, { label })} ${selectionSummary()}${limit}`);
      return true;
    };

    const clearText = () => {
      input.value = '';
      if (!source) {
        filterLocal('');
        refreshEmpty();
      }
    };

    const selectMultiple = (option: HTMLElement) => {
      if (option.hasAttribute('data-eds-max')) {
        announce(maxText());
        return;
      }
      if (option.getAttribute('aria-disabled') === 'true') return;
      toggle(valueOf(option), labelOf(option));
      clearText();
      if (!open) openPopup();
      position();
    };

    const removeFromTag = (button: HTMLButtonElement) => {
      const li = button.closest<HTMLElement>('.eds-combobox-tag');
      const value = li?.getAttribute('data-value');
      if (value === null || value === undefined || !selected.has(value)) return;
      const buttons = removeButtons();
      const index = buttons.indexOf(button);
      toggle(value, selected.get(value) ?? value);
      const remaining = removeButtons();
      // Próximo botão de remover (mesma posição); senão o input.
      const next = remaining[index] ?? null;
      (next ?? input).focus();
    };

    const select = (option: HTMLElement) => {
      if (multiple) {
        selectMultiple(option);
        return;
      }
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
        filterLocal(!multiple && chosen && labelOf(chosen) === input.value ? '' : input.value);
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
        if (multiple) {
          // O texto é só busca: as escolhas ficam nas etiquetas.
        } else if (freeText) {
          // Texto livre: o hidden acompanha o que foi digitado.
          commit(input.value, input.value);
        } else if (currentValue !== '') {
          // Editar o texto depois de escolher desfaz a escolha.
          commit('', '');
        }
        if (!multiple) syncValidity();
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
              flagUnchosen();
            } else if (input.validity.customError) {
              flagUnchosen();
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
              // Múltiplo: limpa só o texto, nunca as etiquetas.
              if (!multiple) {
                if (currentValue !== '') commit('', '');
                syncValidity();
              }
              if (!source) filterLocal('');
            }
            break;
          case 'Backspace':
            if (multiple && input.value === '' && selected.size > 0) {
              event.preventDefault();
              const last = [...selected.entries()].pop();
              if (last) toggle(last[0], last[1]);
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
        flagUnchosen();
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

    let disabledObserver: MutationObserver | null = null;
    if (multiple) {
      disabledObserver = new MutationObserver(() => {
        for (const button of removeButtons()) button.disabled = input.disabled;
      });
      disabledObserver.observe(input, { attributes: true, attributeFilter: ['disabled'] });
      listbox.setAttribute('aria-multiselectable', 'true');
      control?.addEventListener(
        'click',
        (event) => {
          const target = event.target as Element;
          const button = target.closest<HTMLButtonElement>('.eds-combobox-tag-remove');
          if (button) {
            if (!input.disabled) removeFromTag(button);
          } else if (!input.disabled && target !== input) input.focus();
        },
        { signal },
      );
    }

    if (multiple) {
      // Estado inicial: hidden(s) com valor, depois opções marcadas; rótulo da opção, da etiqueta
      // existente (mesma posição) ou o próprio valor.
      const tagLabels = Array.from(root.querySelectorAll('.eds-combobox-tag > span')).map((s) =>
        (s.textContent ?? '').trim(),
      );
      const initial = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="hidden"]'))
        .map((h) => h.value)
        .filter((v) => v !== '');
      for (const option of options()) {
        if (option.getAttribute('aria-selected') === 'true' && !initial.includes(valueOf(option))) {
          initial.push(valueOf(option));
        }
      }
      initial.forEach((value, index) => {
        const option = options().find((o) => valueOf(o) === value);
        selected.set(value, option ? labelOf(option) : (tagLabels[index] ?? value));
      });
      renderHidden();
      renderTags();
      syncOptions();
      syncMultiValidity();
    } else if (currentValue !== '') {
      // Estado inicial: valor do hidden -> texto e marca de "escolhida".
      markCurrent();
      const chosen = options().find((o) => o.hasAttribute('data-current'));
      if (chosen && input.value === '') input.value = labelOf(chosen);
    }
    if (safeMatches(popup, ':popover-open')) hidePopover(popup);
    if (!multiple) syncValidity();

    return () => {
      disabledObserver?.disconnect();
      announcer.dispose();
      input.setCustomValidity('');
      clearError();
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
