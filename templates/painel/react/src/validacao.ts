/**
 * Validação de formulário pela própria API do navegador (validity), com mensagens em texto
 * visível (p.eds-error) em vez do balão nativo. Mesmas mensagens da versão HTML (assets/app.js).
 */
type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function mensagem(campo: Campo): string {
  const v = campo.validity;
  if (v.valueMissing) return 'Preencha este campo.';
  if (v.typeMismatch && campo.type === 'email')
    return 'Informe um e-mail válido, como nome@exemplo.com.br.';
  if (v.tooShort && 'minLength' in campo) return `Use ao menos ${campo.minLength} caracteres.`;
  return campo.validationMessage;
}

/** Erros por `name` dos campos inválidos do formulário (vazio = válido). */
export function validar(form: HTMLFormElement): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    if (
      (el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement) &&
      el.name &&
      !el.validity.valid
    ) {
      erros[el.name] ??= mensagem(el);
    }
  }
  return erros;
}

/** Leva o foco ao primeiro campo com erro (depois do React desenhar as mensagens). */
export function focarPrimeiroErro(form: HTMLFormElement) {
  setTimeout(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
}
