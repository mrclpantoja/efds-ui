import { emit } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { pm } from './page-messages';
import { announce } from './status-region';

const FEEDBACK_MS = 2000;

/** Copia `text` para a área de transferência: Clipboard API, com `execCommand` como reserva. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Sem permissão ou página sem contexto seguro: tenta a reserva.
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.insetBlockStart = '0';
  area.style.opacity = '0';
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.append(area);
  try {
    area.select();
    return typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    active?.focus();
  }
}

/** Texto a copiar: literal em `data-eds-copy-text` ou o valor/texto do alvo de `data-eds-copy`. */
function sourceText(el: HTMLElement): string | null {
  const literal = el.getAttribute('data-eds-copy-text');
  if (literal !== null) return literal;
  const selector = el.getAttribute('data-eds-copy');
  if (!selector) return null;
  let target: Element | null = null;
  try {
    target = el.ownerDocument.querySelector(selector);
  } catch {
    target = null;
  }
  if (!target) return null;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return target.value;
  }
  return (target.textContent ?? '').trim();
}

interface Label {
  get: () => string;
  set: (text: string) => void;
}

/** Onde mora o rótulo do botão: `.eds-copy-label`, o último texto solto ou o `aria-label`. */
function labelOf(button: HTMLElement): Label {
  const marked = button.querySelector<HTMLElement>('.eds-copy-label, [data-eds-copy-label]');
  if (marked) return { get: () => marked.textContent ?? '', set: (t) => (marked.textContent = t) };
  const nodes = [...button.childNodes].filter(
    (n): n is Text => n.nodeType === Node.TEXT_NODE && (n.nodeValue ?? '').trim() !== '',
  );
  const last = nodes[nodes.length - 1];
  if (last) return { get: () => last.nodeValue ?? '', set: (t) => (last.nodeValue = t) };
  return {
    get: () => button.getAttribute('aria-label') ?? '',
    set: (t) => button.setAttribute('aria-label', t),
  };
}

/**
 * Botão de copiar: `data-eds-copy="#alvo"` (valor ou texto do elemento) ou
 * `data-eds-copy-text="literal"`. Troca o rótulo por "Copiado" por 2 s (`data-copied`), anuncia
 * e emite `eds:copy-success` (`detail.text`) ou `eds:copy-error`. O texto vem de `data-eds-copy-done-text`
 * quando o botão traz o seu.
 */
export const copyBehavior: Behavior = {
  name: 'copy',
  selector: '[data-eds-copy], [data-eds-copy-text]',
  bind(button) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let restore: (() => void) | null = null;

    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      restore?.();
      restore = null;
      button.removeAttribute('data-copied');
    };

    const onClick = (event: Event) => {
      if (button instanceof HTMLButtonElement && button.disabled) return;
      if (button.tagName === 'A') event.preventDefault();
      const text = sourceText(button);
      if (text === null) return;
      void copyText(text).then((ok) => {
        if (!button.isConnected) return;
        if (!ok) {
          announce(pm('copyFailed'));
          emit(button, 'copy-error', { text });
          return;
        }
        reset();
        const label = labelOf(button);
        const before = label.get();
        label.set(button.getAttribute('data-eds-copy-done-text') || pm('copyDone'));
        button.setAttribute('data-copied', '');
        restore = () => label.set(before);
        timer = setTimeout(reset, FEEDBACK_MS);
        announce(pm('copyAnnounce'));
        emit(button, 'copy-success', { text });
      });
    };

    button.addEventListener('click', onClick);
    return () => {
      button.removeEventListener('click', onClick);
      reset();
    };
  },
};

export function initCopy(root: ParentNode = document): () => void {
  return bindAll(root, [copyBehavior]);
}
