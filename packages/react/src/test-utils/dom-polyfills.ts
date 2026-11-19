/**
 * Polyfill mínimo, só para testes (jsdom não implementa showModal nem :modal).
 * Emula: showModal/show/close (evento `close`), `:modal` em `matches`, e Esc ->
 * `cancel` cancelável -> close. Foco preso e retorno de foco continuam sem cobertura.
 */
export function installDialogPolyfill(): () => void {
  const proto = HTMLDialogElement.prototype;
  const originalMatches = Element.prototype.matches;
  const modals: HTMLDialogElement[] = [];

  proto.showModal = function showModal(this: HTMLDialogElement) {
    if (this.open) throw new DOMException('já aberto', 'InvalidStateError');
    this.setAttribute('open', '');
    modals.push(this);
    // Passos de foco do dialog (spec): [autofocus] ou o primeiro focável, que no nosso
    // markup é o botão Fechar do cabeçalho.
    this.querySelector<HTMLElement>(
      '[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )?.focus();
  };
  proto.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    const index = modals.indexOf(this);
    if (index >= 0) modals.splice(index, 1);
    // Nativo: o evento `close` é assíncrono.
    queueMicrotask(() => this.dispatchEvent(new Event('close')));
  };
  Element.prototype.matches = function matches(this: Element, selector: string): boolean {
    if (selector === ':modal') return this instanceof HTMLDialogElement && modals.includes(this);
    return originalMatches.call(this, selector);
  } as typeof Element.prototype.matches;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const top = modals[modals.length - 1];
    if (!top) return;
    const cancel = new Event('cancel', { cancelable: true });
    top.dispatchEvent(cancel);
    if (!cancel.defaultPrevented) top.close();
  };
  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    Element.prototype.matches = originalMatches;
    modals.length = 0;
  };
}

/**
 * jsdom esconde `[popover]` fechado (UA stylesheet) e não implementa `showPopover`, então os
 * filhos ficam inacessíveis e sem foco. Em teste o popup é tratado como sempre visível; a
 * abertura continua sendo decidida pelo React (conteúdo só existe aberto).
 */
export function installPopoverStyle(): () => void {
  const style = document.createElement('style');
  style.textContent = '[popover] { display: block !important; }';
  document.head.appendChild(style);
  return () => style.remove();
}
