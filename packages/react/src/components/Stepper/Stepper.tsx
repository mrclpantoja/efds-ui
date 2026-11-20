import { forwardRef, type OlHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

export type StepState = 'complete' | 'current' | 'upcoming' | 'error';

export interface StepperStep {
  label: string;
  /** Sobrescreve o estado derivado de `current` (ex.: `error`). */
  state?: StepState;
}

export interface StepperTexts {
  /** Texto oculto do estado "concluída". */
  complete: string;
  /** Texto oculto do estado "com erro". */
  error: string;
  /** Resumo do contêiner estreito: "Etapa 2 de 4". */
  summary: (current: number, total: number) => string;
}

export const defaultStepperTexts: StepperTexts = {
  complete: ' (concluída)',
  error: ' (com erro)',
  summary: (current, total) => `Etapa ${current} de ${total}`,
};

export interface StepperProps extends Omit<OlHTMLAttributes<HTMLOListElement>, 'children'> {
  /** Nome do indicador de progresso. */
  'aria-label': string;
  steps: readonly StepperStep[];
  /** Índice (a partir de 0) da etapa atual. Antes dela: concluídas; depois: futuras. */
  current: number;
  vertical?: boolean;
  /**
   * Torna as etapas concluídas clicáveis (voltar): o rótulo vira `<button>`. Recebe o índice
   * da etapa escolhida.
   */
  onStepClick?: (index: number) => void;
  texts?: Partial<StepperTexts>;
}

export const stepStates = (steps: readonly StepperStep[], current: number): StepState[] =>
  steps.map(
    (step, i) => step.state ?? (i < current ? 'complete' : i === current ? 'current' : 'upcoming'),
  );

/** Indicador de etapas (`<ol>`). Estado por `data-state` e `aria-current`; nunca só por cor. */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  { steps, current, vertical = false, onStepClick, texts, className, ...rest },
  ref,
) {
  const t = mergeTexts(defaultStepperTexts, texts);
  const states = stepStates(steps, current);
  return (
    <ol
      {...rest}
      ref={ref}
      className={cx('eds-stepper', vertical && 'eds-stepper-vertical', className)}
    >
      {steps.map((step, i) => {
        const state = states[i] ?? 'upcoming';
        const isCurrent = i === current;
        const hidden = state === 'complete' ? t.complete : state === 'error' ? t.error : null;
        const suffix = hidden ? <span className="eds-visually-hidden">{hidden}</span> : null;
        return (
          <li
            key={i}
            className="eds-stepper-item"
            data-state={state}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="eds-stepper-marker" aria-hidden="true" />
            {onStepClick && state === 'complete' && !isCurrent ? (
              <button type="button" className="eds-stepper-label" onClick={() => onStepClick(i)}>
                {step.label}
                {suffix}
              </button>
            ) : (
              <span className="eds-stepper-label">
                {step.label}
                {suffix}
              </span>
            )}
            {isCurrent && (
              <span className="eds-stepper-summary">{t.summary(i + 1, steps.length)}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
});
Stepper.displayName = 'Stepper';
