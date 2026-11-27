import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  fieldLabel,
  fieldMessage,
  isFormControl,
  representativeOf,
  validatableControls,
  type FormControl,
} from '@efds-ui/behavior/internal';
import { validationMessages, type ValidationMessages } from '@efds-ui/behavior/validate';
import { mergeTexts } from '../../utils/texts';
import type { ErrorSummaryItem } from '../ErrorSummary';

/** Um campo recusado: o que o `ErrorSummary` lista. */
export type FormValidationError = ErrorSummaryItem & { name: string; label: string };

export interface UseFormValidationOptions {
  /**
   * Envio com todos os campos válidos (ou com `formNoValidate` no botão): no lugar do `onSubmit` do
   * `<form>`. Para impedir o envio nativo, chame `event.preventDefault()` aqui.
   */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  /** Envio recusado, com os campos inválidos na ordem do documento. */
  onInvalid?: (errors: FormValidationError[]) => void;
  /** Textos das restrições nativas (`required`, `minlength`...) e dos validadores, em pt-BR por padrão. */
  texts?: Partial<ValidationMessages>;
}

export interface FormValidationFormProps {
  /** Desliga o balão nativo: o erro é visível, junto do campo. */
  noValidate: true;
  ref: RefObject<HTMLFormElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBlur: (event: FocusEvent<HTMLFormElement>) => void;
  onInput: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (event: FormEvent<HTMLFormElement>) => void;
  onPointerDownCapture: (event: PointerEvent<HTMLFormElement>) => void;
  onReset: () => void;
}

export interface UseFormValidationResult {
  /** Espalhe no `<form>`: `<form {...formProps}>`. */
  formProps: FormValidationFormProps;
  /** Erro de um campo pelo `name` (ou `id`): passe para `error` do `Field`. `undefined` se não há. */
  errorOf: (name: string) => string | undefined;
  /** Para `<ErrorSummary {...summaryProps} />`. */
  summaryProps: {
    errors: FormValidationError[];
    focusKey: number;
    ref: RefObject<HTMLDivElement | null>;
  };
  /** Valida o formulário agora (mostra os erros e foca o resumo); `true` se está tudo válido. */
  validate: () => boolean;
}

interface FieldState {
  messages: Record<string, string>;
  summary: FormValidationError[];
}

const EMPTY: FieldState = { messages: {}, summary: [] };
const keyOf = (control: FormControl): string => control.name || control.id;

/**
 * Validação de formulário sem dependência: junta a validade nativa (`required`, `pattern`,
 * `minLength`, `type`...) com a prop `validate` do `Input` e entrega o erro de cada campo
 * (`errorOf`) e a lista do `ErrorSummary` (`summaryProps`).
 *
 * Mesmas regras do HTML (`data-eds-validate`): o erro de um campo só aparece ao sair dele ou ao
 * enviar, nunca enquanto se digita pela primeira vez; depois do primeiro erro, ele acompanha a
 * digitação e some ao ficar válido. Envio recusado: o resumo recebe o foco (sem `ErrorSummary`, o
 * primeiro campo inválido) e o envio não chega ao `onSubmit`. O resumo só perde itens ao corrigir.
 *
 * ```tsx
 * const { formProps, errorOf, summaryProps } = useFormValidation({ onSubmit: salvar });
 * <form {...formProps}>
 *   <ErrorSummary {...summaryProps} />
 *   <Field label="CPF" error={errorOf('cpf')}><Input name="cpf" validate="cpf" /></Field>
 * </form>
 * ```
 */
export function useFormValidation(options: UseFormValidationOptions = {}): UseFormValidationResult {
  const { onSubmit, onInvalid, texts } = options;
  const formRef = useRef<HTMLFormElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const armed = useRef(new Set<string>());
  const skipBlurUntil = useRef(0);
  const firstId = useRef('');
  const [state, setState] = useState<FieldState>(EMPTY);
  const [focusKey, setFocusKey] = useState(0);
  const messagesRef = useRef<ValidationMessages>({ ...validationMessages });
  const onSubmitRef = useRef(onSubmit);
  const onInvalidRef = useRef(onInvalid);
  // Os ouvintes leem sempre o valor mais recente, sem ser recriados a cada render.
  useEffect(() => {
    messagesRef.current = mergeTexts<ValidationMessages>({ ...validationMessages }, texts);
    onSubmitRef.current = onSubmit;
    onInvalidRef.current = onInvalid;
  });

  const toError = useCallback((control: FormControl): FormValidationError => {
    if (control.id === '') control.id = `eds-field-${keyOf(control) || 'campo'}`;
    return {
      id: control.id,
      name: keyOf(control),
      label: fieldLabel(control),
      message: fieldMessage(control, messagesRef.current),
    };
  }, []);

  /** Campos inválidos do formulário; `checkValidity` também dispara `invalid` nos que se avisam sozinhos. */
  const collect = useCallback(
    (form: HTMLFormElement): FormValidationError[] => {
      const result: FormValidationError[] = [];
      const seen = new Set<FormControl>();
      for (const control of validatableControls(form)) {
        const rep = representativeOf(control);
        if (seen.has(rep)) continue;
        seen.add(rep);
        if (!rep.checkValidity()) result.push(toError(rep));
      }
      return result;
    },
    [toError],
  );

  const refuse = useCallback((errors: FormValidationError[]) => {
    for (const error of errors) armed.current.add(error.name);
    firstId.current = errors[0]?.id ?? '';
    setState({
      messages: Object.fromEntries(errors.map((e) => [e.name, e.message])),
      summary: errors,
    });
    setFocusKey((key) => key + 1);
    onInvalidRef.current?.(errors);
  }, []);

  const accept = useCallback(() => {
    armed.current.clear();
    setState(EMPTY);
  }, []);

  const validate = useCallback((): boolean => {
    const form = formRef.current;
    if (!form) return true;
    const errors = collect(form);
    if (errors.length === 0) {
      accept();
      return true;
    }
    refuse(errors);
    return false;
  }, [accept, collect, refuse]);

  // Sem `ErrorSummary` na tela (é ele quem foca o resumo), o foco vai ao primeiro campo inválido.
  useEffect(() => {
    if (focusKey === 0 || summaryRef.current) return;
    if (firstId.current) document.getElementById(firstId.current)?.focus();
  }, [focusKey]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const skip =
        (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) &&
        submitter.formNoValidate;
      if (skip) {
        onSubmitRef.current?.(event);
        return;
      }
      const errors = collect(event.currentTarget);
      if (errors.length > 0) {
        event.preventDefault();
        refuse(errors);
        return;
      }
      accept();
      onSubmitRef.current?.(event);
    },
    [accept, collect, refuse],
  );

  /** Reavalia um campo: erro novo, atualizado ou removido (e sai do resumo ao ficar válido). */
  const evaluate = useCallback(
    (control: FormControl, arm: boolean) => {
      const rep = representativeOf(control);
      const key = keyOf(rep);
      if (rep.validity.valid) {
        setState((prev) => {
          const summary = prev.summary.filter((item) => item.name !== key);
          if (!(key in prev.messages) && summary.length === prev.summary.length) return prev;
          const messages = { ...prev.messages };
          delete messages[key];
          return { messages, summary };
        });
        return;
      }
      if (arm) armed.current.add(key);
      const error = toError(rep);
      setState((prev) => ({
        messages: { ...prev.messages, [key]: error.message },
        summary: prev.summary.map((item) => (item.name === key ? error : item)),
      }));
    },
    [toError],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLFormElement>) => {
      const target = event.target as EventTarget;
      if (!isFormControl(target) || target.type === 'hidden') return;
      // Clicar no botão de envio tira o foco do campo e o erro empurraria o botão: o envio valida tudo.
      if (Date.now() < skipBlurUntil.current) return;
      const next = event.relatedTarget;
      // Outra janela: o foco não saiu do campo de verdade.
      if (next === null && !target.ownerDocument.hasFocus()) return;
      // Dentro do mesmo grupo de rádios o foco só passa de uma opção a outra.
      if (target instanceof HTMLInputElement && target.type === 'radio') {
        if (
          next instanceof HTMLInputElement &&
          next.type === 'radio' &&
          next.name === target.name
        ) {
          return;
        }
      }
      evaluate(target, true);
    },
    [evaluate],
  );

  const handleEdit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const target = event.target as EventTarget;
      if (!isFormControl(target) || target.type === 'hidden') return;
      // Só depois do primeiro erro mostrado: digitar pela primeira vez nunca acusa erro.
      if (armed.current.has(keyOf(representativeOf(target)))) evaluate(target, false);
    },
    [evaluate],
  );

  return {
    formProps: {
      noValidate: true,
      ref: formRef,
      onSubmit: handleSubmit,
      onBlur: handleBlur,
      onInput: handleEdit,
      onChange: handleEdit,
      onPointerDownCapture: (event) => {
        const target = event.target as Element;
        if (target.closest?.('button, input[type="submit"]'))
          skipBlurUntil.current = Date.now() + 600;
      },
      onReset: accept,
    },
    errorOf: (name) => state.messages[name] || undefined,
    summaryProps: { errors: state.summary, focusKey, ref: summaryRef },
    validate,
  };
}
