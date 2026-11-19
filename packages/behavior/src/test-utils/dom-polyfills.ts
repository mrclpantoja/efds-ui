/**
 * Polyfills só para testes (jsdom não implementa `showModal`, `:modal` nem a Popover API).
 * Dialog: showModal/show/close, `:modal`, Esc -> `cancel` cancelável -> close.
 * Popover: showPopover/hidePopover/togglePopover, `:popover-open`, `toggle` (assíncrono, como no
 * navegador), `popovertarget` por clique e Esc em `popover="auto"`.
 */
export function installDomPolyfills(): () => void {
  const dialogProto = HTMLDialogElement.prototype;
  const originalMatches = Element.prototype.matches;
  const modals: HTMLDialogElement[] = [];
  const popovers = new Set<Element>();

  dialogProto.showModal = function showModal(this: HTMLDialogElement) {
    if (this.open) throw new DOMException('já aberto', 'InvalidStateError');
    this.setAttribute('open', '');
    modals.push(this);
    this.querySelector<HTMLElement>(
      '[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )?.focus();
  };
  dialogProto.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  dialogProto.close = function close(this: HTMLDialogElement, result?: string) {
    if (!this.open) return;
    if (result !== undefined) this.returnValue = result;
    this.removeAttribute('open');
    const index = modals.indexOf(this);
    if (index >= 0) modals.splice(index, 1);
    queueMicrotask(() => this.dispatchEvent(new Event('close')));
  };

  const fireToggle = (el: Element, newState: 'open' | 'closed') => {
    queueMicrotask(() => {
      const event = new Event('toggle');
      Object.assign(event, { newState, oldState: newState === 'open' ? 'closed' : 'open' });
      el.dispatchEvent(event);
    });
  };
  const proto = HTMLElement.prototype;
  proto.showPopover = function showPopover(this: HTMLElement) {
    if (popovers.has(this)) return;
    popovers.add(this);
    fireToggle(this, 'open');
  };
  proto.hidePopover = function hidePopover(this: HTMLElement) {
    if (!popovers.delete(this)) return;
    fireToggle(this, 'closed');
  };
  proto.togglePopover = function togglePopover(this: HTMLElement) {
    if (popovers.has(this)) this.hidePopover();
    else this.showPopover();
    return popovers.has(this);
  };

  Element.prototype.matches = function matches(this: Element, selector: string): boolean {
    if (selector === ':modal') return this instanceof HTMLDialogElement && modals.includes(this);
    if (selector === ':popover-open') return popovers.has(this);
    return originalMatches.call(this, selector);
  } as typeof Element.prototype.matches;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const top = modals[modals.length - 1];
    if (top) {
      const cancel = new Event('cancel', { cancelable: true });
      top.dispatchEvent(cancel);
      if (!cancel.defaultPrevented) top.close();
      return;
    }
    for (const el of [...popovers]) {
      if (el.getAttribute('popover') !== 'manual') (el as HTMLElement).hidePopover();
    }
  };
  const onClick = (event: MouseEvent) => {
    const trigger = (event.target as Element).closest('[popovertarget]');
    if (!trigger) return;
    const target = document.getElementById(trigger.getAttribute('popovertarget') ?? '');
    if (!target) return;
    const action = trigger.getAttribute('popovertargetaction') ?? 'toggle';
    if (action === 'hide') target.hidePopover();
    else if (action === 'show') target.showPopover();
    else target.togglePopover();
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);
  // jsdom trata o conteúdo de [popover] fechado como não renderizado (sem foco): o estado de
  // abertura é emulado em memória, então o CSS do UA é neutralizado.
  const style = document.createElement('style');
  style.textContent = '[popover] { display: block; }';
  document.head.append(style);

  return () => {
    style.remove();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onClick);
    Element.prototype.matches = originalMatches;
    modals.length = 0;
    popovers.clear();
  };
}

/** Deixa os microtasks (eventos `toggle`, MutationObserver) e timers de 0 ms correrem. */
export const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** `DataTransfer` mínimo (jsdom não tem): `items.add(file)` e `files` (array com `item`). */
export function installDataTransferPolyfill(): () => void {
  const target = globalThis as unknown as { DataTransfer?: unknown };
  const original = target.DataTransfer;
  class FakeDataTransfer {
    private list: File[] = [];
    readonly items = {
      add: (file: File) => {
        this.list.push(file);
      },
    };
    get files(): File[] & { item: (index: number) => File | null } {
      const files = [...this.list] as File[] & { item: (index: number) => File | null };
      files.item = (index) => files[index] ?? null;
      return files;
    }
  }
  target.DataTransfer = FakeDataTransfer;
  return () => {
    target.DataTransfer = original;
  };
}

/** Simula a escolha de arquivos no seletor: troca `input.files` (gravável) e dispara `change`. */
export function pickFiles(input: HTMLInputElement, files: File[]): void {
  let current: unknown = files;
  Object.defineProperty(input, 'files', {
    configurable: true,
    get: () => current,
    set: (value: unknown) => {
      current = value;
    },
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
