import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/cx';
import { Button } from '../Button';
import { CloseGlyph } from '../../internal/glyphs';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  /** Padrão: `info`. `danger` e `warning` não fecham sozinhos; `danger` é anunciado como `alert`. */
  variant?: ToastVariant;
  /**
   * Rótulo em destaque que diz a severidade (ex.: "Erro:"): a cor nunca é o único canal.
   * Sem `title`, a severidade vai num prefixo oculto (ver `severityLabels` do `ToastProvider`).
   */
  title?: string;
  message: string;
}

const severityDefault: Record<ToastVariant, string> = {
  info: 'Informação:',
  success: 'Sucesso:',
  warning: 'Atenção:',
  danger: 'Erro:',
};

export interface ToastApi {
  /** Enfileira um toast e devolve o id. O foco volta ao elemento ativo de agora ao fechar. */
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Acesso à fila de toasts. Exige `<ToastProvider>` acima. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return api;
}

interface ToastEntry extends ToastOptions {
  id: number;
  variant: ToastVariant;
  closing: boolean;
}

/** Tempo da animação de saída do core; depois dele o nó é removido (também sem transitionend). */
const EXIT_MS = 300;

/** info/success: máx(5 s, ~1 s a cada 10 palavras); warning/danger ficam até serem fechados. */
function autoCloseMs(variant: ToastVariant, text: string): number | null {
  if (variant === 'warning' || variant === 'danger') return null;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(5000, words * 100);
}

const isModal = (dialog: Element) => {
  try {
    return dialog.matches(':modal');
  } catch {
    return false;
  }
};

/** Dialog modal aberto mais recente (o resto da página fica inerte), ou null. */
function findModalHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const open = Array.from(document.querySelectorAll<HTMLElement>('dialog[open]')).filter(isModal);
  return open[open.length - 1] ?? null;
}

function useModalHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(findModalHost);
  useEffect(() => {
    const update = () => setHost(findModalHost());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => observer.disconnect();
  }, []);
  return host;
}

interface ToastItemProps {
  toast: ToastEntry;
  paused: boolean;
  closeLabel: string;
  severityLabel: string;
  remaining: RefObject<Map<number, number>>;
  register: (id: number, el: HTMLElement | null) => void;
  onDismiss: (id: number) => void;
}

function ToastItem({
  toast,
  paused,
  closeLabel,
  severityLabel,
  remaining,
  register,
  onDismiss,
}: ToastItemProps) {
  const { id, variant, title, message, closing } = toast;

  // Tempo restante vive no provider: sobrevive à remontagem da região (abrir/fechar modal).
  useEffect(() => {
    const times = remaining.current;
    const left = times.get(id);
    if (left === undefined || paused || closing) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onDismiss(id), left);
    return () => {
      clearTimeout(timer);
      times.set(id, Math.max(0, left - (Date.now() - startedAt)));
    };
  }, [id, paused, closing, remaining, onDismiss]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    // Fecha só o toast, não o dialog que o contém.
    event.preventDefault();
    event.stopPropagation();
    onDismiss(id);
  };

  return (
    <div
      ref={(el) => register(id, el)}
      className={cx('eds-toast', `eds-toast-${variant}`)}
      role={variant === 'danger' ? 'alert' : undefined}
      data-closing={closing || undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="eds-toast-content">
        {title ? (
          <strong className="eds-toast-title">{title}</strong>
        ) : (
          <span className="eds-visually-hidden">{severityLabel} </span>
        )}
        {title ? ' ' : null}
        {message}
      </div>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        className="eds-toast-close"
        aria-label={closeLabel}
        onClick={() => onDismiss(id)}
      >
        <CloseGlyph />
      </Button>
    </div>
  );
}

export interface ToastProviderProps {
  children?: ReactNode;
  /** Nome acessível do botão de fechar de cada toast. Padrão: "Fechar notificação". */
  closeLabel?: string;
  /** Toasts visíveis ao mesmo tempo; os demais esperam na fila. Padrão: 3. */
  maxVisible?: number;
  /**
   * Prefixo oculto (só leitores de tela) que diz a severidade quando o toast não tem `title`.
   * Padrão: "Informação:", "Sucesso:", "Atenção:", "Erro:". Substitua por variante (i18n).
   */
  severityLabels?: Partial<Record<ToastVariant, string>>;
}

/**
 * Fila de toasts e região `aria-live="polite"` montada vazia desde o início. Com um
 * `dialog:modal` aberto, a região vai (portal) para dentro dele; fora disso fica na página.
 */
export function ToastProvider({
  children,
  closeLabel = 'Fechar notificação',
  maxVisible = 3,
  severityLabels,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);
  const elements = useRef(new Map<number, HTMLElement>());
  const origins = useRef(new Map<number, HTMLElement | null>());
  const remaining = useRef(new Map<number, number>());
  const count = useRef(0);
  const closingIds = useRef(new Set<number>());
  const [hover, setHover] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const host = useModalHost();

  const register = useCallback((id: number, el: HTMLElement | null) => {
    if (el) elements.current.set(id, el);
    else elements.current.delete(id);
  }, []);

  const dismiss = useCallback((id: number) => {
    if (closingIds.current.has(id)) return;
    closingIds.current.add(id);
    // O botão focado sai do DOM: devolve o foco a quem disparou o toast.
    const el = elements.current.get(id);
    const origin = origins.current.get(id);
    if (el?.contains(document.activeElement)) {
      if (origin?.isConnected) origin.focus();
      // Origem fora do alcance (inerte atrás de um dialog modal, oculta ou removida): o foco não
      // pode cair no body. Vai ao primeiro controle do dialog que contém a região e, fora de
      // dialog, ao <main> (o AppShell o torna focável com tabIndex=-1).
      if (el.contains(document.activeElement) || document.activeElement === document.body) {
        const region = el.parentElement;
        const inDialog = Array.from(
          el
            .closest('dialog')
            ?.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ) ?? [],
        ).find((node) => !region?.contains(node));
        (inDialog ?? document.querySelector<HTMLElement>('main'))?.focus();
      }
    }
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
      closingIds.current.delete(id);
      origins.current.delete(id);
      remaining.current.delete(id);
      // Nó removido com foco/mouse em cima não dispara blur/leave: zera ao esvaziar a região.
      count.current -= 1;
      if (count.current <= 0) {
        setHover(false);
        setFocusWithin(false);
      }
    }, EXIT_MS);
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    count.current += 1;
    const variant = options.variant ?? 'info';
    const active = document.activeElement;
    origins.current.set(
      id,
      active instanceof HTMLElement && active !== document.body ? active : null,
    );
    const ms = autoCloseMs(variant, `${options.title ?? ''} ${options.message}`);
    if (ms !== null) remaining.current.set(id, ms);
    setToasts((list) => [...list, { ...options, id, variant, closing: false }]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);
  const visible = toasts.slice(0, maxVisible);

  const region = (
    <div
      className="eds-toast-region"
      aria-live="polite"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
    >
      {visible.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          paused={hover || focusWithin}
          closeLabel={closeLabel}
          severityLabel={severityLabels?.[toast.variant] ?? severityDefault[toast.variant]}
          remaining={remaining}
          register={register}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {host ? createPortal(region, host) : region}
    </ToastContext.Provider>
  );
}
