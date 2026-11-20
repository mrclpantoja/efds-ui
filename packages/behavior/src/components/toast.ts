import { closeIcon, emit, FOCUSABLE, safeMatches } from '../core/dom';
import { getMessages } from '../core/config';
import { refCounted } from '../core/registry';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  /** Padrão: `info`. `danger` e `warning` não fecham sozinhos; `danger` é anunciado como `alert`. */
  variant?: ToastVariant;
  /** Rótulo em destaque que diz a severidade (ex.: "Erro:"). Sem ele, a severidade vai oculta. */
  title?: string;
  message: string;
  /**
   * Tempo até fechar, em ms. `0` mantém o toast até ser fechado. Padrão: info/success
   * máx(5 s, ~1 s a cada 10 palavras); warning/danger não fecham sozinhos.
   */
  duration?: number;
  /** Botão de ação (ex.: "Desfazer"): roda `onClick` e fecha o toast. */
  action?: { label: string; onClick: () => void };
}

/** Toasts visíveis ao mesmo tempo; os demais esperam na fila. */
const MAX_VISIBLE = 3;
/** Tempo da animação de saída do core. */
const EXIT_MS = 300;
/** Quanto a região fica muda depois de trocar de lugar (cobre a reinserção dos nós no DOM). */
const MOVE_QUIET_MS = 60;

interface Entry {
  id: number;
  options: ToastOptions & { variant: ToastVariant };
  el: HTMLElement | null;
  origin: HTMLElement | null;
  /** Tempo que falta (ms) ou `null` se não fecha sozinho. */
  remaining: number | null;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  closing: boolean;
}

let region: HTMLElement | null = null;
let entries: Entry[] = [];
let nextId = 1;
let hover = false;
let focusWithin = false;
let hostObserver: MutationObserver | null = null;
let regionReady = false;
let readyTimer: ReturnType<typeof setTimeout> | null = null;
/** A região mudou de lugar com toasts dentro: fica muda (`aria-live="off"`) por um instante. */
let moveTimer: ReturnType<typeof setTimeout> | null = null;

function autoCloseMs(variant: ToastVariant, text: string): number | null {
  if (variant === 'warning' || variant === 'danger') return null;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(5000, words * 100);
}

/** `dialog:modal` aberto mais recente (o resto da página fica inerte) ou `document.body`. */
function findHost(): HTMLElement {
  const open = Array.from(document.querySelectorAll<HTMLElement>('dialog[open]')).filter((d) =>
    safeMatches(d, ':modal'),
  );
  return open[open.length - 1] ?? document.body;
}

const paused = () => hover || focusWithin;

function startTimer(entry: Entry) {
  if (entry.remaining === null || entry.timer || entry.closing || paused()) return;
  entry.startedAt = Date.now();
  entry.timer = setTimeout(() => dismiss(entry.id), entry.remaining);
}

function stopTimer(entry: Entry) {
  if (!entry.timer) return;
  clearTimeout(entry.timer);
  entry.timer = null;
  if (entry.remaining !== null) {
    entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
  }
}

function ensureRegion(): HTMLElement {
  if (region?.isConnected && region.parentElement === findHost()) return region;
  if (!region) {
    region = document.createElement('div');
    region.className = 'eds-toast-region';
    region.setAttribute('aria-live', 'polite');
    region.addEventListener('mouseenter', () => {
      hover = true;
      entries.forEach(stopTimer);
    });
    region.addEventListener('mouseleave', () => {
      hover = false;
      entries.forEach(startTimer);
    });
    region.addEventListener('focusin', () => {
      focusWithin = true;
      entries.forEach(stopTimer);
    });
    region.addEventListener('focusout', (event) => {
      if (region?.contains(event.relatedTarget as Node | null)) return;
      focusWithin = false;
      entries.forEach(startTimer);
    });
  }
  // Com um dialog modal aberto a região vai para dentro dele; fora disso, na página.
  place(findHost());
  return region;
}

/**
 * Leva a região (a mesma, nunca uma segunda) para `host`. Mover um nó o remove e o reinsere, e
 * o leitor de tela releria os toasts que já estavam nela: com conteúdo, a região fica com
 * `aria-live="off"` durante a troca e volta a `polite` logo depois; toasts novos esperam.
 */
function place(host: HTMLElement): void {
  if (!region || region.parentElement === host) return;
  if (region.childElementCount === 0) {
    host.append(region);
    return;
  }
  region.setAttribute('aria-live', 'off');
  host.append(region);
  if (moveTimer) clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    moveTimer = null;
    region?.setAttribute('aria-live', 'polite');
    flush();
  }, MOVE_QUIET_MS);
}

function buildToast(entry: Entry): HTMLElement {
  const { variant, title, message } = entry.options;
  const m = getMessages();
  const severity = {
    info: m.severityInfo,
    success: m.severitySuccess,
    warning: m.severityWarning,
    danger: m.severityDanger,
  }[variant];

  const el = document.createElement('div');
  el.className = `eds-toast eds-toast-${variant}`;
  if (variant === 'danger') el.setAttribute('role', 'alert');

  const content = document.createElement('div');
  content.className = 'eds-toast-content';
  if (title) {
    const strong = document.createElement('strong');
    strong.className = 'eds-toast-title';
    strong.textContent = title;
    content.append(strong, ' ');
  } else {
    const hidden = document.createElement('span');
    hidden.className = 'eds-visually-hidden';
    hidden.textContent = `${severity} `;
    content.append(hidden);
  }
  content.append(message);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'eds-button eds-button-ghost eds-button-icon eds-button-sm eds-toast-close';
  close.setAttribute('aria-label', m.toastClose);
  close.append(closeIcon());
  close.addEventListener('click', () => dismiss(entry.id));

  // Esc fecha só o toast, não o dialog que o contém.
  el.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    dismiss(entry.id);
  });

  const { action } = entry.options;
  if (action) {
    const act = document.createElement('button');
    act.type = 'button';
    act.className = 'eds-button eds-button-ghost eds-button-sm eds-toast-action';
    act.textContent = action.label;
    act.addEventListener('click', () => {
      dismiss(entry.id);
      action.onClick();
    });
    el.append(content, act, close);
  } else el.append(content, close);
  return el;
}

function flush() {
  if (!regionReady || moveTimer) return;
  const host = ensureRegion();
  const visible = entries.filter((e) => e.el).length;
  let room = MAX_VISIBLE - visible;
  for (const entry of entries) {
    if (room <= 0) break;
    if (entry.el || entry.closing) continue;
    entry.el = buildToast(entry);
    host.append(entry.el);
    startTimer(entry);
    room -= 1;
  }
}

/** Reposiciona a região quando um dialog modal abre ou fecha. */
function watchHost() {
  hostObserver?.disconnect();
  hostObserver = new MutationObserver(() => {
    if (region) place(findHost());
  });
  hostObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open'],
  });
}

/**
 * Mostra uma notificação. A região `aria-live` é criada vazia na primeira chamada e o toast só
 * entra um instante depois (uma live region que nasce preenchida não é anunciada).
 * Devolve o id (use com `toast.dismiss`).
 */
export function toast(options: ToastOptions): number {
  const variant = options.variant ?? 'info';
  const id = nextId++;
  const active = document.activeElement;
  const duration = options.duration;
  const remaining =
    duration === undefined
      ? autoCloseMs(variant, `${options.title ?? ''} ${options.message}`)
      : duration > 0
        ? duration
        : null;
  entries.push({
    id,
    options: { ...options, variant },
    el: null,
    origin: active instanceof HTMLElement && active !== document.body ? active : null,
    remaining,
    startedAt: 0,
    timer: null,
    closing: false,
  });
  if (!region) {
    ensureRegion();
    watchHost();
  }
  if (regionReady) flush();
  else if (!readyTimer) {
    readyTimer = setTimeout(() => {
      readyTimer = null;
      regionReady = true;
      flush();
    }, 50);
  }
  return id;
}

/** Fecha um toast (devolve o foco a quem o disparou, se o foco estava nele). */
function dismiss(id: number): void {
  const entry = entries.find((e) => e.id === id);
  if (!entry || entry.closing) return;
  entry.closing = true;
  stopTimer(entry);
  const el = entry.el;
  if (el) {
    if (el.contains(document.activeElement)) {
      const { origin } = entry;
      if (origin?.isConnected) origin.focus();
      // Origem fora do alcance (inerte atrás de um modal, oculta ou removida): o foco não cai no
      // body. Vai ao 1º controle do dialog que contém a região e, fora de dialog, ao <main>.
      if (el.contains(document.activeElement) || document.activeElement === document.body) {
        const dialog = el.closest('dialog');
        const inDialog = Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).find(
          (node) => !region?.contains(node),
        );
        const main = document.querySelector<HTMLElement>('main');
        if (!inDialog && main && !main.hasAttribute('tabindex')) main.tabIndex = -1;
        (inDialog ?? main)?.focus();
      }
    }
    el.setAttribute('data-closing', '');
    emit(el, 'toast-close', { id });
  }
  setTimeout(() => {
    entry.el?.remove();
    entries = entries.filter((e) => e !== entry);
    if (entries.every((e) => !e.el)) {
      hover = false;
      focusWithin = false;
    }
    flush();
  }, EXIT_MS);
}

toast.dismiss = dismiss;

/** Fecha todos os toasts, visíveis ou na fila, sem animação. */
toast.dismissAll = function dismissAll(): void {
  for (const entry of entries) {
    stopTimer(entry);
    entry.el?.remove();
  }
  entries = [];
};

function teardown() {
  toast.dismissAll();
  if (readyTimer) clearTimeout(readyTimer);
  readyTimer = null;
  if (moveTimer) clearTimeout(moveTimer);
  moveTimer = null;
  regionReady = false;
  hostObserver?.disconnect();
  hostObserver = null;
  region?.remove();
  region = null;
  hover = false;
  focusWithin = false;
}

const acquire = refCounted(() => teardown);

/** Mantém o sistema de toast "ligado" enquanto houver um `init` ativo; `destroy` o desmonta. */
export function initToast(): () => void {
  return acquire();
}
