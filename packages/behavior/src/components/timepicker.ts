import { format, getMessages } from '../core/config';
import {
  describeBy,
  emit,
  ensureId,
  hidePopover,
  safeMatches,
  showPopover,
  uid,
} from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

const DEFAULT_STEP = 30;
const MINUTES_IN_DAY = 24 * 60;

/** "08:30" -> 510 (minutos desde 00:00); `null` se não for hh:mm válido (00:00 a 23:59). */
export function parseTime(text: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const mi = Number(match[2]);
  return h <= 23 && mi <= 59 ? h * 60 + mi : null;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, '0')}:${String(minutes - h * 60).padStart(2, '0')}`;
}

/** Máscara hh:mm: só dígitos (até 4), dois-pontos automático; hora iniciada em 3 a 9 vira 0h. */
export function maskTime(raw: string): string {
  // "14h30", "14.30" e "2:30" colados.
  const pasted = /^\s*(\d{1,2})\s*[:h.]\s*(\d{2})\s*$/.exec(raw);
  let digits = pasted
    ? `${pasted[1]?.padStart(2, '0') ?? ''}${pasted[2] ?? ''}`
    : raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 1 && Number(digits) > 2) digits = `0${digits}`;
  if (digits.length <= 2) return digits.length === 2 && raw.endsWith(':') ? `${digits}:` : digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * TimePicker: campo `hh:mm` com máscara + lista de horários (`data-eds-step` em minutos,
 * `data-eds-min`/`data-eds-max` `HH:MM`) no padrão APG combobox com listbox: o foco fica no
 * campo, `aria-activedescendant` aponta o horário, setas movem, Enter escolhe, Esc fecha. O
 * valor `HH:MM` vai no `input[type=hidden]` (ou no próprio campo, sem hidden). Evento
 * `eds:time-change` com `detail { value, minutes }` (`value` vazio sem horário).
 */
export const timepickerBehavior: Behavior = {
  name: 'timepicker',
  selector: '[data-eds-timepicker]',
  bind(root) {
    const input = root.querySelector<HTMLInputElement>('input:not([type="hidden"])');
    const hidden = root.querySelector<HTMLInputElement>('input[type="hidden"]');
    const toggle = root.querySelector<HTMLButtonElement>('.eds-timepicker-toggle');
    const popup = root.querySelector<HTMLElement>('.eds-timepicker-popup, [popover]');
    if (!input || !popup) return;
    let listbox = popup.querySelector<HTMLElement>('[role="listbox"]');
    if (!listbox) {
      listbox = popup.ownerDocument.createElement('ul');
      listbox.className = 'eds-timepicker-listbox';
      listbox.setAttribute('role', 'listbox');
      popup.append(listbox);
    }
    const list = listbox;
    const field = input;
    const m = () => getMessages();
    const ac = new AbortController();
    const { signal } = ac;

    let status = root.querySelector<HTMLElement>('[role="status"]');
    if (!status) {
      status = root.ownerDocument.createElement('span');
      status.className = 'eds-visually-hidden';
      status.setAttribute('role', 'status');
      root.append(status);
    }
    const announcer = createAnnouncer(status);

    // A máscara hh:mm é do próprio TimePicker (vale também na compilação sem máscara): um
    // `data-eds-mask="hora"` no campo é dispensado para as duas não disputarem o valor.
    field.removeAttribute('data-eds-mask');

    // ---- ARIA do combobox ------------------------------------------------------------------
    field.setAttribute('role', 'combobox');
    field.setAttribute('aria-autocomplete', 'none');
    field.setAttribute('aria-haspopup', 'listbox');
    field.setAttribute('aria-expanded', 'false');
    field.setAttribute('aria-controls', ensureId(list, 'time-list'));
    if (!field.hasAttribute('autocomplete')) field.setAttribute('autocomplete', 'off');
    if (!field.hasAttribute('inputmode')) field.setAttribute('inputmode', 'numeric');
    if (!field.hasAttribute('maxlength')) field.setAttribute('maxlength', '5');
    if (!field.hasAttribute('placeholder')) field.setAttribute('placeholder', 'hh:mm');
    if (!list.hasAttribute('aria-label') && !list.hasAttribute('aria-labelledby')) {
      list.setAttribute('aria-label', m().timeList);
    }
    const toggleBase = toggle?.getAttribute('aria-label') ?? m().timeChoose;
    if (toggle) {
      toggle.setAttribute('tabindex', '-1');
      toggle.setAttribute('aria-haspopup', 'listbox');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', list.id);
    }

    // ---- Regras (lidas a cada uso: o servidor pode trocar os atributos) -------------------------
    const step = () => {
      const n = Math.floor(Number(root.getAttribute('data-eds-step')));
      return Number.isFinite(n) && n >= 1 && n <= 720 ? n : DEFAULT_STEP;
    };
    const minMinutes = () => parseTime(root.getAttribute('data-eds-min') ?? '') ?? 0;
    const maxMinutes = () =>
      parseTime(root.getAttribute('data-eds-max') ?? '') ?? MINUTES_IN_DAY - 1;
    const inRange = (minutes: number) => minutes >= minMinutes() && minutes <= maxMinutes();

    const rangeMessage = () => {
      const lo = root.hasAttribute('data-eds-min') ? formatTime(minMinutes()) : null;
      const hi = root.hasAttribute('data-eds-max') ? formatTime(maxMinutes()) : null;
      if (lo && hi) return format(m().timeBetween, { min: lo, max: hi });
      if (lo) return format(m().timeFrom, { min: lo });
      return format(m().timeUntil, { max: hi ?? '' });
    };

    // ---- Lista -----------------------------------------------------------------------------
    let current: number | null = parseTime(hidden?.value || field.value);
    let open = false;
    let highlighted: HTMLElement | null = null;
    let builtKey = '';

    const buildOptions = () => {
      const key = `${step()}|${minMinutes()}|${maxMinutes()}`;
      if (key === builtKey) return;
      builtKey = key;
      list.textContent = '';
      const doc = list.ownerDocument;
      const lo = minMinutes();
      // A grade parte do mínimo (ou da meia-noite) e anda de `step` em `step`.
      for (let t = lo; t <= maxMinutes(); t += step()) {
        const li = doc.createElement('li');
        li.id = uid('time-opt');
        li.className = 'eds-timepicker-option';
        li.setAttribute('role', 'option');
        li.setAttribute('data-value', formatTime(t));
        li.textContent = formatTime(t);
        list.append(li);
      }
    };

    const options = () => Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));

    const setHighlight = (option: HTMLElement | null, scroll = true) => {
      if (highlighted && highlighted !== option) highlighted.removeAttribute('aria-selected');
      highlighted = option;
      if (option) {
        option.setAttribute('aria-selected', 'true');
        field.setAttribute('aria-activedescendant', option.id);
        if (scroll && typeof option.scrollIntoView === 'function') {
          option.scrollIntoView({ block: 'nearest' });
        }
      } else field.removeAttribute('aria-activedescendant');
    };

    const markCurrent = () => {
      for (const option of options()) {
        if (current !== null && option.getAttribute('data-value') === formatTime(current)) {
          option.setAttribute('data-current', '');
        } else option.removeAttribute('data-current');
      }
    };

    /** Destaca o horário atual ou o primeiro da grade que vem depois do digitado. */
    const highlightNearest = () => {
      const typed = parseTime(field.value) ?? current;
      const all = options();
      const target =
        typed === null
          ? all[0]
          : (all.find((o) => (parseTime(o.getAttribute('data-value') ?? '') ?? -1) >= typed) ??
            all[all.length - 1]);
      setHighlight(target ?? null);
    };

    // ---- Posição ---------------------------------------------------------------------------
    const position = () => {
      if (!open) return;
      const rect = field.getBoundingClientRect();
      const height = popup.getBoundingClientRect().height;
      const below = window.innerHeight - rect.bottom;
      const top = height > below && rect.top > below;
      popup.style.setProperty('--_timepicker-x', `${Math.round(rect.left)}px`);
      popup.style.setProperty('--_timepicker-width', `${Math.round(rect.width)}px`);
      popup.style.setProperty('--_timepicker-y', `${Math.round(top ? rect.top : rect.bottom)}px`);
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
      if (open || field.readOnly || field.disabled) return;
      buildOptions();
      if (options().length === 0) {
        announcer.say(m().timeEmpty);
        return;
      }
      open = true;
      field.setAttribute('aria-expanded', 'true');
      toggle?.setAttribute('aria-expanded', 'true');
      showPopover(popup);
      markCurrent();
      position();
      highlightNearest();
      window.addEventListener('resize', onViewport);
      window.addEventListener('scroll', onViewport, true);
    };
    const closePopup = () => {
      if (!open) return;
      open = false;
      setHighlight(null);
      field.setAttribute('aria-expanded', 'false');
      toggle?.setAttribute('aria-expanded', 'false');
      hidePopover(popup);
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('scroll', onViewport, true);
      if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
      frame = 0;
    };

    // ---- Erro visível e associado (3.3.1) ---------------------------------------------------
    let errorEl: HTMLElement | null = null;
    let ownsError = true;
    const showError = (message: string) => {
      if (message === '') return;
      field.setAttribute('aria-invalid', 'true');
      if (!errorEl) {
        // Um `p.eds-error` que o autor já escreveu depois do campo é reaproveitado.
        const authored = root.nextElementSibling;
        if (authored instanceof HTMLElement && authored.matches('p.eds-error')) {
          errorEl = authored;
          ownsError = false;
          if (!errorEl.id) errorEl.id = `${ensureId(field, 'time')}-err`;
          errorEl.hidden = false;
        } else {
          errorEl = root.ownerDocument.createElement('p');
          errorEl.className = 'eds-error';
          errorEl.id = `${ensureId(field, 'time')}-err`;
          root.after(errorEl);
          ownsError = true;
        }
      }
      describeBy(field, errorEl.id, true);
      if (errorEl.textContent !== message) {
        errorEl.textContent = message;
        announcer.say(message);
      }
    };
    const clearError = () => {
      if (!errorEl) return;
      describeBy(field, errorEl.id, false);
      if (ownsError) errorEl.remove();
      else errorEl.hidden = true;
      errorEl = null;
      field.removeAttribute('aria-invalid');
    };
    field.addEventListener('invalid', () => showError(field.validationMessage), { signal });

    // ---- Valor ---------------------------------------------------------------------------------
    const syncLabel = () => {
      if (!toggle) return;
      toggle.setAttribute(
        'aria-label',
        current === null
          ? toggleBase
          : format(m().timeCurrent, { label: toggleBase, value: formatTime(current) }),
      );
    };

    const validityFor = (text: string): { minutes: number | null; error: string } => {
      if (text === '') return { minutes: null, error: '' };
      const minutes = parseTime(text);
      if (minutes === null) return { minutes: null, error: m().maskInvalidTime };
      if (!inRange(minutes)) return { minutes: null, error: rangeMessage() };
      return { minutes, error: '' };
    };

    /** Aplica o texto do campo: valida, grava o hidden e avisa a mudança. */
    const commit = (opts: { report: boolean }) => {
      const text = field.value.trim();
      const { minutes, error } = validityFor(text);
      // Texto incompleto enquanto digita não é erro: só ao sair do campo ou escolher.
      const incomplete = text !== '' && text.length < 5 && minutes === null;
      field.setCustomValidity(incomplete && !opts.report ? '' : error);
      if (error === '' || (incomplete && !opts.report)) clearError();
      else if (opts.report) showError(error);
      const next = minutes;
      if (hidden) hidden.value = next === null ? '' : formatTime(next);
      if (next === current) return;
      current = next;
      markCurrent();
      syncLabel();
      const value = next === null ? '' : formatTime(next);
      if (hidden) {
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }
      emit(root, 'time-change', { value, minutes: next });
    };

    const choose = (option: HTMLElement) => {
      const value = option.getAttribute('data-value') ?? '';
      field.value = value;
      commit({ report: true });
      closePopup();
      announcer.say(format(m().timeSelected, { time: value }));
    };

    // ---- Digitação -------------------------------------------------------------------------------
    field.addEventListener(
      'input',
      () => {
        const raw = field.value;
        const caret = field.selectionStart ?? raw.length;
        const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
        const masked = maskTime(raw);
        if (masked !== raw) {
          field.value = masked;
          let seen = 0;
          let pos = 0;
          // Digitando no fim ("9" vira "09"): o cursor fica no fim, não entre o zero automático e o 9.
          if (caret >= raw.length) pos = masked.length;
          else {
            while (pos < masked.length && seen < digitsBefore) {
              if (/\d/.test(masked[pos] ?? '')) seen += 1;
              pos += 1;
            }
            // Depois do último dígito antes de ":" o cursor passa dos dois-pontos.
            if (masked[pos] === ':' && pos === masked.indexOf(':')) pos += 1;
          }
          field.setSelectionRange?.(pos, pos);
        }
        commit({ report: false });
        if (open) highlightNearest();
      },
      { signal },
    );
    field.addEventListener(
      'blur',
      () => {
        // Foco indo para a lista não existe (o foco fica no campo): sair é terminar de digitar.
        commit({ report: true });
        closePopup();
      },
      { signal },
    );

    field.addEventListener(
      'keydown',
      (event) => {
        if (event.isComposing) return;
        const all = options();
        const at = highlighted ? all.indexOf(highlighted) : -1;
        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowUp': {
            event.preventDefault();
            if (!open) {
              openPopup();
              return;
            }
            if (event.altKey && event.key === 'ArrowUp') {
              closePopup();
              return;
            }
            const down = event.key === 'ArrowDown';
            const next = at === -1 ? (down ? 0 : all.length - 1) : at + (down ? 1 : -1);
            setHighlight(all[Math.max(0, Math.min(all.length - 1, next))] ?? null);
            break;
          }
          case 'PageDown':
          case 'PageUp':
            if (open) {
              event.preventDefault();
              const jump = event.key === 'PageDown' ? 8 : -8;
              setHighlight(all[Math.max(0, Math.min(all.length - 1, at + jump))] ?? null);
            }
            break;
          case 'Home':
          case 'End':
            if (open && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              setHighlight((event.key === 'Home' ? all[0] : all[all.length - 1]) ?? null);
            }
            break;
          case 'Enter':
            if (open && highlighted) {
              event.preventDefault();
              choose(highlighted);
            }
            break;
          case 'Escape':
            if (open) {
              // Fecha só a lista (o diálogo em volta, se houver, não deve fechar junto).
              event.preventDefault();
              event.stopPropagation();
              closePopup();
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

    // O foco fica no campo: o pointerdown nas opções não o tira dali.
    popup.addEventListener('pointerdown', (event) => event.preventDefault(), { signal });
    popup.addEventListener(
      'click',
      (event) => {
        const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
        if (option) choose(option);
      },
      { signal },
    );
    popup.addEventListener(
      'pointermove',
      (event) => {
        const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
        if (option && option !== highlighted) setHighlight(option, false);
      },
      { signal },
    );
    toggle?.addEventListener(
      'click',
      () => {
        if (open) closePopup();
        else {
          field.focus();
          openPopup();
        }
      },
      { signal },
    );
    toggle?.addEventListener('pointerdown', (event) => event.preventDefault(), { signal });
    // Clique fora fecha (o blur do campo já cobre; este cobre o popup aberto sem foco).
    root.ownerDocument.addEventListener(
      'pointerdown',
      (event) => {
        if (!open) return;
        const target = event.target as Node;
        if (!root.contains(target) && !popup.contains(target)) closePopup();
      },
      { signal },
    );

    // O servidor devolve o valor no campo: ele é aceito e aparece formatado.
    if (hidden && hidden.value !== '' && field.value === '') {
      const minutes = parseTime(hidden.value);
      if (minutes !== null) field.value = formatTime(minutes);
    }
    current = parseTime(field.value);
    // Valor inicial fora das regras: o erro já aparece e o hidden fica vazio.
    if (field.value !== '' && validityFor(field.value.trim()).error !== '') {
      current = null;
      commit({ report: true });
    }
    if (hidden) hidden.value = current === null ? '' : formatTime(current);
    syncLabel();

    return () => {
      ac.abort();
      closePopup();
      announcer.dispose();
      clearError();
      if (safeMatches(popup, ':popover-open')) hidePopover(popup);
    };
  },
};

export function initTimepicker(root: ParentNode = document): () => void {
  return bindAll(root, [timepickerBehavior]);
}
