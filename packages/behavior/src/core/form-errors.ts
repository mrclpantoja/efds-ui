import {
  VALIDATOR_MESSAGE_KEY,
  isValidatorName,
  parseData,
  validateBy,
  type ValidateOptions,
  type ValidationMessages,
  type ValidatorName,
} from './validate';

/** Substitui `{chave}` (o mesmo que o `format` da configuração, sem puxar o módulo inteiro). */
function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Controles de formulário que entram na validação. */
export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export const isFormControl = (el: unknown): el is FormControl =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement;

/** Rádios do mesmo nome valem como um campo só (o primeiro os representa). */
export function representativeOf(control: FormControl): FormControl {
  if (control instanceof HTMLInputElement && control.type === 'radio' && control.name) {
    const group = control.form?.elements.namedItem(control.name);
    const first = group instanceof RadioNodeList ? group[0] : group;
    if (first instanceof HTMLInputElement) return first;
  }
  return control;
}

/** Os campos que o envio valida: validáveis, visíveis e que não são botões nem ocultos. */
export function validatableControls(form: HTMLFormElement): FormControl[] {
  return Array.from(form.elements).filter(
    (el): el is FormControl =>
      isFormControl(el) &&
      el.willValidate &&
      el.type !== 'hidden' &&
      el.type !== 'submit' &&
      el.type !== 'button' &&
      el.type !== 'reset' &&
      el.closest('[hidden], [inert]') === null,
  );
}

/** Um campo recusado: o que o resumo de erros e o evento `eds:form-invalid` mostram. */
export interface InvalidField {
  /** O controle (em grupo de rádios, o primeiro). */
  element: FormControl;
  /** `id` do controle (gerado se faltar): destino do link do resumo. */
  id: string;
  name: string;
  /** Rótulo visível do campo (sem o asterisco de obrigatório). */
  label: string;
  /** Texto do erro, o mesmo que aparece junto do campo. */
  message: string;
}

/** Campos que mostram o próprio erro (Combobox, DatePicker, Lookup, máscara com validação...). */
export const SELF_REPORTING =
  '.eds-combobox, [data-eds-datepicker], [data-eds-daterange], [data-eds-timepicker], [data-eds-lookup], [data-eds-upload], [data-eds-mask-validate]';

const clean = (text: string | null | undefined): string =>
  (text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\*\s*$/, '')
    .trim();

/**
 * Rótulo visível do campo: `<label for>`, `aria-labelledby`, `aria-label` e, em grupo de rádios,
 * a `<legend>` do `<fieldset>` (o rótulo do rádio é só a opção).
 */
export function fieldLabel(control: FormControl): string {
  const doc = control.ownerDocument;
  if (control instanceof HTMLInputElement && control.type === 'radio') {
    const legend = control.closest('fieldset')?.querySelector('legend');
    if (legend) return clean(legend.textContent);
  }
  const first = control.labels?.[0];
  if (first) return clean(first.textContent);
  const ids = (control.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  if (ids.length > 0) {
    return clean(ids.map((id) => doc.getElementById(id)?.textContent ?? '').join(' '));
  }
  return clean(control.getAttribute('aria-label'));
}

/** "CPF" + "Informe um CPF válido." vira "CPF: informe um CPF válido." (sem baixar siglas). */
export function composeErrorText(label: string, message: string): string {
  if (label === '') return message;
  const text = /^\p{Lu}\p{Ll}/u.test(message)
    ? message.charAt(0).toLocaleLowerCase() + message.slice(1)
    : message;
  return `${label}: ${text}`;
}

/** Título do resumo: "Corrija 1 campo" / "Corrija N campos". */
export function summaryTitle(
  count: number,
  messages: Pick<ValidationMessages, 'errorSummaryTitleOne' | 'errorSummaryTitleMany'>,
): string {
  return count === 1
    ? messages.errorSummaryTitleOne
    : format(messages.errorSummaryTitleMany, { count });
}

/** Faixa de datas lida dos atributos `min` e `max` do campo. */
function dateRange(control: FormControl): ValidateOptions {
  const options: ValidateOptions = {};
  const min = control.getAttribute('min');
  const max = control.getAttribute('max');
  if (min) options.min = min;
  if (max) options.max = max;
  const tipo = control.getAttribute('data-eds-validate-tipo');
  if (tipo === 'fixo' || tipo === 'celular') options.tipo = tipo;
  return options;
}

const asBr = (value: string): string => {
  const parts = parseData(value);
  if (!parts) return value;
  const pad = (n: number, size = 2) => String(n).padStart(size, '0');
  return `${pad(parts.day)}/${pad(parts.month)}/${pad(parts.year, 4)}`;
};

/**
 * Texto de erro do validador (`name`) para `value`, ou `''` se o valor passa (ou está vazio). Em
 * `data`, diferencia data inexistente de data fora da faixa `min`/`max`.
 */
export function validatorMessage(
  name: ValidatorName,
  value: string,
  options: ValidateOptions,
  messages: ValidationMessages,
): string {
  if (validateBy(name, value, options)) return '';
  if (name === 'data' && parseData(value)) {
    const min = options.min ? asBr(options.min) : '';
    const max = options.max ? asBr(options.max) : '';
    if (min && max) return format(messages.validateDataRange, { min, max });
    if (min && validateBy('data', value, { max: options.max })) {
      return format(messages.validateDataMin, { min });
    }
    if (max) return format(messages.validateDataMax, { max });
    return format(messages.validateDataMin, { min });
  }
  return messages[VALIDATOR_MESSAGE_KEY[name]];
}

/**
 * Aplica o validador `name` ao valor do campo na validade nativa (`setCustomValidity`), para que
 * `checkValidity`, o Wizard e o envio enxerguem o erro. `own` troca o texto padrão. `min`, `max` e
 * `data-eds-validate-tipo` do campo entram nas opções.
 */
export function applyValidatorBy(
  control: FormControl,
  name: ValidatorName,
  messages: ValidationMessages,
  own?: string | null,
): void {
  const text = validatorMessage(name, control.value, dateRange(control), messages);
  control.setCustomValidity(text === '' ? '' : own || text);
}

/**
 * Aplica `data-eds-validate` do campo (HTML): mensagem de `data-eds-validate-message` ou o texto padrão.
 * Campos que se validam sozinhos (`SELF_REPORTING`) ficam de fora. Devolve `true` se o campo é tratado aqui.
 */
export function applyValidator(control: FormControl, messages: ValidationMessages): boolean {
  const name = control.getAttribute('data-eds-validate')?.trim() ?? '';
  if (!isValidatorName(name) || control.closest(SELF_REPORTING)) return false;
  applyValidatorBy(control, name, messages, control.getAttribute('data-eds-validate-message'));
  return true;
}

/**
 * Texto do erro atual do campo, em pt-BR e no idioma de `messages` (não no do navegador): a validade
 * personalizada (`setCustomValidity`) vale como está; `data-eds-error` do campo troca o texto das
 * restrições nativas.
 */
export function fieldMessage(control: FormControl, messages: ValidationMessages): string {
  const v = control.validity;
  if (v.valid) return '';
  if (v.customError) return control.validationMessage;
  const own = control.getAttribute('data-eds-error');
  if (own) return own;
  if (v.valueMissing) {
    if (control instanceof HTMLSelectElement) return messages.validateRequiredChoice;
    if (control instanceof HTMLInputElement) {
      if (control.type === 'checkbox') return messages.validateRequiredCheck;
      if (control.type === 'radio') return messages.validateRequiredChoice;
    }
    return messages.validateRequired;
  }
  if (v.tooShort)
    return format(messages.validateTooShort, { min: control.getAttribute('minlength') ?? '' });
  if (v.tooLong)
    return format(messages.validateTooLong, { max: control.getAttribute('maxlength') ?? '' });
  if (v.patternMismatch) return messages.validatePattern;
  if (v.typeMismatch && control instanceof HTMLInputElement && control.type === 'email') {
    return messages.validateEmail;
  }
  if (v.rangeUnderflow)
    return format(messages.validateRangeUnderflow, { min: control.getAttribute('min') ?? '' });
  if (v.rangeOverflow)
    return format(messages.validateRangeOverflow, { max: control.getAttribute('max') ?? '' });
  return control.validationMessage;
}
