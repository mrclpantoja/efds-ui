import { forwardRef, useId, useMemo, type HTMLAttributes } from 'react';
import { addDays, addMonths, makeDate, parseIso, toIso } from '../../internal/calendar-shared';
import { ChevronLeftGlyph, ChevronRightGlyph } from '../../internal/glyphs';
import { useControllable } from '../../internal/useControllable';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { useLocale } from '../Locale';
import { Button } from '../Button';
import { Popover } from '../Popover';

export type AgendaTone = 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface AgendaEvent {
  /** Identificador estável (chave e retorno de `onEventClick`). */
  id: string;
  title: string;
  /** Dia do evento, ISO `aaaa-mm-dd`. */
  date: string;
  /** Último dia, inclusive, de um evento de vários dias. */
  end?: string;
  /** `HH:MM`; sem hora, o evento é de dia inteiro. */
  time?: string;
  /** Com `href` o evento é um link; sem, um botão (use `onEventClick`). */
  href?: string;
  /** Padrão: `accent`. */
  tone?: AgendaTone;
}

export interface AgendaTexts {
  previous: string;
  next: string;
  /** Botão que volta ao mês atual. */
  today: string;
  /** Marca do dia de hoje (aparece em contêiner estreito; o leitor de tela a lê sempre). */
  todayMark: string;
  /** Legenda da grade (recebe o título do mês). */
  grid: (title: string) => string;
  /** Botão "+N mais". */
  more: (count: number) => string;
  /** Nome acessível do "+N mais" (recebe a quantidade e a data por extenso). */
  moreLabel: (count: number, date: string) => string;
  /** Título do painel com todos os eventos do dia (recebe a data por extenso). */
  moreTitle: (date: string) => string;
  /** Texto oculto dos eventos sem hora. */
  allDay: string;
  /** Aviso de mês sem eventos (contêiner estreito). */
  empty: string;
}

const defaultTexts: AgendaTexts = {
  previous: 'Mês anterior',
  next: 'Próximo mês',
  today: 'Hoje',
  todayMark: 'Hoje',
  grid: (title) => `Agenda de ${title}`,
  more: (count) => `+${count} mais`,
  moreLabel: (count, date) => `${count} mais eventos em ${date}`,
  moreTitle: (date) => `Eventos de ${date}`,
  allDay: 'dia inteiro',
  empty: 'Nenhum evento neste mês.',
};

const DEFAULT_MAX_EVENTS = 3;
const MAX_SPAN_DAYS = 62;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const monthKey = (d: Date) => `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}`;

/** `aaaa-mm` -> primeiro dia do mês (ou `null`). */
function parseMonth(month: string | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  return match ? makeDate(Number(match[1]), Number(match[2]) - 1, 1) : null;
}

export interface AgendaProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onChange'> {
  /** Eventos (de qualquer mês; só os do período visível aparecem). */
  events?: readonly AgendaEvent[];
  /** Mês mostrado, `aaaa-mm` (controlado). */
  month?: string;
  /** Mês inicial (não controlado). Padrão: o atual. */
  defaultMonth?: string;
  /** O mês mudou (anterior, próximo, hoje). Busque os eventos do novo mês aqui, se vierem do servidor. */
  onMonthChange?: (month: string) => void;
  /** Clique num evento (link ou botão). */
  onEventClick?: (event: AgendaEvent) => void;
  /** Início da semana: 0 = domingo (padrão), 1 = segunda. */
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Eventos por dia antes do "+N mais". Padrão: `3`. */
  maxEvents?: number;
  /** Carregando os eventos: `aria-busy` e grade esmaecida. */
  loading?: boolean;
  /** Idioma dos nomes de mês e dia. Padrão: o do `LocaleProvider` (`pt-BR`). */
  locale?: string;
  /** Textos internos substituíveis (i18n). */
  texts?: Partial<AgendaTexts>;
}

/**
 * Agenda mensal: grade de um mês (`<table>`) com os eventos de cada dia; em contêiner estreito
 * vira lista por dia (CSS). Navegação por mês anterior, próximo e hoje; o título muda em
 * `aria-live`. Sem arrastar eventos.
 */
export const Agenda = forwardRef<HTMLElement, AgendaProps>(function Agenda(
  {
    events = [],
    month: monthProp,
    defaultMonth,
    onMonthChange,
    onEventClick,
    weekStart = 0,
    maxEvents = DEFAULT_MAX_EVENTS,
    loading = false,
    locale: localeProp,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const contextLocale = useLocale();
  const locale = localeProp ?? contextLocale;
  const titleId = useId();
  const now = new Date();
  const todayIso = toIso(now);
  const [month, setMonth] = useControllable<string>(
    monthProp,
    parseMonth(defaultMonth) ? (defaultMonth as string) : monthKey(now),
    onMonthChange,
  );
  const first = parseMonth(month) ?? makeDate(now.getFullYear(), now.getMonth(), 1) ?? now;
  const limit = Math.max(1, Math.floor(maxEvents));

  const names = useMemo(() => {
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const full = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });
    return { short, long, title, full };
  }, [locale]);

  const lead = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const gridStart = addDays(first, -lead);
  const gridEnd = addDays(gridStart, weeks * 7 - 1);
  const startIso = toIso(gridStart);
  const endIso = toIso(gridEnd);

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      const start = parseIso(event.date);
      if (!start) continue;
      const last = parseIso(event.end ?? event.date);
      let at = start;
      for (let i = 0; i <= MAX_SPAN_DAYS && last && toIso(at) <= toIso(last); i += 1) {
        const iso = toIso(at);
        if (iso >= startIso && iso <= endIso) {
          const bucket = map.get(iso) ?? [];
          bucket.push(event);
          map.set(iso, bucket);
        }
        at = addDays(at, 1);
      }
    }
    for (const bucket of map.values())
      bucket.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    return map;
  }, [events, startIso, endIso]);

  const monthTitle = names.title.format(first);
  const title = monthTitle.charAt(0).toLocaleUpperCase(locale) + monthTitle.slice(1);
  const goto = (next: Date) => setMonth(monthKey(next));

  const heads = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(2024, 0, 7 + ((weekStart + i) % 7)); // 07/01/2024 é domingo
    return { key: i, short: names.short.format(day), long: names.long.format(day) };
  });

  const eventItem = (event: AgendaEvent, day: string) => {
    const content = (
      <>
        {event.time ? (
          <>
            <span className="eds-agenda-event-time">{event.time}</span>{' '}
          </>
        ) : (
          <span className="eds-visually-hidden">{t.allDay}: </span>
        )}
        <span className="eds-agenda-event-title">{event.title}</span>
      </>
    );
    const common = {
      className: 'eds-agenda-event',
      'data-tone': event.tone,
      'data-continues': event.date !== day ? '' : undefined,
    };
    return (
      <li key={`${event.id}-${day}`}>
        {event.href !== undefined ? (
          <a {...common} href={event.href} onClick={() => onEventClick?.(event)}>
            {content}
          </a>
        ) : (
          <button {...common} type="button" onClick={() => onEventClick?.(event)}>
            {content}
          </button>
        )}
      </li>
    );
  };

  const hasEvents = Array.from(byDay.keys()).length > 0;

  return (
    <section
      {...rest}
      ref={ref}
      className={cx('eds-agenda', className)}
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
    >
      <header className="eds-agenda-header">
        <h2 className="eds-agenda-title" id={titleId} aria-live="polite">
          {title}
        </h2>
        <div className="eds-agenda-nav">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => goto(makeDate(now.getFullYear(), now.getMonth(), 1) ?? now)}
          >
            {t.today}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={t.previous}
            onClick={() => goto(addMonths(first, -1))}
          >
            <ChevronLeftGlyph />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={t.next}
            onClick={() => goto(addMonths(first, 1))}
          >
            <ChevronRightGlyph />
          </Button>
        </div>
      </header>
      <table className="eds-agenda-grid">
        <caption className="eds-visually-hidden">{t.grid(monthTitle)}</caption>
        <thead>
          <tr>
            {heads.map((head) => (
              <th key={head.key} scope="col">
                <abbr title={head.long}>{head.short}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: weeks }, (_, w) => (
            <tr key={w}>
              {Array.from({ length: 7 }, (_, d) => {
                const date = addDays(gridStart, w * 7 + d);
                const iso = toIso(date);
                const list = byDay.get(iso) ?? [];
                const isToday = iso === todayIso;
                const shown = list.length > limit ? limit - 1 : list.length;
                const hiddenCount = list.length - shown;
                const long = names.full.format(date);
                return (
                  <td
                    key={iso}
                    className="eds-agenda-day"
                    data-date={iso}
                    data-outside={date.getMonth() !== first.getMonth() ? '' : undefined}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <div className="eds-agenda-day-head">
                      <span className="eds-agenda-weekday">{names.long.format(date)}</span>
                      <time className="eds-agenda-date" dateTime={iso}>
                        {date.getDate()}
                      </time>
                      {isToday ? <span className="eds-agenda-today">{t.todayMark}</span> : null}
                    </div>
                    {list.length > 0 ? (
                      <ul className="eds-agenda-events">
                        {list.slice(0, shown).map((event) => eventItem(event, iso))}
                        {hiddenCount > 0 ? (
                          <li>
                            <Popover
                              title={t.moreTitle(long)}
                              trigger={
                                <button
                                  type="button"
                                  className="eds-agenda-more"
                                  aria-label={t.moreLabel(hiddenCount, long)}
                                >
                                  {t.more(hiddenCount)}
                                </button>
                              }
                            >
                              <ul className="eds-agenda-events">
                                {list.map((event) => eventItem(event, iso))}
                              </ul>
                            </Popover>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {!hasEvents ? <p className="eds-agenda-empty">{t.empty}</p> : null}
    </section>
  );
});
Agenda.displayName = 'Agenda';
