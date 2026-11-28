/**
 * Erro visível e associado (WCAG 3.3.1/3.3.3) para formulários em etapas: cada campo inválido
 * ganha `aria-invalid` e um `p.eds-error` ligado por `aria-describedby`; o erro some quando o
 * campo fica válido. Mensagem: `data-eds-error-message` do campo ou a nativa. Reaproveita o `p.eds-error`
 * do `.eds-field`. Não chama `reportValidity` (sem balão nativo duplicado).
 */
export type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const CONTROLS = 'input, select, textarea';
/** Campos compostos: o erro vai depois da raiz, não do `<input>` interno. */
const COMPOSITE = '.eds-combobox, .eds-datepicker, .eds-daterange';

interface Entry {
  el: HTMLElement;
  created: boolean;
  hidden: boolean;
  text: string;
}

export const controlsOf = (panel: HTMLElement): FieldControl[] =>
  Array.from(panel.querySelectorAll<FieldControl>(CONTROLS)).filter(
    (el) => !el.disabled && el.type !== 'hidden',
  );

let counter = 0;
const ensureId = (el: Element, prefix: string): string => {
  if (!el.id) {
    counter += 1;
    el.id = `${prefix}-${counter}`;
  }
  return el.id;
};

const describeBy = (el: Element, id: string, on: boolean): void => {
  const tokens = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  const rest = tokens.filter((t) => t !== id);
  if (on) rest.push(id);
  if (rest.length > 0) el.setAttribute('aria-describedby', rest.join(' '));
  else el.removeAttribute('aria-describedby');
};

export function createFieldErrors() {
  const entries = new Map<FieldControl, Entry>();

  const messageOf = (control: FieldControl): string =>
    control.getAttribute('data-eds-error-message') || control.validationMessage;

  const show = (control: FieldControl): void => {
    const message = messageOf(control);
    const root = control.closest<HTMLElement>(COMPOSITE);
    let entry = entries.get(control);
    if (!entry) {
      const next = root?.nextElementSibling;
      const own =
        next instanceof HTMLElement && next.matches('p.eds-error')
          ? next
          : root
            ? null
            : (control.closest('.eds-field')?.querySelector<HTMLElement>('p.eds-error') ?? null);
      // O campo composto já mostra o próprio erro: nada a acrescentar.
      if (own && !own.hidden && (own.textContent ?? '').trim() !== '' && root) return;
      if (own) {
        entry = {
          el: own,
          created: false,
          hidden: own.hidden as boolean,
          text: own.textContent ?? '',
        };
      } else {
        const el = control.ownerDocument.createElement('p');
        el.className = 'eds-error';
        el.id = `${ensureId(control, 'wizard')}-err`;
        (root ?? control.closest('label') ?? control).after(el);
        entry = { el, created: true, hidden: false, text: '' };
      }
      entries.set(control, entry);
    }
    ensureId(entry.el, 'wizard-err');
    entry.el.hidden = false;
    if (entry.el.textContent !== message) entry.el.textContent = message;
    control.setAttribute('aria-invalid', 'true');
    describeBy(control, entry.el.id, true);
  };

  const clear = (control: FieldControl): void => {
    const entry = entries.get(control);
    if (!entry) return;
    entries.delete(control);
    describeBy(control, entry.el.id, false);
    control.removeAttribute('aria-invalid');
    if (entry.created) entry.el.remove();
    else {
      entry.el.hidden = entry.hidden;
      entry.el.textContent = entry.text;
    }
  };

  return {
    /** Texto do erro do campo agora (`data-eds-error-message` ou a mensagem nativa). */
    messageOf,
    /**
     * Mostra o erro de cada campo inválido do painel e foca o primeiro (`focus: false` deixa o foco
     * para quem lista os erros). `onInvalid` recebe os campos recusados. `true` se tudo válido.
     */
    validatePanel(
      panel: HTMLElement,
      options: { focus?: boolean; onInvalid?: (controls: FieldControl[]) => void } = {},
    ): boolean {
      const groups = new Set<string>();
      const invalid: FieldControl[] = [];
      for (const control of controlsOf(panel)) {
        if (control.checkValidity()) {
          clear(control);
          continue;
        }
        if (control instanceof HTMLInputElement && control.type === 'radio' && control.name) {
          if (groups.has(control.name)) continue;
          groups.add(control.name);
        }
        show(control);
        invalid.push(control);
      }
      const first = invalid[0];
      if (!first) return true;
      options.onInvalid?.(invalid);
      if (options.focus !== false) first.focus();
      return false;
    },
    /** Ao editar: o erro some quando o campo fica válido; senão acompanha o motivo. */
    refresh(control: FieldControl): void {
      if (!entries.has(control)) return;
      if (control.checkValidity()) clear(control);
      else show(control);
    },
    clearAll(): void {
      for (const control of Array.from(entries.keys())) clear(control);
    },
  };
}
