const CONTROLS = 'input, select, textarea';
const TITLES = 'h1, h2, h3, h4, h5, h6, legend, [data-eds-section-title]';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function hasValue(el: Control): boolean {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
    return el.checked;
  if (el instanceof HTMLInputElement && el.type === 'file') return (el.files?.length ?? 0) > 0;
  return el.value.trim() !== '';
}

/**
 * Seção concluída (mesma regra do behavior `data-eds-stepper-sections`): tem controles, nenhum é
 * inválido (`validity.valid`, que não dispara `invalid` nem mostra erro) e há o que contar: ao
 * menos um `required` ou algum campo preenchido.
 */
export function isSectionComplete(section: HTMLElement): boolean {
  const controls = Array.from(section.querySelectorAll<Control>(CONTROLS)).filter(
    (el) => !el.disabled && el.type !== 'hidden' && !el.closest('[hidden], [inert]'),
  );
  if (controls.length === 0) return false;
  if (!controls.every((c) => c.validity.valid)) return false;
  return (
    controls.some((c) => c.required || c.getAttribute('aria-required') === 'true') ||
    controls.some(hasValue)
  );
}

/** Leva o foco ao título da seção (cabeçalho, `legend` ou o que o autor marcar). */
export function focusSectionTitle(section: HTMLElement): void {
  const title = section.matches(TITLES)
    ? section
    : (section.querySelector<HTMLElement>(TITLES) ?? section);
  if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
  // A navegação por fragmento tira o foco de quem não é focável: o foco vem depois dela.
  setTimeout(() => title.focus({ preventScroll: true }), 0);
}
