import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { useAnnouncer } from '../../internal/announcer';
import { controlsOf, createFieldErrors, type FieldControl } from '../../internal/field-errors';
import { fieldLabel, representativeOf } from '@efds-ui/behavior/internal';
import { ErrorSummary, type ErrorSummaryItem, type ErrorSummaryProps } from '../ErrorSummary';
import { Stepper, type StepperTexts, type StepperStepState } from '../Stepper';

export interface WizardStep {
  /** Título da etapa: rótulo no Stepper, título do painel e anúncio. */
  title: string;
  /** Campos do painel. Todos os painéis ficam montados (os valores se preservam). */
  content: ReactNode;
}

export interface WizardTexts {
  back: string;
  next: string;
  finish: string;
  /** Anúncio ao mudar de etapa. Padrão: "Etapa 2 de 4: Endereço.". */
  step: (current: number, total: number, title: string) => string;
  stepper: Partial<StepperTexts>;
}

const defaultWizardTexts: WizardTexts = {
  back: 'Voltar',
  next: 'Avançar',
  finish: 'Concluir',
  step: (current, total, title) => `Etapa ${current} de ${total}: ${title}.`,
  stepper: {},
};

/** Ajustes do resumo de erros do Wizard (os campos `errors` e `focusKey` ficam por conta dele). */
export type WizardErrorSummary = Omit<ErrorSummaryProps, 'errors' | 'focusKey' | 'moveFocus'>;

export interface WizardProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'children' | 'onChange'
> {
  /** Nome do indicador de etapas. */
  'aria-label': string;
  steps: readonly WizardStep[];
  /**
   * Etapa atual (controlada, índice a partir de 0). Use com `onStepChange`, que avisa a etapa
   * escolhida (avançar, voltar ou clicar numa concluída): quem controla decide se `step` muda.
   */
  step?: number;
  /** Etapa inicial (não controlada, índice a partir de 0). */
  defaultStep?: number;
  /**
   * Validação extra de uma etapa, depois da validação nativa dos campos (`required`, `pattern`...).
   * Devolva `false` para impedir o avanço (mostre o motivo na própria interface).
   */
  validate?: (index: number, panel: HTMLElement) => boolean;
  /** Antes de mudar de etapa; `false` cancela (como `eds:wizard-beforechange`). */
  onBeforeStepChange?: (from: number, to: number) => boolean | void;
  onStepChange?: (index: number, from: number) => void;
  /** Envio final, com todos os painéis válidos. O envio nativo do formulário é impedido. */
  onComplete?: (data: FormData, form: HTMLFormElement) => void;
  /**
   * Mostra um `ErrorSummary` com os campos inválidos do painel quando o avanço (ou o envio final) é
   * recusado: ele recebe o foco no lugar do primeiro campo, cada item leva ao campo e some ao
   * corrigir ou ao mudar de etapa. Passe um objeto para ajustar o resumo (`headingLevel`, `texts`...).
   * Sem isto, o foco segue ao primeiro campo inválido, como sempre.
   */
  errorSummary?: boolean | WizardErrorSummary;
  texts?: Partial<WizardTexts>;
}

/**
 * Formulário em etapas: Stepper + painéis `hidden` + Voltar/Avançar/Concluir. Avançar valida os
 * campos do painel (cada inválido ganha `aria-invalid` e um `p.eds-error` ligado por
 * `aria-describedby`, com a mensagem nativa ou o `data-eds-error-message` do campo; o foco vai ao primeiro), move o foco ao título da nova etapa e
 * anuncia "Etapa 2 de 4: Endereço.". Enter avança; o envio final valida todos os painéis.
 */
export const Wizard = forwardRef<HTMLFormElement, WizardProps>(function Wizard(
  {
    'aria-label': ariaLabel,
    steps,
    step: stepProp,
    defaultStep = 0,
    validate,
    onBeforeStepChange,
    onStepChange,
    onComplete,
    errorSummary,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultWizardTexts, texts);
  const baseId = useId();
  const total = steps.length;
  const last = total - 1;
  const start = Math.min(Math.max(stepProp ?? defaultStep, 0), last);
  const [internal, setCurrent] = useState(start);
  const current = stepProp === undefined ? internal : Math.min(Math.max(stepProp, 0), last);
  const [completed, setCompleted] = useState<ReadonlySet<number>>(
    () => new Set(Array.from({ length: start }, (_, i) => i)),
  );
  const [errored, setErrored] = useState<ReadonlySet<number>>(new Set());
  const panels = useRef<(HTMLElement | null)[]>([]);
  const headings = useRef<(HTMLElement | null)[]>([]);
  const focusAfter = useRef(false);
  const [fieldErrors] = useState(createFieldErrors);
  const [summaryItems, setSummaryItems] = useState<ErrorSummaryItem[]>([]);
  const [summaryKey, setSummaryKey] = useState(0);
  const summaryOn = Boolean(errorSummary);
  const clearSummary = () => setSummaryItems((prev) => (prev.length === 0 ? prev : []));
  const { text: statusText, announce } = useAnnouncer();

  useEffect(() => {
    if (!focusAfter.current) return;
    focusAfter.current = false;
    headings.current[current]?.focus();
  }, [current]);

  const validatePanel = (index: number): boolean => {
    const panel = panels.current[index];
    if (!panel) return true;
    const ok = fieldErrors.validatePanel(panel, {
      focus: !summaryOn,
      onInvalid: (controls) => {
        if (!summaryOn) return;
        setSummaryItems(
          controls.map((control) => {
            const element = representativeOf(control);
            if (element.id === '') element.id = `${baseId}-f-${element.name || index}`;
            return {
              id: element.id,
              name: element.name || element.id,
              label: fieldLabel(element),
              message: fieldErrors.messageOf(control),
            };
          }),
        );
        setSummaryKey((key) => key + 1);
      },
    });
    if (!ok) return false;
    clearSummary();
    return validate ? validate(index, panel) : true;
  };

  const goTo = (to: number) => {
    if (to < 0 || to > last || to === current) return;
    if (onBeforeStepChange?.(current, to) === false) return;
    const from = current;
    clearSummary();
    focusAfter.current = true;
    setCurrent(to);
    announce(t.step(to + 1, total, steps[to]?.title ?? ''));
    onStepChange?.(to, from);
  };

  const markDone = (index: number) => {
    setCompleted((prev) => new Set(prev).add(index));
    setErrored((prev) => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const advance = () => {
    if (!validatePanel(current)) return;
    markDone(current);
    goTo(current + 1);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (current < last) {
      advance();
      return;
    }
    const form = event.currentTarget;
    for (let i = 0; i < total; i += 1) {
      const panel = panels.current[i];
      const nativeOk = !panel || controlsOf(panel).every((el) => el.checkValidity());
      if (nativeOk && (i !== current || !validate || !panel || validate(i, panel))) {
        markDone(i);
        continue;
      }
      setErrored((prev) => new Set(prev).add(i));
      if (i !== current) goTo(i);
      // O painel só aparece depois do render; o erro visível é montado então.
      setTimeout(() => validatePanel(i), 0);
      return;
    }
    onComplete?.(new FormData(form), form);
  };

  const onEdit = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      fieldErrors.refresh(target as FieldControl);
      // O resumo perde o que foi corrigido e acompanha o motivo do que segue inválido.
      setSummaryItems((prev) => {
        if (prev.length === 0) return prev;
        const next = prev
          .map((item) => ({ item, el: document.getElementById(item.id) as FieldControl | null }))
          .filter(({ el }) => el !== null && !el.validity.valid)
          .map(({ item, el }) => ({ ...item, message: fieldErrors.messageOf(el as FieldControl) }));
        return next.length === prev.length && next.every((n, i) => n.message === prev[i]?.message)
          ? prev
          : next;
      });
    }
  };

  const states: StepperStepState[] = steps.map((_, i) =>
    i === current ? 'current' : errored.has(i) ? 'error' : completed.has(i) ? 'done' : 'upcoming',
  );

  return (
    <form
      {...rest}
      ref={ref}
      noValidate
      className={cx('eds-stack', 'eds-gap-5', className)}
      onSubmit={onSubmit}
      onInput={onEdit}
      onChange={onEdit}
    >
      <Stepper
        aria-label={ariaLabel}
        steps={steps.map((step, i) => ({ label: step.title, state: states[i] }))}
        current={current}
        onStepClick={goTo}
        texts={t.stepper}
      />
      {summaryOn ? (
        <ErrorSummary
          {...(typeof errorSummary === 'object' ? errorSummary : null)}
          errors={summaryItems}
          focusKey={summaryKey}
        />
      ) : null}
      {steps.map((step, i) => (
        <section
          key={i}
          ref={(el) => {
            panels.current[i] = el;
          }}
          aria-labelledby={`${baseId}-t${i}`}
          hidden={i !== current}
        >
          <h3
            className="eds-text-h4"
            id={`${baseId}-t${i}`}
            tabIndex={-1}
            ref={(el) => {
              headings.current[i] = el;
            }}
          >
            {step.title}
          </h3>
          {step.content}
        </section>
      ))}
      <div className="eds-stack eds-stack-row eds-stack-justify-between eds-stack-wrap eds-gap-2">
        <button
          type="button"
          className="eds-button eds-button-secondary"
          hidden={current === 0}
          onClick={() => goTo(current - 1)}
        >
          {t.back}
        </button>
        {current < last ? (
          <button key="next" type="submit" className="eds-button eds-button-primary eds-push-end">
            {t.next}
          </button>
        ) : (
          <button key="finish" type="submit" className="eds-button eds-button-primary eds-push-end">
            {t.finish}
          </button>
        )}
      </div>
      <div role="status" className="eds-visually-hidden">
        {statusText}
      </div>
    </form>
  );
});
Wizard.displayName = 'Wizard';
