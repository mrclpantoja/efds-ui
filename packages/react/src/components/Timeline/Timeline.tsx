import { createElement, forwardRef, type OlHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import type { Tone } from '../../internal/tone';

export type TimelineTone = Extract<
  Tone,
  'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'
>;
/** Andamento do item (linha do tempo de etapas): concluído, em curso ou por vir. */
export type TimelineState = 'done' | 'current' | 'upcoming';

export interface TimelineItem {
  /** Chave estável. */
  id: string;
  title: ReactNode;
  /** Hora ou data exibida. */
  time?: ReactNode;
  /** Valor ISO do `<time datetime>` (para leitores e máquinas). */
  dateTime?: string;
  text?: ReactNode;
  /** Quem fez ("por Maria Exemplo"). */
  actor?: ReactNode;
  /** Tom do marcador. O título e a hora dizem o que houve; o tom só reforça. */
  tone?: TimelineTone;
  /** Ícone (um `<svg>`) dentro do marcador. Sem ele, o marcador é um ponto. */
  icon?: ReactNode;
  /**
   * Andamento (`data-state`): o marcador ganha visto, anel ou tracejado, nunca só cor. Diga o estado
   * também no texto (ex.: "(paga)" no título, oculto com `eds-visually-hidden`).
   */
  state?: TimelineState;
}

export interface TimelineGroup {
  /** Cabeçalho do grupo (ex.: "Hoje, 20/11/2026"). */
  title: ReactNode;
  items: TimelineItem[];
  /** Chave do grupo. Padrão: o índice. */
  id?: string;
}

interface TimelineBase extends Omit<OlHTMLAttributes<HTMLOListElement>, 'children'> {
  /** Variante compacta (menos respiro). */
  compact?: boolean;
  /**
   * `horizontal`: itens lado a lado, com o fio entre os marcadores; rola no próprio contêiner e,
   * em largura estreita, volta a ser vertical. Com muitos itens, passe `tabIndex={0}` e `aria-label`
   * para rolar pelo teclado. Padrão: `vertical`.
   */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Só na horizontal: em contêiner estreito, `stack` (padrão) volta a ser vertical e `scroll` mantém
   * a linha e rola (`.eds-timeline-scroll`).
   */
  narrow?: 'stack' | 'scroll';
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<TimelineTexts>;
}

export interface TimelineTexts {
  /** Nome da lista horizontal (rolável pelo teclado) quando não há `aria-label`. */
  label: string;
}

const defaultTexts: TimelineTexts = { label: 'Linha do tempo' };

export type TimelineProps =
  | (TimelineBase & { items: TimelineItem[]; groups?: undefined; headingLevel?: undefined })
  | (TimelineBase & {
      items?: undefined;
      /** Agrupa por dia (ou outro critério): cada grupo tem um cabeçalho. */
      groups: TimelineGroup[];
      /** Nível dos cabeçalhos dos grupos. Padrão: 3. */
      headingLevel?: 2 | 3 | 4 | 5 | 6;
    });

function renderItem(item: TimelineItem) {
  return (
    <li
      key={item.id}
      className={cx(
        'eds-timeline-item',
        item.tone && item.tone !== 'neutral' && `eds-timeline-item-${item.tone}`,
      )}
      data-state={item.state}
    >
      <span className="eds-timeline-marker" aria-hidden="true">
        {item.icon}
      </span>
      <div className="eds-timeline-content">
        <div className="eds-timeline-header">
          <span className="eds-timeline-title">{item.title}</span>
          {item.time != null && (
            <time className="eds-timeline-time" dateTime={item.dateTime}>
              {item.time}
            </time>
          )}
        </div>
        {item.text != null && <p className="eds-timeline-text">{item.text}</p>}
        {item.actor != null && <p className="eds-timeline-actor">{item.actor}</p>}
      </div>
    </li>
  );
}

/**
 * Histórico de eventos (lista ordenada). A ordem é a dos dados (recente primeiro ou o
 * inverso). Com `groups`, cada grupo ganha um cabeçalho.
 */
export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(function Timeline(props, ref) {
  const {
    compact,
    orientation = 'vertical',
    narrow = 'stack',
    texts,
    className,
    items,
    groups,
    headingLevel = 3,
    ...rest
  } = props;
  const cls = cx(
    'eds-timeline',
    compact && 'eds-timeline-compact',
    orientation === 'horizontal' && 'eds-timeline-horizontal',
    orientation === 'horizontal' && narrow === 'scroll' && 'eds-timeline-scroll',
    className,
  );
  const t = mergeTexts(defaultTexts, texts);
  // Horizontal: o <ol> rola sozinho; precisa de foco e nome para rolar pelo teclado.
  const scrollProps =
    orientation === 'horizontal'
      ? { tabIndex: 0, 'aria-label': props['aria-label'] ?? t.label }
      : {};
  if (groups) {
    return (
      <ol {...rest} ref={ref} className="eds-timeline-groups">
        {groups.map((group, index) => (
          <li key={group.id ?? index} className="eds-timeline-group">
            {createElement(
              `h${headingLevel}`,
              { className: 'eds-timeline-group-title' },
              group.title,
            )}
            <ol className={cls}>{group.items.map(renderItem)}</ol>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol {...rest} {...scrollProps} ref={ref} className={cls}>
      {items?.map(renderItem)}
    </ol>
  );
});
Timeline.displayName = 'Timeline';
