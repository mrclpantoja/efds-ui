import { forwardRef, useId, type ProgressHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export type ProgressTone = 'info' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md';

interface ProgressBase extends Omit<ProgressHTMLAttributes<HTMLProgressElement>, 'value' | 'max'> {
  /** Valor atual. Sem `value` a barra é indeterminada (trabalho de duração desconhecida). */
  value?: number;
  /** Valor máximo. Padrão: 100. */
  max?: number;
  size?: ProgressSize;
  /** Tom semântico; o padrão é a cor de ação. */
  tone?: ProgressTone;
  /**
   * Texto do valor ao lado do rótulo. Padrão: a porcentagem (determinada) ou nada
   * (indeterminada). `false` oculta.
   */
  valueText?: ReactNode | false;
}

/** A barra precisa de nome: um `label` visível ou um `aria-label`. */
export type ProgressProps = ProgressBase &
  ({ label: ReactNode; 'aria-label'?: string } | { label?: undefined; 'aria-label': string });

/**
 * Barra de progresso (`<progress>` nativo). O valor também aparece em texto (a cor sozinha não
 * informa). Atualize `value` para andar; sem `value` a animação respeita `prefers-reduced-motion`.
 */
export const Progress = forwardRef<HTMLProgressElement, ProgressProps>(function Progress(
  { value, max = 100, size = 'md', tone, valueText, label, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const barId = id ?? autoId;
  const determinate = value !== undefined;
  const safeMax = max > 0 ? max : 100;
  const percent = determinate
    ? Math.round((Math.min(Math.max(value, 0), safeMax) / safeMax) * 100)
    : 0;
  const shown = valueText === false ? null : (valueText ?? (determinate ? `${percent}%` : null));
  const bar = (
    <progress
      {...rest}
      ref={ref}
      id={barId}
      className={cx('eds-progress', size === 'sm' && 'eds-progress-sm', className)}
      value={determinate ? value : undefined}
      max={determinate ? safeMax : undefined}
      data-tone={tone}
      aria-valuetext={typeof valueText === 'string' ? valueText : undefined}
    >
      {children ?? (determinate ? `${percent}%` : undefined)}
    </progress>
  );
  if (label === undefined) return bar;
  return (
    <div className="eds-progress-field">
      <div className="eds-progress-header">
        <label className="eds-progress-label" htmlFor={barId}>
          {label}
        </label>
        {shown !== null && <span className="eds-progress-value">{shown}</span>}
      </div>
      {bar}
    </div>
  );
});
Progress.displayName = 'Progress';
