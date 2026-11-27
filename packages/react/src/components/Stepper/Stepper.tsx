import { forwardRef, type OlHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { focusSectionTitle } from '../../internal/sections';
import { mergeTexts } from '../../utils/texts';

export type StepperStepState = 'done' | 'current' | 'upcoming' | 'error';

export type StepperOrientation = 'horizontal' | 'vertical';

export interface StepperStep {
  label: string;
  /** Sobrescreve o estado derivado de `current` (ex.: `error`). */
  state?: StepperStepState;
  /**
   * Indicador de seções: o rótulo vira um link para a âncora (`#secao`) e o clique leva o foco ao
   * título dela. Com `href` em alguma etapa, o `Stepper` passa ao modo indicador.
   */
  href?: string;
}

export interface StepperTexts {
  /** Texto oculto do estado "concluída". */
  complete: string;
  /** Texto oculto do estado "com erro". */
  error: string;
  /** Resumo do contêiner estreito: "Etapa 2 de 4". */
  summary: (current: number, total: number) => string;
  /** Resumo do contêiner estreito no modo indicador de seções: "Seção 2 de 4". */
  sectionSummary: (current: number, total: number) => string;
}

export const defaultStepperTexts: StepperTexts = {
  complete: ' (concluída)',
  error: ' (com erro)',
  summary: (current, total) => `Etapa ${current} de ${total}`,
  sectionSummary: (current, total) => `Seção ${current} de ${total}`,
};

export interface StepperProps extends Omit<OlHTMLAttributes<HTMLOListElement>, 'children'> {
  /** Nome do indicador de progresso. */
  'aria-label': string;
  steps: readonly StepperStep[];
  /**
   * Índice (a partir de 0) da etapa atual. Antes dela: concluídas; depois: futuras. No modo
   * indicador de seções, é a seção lida e os estados vêm de `state` (ver `useSectionProgress`).
   */
  current: number;
  /** Padrão: `horizontal`. */
  orientation?: StepperOrientation;
  /**
   * Torna as etapas concluídas clicáveis (voltar): o rótulo vira `<button>`. Recebe o índice
   * da etapa escolhida.
   */
  onStepClick?: (index: number) => void;
  texts?: Partial<StepperTexts>;
}

export const stepStates = (steps: readonly StepperStep[], current: number): StepperStepState[] =>
  steps.map(
    (step, i) => step.state ?? (i < current ? 'done' : i === current ? 'current' : 'upcoming'),
  );

/** Indicador de etapas (`<ol>`). Estado por `data-state` e `aria-current`; nunca só por cor. */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  { steps, current, orientation = 'horizontal', onStepClick, texts, className, ...rest },
  ref,
) {
  const t = mergeTexts(defaultStepperTexts, texts);
  const states = stepStates(steps, current);
  const indicator = steps.some((step) => step.href !== undefined);
  return (
    <ol
      {...rest}
      ref={ref}
      className={cx('eds-stepper', orientation === 'vertical' && 'eds-stepper-vertical', className)}
    >
      {steps.map((step, i) => {
        const state = states[i] ?? 'upcoming';
        const isCurrent = i === current;
        const hidden = state === 'done' ? t.complete : state === 'error' ? t.error : null;
        const suffix = hidden ? <span className="eds-visually-hidden">{hidden}</span> : null;
        if (indicator) {
          return (
            <li key={i} className="eds-stepper-item" data-state={state}>
              <span className="eds-stepper-marker" aria-hidden="true" />
              <span className="eds-stepper-label">
                {step.href !== undefined ? (
                  <a
                    className="eds-stepper-link"
                    href={step.href}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={() => {
                      const id = step.href?.startsWith('#') ? step.href.slice(1) : '';
                      const section = id ? document.getElementById(decodeURIComponent(id)) : null;
                      if (section) focusSectionTitle(section);
                    }}
                  >
                    {step.label}
                    {suffix}
                  </a>
                ) : (
                  <>
                    {step.label}
                    {suffix}
                  </>
                )}
              </span>
              {isCurrent && (
                <span className="eds-stepper-summary">{t.sectionSummary(i + 1, steps.length)}</span>
              )}
            </li>
          );
        }
        return (
          <li
            key={i}
            className="eds-stepper-item"
            data-state={state}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="eds-stepper-marker" aria-hidden="true" />
            {onStepClick && state === 'done' && !isCurrent ? (
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
