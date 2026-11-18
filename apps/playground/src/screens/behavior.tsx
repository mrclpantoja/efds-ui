/*
 * Comportamento compartilhado pelas telas (contrato de docs/architecture/comportamento.md).
 * É o que @eds-ui/react vai encapsular; aqui fica mínimo e local ao playground.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { icons } from './icons';

/** Região rolável (tabela, corpo de modal): focável por teclado só quando rola de fato. */
export function useScrollRegion(ref: RefObject<HTMLElement | null>, labelledby: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      const scrolls = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      if (scrolls) {
        el.tabIndex = 0;
        el.setAttribute('role', 'region');
        el.setAttribute('aria-labelledby', labelledby);
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-labelledby');
      }
    };
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [ref, labelledby]);
}

/** Backdrop fecha só se pointerdown E click ocorreram no próprio <dialog> (WCAG 2.5.2). */
export function useDialogBackdrop(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let downOnDialog = false;
    const onDown = (event: Event) => {
      downOnDialog = event.target === dialog;
    };
    const onClick = (event: Event) => {
      if (downOnDialog && event.target === dialog) dialog.close();
      downOnDialog = false;
    };
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('click', onClick);
    };
  }, [ref]);
}

/** showModal() + foco no elemento marcado com data-autofocus (autoFocus do React só age na montagem). */
export function openDialog(ref: RefObject<HTMLDialogElement | null>) {
  const dialog = ref.current;
  if (!dialog) return;
  dialog.showModal();
  dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
}

/* ---------------------------------- Toast ---------------------------------- */

export type ToastKind = 'info' | 'success' | 'warning' | 'danger';

interface ToastData {
  id: number;
  kind: ToastKind;
  title: string;
  text: string;
  origin: HTMLElement | null;
}

/** Dialog modal aberto mais recente, ou null: a região de toasts vai para dentro dele. */
function useModalHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => {
      const open = document.querySelectorAll<HTMLElement>('dialog:modal');
      setHost(open[open.length - 1] ?? null);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => observer.disconnect();
  }, []);
  return host;
}

function ToastItem({
  toast,
  paused,
  onClose,
}: {
  toast: ToastData;
  paused: boolean;
  onClose: (id: number) => void;
}) {
  // info/success: máx(5 s, ~1 s a cada 10 palavras); warning/danger não fecham sozinhos.
  const remaining = useRef(
    toast.kind === 'info' || toast.kind === 'success'
      ? Math.max(5000, `${toast.title} ${toast.text}`.split(/\s+/).length * 100)
      : null,
  );
  useEffect(() => {
    if (paused || remaining.current === null) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onClose(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, (remaining.current ?? 0) - (Date.now() - startedAt));
    };
  }, [paused, toast.id, onClose]);

  return (
    <div
      className={`eds-toast eds-toast-${toast.kind}`}
      data-toast-id={toast.id}
      role={toast.kind === 'danger' ? 'alert' : undefined}
    >
      <div className="eds-toast-content">
        <strong className="eds-toast-title">{toast.title}</strong> {toast.text}
      </div>
      <button
        type="button"
        className="eds-button eds-button-ghost eds-button-icon eds-button-sm eds-toast-close"
        aria-label="Fechar notificação"
        onClick={() => onClose(toast.id)}
      >
        {icons.fechar}
      </button>
    </div>
  );
}

/** Fila mínima de toasts: região polite sempre montada, pausa em hover/foco, Esc fecha. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastsRef = useRef(toasts);
  const nextId = useRef(1);
  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  // Fechar um toast com foco devolve o foco a quem o disparou (o botão sai do DOM).
  const close = useCallback((id: number) => {
    const el = document.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
    const origin = toastsRef.current.find((t) => t.id === id)?.origin;
    if (el?.contains(document.activeElement) && origin?.isConnected) origin.focus();
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, text: string, origin?: HTMLElement | null) => {
      const from =
        origin ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      setToasts((list) => [...list, { id: nextId.current++, kind, title, text, origin: from }]);
    },
    [],
  );

  return { toasts, push, close };
}

export function ToastRegion({
  toasts,
  onClose,
}: {
  toasts: ToastData[];
  onClose: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const host = useModalHost();
  const ref = useRef<HTMLDivElement>(null);

  // Esc dentro de um toast fecha só ele (e não o dialog que o contém).
  useEffect(() => {
    const region = ref.current;
    if (!region) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !(event.target instanceof Element)) return;
      const id = event.target.closest<HTMLElement>('[data-toast-id]')?.dataset.toastId;
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      onClose(Number(id));
    };
    region.addEventListener('keydown', onKeyDown);
    return () => region.removeEventListener('keydown', onKeyDown);
  }, [onClose, host]);

  const region = (
    <div
      ref={ref}
      className="eds-toast-region"
      aria-live="polite"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
      }}
    >
      {toasts.slice(0, 3).map((toast) => (
        <ToastItem key={toast.id} toast={toast} paused={hover || focus} onClose={onClose} />
      ))}
    </div>
  );

  return host ? createPortal(region, host) : region;
}
