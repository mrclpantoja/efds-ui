/** Ponteiro e geometria simulados (jsdom não tem layout nem Pointer Events completos). */

export function pointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
  init: { pointerId?: number; button?: number; pointerType?: string } = {},
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: init.button ?? 0,
  });
  Object.assign(event, {
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
    isPrimary: true,
  });
  target.dispatchEvent(event);
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Fixa o `getBoundingClientRect` de um elemento. */
export function stubRect(el: Element, box: Box): void {
  const rect = {
    ...box,
    x: box.left,
    y: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
    toJSON: () => ({}),
  } as DOMRect;
  el.getBoundingClientRect = () => rect;
}
