import { getMessages } from '../core/config';
import { emit, ensureId } from '../core/dom';
import { createErrorSlot, type ErrorSlot } from '../core/error-slot';
import {
  SELF_REPORTING,
  applyValidator,
  fieldLabel,
  fieldMessage,
  isFormControl,
  representativeOf,
  validatableControls,
  type FormControl,
  type InvalidField,
} from '../core/form-errors';
import type { Behavior } from '../core/registry';

/** Quem mostra a lista (o resumo de erros) para o controlador do formulário. */
export interface SummaryView {
  render(fields: readonly InvalidField[]): void;
  /** Atualiza a lista depois de uma edição (corrigidos saem; zerada, o resumo se esconde). */
  update(fields: readonly InvalidField[]): void;
  clear(): void;
  focus(): boolean;
}

export interface FormController {
  /** Liga um resumo; devolve a limpeza. */
  addSummary(view: SummaryView): () => void;
  /** Conta um uso do controlador; devolve a liberação (a última desliga tudo). */
  retain(): () => void;
}

const controllers = new WeakMap<HTMLFormElement, FormController>();

/** Texto do erro que o próprio campo já mostra (Combobox, DatePicker...), se houver. */
function ownVisibleError(control: FormControl, ours: HTMLElement | null): string {
  const ids = (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  for (const id of ids) {
    const el = control.ownerDocument.getElementById(id);
    if (!el || el === ours || el.hidden || !el.classList.contains('eds-error')) continue;
    const text = el.textContent?.trim() ?? '';
    if (text !== '') return text;
  }
  return '';
}

function anchorOf(control: FormControl): Element {
  if (control instanceof HTMLInputElement && control.type === 'radio') {
    return control.closest('fieldset') ?? control.closest('label') ?? control;
  }
  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    return control.closest('label') ?? control;
  }
  return control.closest('.eds-input-group') ?? control;
}

function createController(form: HTMLFormElement, dispose: () => void): FormController {
  const ac = new AbortController();
  const { signal } = ac;
  const slots = new WeakMap<FormControl, ErrorSlot>();
  const armed = new WeakSet<FormControl>();
  const summaries = new Set<SummaryView>();
  /** Campos da última recusa de envio, que o resumo mostra e vai podando ao corrigir. */
  let shown: InvalidField[] = [];
  let uses = 0;
  let skipBlurUntil = 0;
  const wasNoValidate = form.noValidate;
  const wizard = form.hasAttribute('data-eds-wizard');
  // Sem JS o navegador valida sozinho (balão nativo); com JS o erro é visível e fica no campo.
  if (!wizard) form.noValidate = true;

  const messages = () => getMessages();

  const controls = (): FormControl[] => validatableControls(form);

  const slotOf = (control: FormControl): ErrorSlot => {
    let slot = slots.get(control);
    if (!slot) {
      slot = createErrorSlot(control, () => anchorOf(control));
      slots.set(control, slot);
    }
    return slot;
  };

  const toField = (control: FormControl, message: string): InvalidField => ({
    element: control,
    id: ensureId(control, 'field'),
    name: control.name,
    label: fieldLabel(control),
    message,
  });

  /** Mensagem do campo agora: a que ele mesmo mostra ou a calculada. */
  const messageOf = (control: FormControl): string =>
    ownVisibleError(control, slots.get(control)?.element ?? null) ||
    fieldMessage(control, messages());

  /** Valida um campo: erro visível e `aria-invalid` se inválido; limpa se válido. */
  const evaluate = (control: FormControl, arm: boolean): boolean => {
    applyValidator(control, messages());
    if (control.validity.valid) {
      slots.get(control)?.clear();
      return true;
    }
    if (arm) armed.add(control);
    if (!control.closest(SELF_REPORTING)) slotOf(control).show(fieldMessage(control, messages()));
    return false;
  };

  /** Valida o formulário todo (envio): devolve os inválidos, na ordem do documento. */
  const validateAll = (): InvalidField[] => {
    const invalid: InvalidField[] = [];
    const seen = new Set<FormControl>();
    for (const control of controls()) {
      const rep = representativeOf(control);
      if (seen.has(rep)) continue;
      seen.add(rep);
      applyValidator(rep, messages());
      // `checkValidity` dispara `invalid`: é por ele que Combobox, DatePicker etc. mostram o erro.
      if (rep.checkValidity()) {
        slots.get(rep)?.clear();
        continue;
      }
      armed.add(rep);
      const own = ownVisibleError(rep, slots.get(rep)?.element ?? null);
      const message = own || fieldMessage(rep, messages());
      if (!own) slotOf(rep).show(message);
      invalid.push(toField(rep, message));
    }
    return invalid;
  };

  const pushSummary = () => {
    for (const view of summaries) view.update(shown);
  };

  /** Depois de editar: tira do resumo o que foi corrigido e atualiza o texto do que segue inválido. */
  const refreshSummary = () => {
    if (shown.length === 0) return;
    shown = shown
      .filter((field) => field.element.isConnected && !field.element.validity.valid)
      .map((field) => ({ ...field, message: messageOf(field.element) || field.message }));
    pushSummary();
  };

  const controlOf = (target: EventTarget | null): FormControl | null => {
    if (!isFormControl(target) || target.type === 'hidden') return null;
    return representativeOf(target);
  };

  const onSubmit = (event: Event) => {
    const submitter = (event as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
      if (submitter.formNoValidate) return;
    }
    const invalid = validateAll();
    if (invalid.length === 0) {
      shown = [];
      for (const view of summaries) view.clear();
      return;
    }
    // Recusado como o navegador recusaria: sem `submit` para os demais ouvintes (loader, etc.).
    event.preventDefault();
    event.stopImmediatePropagation();
    shown = invalid;
    for (const view of summaries) view.render(invalid);
    emit(form, 'form-invalid', { fields: invalid });
    let focused = false;
    for (const view of summaries) focused = view.focus() || focused;
    if (!focused) invalid[0]?.element.focus();
  };

  const onFocusOut = (event: Event) => {
    const control = controlOf(event.target);
    if (!control || control.closest(SELF_REPORTING)) return;
    // Clicar no botão de envio tira o foco do campo e o erro empurraria o botão: o envio valida tudo.
    if (Date.now() < skipBlurUntil) return;
    const next = (event as FocusEvent).relatedTarget;
    // Outra janela: o foco não saiu do campo de verdade.
    if (next === null && !form.ownerDocument.hasFocus()) return;
    // Dentro do mesmo grupo de rádios o foco só passa de uma opção a outra.
    if (control instanceof HTMLInputElement && control.type === 'radio') {
      if (next instanceof HTMLInputElement && next.type === 'radio' && next.name === control.name) {
        return;
      }
    }
    evaluate(control, true);
    refreshSummary();
  };

  const onEdit = (event: Event) => {
    const control = controlOf(event.target);
    if (!control) return;
    // Só depois do primeiro erro mostrado: digitar pela primeira vez nunca acusa erro.
    if (armed.has(control) && !control.closest(SELF_REPORTING)) evaluate(control, false);
    // Os campos que se validam sozinhos atualizam a validade no próprio ouvinte; confere depois dele.
    queueMicrotask(refreshSummary);
  };

  const onPointerDown = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('button, input[type="submit"]')) {
      skipBlurUntil = Date.now() + 600;
    }
  };

  const onReset = () => {
    for (const control of controls()) {
      slots.get(control)?.clear();
      armed.delete(control);
    }
    shown = [];
    for (const view of summaries) view.clear();
  };

  if (!wizard) {
    form.addEventListener('submit', onSubmit, { capture: true, signal });
    form.addEventListener('focusout', onFocusOut, { signal });
    form.addEventListener('input', onEdit, { signal });
    form.addEventListener('change', onEdit, { signal });
    form.addEventListener('pointerdown', onPointerDown, { capture: true, signal });
    form.addEventListener('reset', onReset, { signal });
  }

  const controller: FormController = {
    addSummary(view) {
      summaries.add(view);
      return () => summaries.delete(view);
    },
    retain() {
      uses += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        uses -= 1;
        if (uses > 0) return;
        ac.abort();
        for (const control of controls()) slots.get(control)?.clear();
        if (!wizard) form.noValidate = wasNoValidate;
        controllers.delete(form);
        dispose();
      };
    },
  };
  return controller;
}

/** O controlador do formulário (um por `<form>`, compartilhado por campos e resumos). */
export function formControllerOf(form: HTMLFormElement): FormController {
  let controller = controllers.get(form);
  if (!controller) {
    controller = createController(form, () => undefined);
    controllers.set(form, controller);
  }
  return controller;
}

/**
 * Validação declarativa: `data-eds-validate="cpf|cnpj|cpf-cnpj|cep|telefone|email|pis|titulo|placa|data"`
 * no campo. O valor inválido vira `setCustomValidity` (então `checkValidity`, o Wizard e o envio o
 * enxergam) com o texto padrão pt-BR (`configure({ messages })`) ou o de `data-eds-error-message`.
 * Campo vazio é válido: use `required`. `data` lê `min` e `max` do campo; `telefone` aceita
 * `data-eds-validate-phone-type="landline|mobile"`.
 *
 * O formulário do campo passa a mostrar o erro visível (`p.eds-error` ligado por `aria-describedby`,
 * `aria-invalid`) em vez do balão nativo (`novalidate` por JS; sem JS o navegador ainda valida
 * `required`/`pattern`): ao sair do campo e ao enviar, e depois do primeiro erro também ao digitar,
 * até ele sumir. Vale para todos os campos do formulário, com ou sem o atributo. Envio recusado:
 * evento `eds:form-invalid` (`detail.fields`) e foco no resumo de erros ou no primeiro campo inválido.
 */
export const validateBehavior: Behavior = {
  name: 'validate',
  selector: 'input[data-eds-validate], select[data-eds-validate], textarea[data-eds-validate]',
  bind(el) {
    if (!isFormControl(el)) return;
    const control = el;
    const form = control.form;
    const release = form ? formControllerOf(form).retain() : () => undefined;
    const ac = new AbortController();
    const apply = () => {
      applyValidator(control, getMessages());
    };
    apply();
    // `input` e `change` do próprio campo rodam antes do ouvinte do formulário (que lê a validade).
    control.addEventListener('input', apply, { signal: ac.signal });
    control.addEventListener('change', apply, { signal: ac.signal });
    return () => {
      ac.abort();
      control.setCustomValidity('');
      release();
    };
  },
};

/** `form[data-eds-validate-form]`: o formulário mostra erros visíveis mesmo sem campos `data-eds-validate`. */
export const validateFormBehavior: Behavior = {
  name: 'validate-form',
  selector: 'form[data-eds-validate-form]',
  bind(el) {
    if (!(el instanceof HTMLFormElement)) return;
    return formControllerOf(el).retain();
  },
};

export { type InvalidField };
