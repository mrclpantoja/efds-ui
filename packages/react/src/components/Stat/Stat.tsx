import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Skeleton } from '../Skeleton';

export type StatTrend = 'up' | 'down' | 'flat';
export type StatTone = 'positive' | 'negative' | 'warning' | 'neutral';

export interface StatTexts {
  /** Texto oculto antes da variação, por direção. */
  up: string;
  down: string;
  flat: string;
  /** Anúncio do estado carregando. */
  loading: string;
}

const defaultStatTexts: StatTexts = {
  up: 'Aumento de',
  down: 'Queda de',
  flat: 'Sem variação,',
  loading: 'Carregando indicador',
};

/** Dentro de um `<StatGrid>` o anúncio é um só; o contexto registra quem está carregando. */
const StatGridContext = createContext<((id: string, loading: boolean) => void) | null>(null);

export interface StatProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: string;
  /** Valor já formatado ("1.284", "R$ 86.410,00"). */
  value: ReactNode;
  /** Variação já formatada ("12,4%"). Sem ela, não há linha de variação. */
  delta?: ReactNode;
  /** Direção da seta. Padrão: `flat`. Uma subida pode ser ruim: combine com `tone="negative"`. */
  trend?: StatTrend;
  /** Leitura do resultado (cor): positivo, negativo, atenção ou neutro. Padrão: `neutral`. */
  tone?: StatTone;
  /** Referência da variação ("vs. mês anterior"). */
  meta?: string;
  /**
   * Carregando: `aria-busy` e Skeleton nas mesmas dimensões. Fora de um `<StatGrid>`, anuncia
   * `texts.loading`; dentro, quem anuncia é a grade (uma vez só).
   */
  loading?: boolean;
  texts?: Partial<StatTexts>;
}

/** Indicador (KPI) sobre `.eds-card`. O valor usa algarismos tabulares; a direção também vai em texto. */
export const Stat = forwardRef<HTMLDivElement, StatProps>(function Stat(
  {
    label,
    value,
    delta,
    trend = 'flat',
    tone = 'neutral',
    meta,
    loading = false,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultStatTexts, texts);
  const register = useContext(StatGridContext);
  const id = useId();
  useEffect(() => {
    if (!register) return undefined;
    register(id, loading);
    return () => register(id, false);
  }, [register, id, loading]);
  return (
    <div
      {...rest}
      ref={ref}
      className={cx('eds-card', 'eds-stat', className)}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          {!register && (
            <span className="eds-visually-hidden" role="status">
              {t.loading}
            </span>
          )}
          <p className="eds-stat-label">
            <Skeleton variant="text" />
          </p>
          <p className="eds-stat-value">
            <Skeleton variant="text" />
          </p>
          <p className="eds-stat-delta">
            <Skeleton variant="text" />
          </p>
        </>
      ) : (
        <>
          <p className="eds-stat-label">{label}</p>
          <p className="eds-stat-value">{value}</p>
          {delta !== undefined && (
            <p className="eds-stat-delta" data-trend={trend} data-tone={tone}>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
              </svg>
              <span className="eds-visually-hidden">{t[trend]}</span> {delta}
              {meta !== undefined && (
                <>
                  {' '}
                  <span className="eds-stat-meta">{meta}</span>
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
});
Stat.displayName = 'Stat';

export interface StatGridTexts {
  /** Anúncio quando algum indicador da grade começa a carregar. */
  loading: string;
  /** Anúncio quando todos terminam de carregar. */
  loaded: string;
}

const defaultStatGridTexts: StatGridTexts = {
  loading: 'Carregando indicadores',
  loaded: 'Indicadores carregados',
};

export interface StatGridProps extends HTMLAttributes<HTMLDivElement> {
  texts?: Partial<StatGridTexts>;
}

/**
 * Grade de indicadores: 1, 2 e 4 colunas conforme a largura do contêiner. Anuncia o carregamento
 * dos `<Stat loading>` filhos em um único `role="status"`, em vez de um por card.
 */
export const StatGrid = forwardRef<HTMLDivElement, StatGridProps>(function StatGrid(
  { className, texts, children, ...rest },
  ref,
) {
  const t = mergeTexts(defaultStatGridTexts, texts);
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [message, setMessage] = useState('');
  const wasLoading = useRef(false);
  const [register] = useState(() => (id: string, loading: boolean) => {
    setPending((prev) => {
      if (prev.has(id) === loading) return prev;
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  });
  const busy = pending.size > 0;
  // A região existe desde o início e só o texto muda: uma região que nasce preenchida não é lida.
  useEffect(() => {
    if (busy) {
      wasLoading.current = true;
      setMessage(t.loading);
    } else if (wasLoading.current) {
      wasLoading.current = false;
      setMessage(t.loaded);
    }
  }, [busy, t.loading, t.loaded]);
  return (
    <StatGridContext.Provider value={register}>
      <div {...rest} ref={ref} className={cx('eds-stat-grid', className)}>
        {children}
        <span className="eds-visually-hidden" role="status">
          {message}
        </span>
      </div>
    </StatGridContext.Provider>
  );
});
StatGrid.displayName = 'StatGrid';
