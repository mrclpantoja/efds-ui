import { format, getMessages } from '../core/config';
import {
  addDays,
  addMonths,
  cmp,
  daysInMonth,
  diffDays,
  inYearRange,
  longName,
  make,
  maskInput,
  monthName,
  monthTitle,
  parseAny,
  parseIso,
  same,
  toBr,
  toDate,
  toIso,
  today,
  weekday,
  weekdayNames,
  type Ymd,
} from '../core/date';
import {
  describeBy,
  emit,
  ensureId,
  FOCUSABLE,
  hidePopover,
  safeMatches,
  showPopover,
} from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

const YEARS_BACK = 100;
const YEARS_AHEAD = 50;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

interface Cell {
  el: HTMLElement;
  date: Ymd;
  label: string;
}

/**
 * Núcleo dos dois comportamentos: campo de texto com máscara dd/mm/aaaa, campo hidden ISO,
 * validação nativa (`setCustomValidity`) e o calendário (APG "Date Picker Dialog") montado pelo JS
 * dentro do `.eds-calendar` (`popover="manual"`, posicionado por `--_calendar-x/-y`).
 * `range` = dois campos (início e fim), um mês por vez, primeiro clique = início, segundo = fim.
 */
function bindPicker(root: HTMLElement, range: boolean): (() => void) | void {
  const texts = Array.from(root.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'));
  const hiddens = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="hidden"]'));
  const toggle = root.querySelector<HTMLButtonElement>('.eds-datepicker-toggle');
  const calendar = root.querySelector<HTMLElement>('.eds-calendar');
  const count = range ? 2 : 1;
  if (texts.length < count || !toggle || !calendar) return;
  const fields = texts.slice(0, count);

  const ac = new AbortController();
  const { signal } = ac;
  const m = () => getMessages();
  const locale = () => m().dateLocale;

  let status = root.querySelector<HTMLElement>('[role="status"]');
  if (!status) {
    status = el('span', 'eds-visually-hidden', { role: 'status' });
    root.append(status);
  }
  const announcer = createAnnouncer(status);
  const announce = announcer.say;

  // ---- Regras de disponibilidade (lidas a cada uso: o servidor pode trocar os atributos) -------
  const minDate = () => parseIso(root.getAttribute('data-eds-min') ?? '');
  const maxDate = () => parseIso(root.getAttribute('data-eds-max') ?? '');
  let blockedRaw = '';
  let blockedSet = new Set<string>();
  const blockedDates = () => {
    const raw = root.getAttribute('data-eds-disabled-dates') ?? '';
    if (raw !== blockedRaw) {
      blockedRaw = raw;
      blockedSet = new Set(
        raw
          .split(/[\s,;]+/)
          .map((part) => parseIso(part))
          .filter((d): d is Ymd => d !== null)
          .map(toIso),
      );
    }
    return blockedSet;
  };
  const weekendsOff = () =>
    root.hasAttribute('data-eds-disable-weekends') &&
    root.getAttribute('data-eds-disable-weekends') !== 'false';
  const maxDays = () =>
    range ? Math.max(0, Math.floor(Number(root.getAttribute('data-eds-max-days')) || 0)) : 0;

  const outOfRange = (a: Ymd) => {
    const lo = minDate();
    const hi = maxDate();
    return (lo !== null && cmp(a, lo) < 0) || (hi !== null && cmp(a, hi) > 0);
  };
  const isBlocked = (a: Ymd) =>
    blockedDates().has(toIso(a)) || (weekendsOff() && [0, 6].includes(weekday(a)));
  const unavailable = (a: Ymd) => outOfRange(a) || isBlocked(a);

  const clampBounds = (a: Ymd): Ymd => {
    const lo = minDate();
    const hi = maxDate();
    if (lo && cmp(a, lo) < 0) return lo;
    if (hi && cmp(a, hi) > 0) return hi;
    return a;
  };

  const rangeMessage = () => {
    const lo = minDate();
    const hi = maxDate();
    if (lo && hi) return format(m().dateBetween, { min: toBr(lo), max: toBr(hi) });
    if (lo) return format(m().dateFrom, { min: toBr(lo) });
    return format(m().dateUntil, { max: hi ? toBr(hi) : '' });
  };
  const dateError = (a: Ymd): string => {
    if (outOfRange(a)) return rangeMessage();
    if (isBlocked(a)) return m().dateBlocked;
    return '';
  };
  const maxDaysMessage = () =>
    maxDays() === 1 ? m().rangeMaxDaysOne : format(m().rangeMaxDays, { max: maxDays() });

  // ---- Valor: texto -> validação -> hidden ISO ------------------------------------------------
  let values: (Ymd | null)[] = fields.map(() => null);
  const flagged = new Set<number>();
  const keyOf = (list: (Ymd | null)[]) => list.map((v) => (v ? toIso(v) : '')).join('|');
  let lastEmitted = '';

  // Erro visível e associado (3.3.1): <p class="eds-error"> logo após o .eds-datepicker.
  const errorEls: (HTMLElement | null)[] = fields.map(() => null);
  const showError = (input: HTMLInputElement, i: number, message: string) => {
    let p = errorEls[i] ?? null;
    if (!p) {
      p = el('p', 'eds-error', { id: `${ensureId(input, 'date')}-err` });
      errorEls[i] = p;
      (i > 0 ? (errorEls[i - 1] ?? root) : root).after(p);
    }
    describeBy(input, p.id, true);
    if (p.textContent !== message) {
      p.textContent = message;
      announce(message);
    }
  };
  const clearError = (input: HTMLInputElement, i: number) => {
    const p = errorEls[i];
    if (!p) return;
    describeBy(input, p.id, false);
    p.remove();
    errorEls[i] = null;
  };

  // Envio com o campo obrigatório vazio (ou inválido): o balão nativo some rápido; o erro fica visível.
  fields.forEach((input, i) => {
    input.addEventListener(
      'invalid',
      () => {
        const message = input.validationMessage;
        if (!message) return;
        input.setAttribute('aria-invalid', 'true');
        flagged.add(i);
        showError(input, i, message);
      },
      { signal },
    );
  });

  const toggleBase =
    toggle.getAttribute('aria-label') ?? (range ? m().rangeChoose : m().dateChoose);
  const syncToggleLabel = () => {
    const [a, b] = values;
    let label = toggleBase;
    if (range && a && b) {
      label = format(m().rangeCurrent, { label: toggleBase, start: toBr(a), end: toBr(b) });
    } else if (!range && a) {
      label = format(m().dateCurrent, { label: toggleBase, value: toBr(a) });
    }
    toggle.setAttribute('aria-label', label);
  };

  const evaluate = (loud: boolean) => {
    const next: (Ymd | null)[] = fields.map(() => null);
    const errors: string[] = fields.map(() => '');
    fields.forEach((input, i) => {
      const raw = input.value.trim();
      if (raw === '') return;
      const parsed = parseAny(raw);
      if (!parsed) {
        errors[i] = /^\d{2}\/\d{2}\/\d{2}$/.test(raw) ? m().dateInvalidShortYear : m().dateInvalid;
        return;
      }
      const error = dateError(parsed);
      if (error) errors[i] = error;
      else next[i] = parsed;
    });
    if (range) {
      const [start, end] = next;
      if (start && end) {
        if (cmp(end, start) < 0) {
          errors[1] = m().rangeEndBeforeStart;
          next[1] = null;
        } else if (maxDays() > 0 && diffDays(start, end) + 1 > maxDays()) {
          errors[1] = maxDaysMessage();
          next[1] = null;
        }
      }
      const filled = fields.map((input) => input.value.trim() !== '');
      if (!errors[0] && !errors[1]) {
        if (filled[0] && !filled[1] && !fields[1]?.required) errors[1] = m().rangeNeedEnd;
        else if (!filled[0] && filled[1] && !fields[0]?.required) errors[0] = m().rangeNeedStart;
      }
    }

    fields.forEach((input, i) => {
      const error = errors[i] ?? '';
      input.setCustomValidity(error);
      if (error && loud) {
        input.setAttribute('aria-invalid', 'true');
        flagged.add(i);
        showError(input, i, error);
      } else if (!error && flagged.has(i)) {
        input.removeAttribute('aria-invalid');
        flagged.delete(i);
        clearError(input, i);
      }
    });

    next.forEach((value, i) => {
      const hidden = hiddens[i];
      const text = value ? toIso(value) : '';
      if (hidden && hidden.value !== text) {
        hidden.value = text;
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    values = next;
    syncToggleLabel();
    const key = keyOf(next);
    if (loud && key !== lastEmitted) {
      lastEmitted = key;
      const start = next[0] ?? null;
      const end = next[1] ?? null;
      if (range) {
        emit(root, 'daterange-change', {
          start: start ? toIso(start) : null,
          end: end ? toIso(end) : null,
        });
      } else {
        emit(root, 'date-change', {
          value: start ? toIso(start) : null,
          date: start ? toDate(start) : null,
        });
      }
    }
    if (isOpen) paint();
  };

  // ---- Máscara e colagem ------------------------------------------------------------------------
  const applyMask = (input: HTMLInputElement) => {
    const raw = input.value;
    const masked = maskInput(raw);
    if (masked === raw) return;
    const caret = input.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    input.value = masked;
    let pos = 0;
    let seen = 0;
    while (pos < masked.length && seen < digitsBefore) {
      if (/\d/.test(masked.charAt(pos))) seen += 1;
      pos += 1;
    }
    if (document.activeElement === input) input.setSelectionRange(pos, pos);
  };

  fields.forEach((input) => {
    if (!input.hasAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
    if (!input.hasAttribute('inputmode')) input.setAttribute('inputmode', 'numeric');
    if (!input.hasAttribute('maxlength')) input.setAttribute('maxlength', '10');
    input.addEventListener(
      'input',
      () => {
        applyMask(input);
        evaluate(false);
        syncViewToText();
      },
      { signal },
    );
    input.addEventListener(
      'paste',
      (event) => {
        const text = event.clipboardData?.getData('text') ?? '';
        const parsed = parseAny(text);
        if (!parsed) return;
        event.preventDefault();
        input.value = toBr(parsed);
        evaluate(false);
        syncViewToText();
      },
      { signal },
    );
    input.addEventListener('change', () => evaluate(true), { signal });
    input.addEventListener('blur', () => evaluate(true), { signal });
    input.addEventListener(
      'keydown',
      (event) => {
        if (event.altKey && event.key === 'ArrowDown') {
          event.preventDefault();
          openCalendar(fields.indexOf(input));
        }
      },
      { signal },
    );
  });

  // ---- Estado do calendário ---------------------------------------------------------------------
  let isOpen = false;
  let view = { y: 2000, m: 0 };
  let focusDate: Ymd = today();
  let pending: Ymd | null = null;
  let hover: Ymd | null = null;
  let cells: Cell[] = [];

  const calId = ensureId(calendar, 'calendar');
  if (!calendar.hasAttribute('role')) calendar.setAttribute('role', 'dialog');
  if (!calendar.hasAttribute('aria-label')) {
    calendar.setAttribute('aria-label', toggleBase);
  }
  if (!toggle.hasAttribute('aria-label')) {
    toggle.setAttribute('aria-label', range ? m().rangeChoose : m().dateChoose);
  }
  calendar.setAttribute('aria-modal', 'true');
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', calId);
  if (!toggle.hasAttribute('type')) toggle.setAttribute('type', 'button');

  // ---- Montagem do calendário ---------------------------------------------------------------------
  calendar.textContent = '';
  const header = el('div', 'eds-calendar-header');
  const prev = el('button', 'eds-calendar-nav', { type: 'button' });
  const next = el('button', 'eds-calendar-nav', { type: 'button' });
  const title = el('h2', 'eds-calendar-title', { id: `${calId}-t`, 'aria-live': 'polite' });
  header.append(prev, title, next);

  const jump = el('div', 'eds-calendar-jump');
  const monthSelect = el('select', 'eds-select eds-select-sm');
  const yearSelect = el('select', 'eds-select eds-select-sm');
  jump.append(monthSelect, yearSelect);

  const grid = el('table', 'eds-calendar-grid', { role: 'grid', 'aria-labelledby': `${calId}-t` });
  const thead = el('thead');
  const headRow = el('tr');
  for (const name of weekdayNames(locale())) {
    const th = el('th', 'eds-calendar-weekday', { scope: 'col', abbr: name.long });
    th.textContent = name.short;
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = el('tbody');
  grid.append(thead, tbody);

  const footer = el('div', 'eds-calendar-footer');
  const todayButton = el('button', 'eds-button eds-button-ghost eds-button-sm', { type: 'button' });
  const closeButton = el('button', 'eds-button eds-button-secondary eds-button-sm', {
    type: 'button',
  });
  footer.append(todayButton, closeButton);
  calendar.append(header, jump, grid, footer);

  const labelTexts = () => {
    const msg = m();
    prev.setAttribute('aria-label', msg.datePrevMonth);
    next.setAttribute('aria-label', msg.dateNextMonth);
    monthSelect.setAttribute('aria-label', msg.dateMonth);
    yearSelect.setAttribute('aria-label', msg.dateYear);
    todayButton.textContent = msg.dateToday;
    closeButton.textContent = msg.dateClose;
  };
  labelTexts();

  const monthAllowed = (y: number, mo: number) => {
    const lo = minDate();
    const hi = maxDate();
    if (lo && cmp({ y, m: mo, d: daysInMonth(y, mo) }, lo) < 0) return false;
    if (hi && cmp({ y, m: mo, d: 1 }, hi) > 0) return false;
    return true;
  };

  let yearsKey = '';
  let baseKey = '';
  let baseYears = { from: 1, to: 9999 };
  const fillYears = () => {
    // Faixa fixa (hoje -100/+50 ou min/max): só muda quando min/max mudam.
    const key = `${root.getAttribute('data-eds-min')}|${root.getAttribute('data-eds-max')}`;
    if (key !== baseKey) {
      baseKey = key;
      const lo = minDate();
      const hi = maxDate();
      const now = today().y;
      baseYears = {
        from: Math.max(1, lo ? lo.y : now - YEARS_BACK),
        to: Math.min(9999, hi ? hi.y : now + YEARS_AHEAD),
      };
    }
    const from = Math.min(baseYears.from, view.y);
    const to = Math.max(baseYears.to, view.y);
    const yearsId = `${from}-${to}`;
    if (yearsId !== yearsKey) {
      yearsKey = yearsId;
      yearSelect.textContent = '';
      for (let y = from; y <= to; y += 1) {
        const option = el('option', undefined, { value: String(y) });
        option.textContent = String(y);
        yearSelect.append(option);
      }
    }
    yearSelect.value = String(view.y);
  };

  let monthsKey = '';
  const fillMonths = () => {
    const key = locale();
    if (key !== monthsKey || monthSelect.options.length !== 12) {
      monthsKey = key;
      monthSelect.textContent = '';
      for (let mo = 0; mo < 12; mo += 1) {
        const option = el('option', undefined, { value: String(mo) });
        option.textContent = monthName(mo, key);
        monthSelect.append(option);
      }
    }
    for (const option of Array.from(monthSelect.options)) {
      option.disabled = !monthAllowed(view.y, Number(option.value));
    }
    monthSelect.value = String(view.m);
  };

  const blockedByLimit = (a: Ymd) => {
    if (!range || !pending || maxDays() === 0) return false;
    return cmp(a, pending) > 0 && diffDays(pending, a) + 1 > maxDays();
  };

  /** Marcas visuais por atributo: escolhido, período, prévia e indisponível. */
  function paint() {
    const todayYmd = today();
    let start: Ymd | null;
    let end: Ymd | null;
    if (range) {
      start = pending ?? values[0] ?? null;
      end = pending ? null : (values[1] ?? null);
    } else {
      start = values[0] ?? null;
      end = null;
    }
    const preview = range && pending ? (hover ?? focusDate) : null;
    const previewOn = pending !== null && preview !== null && cmp(preview, pending) > 0;
    for (const { el: cell, date, label } of cells) {
      const selected =
        start !== null && (end ? cmp(date, start) >= 0 && cmp(date, end) <= 0 : same(date, start));
      if (selected) cell.setAttribute('aria-selected', 'true');
      else cell.removeAttribute('aria-selected');

      let band: string | null = null;
      if (range && start && end && !same(start, end)) {
        if (same(date, start)) band = 'start';
        else if (same(date, end)) band = 'end';
        else if (selected) band = 'middle';
      } else if (range && same(date, start)) {
        band = previewOn ? 'start' : 'single';
      }
      let suffix = '';
      if (range && start && same(date, start)) suffix = m().rangeStartLabel;
      else if (range && end && same(date, end)) suffix = m().rangeEndLabel;
      cell.setAttribute('aria-label', suffix ? `${label}, ${suffix}` : label);
      if (band) cell.setAttribute('data-range', band);
      else cell.removeAttribute('data-range');

      if (previewOn && pending && preview && cmp(date, pending) > 0 && cmp(date, preview) <= 0) {
        cell.setAttribute('data-range-preview', '');
      } else cell.removeAttribute('data-range-preview');

      if (same(date, todayYmd)) cell.setAttribute('aria-current', 'date');
      else cell.removeAttribute('aria-current');

      if (unavailable(date) || blockedByLimit(date)) cell.setAttribute('aria-disabled', 'true');
      else cell.removeAttribute('aria-disabled');
    }
  }

  const updateRoving = () => {
    for (const { el: cell, date } of cells) {
      cell.tabIndex = same(date, focusDate) ? 0 : -1;
    }
  };

  const render = () => {
    title.textContent = monthTitle(view.y, view.m, locale());
    fillMonths();
    fillYears();
    const prevOk = (() => {
      const t = addMonths({ y: view.y, m: view.m, d: 1 }, -1);
      return t !== null && monthAllowed(t.y, t.m);
    })();
    const nextOk = (() => {
      const t = addMonths({ y: view.y, m: view.m, d: 1 }, 1);
      return t !== null && monthAllowed(t.y, t.m);
    })();
    if (prevOk) prev.removeAttribute('aria-disabled');
    else prev.setAttribute('aria-disabled', 'true');
    if (nextOk) next.removeAttribute('aria-disabled');
    else next.setAttribute('aria-disabled', 'true');

    tbody.textContent = '';
    cells = [];
    const lead = weekday({ y: view.y, m: view.m, d: 1 });
    const total = daysInMonth(view.y, view.m);
    const weeks = Math.ceil((lead + total) / 7);
    const loc = locale();
    for (let w = 0; w < weeks; w += 1) {
      const row = el('tr');
      for (let c = 0; c < 7; c += 1) {
        const day = w * 7 + c - lead + 1;
        if (day < 1 || day > total) {
          row.append(el('td'));
          continue;
        }
        const date: Ymd = { y: view.y, m: view.m, d: day };
        const td = el('td', 'eds-calendar-day', {
          tabindex: '-1',
          'data-date': toIso(date),
          'aria-label': longName(date, loc),
        });
        td.textContent = String(day);
        cells.push({ el: td, date, label: longName(date, loc) });
        row.append(td);
      }
      tbody.append(row);
    }
    updateRoving();
    paint();
  };

  const cellOf = (a: Ymd) => cells.find((c) => same(c.date, a))?.el ?? null;

  const setFocusDate = (target: Ymd | null, moveFocus = true) => {
    if (!target || !inYearRange(target)) return;
    const a = clampBounds(target);
    focusDate = a;
    hover = null;
    if (a.y !== view.y || a.m !== view.m) {
      view = { y: a.y, m: a.m };
      render();
    } else {
      updateRoving();
      paint();
    }
    if (moveFocus) cellOf(a)?.focus();
  };

  /** Troca de mês (nav, selects): o dia acompanha, ajustado ao mês e aos limites. */
  const goToMonth = (y: number, mo: number) => {
    const day = Math.min(focusDate.d, daysInMonth(y, mo));
    const target = make(y, mo, day);
    if (!target) return;
    const a = clampBounds(target);
    focusDate = a;
    view = { y: a.y, m: a.m };
    hover = null;
    render();
  };

  // ---- Escolha ---------------------------------------------------------------------------------------
  const choose = (a: Ymd) => {
    if (unavailable(a)) {
      announce(format(m().dateUnavailable, { date: longName(a, locale()) }));
      return;
    }
    if (!range) {
      const input = fields[0];
      if (input) input.value = toBr(a);
      evaluate(true);
      announce(format(m().dateSelected, { date: longName(a, locale()) }));
      closeCalendar(true);
      return;
    }
    if (pending && cmp(a, pending) >= 0 && blockedByLimit(a)) {
      announce(maxDaysMessage());
      return;
    }
    if (!pending || cmp(a, pending) < 0) {
      pending = a;
      announce(format(m().rangeStart, { start: toBr(a) }));
      paint();
      return;
    }
    const [startInput, endInput] = fields;
    if (startInput) startInput.value = toBr(pending);
    if (endInput) endInput.value = toBr(a);
    const first = pending;
    pending = null;
    evaluate(true);
    announce(format(m().rangePeriod, { start: toBr(first), end: toBr(a) }));
    closeCalendar(true);
  };

  /** Texto digitado válido leva a grade para aquele mês (sem mexer no foco). */
  function syncViewToText() {
    if (!isOpen) return;
    const typed = fields.map((input) => parseAny(input.value)).find((d) => d !== null) ?? null;
    if (typed && (typed.y !== view.y || typed.m !== view.m)) {
      focusDate = clampBounds(typed);
      view = { y: focusDate.y, m: focusDate.m };
      render();
    }
  }

  // ---- Posição e abertura -----------------------------------------------------------------------------
  const position = () => {
    if (!isOpen) return;
    const rect = root.getBoundingClientRect();
    const height = calendar.getBoundingClientRect().height;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const top = height > below && above > below;
    calendar.style.setProperty('--_calendar-x', `${Math.round(rect.left)}px`);
    calendar.style.setProperty('--_calendar-y', `${Math.round(top ? rect.top : rect.bottom)}px`);
    if (top) calendar.setAttribute('data-placement', 'top');
    else calendar.removeAttribute('data-placement');
  };
  const onViewportChange = () => position();

  const onDocumentPointer = (event: Event) => {
    if (!root.contains(event.target as Node)) closeCalendar(false);
  };

  const openCalendar = (index = 0) => {
    if (isOpen) return;
    if (fields.some((input) => input.disabled || input.readOnly) || toggle.disabled) return;
    isOpen = true;
    pending = null;
    hover = null;
    const base = values[index] ?? values[0] ?? today();
    focusDate = clampBounds(base);
    view = { y: focusDate.y, m: focusDate.m };
    labelTexts();
    toggle.setAttribute('aria-expanded', 'true');
    showPopover(calendar);
    render();
    position();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    document.addEventListener('pointerdown', onDocumentPointer, true);
    cellOf(focusDate)?.focus();
  };

  const closeCalendar = (returnFocus: boolean) => {
    if (!isOpen) return;
    isOpen = false;
    pending = null;
    hover = null;
    toggle.setAttribute('aria-expanded', 'false');
    hidePopover(calendar);
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('scroll', onViewportChange, true);
    document.removeEventListener('pointerdown', onDocumentPointer, true);
    if (returnFocus) toggle.focus();
  };

  // ---- Eventos do calendário ---------------------------------------------------------------------------
  toggle.addEventListener(
    'click',
    () => {
      if (isOpen) closeCalendar(true);
      else openCalendar(0);
    },
    { signal },
  );

  const shiftView = (delta: 1 | -1) => {
    const t = addMonths({ y: view.y, m: view.m, d: 1 }, delta);
    if (!t || !monthAllowed(t.y, t.m)) return;
    goToMonth(t.y, t.m);
  };
  prev.addEventListener('click', () => shiftView(-1), { signal });
  next.addEventListener('click', () => shiftView(1), { signal });
  const onJump = () => goToMonth(Number(yearSelect.value), Number(monthSelect.value));
  monthSelect.addEventListener('change', onJump, { signal });
  yearSelect.addEventListener('change', onJump, { signal });
  todayButton.addEventListener(
    'click',
    () => {
      const now = today();
      if (unavailable(now)) {
        announce(format(m().dateUnavailable, { date: longName(now, locale()) }));
        setFocusDate(now);
        return;
      }
      choose(now);
    },
    { signal },
  );
  closeButton.addEventListener('click', () => closeCalendar(true), { signal });

  const dayOf = (target: EventTarget | null): Ymd | null => {
    const cell = (target as Element | null)?.closest<HTMLElement>('.eds-calendar-day');
    return cell ? parseIso(cell.getAttribute('data-date') ?? '') : null;
  };

  tbody.addEventListener(
    'click',
    (event) => {
      const date = dayOf(event.target);
      if (!date) return;
      focusDate = date;
      updateRoving();
      choose(date);
    },
    { signal },
  );
  tbody.addEventListener(
    'pointerover',
    (event) => {
      if (!pending) return;
      const date = dayOf(event.target);
      if (date && !same(date, hover)) {
        hover = date;
        paint();
      }
    },
    { signal },
  );
  tbody.addEventListener(
    'pointerleave',
    () => {
      if (hover) {
        hover = null;
        paint();
      }
    },
    { signal },
  );

  tbody.addEventListener(
    'keydown',
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      const current = dayOf(event.target);
      if (!current) return;
      let target: Ymd | null = null;
      switch (event.key) {
        case 'ArrowLeft':
          target = addDays(current, -1);
          break;
        case 'ArrowRight':
          target = addDays(current, 1);
          break;
        case 'ArrowUp':
          target = addDays(current, -7);
          break;
        case 'ArrowDown':
          target = addDays(current, 7);
          break;
        case 'Home':
          target = addDays(current, -weekday(current));
          break;
        case 'End':
          target = addDays(current, 6 - weekday(current));
          break;
        case 'PageUp':
          target = addMonths(current, event.shiftKey ? -12 : -1);
          break;
        case 'PageDown':
          target = addMonths(current, event.shiftKey ? 12 : 1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          choose(current);
          return;
        default:
          return;
      }
      event.preventDefault();
      setFocusDate(target);
    },
    { signal },
  );

  // Tab circula dentro do diálogo; Esc fecha (e não chega ao Modal em volta).
  calendar.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(calendar.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => !item.hidden,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !calendar.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !calendar.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    },
    { signal },
  );
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !isOpen) return;
      event.preventDefault();
      event.stopPropagation();
      closeCalendar(true);
    },
    { signal },
  );

  // ---- Estado inicial e limpeza ---------------------------------------------------------------------------
  fields.forEach((input, i) => {
    const initial = parseAny(hiddens[i]?.value ?? '') ?? parseAny(input.value);
    if (initial) input.value = toBr(initial);
  });
  evaluate(false);
  syncToggleLabel();
  lastEmitted = keyOf(values);
  if (safeMatches(calendar, ':popover-open')) hidePopover(calendar);
  toggle.disabled = fields.some((input) => input.disabled || input.readOnly);

  const observer = new MutationObserver(() => {
    toggle.disabled = fields.some((input) => input.disabled || input.readOnly);
    if (toggle.disabled) closeCalendar(false);
  });
  for (const input of fields)
    observer.observe(input, { attributes: true, attributeFilter: ['disabled', 'readonly'] });

  return () => {
    observer.disconnect();
    ac.abort();
    announcer.dispose();
    closeCalendar(false);
    for (const input of fields) {
      input.setCustomValidity('');
      if (flagged.size > 0) input.removeAttribute('aria-invalid');
    }
    fields.forEach((input, i) => clearError(input, i));
  };
}

/** DatePicker (`data-eds-datepicker`): campo com máscara + calendário em diálogo. */
export const datepickerBehavior: Behavior = {
  name: 'datepicker',
  selector: '[data-eds-datepicker]',
  bind: (root) => bindPicker(root, false),
};

/** DateRangePicker (`data-eds-daterange`): início e fim. */
export const daterangeBehavior: Behavior = {
  name: 'daterange',
  selector: '[data-eds-daterange]',
  bind: (root) => bindPicker(root, true),
};

export function initDatepicker(root: ParentNode = document): () => void {
  return bindAll(root, [datepickerBehavior, daterangeBehavior]);
}
