import { format, getLocale, getMessages } from '../core/config';
import {
  addDays,
  addMonths,
  cmp,
  daysInMonth,
  longName,
  make as makeDate,
  monthTitle,
  parseIso,
  today,
  toIso,
  weekday,
  type Ymd,
} from '../core/date';
import { closeIcon, emit, uid } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { popoverBehavior } from './popover';

export type AgendaTone = 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** Evento da agenda. `date` e `end` (inclusive, para vários dias) são `aaaa-mm-dd`. */
export interface AgendaEvent {
  id?: string;
  title: string;
  date: string;
  end?: string;
  /** `HH:MM`; sem hora, o evento é de dia inteiro. */
  time?: string;
  href?: string;
  tone?: AgendaTone;
}

const TONES: readonly string[] = ['accent', 'neutral', 'info', 'success', 'warning', 'danger'];
const DEFAULT_MAX_EVENTS = 3;
const MAX_SPAN_DAYS = 62;

type FetchInit = RequestInit & { edsLoader?: false };

function cleanEvent(raw: unknown): AgendaEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.title !== 'string' || typeof r.date !== 'string') return null;
  if (parseIso(r.date) === null) return null;
  const end = typeof r.end === 'string' && parseIso(r.end) !== null ? r.end : undefined;
  const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
  return {
    id: r.id !== undefined ? String(r.id) : undefined,
    title: r.title,
    date: r.date,
    end,
    time: str(r.time),
    href: str(r.href),
    tone: typeof r.tone === 'string' && TONES.includes(r.tone) ? (r.tone as AgendaTone) : undefined,
  };
}

/** Datas (ISO) de cada dia coberto pelo evento, limitadas ao período visível. */
function spanOf(event: AgendaEvent, from: Ymd, to: Ymd): string[] {
  const start = parseIso(event.date);
  if (!start) return [];
  let last = parseIso(event.end ?? event.date) ?? start;
  if (cmp(last, start) < 0) last = start;
  const days: string[] = [];
  let at = start;
  for (let i = 0; i <= MAX_SPAN_DAYS && cmp(at, last) <= 0; i += 1) {
    if (cmp(at, from) >= 0 && cmp(at, to) <= 0) days.push(toIso(at));
    const next = addDays(at, 1);
    if (!next) break;
    at = next;
  }
  return days;
}

const chevron = (direction: 'left' | 'right'): SVGSVGElement => {
  const svg = closeIcon();
  svg
    .querySelector('path')
    ?.setAttribute('d', direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6');
  return svg;
};

/**
 * Agenda mensal (`.eds-agenda[data-eds-agenda]`): grade de mês como `<table class="eds-agenda-grid">`
 * (cabeçalhos `th scope="col"`, legenda oculta), navegação mês anterior, próximo e hoje (botões
 * `[data-eds-agenda-prev|next|today]`, criados se faltarem), título em `aria-live`, hoje com
 * `aria-current="date"`, eventos como link (com `href`) ou botão e "+N mais" abrindo o Popover.
 * Eventos em `<script type="application/json" data-eds-agenda-events>` ou, a cada mês, de
 * `data-eds-source` (`{from}` e `{to}` em `aaaa-mm-dd` na URL). Mês inicial em `data-eds-agenda-month`
 * (`aaaa-mm`; padrão: o atual), início da semana em `data-eds-week-start` (0 = domingo) e
 * `data-eds-max-events` por dia. Grade escrita pelo servidor e sem dados no cliente: o JS só liga
 * a navegação e avisa (`eds:agenda-month-change`), sem apagar a grade. Eventos:
 * `eds:agenda-month-change` (`detail { year, month, from, to }`, mês de 1 a 12) e
 * `eds:agenda-event-click` (`detail { id, title, date, item }`).
 */
export const agendaBehavior: Behavior = {
  name: 'agenda',
  selector: '[data-eds-agenda]',
  bind(root) {
    const doc = root.ownerDocument;
    const ac = new AbortController();
    const { signal } = ac;
    const m = () => getMessages();
    const created: HTMLElement[] = [];

    const make = <K extends keyof HTMLElementTagNameMap>(
      tag: K,
      className?: string,
    ): HTMLElementTagNameMap[K] => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      return node;
    };

    if (!root.classList.contains('eds-agenda')) root.classList.add('eds-agenda');

    const source = root.getAttribute('data-eds-source');
    const script = root.querySelector<HTMLScriptElement>(
      'script[type="application/json"][data-eds-agenda-events]',
    );
    let events: AgendaEvent[] = [];
    if (script) {
      try {
        const data: unknown = JSON.parse(script.textContent ?? '[]');
        events = (Array.isArray(data) ? data : [])
          .map(cleanEvent)
          .filter((e): e is AgendaEvent => e !== null);
      } catch {
        events = [];
      }
    }

    const weekStart = () => {
      const n = Math.floor(Number(root.getAttribute('data-eds-week-start') ?? 0));
      return n >= 0 && n <= 6 ? n : 0;
    };
    const maxEvents = () => {
      const n = Math.floor(Number(root.getAttribute('data-eds-max-events') ?? DEFAULT_MAX_EVENTS));
      return n >= 1 ? n : DEFAULT_MAX_EVENTS;
    };

    const initial = /^(\d{4})-(\d{2})$/.exec(root.getAttribute('data-eds-agenda-month') ?? '');
    const start = initial ? makeDate(Number(initial[1]), Number(initial[2]) - 1, 1) : null;
    let view: { y: number; m: number } = start
      ? { y: start.y, m: start.m }
      : { y: today().y, m: today().m };

    // ---- Estrutura: o que o autor escreveu é usado; o que falta é criado ----------------------
    const authoredGrid = root.querySelector<HTMLTableElement>('.eds-agenda-grid');
    // Grade do servidor sem dados no cliente: o JS não a reescreve.
    const staticGrid = authoredGrid !== null && !script && !source;

    let header = root.querySelector<HTMLElement>('.eds-agenda-header');
    if (!header) {
      header = make('div', 'eds-agenda-header');
      root.prepend(header);
      created.push(header);
    }
    let title = header.querySelector<HTMLElement>('.eds-agenda-title');
    if (!title) {
      title = make('h3', 'eds-agenda-title');
      title.setAttribute('aria-live', 'polite');
      header.prepend(title);
    }
    let nav = header.querySelector<HTMLElement>('.eds-agenda-nav');
    if (!nav) {
      nav = make('div', 'eds-agenda-nav');
      header.append(nav);
    }
    const navButton = (
      attr: string,
      label: string,
      icon: SVGSVGElement | null,
    ): HTMLButtonElement => {
      const found = root.querySelector<HTMLButtonElement>(`[${attr}]`);
      if (found) return found;
      const b = make('button');
      b.type = 'button';
      b.setAttribute(attr, '');
      if (icon) {
        b.className = 'eds-button eds-button-ghost eds-button-icon eds-button-sm';
        b.setAttribute('aria-label', label);
        b.append(icon);
      } else {
        b.className = 'eds-button eds-button-secondary eds-button-sm';
        b.textContent = label;
      }
      nav.append(b);
      return b;
    };
    const todayButton = navButton('data-eds-agenda-today', m().dateToday, null);
    const prev = navButton('data-eds-agenda-prev', m().datePrevMonth, chevron('left'));
    const next = navButton('data-eds-agenda-next', m().dateNextMonth, chevron('right'));

    let table = authoredGrid;
    if (!table) {
      table = make('table', 'eds-agenda-grid');
      header.after(table);
      created.push(table);
    }
    const grid = table;
    let thead = grid.querySelector('thead');
    if (!thead) {
      thead = make('thead');
      grid.prepend(thead);
    }
    let tbody = grid.querySelector('tbody');
    if (!tbody) {
      tbody = make('tbody');
      grid.append(tbody);
    }
    let caption = grid.querySelector('caption');
    if (!caption) {
      caption = make('caption', 'eds-visually-hidden');
      grid.prepend(caption);
    }
    let emptyNote = root.querySelector<HTMLElement>('.eds-agenda-empty');
    if (!emptyNote) {
      emptyNote = make('p', 'eds-agenda-empty');
      emptyNote.textContent = m().agendaEmpty;
      grid.after(emptyNote);
      created.push(emptyNote);
    }
    const head = thead;
    const body = tbody;

    // Nomes de dia da semana no locale em vigor.
    const dayHeads = (): void => {
      const locale = getLocale();
      const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
      const long = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
      const row = make('tr');
      for (let i = 0; i < 7; i += 1) {
        const dow = (weekStart() + i) % 7;
        const date = new Date(Date.UTC(2024, 0, 7 + dow)); // 07/01/2024 é domingo
        const th = make('th');
        th.scope = 'col';
        const abbr = make('abbr');
        abbr.title = long.format(date);
        abbr.textContent = short.format(date);
        th.append(abbr);
        row.append(th);
      }
      head.textContent = '';
      head.append(row);
    };

    // ---- Eventos -------------------------------------------------------------------------
    const itemFor = (event: AgendaEvent, day: string): HTMLLIElement => {
      const li = make('li');
      const control = event.href
        ? make('a', 'eds-agenda-event')
        : make('button', 'eds-agenda-event');
      if (control instanceof HTMLAnchorElement && event.href) control.href = event.href;
      if (control instanceof HTMLButtonElement) control.type = 'button';
      if (event.tone && event.tone !== 'accent')
        control.classList.add(`eds-agenda-event-${event.tone}`);
      if (event.date !== day) control.setAttribute('data-continues', '');
      if (event.id !== undefined) control.setAttribute('data-id', event.id);
      control.setAttribute('data-date', event.date);
      if (event.time) {
        const time = make('span', 'eds-agenda-event-time');
        time.textContent = event.time;
        control.append(time, ' ');
      } else {
        const allDay = make('span', 'eds-visually-hidden');
        allDay.textContent = `${m().agendaEventAllDay}: `;
        control.append(allDay);
      }
      const label = make('span', 'eds-agenda-event-title');
      label.textContent = event.title;
      control.append(label);
      li.append(control);
      return li;
    };

    const byDay = (list: AgendaEvent[], from: Ymd, to: Ymd): Map<string, AgendaEvent[]> => {
      const map = new Map<string, AgendaEvent[]>();
      for (const event of list) {
        for (const day of spanOf(event, from, to)) {
          const bucket = map.get(day) ?? [];
          bucket.push(event);
          map.set(day, bucket);
        }
      }
      for (const bucket of map.values()) {
        // Dia inteiro primeiro, depois por hora; estável.
        bucket.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
      }
      return map;
    };

    // ---- Grade ---------------------------------------------------------------------------
    let range: { from: Ymd; to: Ymd } = { from: today(), to: today() };

    const computeRange = () => {
      const first = makeDate(view.y, view.m, 1) ?? today();
      const lead = (weekday(first) - weekStart() + 7) % 7;
      const gridStart = addDays(first, -lead) ?? first;
      const weeks = Math.ceil((lead + daysInMonth(view.y, view.m)) / 7);
      const gridEnd = addDays(gridStart, weeks * 7 - 1) ?? gridStart;
      range = { from: gridStart, to: gridEnd };
      return { gridStart, weeks };
    };

    const render = () => {
      const locale = getLocale();
      const { gridStart, weeks } = computeRange();
      const todayIso = toIso(today());
      const grouped = byDay(events, gridStart, range.to);
      const limit = maxEvents();
      const monthText = monthTitle(view.y, view.m, locale);

      title.textContent = monthText.charAt(0).toLocaleUpperCase(locale) + monthText.slice(1);
      caption.textContent = format(m().agendaGrid, { title: monthText });
      root.setAttribute(
        'data-eds-agenda-month',
        `${String(view.y).padStart(4, '0')}-${String(view.m + 1).padStart(2, '0')}`,
      );
      dayHeads();
      body.textContent = '';
      const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
      let cursor = gridStart;
      for (let w = 0; w < weeks; w += 1) {
        const tr = make('tr');
        for (let d = 0; d < 7; d += 1) {
          const iso = toIso(cursor);
          const td = make('td', 'eds-agenda-day');
          td.setAttribute('data-date', iso);
          if (cursor.m !== view.m) td.setAttribute('data-outside', '');
          const isToday = iso === todayIso;
          if (isToday) td.setAttribute('aria-current', 'date');

          const dayHead = make('div', 'eds-agenda-day-head');
          const weekdayEl = make('span', 'eds-agenda-weekday');
          weekdayEl.textContent = weekdayLong.format(
            new Date(Date.UTC(cursor.y, cursor.m, cursor.d)),
          );
          const dateEl = make('time', 'eds-agenda-date');
          dateEl.dateTime = iso;
          dateEl.textContent = String(cursor.d);
          dayHead.append(weekdayEl, dateEl);
          if (isToday) {
            const todayEl = make('span', 'eds-agenda-today');
            todayEl.textContent = m().agendaToday;
            dayHead.append(todayEl);
          }
          td.append(dayHead);

          const list = grouped.get(iso) ?? [];
          if (list.length > 0) {
            const ul = make('ul', 'eds-agenda-events');
            const shown = list.length > limit ? limit - 1 : list.length;
            for (const event of list.slice(0, shown)) ul.append(itemFor(event, iso));
            if (list.length > shown) {
              const hiddenCount = list.length - shown;
              const popId = uid('agenda-more');
              const li = make('li');
              const more = make('button', 'eds-agenda-more');
              more.type = 'button';
              more.setAttribute('popovertarget', popId);
              more.setAttribute('data-eds-popover', 'bottom');
              more.setAttribute('aria-haspopup', 'dialog');
              more.setAttribute('aria-expanded', 'false');
              more.setAttribute(
                'aria-label',
                format(m().agendaMoreLabel, { count: hiddenCount, date: longName(cursor, locale) }),
              );
              more.textContent = format(m().agendaMore, { count: hiddenCount });
              li.append(more);
              ul.append(li);
              const pop = make('div', 'eds-popover');
              pop.id = popId;
              pop.setAttribute('popover', '');
              pop.setAttribute('role', 'dialog');
              const h = make('h4', 'eds-popover-title');
              h.id = `${popId}-t`;
              h.textContent = format(m().agendaMoreTitle, { date: longName(cursor, locale) });
              pop.setAttribute('aria-labelledby', h.id);
              const all = make('ul', 'eds-agenda-events');
              for (const event of list) all.append(itemFor(event, iso));
              pop.append(h, all);
              td.append(ul, pop);
            } else td.append(ul);
          }
          tr.append(td);
          cursor = addDays(cursor, 1) ?? cursor;
        }
        body.append(tr);
      }
    };

    const fromTo = () => ({ from: toIso(range.from), to: toIso(range.to) });

    let controller: AbortController | null = null;
    const load = async () => {
      if (!source) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      root.setAttribute('aria-busy', 'true');
      try {
        const { from, to } = fromTo();
        const url = source
          .replace('{from}', encodeURIComponent(from))
          .replace('{to}', encodeURIComponent(to));
        const init: FetchInit = {
          signal: current.signal,
          headers: { Accept: 'application/json' },
          edsLoader: false,
        };
        const response = await fetch(url, init);
        if (!response.ok) throw new Error(String(response.status));
        const data: unknown = await response.json();
        if (current.signal.aborted) return;
        events = (Array.isArray(data) ? data : [])
          .map(cleanEvent)
          .filter((e): e is AgendaEvent => e !== null);
        render();
      } catch {
        if (current.signal.aborted) return;
        events = [];
        render();
      } finally {
        if (controller === current) {
          controller = null;
          root.removeAttribute('aria-busy');
        }
      }
    };

    const goTo = (y: number, mo: number) => {
      const target = addMonths({ y, m: mo, d: 1 }, 0);
      if (!target) return;
      view = { y: target.y, m: target.m };
      if (staticGrid) computeRange();
      else render();
      const { from, to } = fromTo();
      emit(root, 'agenda-month-change', { year: view.y, month: view.m + 1, from, to });
      void load();
    };

    const shift = (delta: number) => {
      const target = addMonths({ y: view.y, m: view.m, d: 1 }, delta);
      if (target) goTo(target.y, target.m);
    };

    prev.addEventListener('click', () => shift(-1), { signal });
    next.addEventListener('click', () => shift(1), { signal });
    todayButton.addEventListener('click', () => goTo(today().y, today().m), { signal });

    root.addEventListener(
      'click',
      (event) => {
        const link = (event.target as Element).closest<HTMLElement>('.eds-agenda-event');
        if (!link || !root.contains(link)) return;
        emit(root, 'agenda-event-click', {
          id: link.getAttribute('data-id'),
          title: link.querySelector('.eds-agenda-event-title')?.textContent ?? '',
          date: link.getAttribute('data-date'),
          item: link,
        });
      },
      { signal },
    );

    if (staticGrid) computeRange();
    else render();
    // Grade escrita pelo servidor: o "+N mais" precisa de data-eds-popover para o balão ser posicionado.
    for (const more of grid.querySelectorAll(
      '.eds-agenda-more[popovertarget]:not([data-eds-popover])',
    )) {
      more.setAttribute('data-eds-popover', 'bottom');
    }
    const stopPopover = bindAll(grid, [popoverBehavior]);
    void load();

    return () => {
      ac.abort();
      controller?.abort();
      stopPopover();
      for (const node of created) node.remove();
    };
  },
};

export function initAgenda(root: ParentNode = document): () => void {
  return bindAll(root, [agendaBehavior]);
}
