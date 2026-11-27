import { emit, focusEl } from '../core/dom';
import { pm, type PageMessageKey } from './page-messages';

export interface SessionOptions {
  /** Segundos sem atividade até a sessão expirar. Padrão: 900 (15 min). */
  timeout?: number;
  /** Segundos de aviso antes de expirar. Padrão: 60. */
  warnBefore?: number;
  /** Chamado quando a sessão expira (ou o usuário escolhe "Sair"). */
  onExpire?: () => void;
  /** Chamado quando o aviso abre (`remaining` em segundos). */
  onWarn?: (remaining: number) => void;
  /**
   * Endereço para renovar a sessão no servidor (POST, mesmo site). Sem ele nenhuma chamada de
   * rede é feita. Chamado ao "Continuar conectado" e, com atividade, no máximo a cada
   * `keepAliveEvery`.
   */
  keepAliveUrl?: string;
  /** Segundos entre renovações por atividade. Padrão: 300. */
  keepAliveEvery?: number;
  /** Ao expirar, navega para este endereço (saída). */
  logoutUrl?: string;
  /** Chave do `localStorage` para sincronizar as abas. Padrão: `eds-session`. */
  storageKey?: string;
  /** Textos desta sessão (sobrepõem `configure({ messages })`). */
  messages?: Partial<Record<PageMessageKey, string>>;
}

export interface SessionHandle {
  /** O usuário continua conectado: reinicia a contagem em todas as abas. */
  extend: () => void;
  /** Segundos até expirar. */
  remaining: () => number;
  destroy: () => void;
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'mousemove'];
const SVG_NS = 'http://www.w3.org/2000/svg';

let active: SessionHandle | null = null;

function glyph(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M12 7v5l3 2');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '9');
  svg.append(circle, path);
  return svg;
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Sessão por inatividade (WCAG 2.2.1 e 2.2.6). Qualquer atividade (ponteiro, teclado, rolagem)
 * reinicia a contagem. Faltando `warnBefore` segundos abre um `alertdialog` modal com a contagem
 * (visual, sem anúncio por segundo: o leitor de tela ouve o tempo ao abrir, a cada minuto e aos
 * 10 s) e dois botões: "Continuar conectado" e "Sair". Esc continua conectado. Com a contagem
 * zerada, chama `onExpire`, dispara `eds:session-expire` em `<html>` e navega a `logoutUrl`.
 * A atividade e a expiração são compartilhadas entre as abas pelo `localStorage`. Não faz
 * nenhuma chamada de rede sem `keepAliveUrl`.
 */
export function session(options: SessionOptions = {}): SessionHandle {
  active?.destroy();

  const timeoutMs = Math.max(1, options.timeout ?? 15 * 60) * 1000;
  let warnMs = Math.max(0, options.warnBefore ?? 60) * 1000;
  if (warnMs >= timeoutMs) warnMs = Math.floor(timeoutMs / 2);
  const keepAliveMs = (options.keepAliveEvery ?? 300) * 1000;
  const key = options.storageKey ?? 'eds-session';
  const lastKey = `${key}-last`;
  const nonce = Math.random().toString(36).slice(2);
  const store = safeStorage();
  const text = (k: PageMessageKey, values: Record<string, string | number> = {}): string => {
    const own = options.messages?.[k];
    if (own === undefined) return pm(k, values);
    return own.replace(/\{(\w+)\}/g, (m, name: string) =>
      name in values ? String(values[name]) : m,
    );
  };

  const spoken = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const minutes =
      m > 0 ? text(m === 1 ? 'sessionMinuteOne' : 'sessionMinuteMany', { count: m }) : '';
    const secs =
      s > 0 || m === 0
        ? text(s === 1 ? 'sessionSecondOne' : 'sessionSecondMany', { count: s })
        : '';
    return [minutes, secs].filter(Boolean).join(text('sessionAnd'));
  };
  const clock = (seconds: number): string =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  // ---- Estado --------------------------------------------------------------------------------

  let last = Date.now();
  let lastWrite = 0;
  let lastPing = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let expired = false;
  let announced = new Set<number>();

  function write(type: 'activity' | 'expired', at: number): void {
    lastWrite = Date.now();
    try {
      store?.setItem(lastKey, String(at));
      store?.setItem(key, `${nonce}|${type}|${at}|${Math.random()}`);
    } catch {
      // Sem armazenamento: cada aba conta sozinha.
    }
  }

  const stored = Number(store?.getItem(lastKey) ?? '');
  if (Number.isFinite(stored) && stored > 0 && Date.now() - stored < timeoutMs) last = stored;
  else write('activity', last);

  const remainingMs = (): number => last + timeoutMs - Date.now();

  // ---- Diálogo de aviso ----------------------------------------------------------------------

  let dialog: HTMLDialogElement | null = null;
  let countdown: HTMLElement | null = null;
  let status: HTMLElement | null = null;
  let origin: HTMLElement | null = null;

  const closeDialog = (restoreFocus: boolean) => {
    if (!dialog) return;
    const el = dialog;
    dialog = null;
    countdown = null;
    status = null;
    announced = new Set();
    if (el.open) el.close();
    el.remove();
    if (restoreFocus) focusEl(origin);
    origin = null;
  };

  const ping = () => {
    if (!options.keepAliveUrl) return;
    lastPing = Date.now();
    try {
      void fetch(options.keepAliveUrl, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // fetch indisponível: segue sem renovar no servidor.
    }
  };

  const extend = () => {
    if (destroyed || expired) return;
    last = Date.now();
    write('activity', last);
    closeDialog(true);
    ping();
    emit(document.documentElement, 'session-extend', {});
    schedule();
  };

  const expire = (broadcast: boolean) => {
    if (destroyed || expired) return;
    expired = true;
    if (timer) clearTimeout(timer);
    timer = null;
    closeDialog(false);
    if (broadcast) write('expired', Date.now());
    emit(document.documentElement, 'session-expire', {});
    options.onExpire?.();
    if (options.logoutUrl) window.location.assign(options.logoutUrl);
  };

  const openDialog = (seconds: number) => {
    if (dialog) return;
    origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = `eds-session-${nonce}`;
    const el = document.createElement('dialog');
    el.className = 'eds-modal eds-alert-dialog eds-alert-dialog-warning';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('data-eds-backdrop', 'static');
    el.setAttribute('aria-labelledby', `${id}-t`);
    el.setAttribute('aria-describedby', `${id}-d`);

    const icon = document.createElement('div');
    icon.className = 'eds-alert-dialog-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.append(glyph());

    const title = document.createElement('h2');
    title.className = 'eds-alert-dialog-title';
    title.id = `${id}-t`;
    title.textContent = text('sessionTitle');

    const body = document.createElement('p');
    body.className = 'eds-alert-dialog-text';
    body.id = `${id}-d`;
    // A contagem visual não é lida (aria-hidden); o tempo falado vai uma vez, ao abrir.
    countdown = document.createElement('strong');
    countdown.className = 'eds-session-countdown';
    countdown.setAttribute('aria-hidden', 'true');
    countdown.setAttribute('data-eds-session-countdown', '');
    countdown.textContent = clock(seconds);
    const spokenNow = document.createElement('span');
    spokenNow.className = 'eds-visually-hidden';
    spokenNow.textContent = spoken(seconds);
    const [before = '', after = ''] = text('sessionBody', { time: ' ' }).split(' ');
    body.append(before, countdown, spokenNow, after);

    // A região fica dentro do diálogo: fora dele o resto da página está inerte.
    status = document.createElement('div');
    status.className = 'eds-visually-hidden';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const actions = document.createElement('div');
    actions.className = 'eds-alert-dialog-actions';
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'eds-button eds-button-secondary';
    leave.textContent = text('sessionLeave');
    const stay = document.createElement('button');
    stay.type = 'button';
    stay.className = 'eds-button eds-button-primary';
    stay.setAttribute('autofocus', '');
    stay.textContent = text('sessionContinue');
    actions.append(leave, stay);

    el.append(icon, title, body, status, actions);
    leave.addEventListener('click', () => expire(true));
    stay.addEventListener('click', extend);
    el.addEventListener('cancel', (event) => {
      event.preventDefault();
      extend();
    });
    document.body.append(el);
    dialog = el;
    try {
      el.showModal();
    } catch {
      el.setAttribute('open', '');
    }
    stay.focus();
    options.onWarn?.(seconds);
  };

  /** Anúncios moderados: a cada minuto cheio abaixo do aviso e aos 10 s. */
  const milestones = (): number[] => {
    const list: number[] = [];
    for (let s = 60; s < warnMs / 1000; s += 60) list.push(s);
    if (warnMs / 1000 > 10) list.push(10);
    return list;
  };

  function schedule(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    if (destroyed || expired) return;
    const rem = remainingMs();
    if (rem <= 0) {
      expire(true);
      return;
    }
    if (warnMs > 0 && rem <= warnMs) {
      const seconds = Math.ceil(rem / 1000);
      if (!dialog) openDialog(seconds);
      else if (countdown) countdown.textContent = clock(seconds);
      for (const m of milestones()) {
        if (seconds <= m && !announced.has(m)) {
          announced.add(m);
          if (status) status.textContent = text('sessionAnnounce', { time: spoken(seconds) });
        }
      }
      // O próximo toque do relógio cai no começo do próximo segundo restante.
      timer = setTimeout(schedule, rem % 1000 || 1000);
      return;
    }
    // Longe do aviso: dorme até lá (no máximo 30 s, para absorver suspensão do computador).
    timer = setTimeout(schedule, Math.min(rem - warnMs, 30_000));
  }

  // ---- Atividade e outras abas ---------------------------------------------------------------

  const onActivity = () => {
    if (destroyed || expired || dialog) return;
    const now = Date.now();
    // No máximo uma escrita por segundo (mousemove e rolagem disparam sem parar).
    if (now - lastWrite < 1000) return;
    last = now;
    write('activity', now);
    if (options.keepAliveUrl && now - lastPing > keepAliveMs) ping();
    schedule();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key || !event.newValue) return;
    const [from, type, at] = event.newValue.split('|');
    if (from === nonce) return;
    if (type === 'expired') {
      expire(false);
      return;
    }
    const time = Number(at);
    if (Number.isFinite(time) && time > last) {
      last = time;
      closeDialog(false);
      schedule();
    }
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') schedule();
  };

  for (const name of ACTIVITY_EVENTS) {
    document.addEventListener(name, onActivity, { passive: true, capture: true });
  }
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisible);
  schedule();

  const handle: SessionHandle = {
    extend,
    remaining: () => Math.max(0, Math.ceil(remainingMs() / 1000)),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      for (const name of ACTIVITY_EVENTS) {
        document.removeEventListener(name, onActivity, { capture: true });
      }
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      closeDialog(false);
      if (active === handle) active = null;
    },
  };
  active = handle;
  return handle;
}

/**
 * Liga a sessão pelo HTML: um elemento (em geral o próprio `<script>`) com
 * `data-eds-session-timeout="900"` e, opcionais, `data-eds-session-warn="60"`,
 * `data-eds-session-keepalive-url`, `data-eds-session-logout-url`. Sem o atributo, não faz nada.
 */
export function initSession(root: ParentNode = document): () => void {
  const doc = (root as Node).ownerDocument ?? (root as Document);
  const el = doc.querySelector<HTMLElement>('[data-eds-session-timeout]');
  if (!el) return () => undefined;
  const num = (name: string): number | undefined => {
    const value = Number(el.getAttribute(name));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const handle = session({
    timeout: num('data-eds-session-timeout'),
    warnBefore: num('data-eds-session-warn'),
    keepAliveUrl: el.getAttribute('data-eds-session-keepalive-url') || undefined,
    logoutUrl: el.getAttribute('data-eds-session-logout-url') || undefined,
  });
  return () => handle.destroy();
}
