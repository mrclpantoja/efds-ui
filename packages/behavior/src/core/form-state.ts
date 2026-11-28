/**
 * Registro mínimo dos formulários com a validação do efDS.ui ligada. Fica à parte para que a
 * confirmação declarativa saiba se um envio inválido será recusado sem importar a validação.
 */
const validating = new WeakSet<HTMLFormElement>();

export function markValidating(form: HTMLFormElement, on: boolean): void {
  if (on) validating.add(form);
  else validating.delete(form);
}

export const isValidating = (form: HTMLFormElement): boolean => validating.has(form);

/** Validade atual sem disparar `invalid` (sem efeito visível). */
export function isFormValid(form: HTMLFormElement): boolean {
  for (const el of Array.from(form.elements)) {
    const control = el as Partial<HTMLInputElement>;
    if (control.willValidate && control.validity && !control.validity.valid) return false;
  }
  return true;
}
