/** Polyfills só para testes: o jsdom não tem layout, `showModal` nem a Popover API. */
const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} };
Range.prototype.getBoundingClientRect = () => rect as DOMRect;
Range.prototype.getClientRects = () =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: [][Symbol.iterator],
  }) as unknown as DOMRectList;
Document.prototype.elementFromPoint = () => null;

const style = document.createElement('style');
style.textContent = '.ProseMirror { white-space: pre-wrap; }';
document.head.append(style);

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.hasAttribute('open')) return;
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

// Popover API (o jsdom não tem). O `display` em linha faz o elemento aberto contar como renderizado
// (o jsdom esconde `[popover]` por padrão e não deixa focar o que há dentro).
const openPopovers = new WeakSet<Element>();
const popoverEvent = (el: HTMLElement, newState: 'open' | 'closed') => {
  const event = new Event('toggle');
  Object.assign(event, { newState });
  el.dispatchEvent(event);
};
HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
  if (openPopovers.has(this)) return;
  openPopovers.add(this);
  this.style.display = 'block';
  popoverEvent(this, 'open');
};
HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
  if (!openPopovers.delete(this)) return;
  this.style.display = '';
  popoverEvent(this, 'closed');
};
const originalMatches = Element.prototype.matches;
Element.prototype.matches = function patched(this: Element, selector: string): boolean {
  if (selector === ':popover-open') return openPopovers.has(this);
  return originalMatches.call(this, selector);
} as typeof Element.prototype.matches;

// `popovertarget` por clique (o navegador faz sozinho).
document.addEventListener('click', (event) => {
  const trigger = (event.target as Element).closest('[popovertarget]');
  const target = trigger
    ? document.getElementById(trigger.getAttribute('popovertarget') ?? '')
    : null;
  if (!target) return;
  if (openPopovers.has(target)) target.hidePopover();
  else target.showPopover();
});
