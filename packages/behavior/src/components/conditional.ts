import { emit } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { announce } from './status-region';

/** Controles de formulário dentro de `el` (ou o próprio `el`). */
const CONTROLS = 'input, select, textarea, button, fieldset';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;
type Disableable = Control | HTMLFieldSetElement;

function controlsOf(el: HTMLElement): Disableable[] {
  const list = [...el.querySelectorAll<Disableable>(CONTROLS)];
  if (el.matches(CONTROLS)) list.unshift(el as Disableable);
  return list;
}

/** Valores atuais do campo `name` no escopo: texto único, marcados ou selecionados. */
function valuesOf(scope: ParentNode, name: string): string[] {
  const fields = [...scope.querySelectorAll<HTMLElement>('[name]')].filter(
    (f) => f.getAttribute('name') === name,
  );
  const out: string[] = [];
  for (const field of fields) {
    // Campo desligado por outra condição (oculto) não conta.
    if (field.hasAttribute('data-eds-cond-off')) continue;
    if (field instanceof HTMLInputElement) {
      if (field.type === 'checkbox' || field.type === 'radio') {
        if (field.checked) out.push(field.value || 'on');
      } else if (field.value !== '') out.push(field.value);
    } else if (field instanceof HTMLSelectElement) {
      for (const option of field.selectedOptions) if (option.value !== '') out.push(option.value);
    } else if (field instanceof HTMLTextAreaElement) {
      if (field.value !== '') out.push(field.value);
    }
  }
  return out;
}

/**
 * Avalia `campo=valor`, `campo!=valor`, `campo` (preenchido ou marcado) e `!campo`. O valor pode
 * ser uma lista `a|b`. Sintaxe inválida ou campo ausente: falso.
 */
export function evaluateCondition(expression: string, scope: ParentNode): boolean {
  const text = expression.trim();
  if (text === '') return false;
  const notEqual = text.indexOf('!=');
  if (notEqual > 0) {
    const name = text.slice(0, notEqual).trim();
    const wanted = text
      .slice(notEqual + 2)
      .split('|')
      .map((v) => v.trim());
    const values = valuesOf(scope, name);
    return !values.some((v) => wanted.includes(v));
  }
  const equal = text.indexOf('=');
  if (equal > 0) {
    const name = text.slice(0, equal).trim();
    const wanted = text
      .slice(equal + 1)
      .split('|')
      .map((v) => v.trim());
    return valuesOf(scope, name).some((v) => wanted.includes(v));
  }
  if (text.startsWith('!')) return valuesOf(scope, text.slice(1).trim()).length === 0;
  return valuesOf(scope, text).length > 0;
}

/** Devolve o foco ao campo citado na condição (o primeiro visível com esse nome). */
function focusController(expression: string, scope: ParentNode): void {
  const name = expression.trim().replace(/^!/, '').split(/!=|=/)[0]?.trim();
  if (!name) return;
  const target = [...scope.querySelectorAll<HTMLElement>('[name]')].find(
    (f) => f.getAttribute('name') === name && !f.hasAttribute('data-eds-cond-off') && !f.hidden,
  );
  target?.focus();
}

/**
 * Campos condicionais, sem script inline (compatível com CSP):
 * - `data-eds-show-if="campo=valor"` mostra o elemento só quando a condição vale. Oculto, ele
 *   recebe `hidden` e os campos dentro dele ficam `disabled` (não vão no envio nem validam);
 * - `data-eds-require-if="campo=valor"` torna obrigatórios (`required`) os campos dentro dele
 *   (ou ele mesmo) quando a condição vale;
 * - `data-eds-show-if-announce="Texto"` (opcional) anuncia o texto, de forma discreta, quando o
 *   bloco aparece depois de uma ação do usuário.
 * O escopo é o formulário do elemento (ou o documento). Evento `eds:conditional-change`
 * (`detail.visible`).
 */
export const conditionalBehavior: Behavior = {
  name: 'conditional',
  selector: '[data-eds-show-if], [data-eds-require-if]',
  bind(el) {
    const scope: ParentNode = el.closest('form') ?? el.ownerDocument;
    const showIf = el.getAttribute('data-eds-show-if');
    const requireIf = el.getAttribute('data-eds-require-if');
    const message = el.getAttribute('data-eds-show-if-announce');
    let visible: boolean | null = null;
    let wasRequired = new WeakMap<Element, boolean>();

    const apply = (initial: boolean) => {
      const nextVisible = showIf === null ? true : evaluateCondition(showIf, scope);
      if (nextVisible !== visible) {
        visible = nextVisible;
        // O foco que estava dentro do bloco que some vai ao campo que controla a condição.
        const lostFocus = !nextVisible && el.contains(el.ownerDocument.activeElement);
        el.hidden = !nextVisible;
        if (nextVisible) el.removeAttribute('data-eds-cond-hidden');
        else el.setAttribute('data-eds-cond-hidden', '');
        for (const control of controlsOf(el)) {
          if (!nextVisible) {
            if (!control.disabled) {
              control.disabled = true;
              control.setAttribute('data-eds-cond-off', '');
            }
          } else if (
            control.hasAttribute('data-eds-cond-off') &&
            // Continua desligado se outro bloco condicional oculto (pai ou interno) o contém.
            control.closest('[data-eds-cond-hidden]') === null
          ) {
            control.disabled = false;
            control.removeAttribute('data-eds-cond-off');
          }
        }
        if (lostFocus && showIf !== null) focusController(showIf, scope);
        if (!initial) {
          emit(el, 'conditional-change', { visible: nextVisible });
          if (nextVisible && message) announce(message);
        }
      }
      if (requireIf !== null) {
        const needed = visible !== false && evaluateCondition(requireIf, scope);
        for (const control of controlsOf(el)) {
          if (control instanceof HTMLFieldSetElement || control instanceof HTMLButtonElement) {
            continue;
          }
          if (needed) {
            if (!wasRequired.has(control)) wasRequired.set(control, control.required);
            control.required = true;
          } else if (wasRequired.has(control)) {
            control.required = wasRequired.get(control) === true;
            wasRequired.delete(control);
          }
        }
      }
    };

    const onChange = () => apply(false);
    const onReset = () => setTimeout(() => apply(false), 0);
    apply(true);
    scope.addEventListener('input', onChange);
    scope.addEventListener('change', onChange);
    if (scope instanceof HTMLFormElement) scope.addEventListener('reset', onReset);

    return () => {
      scope.removeEventListener('input', onChange);
      scope.removeEventListener('change', onChange);
      if (scope instanceof HTMLFormElement) scope.removeEventListener('reset', onReset);
      wasRequired = new WeakMap();
    };
  },
};

export function initConditional(root: ParentNode = document): () => void {
  return bindAll(root, [conditionalBehavior]);
}
