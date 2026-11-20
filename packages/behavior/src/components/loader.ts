import { getMessages } from '../core/config';
import { emit } from '../core/dom';

export type LoaderMode = 'auto' | 'manual' | 'off';
export type LoaderTrigger = 'all' | 'user';
export type LoaderHideReason = 'done' | 'timeout' | 'closed';

export interface LoaderOptions {
  /** `auto` (padrão): intercepta fetch/XHR/form/link. `manual`: só `start`/`track`. `off`: nada. */
  mode?: LoaderMode;
  /** Atalho: `true` = `auto`, `false` = `manual` (`mode` tem prioridade). */
  auto?: boolean;
  /** Só aparece se o processamento passar deste tempo (ms). Padrão: 300. */
  delay?: number;
  /** Depois de visível, fica no mínimo este tempo (ms). Padrão: 400. */
  minVisible?: number;
  title?: string;
  text?: string;
  /** Requisições cuja URL casa (RegExp ou trecho de texto) não acionam o loader (ex.: polling). */
  exclude?: (RegExp | string)[];
  /**
   * Navegação (form/link) que não troca a página (ex.: download) deixaria o loader preso: fecha
   * sozinho depois deste tempo (ms). `0` desliga. Padrão: 10000.
   */
  navigationTimeout?: number;
  /**
   * Depois deste tempo (ms) o diálogo oferece "Fechar" e "Continuar aguardando". `0` desliga.
   * Padrão: 20000.
   */
  slowAfter?: number;
  /**
   * `all` (padrão): todo fetch/XHR conta. `user`: só os iniciados com ativação do usuário
   * (`navigator.userActivation.isActive`).
   */
  trigger?: LoaderTrigger;
}

/** Por requisição: textos (`fetch(url, { edsLoader: { title } })`) ou `false` para ignorar. */
export interface LoaderRequestOptions {
  title?: string;
  text?: string;
}

interface Resolved {
  mode: LoaderMode;
  delay: number;
  minVisible: number;
  title: string | undefined;
  text: string | undefined;
  exclude: (RegExp | string)[];
  navigationTimeout: number;
  slowAfter: number;
  trigger: LoaderTrigger;
}

const defaults = (): Resolved => ({
  mode: 'auto',
  delay: 300,
  minVisible: 400,
  title: undefined,
  text: undefined,
  exclude: [],
  navigationTimeout: 10000,
  slowAfter: 20000,
  trigger: 'all',
});

const config: Resolved = defaults();

export function setLoaderConfig(options: LoaderOptions | undefined): void {
  if (!options) return;
  const mode =
    options.mode ?? (options.auto === undefined ? undefined : options.auto ? 'auto' : 'manual');
  if (mode) config.mode = mode;
  if (options.delay !== undefined) config.delay = options.delay;
  if (options.minVisible !== undefined) config.minVisible = options.minVisible;
  if (options.title !== undefined) config.title = options.title;
  if (options.text !== undefined) config.text = options.text;
  if (options.exclude !== undefined) config.exclude = options.exclude;
  if (options.navigationTimeout !== undefined) config.navigationTimeout = options.navigationTimeout;
  if (options.slowAfter !== undefined) config.slowAfter = options.slowAfter;
  if (options.trigger !== undefined) config.trigger = options.trigger;
  syncAuto();
}

/** Volta ao padrão (usado em testes e por quem quiser reconfigurar do zero). */
export function resetLoaderConfig(): void {
  Object.assign(config, defaults());
  syncAuto();
}

export function getLoaderConfig(): Readonly<Resolved> {
  return config;
}

// ---- Núcleo: contagem de pendências, atraso, tempo mínimo, saída por demora e diálogo --------

interface Pending {
  title?: string;
  text?: string;
}

type Timer = ReturnType<typeof setTimeout> | null;

let pendings: Pending[] = [];
let dialog: HTMLDialogElement | null = null;
let ownsDialog = false;
let showTimer: Timer = null;
let hideTimer: Timer = null;
let slowTimer: Timer = null;
let visibleSince = 0;
let busyMain: HTMLElement | null = null;
/** Demorou: o diálogo mostra a saída ("Fechar" / "Continuar aguardando"). */
let slow = false;
/** O usuário fechou o diálogo: a página fica livre e as pendências contam em silêncio. */
let silent = false;
/** Fechamento feito por nós (o evento `close` seguinte não é um fechamento externo). */
let expectClose = false;

const TITLE_ID = 'eds-page-loader-title';
const TEXT_ID = 'eds-page-loader-text';

function clear(timer: Timer): null {
  if (timer) clearTimeout(timer);
  return null;
}

function ensureDialog(): HTMLDialogElement {
  if (dialog?.isConnected) return dialog;
  // Só adota o dialog declarado para isso: nunca qualquer .eds-page-loader.
  const existing = document.querySelector<HTMLDialogElement>(
    'dialog#eds-page-loader, dialog[data-eds-page-loader]',
  );
  if (existing) {
    dialog = existing;
    ownsDialog = false;
  } else {
    const el = document.createElement('dialog');
    el.id = 'eds-page-loader';
    el.className = 'eds-page-loader';
    el.setAttribute('aria-labelledby', TITLE_ID);
    el.setAttribute('aria-describedby', TEXT_ID);
    const spinner = document.createElement('span');
    spinner.className = 'eds-spinner eds-spinner-lg';
    spinner.setAttribute('aria-hidden', 'true');
    const title = document.createElement('p');
    title.className = 'eds-page-loader-title';
    title.id = TITLE_ID;
    const text = document.createElement('p');
    text.className = 'eds-page-loader-text';
    text.id = TEXT_ID;
    el.append(spinner, title, text);
    document.body.append(el);
    dialog = el;
    ownsDialog = true;
  }
  // Foco precisa de onde parar enquanto o resto da página está inerte.
  if (!dialog.hasAttribute('tabindex')) dialog.tabIndex = -1;
  if (!dialog.hasAttribute('data-eds-bound')) {
    dialog.setAttribute('data-eds-bound', '');
    // Esc não fecha: só o código fecha.
    dialog.addEventListener('cancel', (event) => event.preventDefault());
    // No Chrome o segundo Esc seguido não gera `cancel` cancelável (sem ativação do usuário) e
    // fecha o diálogo: cancelar o próprio `keydown` evita o fechamento já na origem.
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') event.preventDefault();
    });
    // Fechamento externo (ex.: segundo Esc do Chrome, que não é cancelável): reabre.
    const target = dialog;
    dialog.addEventListener('close', () => {
      if (expectClose) {
        expectClose = false;
        return;
      }
      if (pendings.length > 0 && !silent && config.mode !== 'off' && target.isConnected) show(true);
      else setBusy(false);
    });
  }
  return dialog;
}

function renderTexts(): void {
  if (!dialog) return;
  const m = getMessages();
  const last = (key: 'title' | 'text') =>
    [...pendings].reverse().find((p) => p[key] !== undefined)?.[key];
  const title = dialog.querySelector('.eds-page-loader-title');
  const text = dialog.querySelector('.eds-page-loader-text');
  if (title) title.textContent = last('title') ?? config.title ?? m.loaderTitle;
  if (text) {
    text.textContent = slow ? m.loaderSlowText : (last('text') ?? config.text ?? m.loaderText);
  }
}

function removeActions(): void {
  dialog?.querySelector('[data-eds-loader-actions]')?.remove();
}

function renderActions(): HTMLButtonElement | null {
  if (!dialog) return null;
  removeActions();
  const m = getMessages();
  const row = document.createElement('div');
  row.className = 'eds-stack eds-stack-row eds-gap-3';
  row.setAttribute('data-eds-loader-actions', '');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'eds-button eds-button-secondary';
  close.textContent = m.loaderClose;
  close.addEventListener('click', giveUp);
  const keep = document.createElement('button');
  keep.type = 'button';
  keep.className = 'eds-button eds-button-primary';
  keep.textContent = m.loaderContinue;
  keep.addEventListener('click', keepWaiting);
  row.append(close, keep);
  dialog.append(row);
  return keep;
}

function isVisible(): boolean {
  return !!dialog && dialog.open;
}

function setBusy(on: boolean): void {
  if (on) {
    busyMain ??= document.querySelector<HTMLElement>('main, [role="main"]');
    busyMain?.setAttribute('aria-busy', 'true');
  } else {
    busyMain?.removeAttribute('aria-busy');
    busyMain = null;
  }
}

function show(reopen = false): void {
  showTimer = null;
  if (pendings.length === 0 || config.mode === 'off' || silent) return;
  const el = ensureDialog();
  renderTexts();
  if (!el.open) {
    try {
      el.showModal();
    } catch {
      el.setAttribute('open', '');
    }
    if (!reopen) visibleSince = Date.now();
    setBusy(true);
    if (!reopen) emit(el, 'loader-show', {});
  }
  if (slow) renderActions()?.focus();
}

function hide(reason: LoaderHideReason): void {
  hideTimer = clear(hideTimer);
  slow = false;
  removeActions();
  setBusy(false);
  if (!dialog || !dialog.open) return;
  expectClose = true;
  dialog.close();
  emit(dialog, 'loader-hide', { reason });
}

function armSlow(): void {
  slowTimer = clear(slowTimer);
  if (config.slowAfter > 0) slowTimer = setTimeout(enterSlow, config.slowAfter);
}

function enterSlow(): void {
  slowTimer = null;
  if (pendings.length === 0 || silent) return;
  slow = true;
  if (!isVisible()) show();
  else {
    renderTexts();
    renderActions()?.focus();
  }
  if (dialog) emit(dialog, 'loader-timeout', { pending: pendings.length });
}

/** "Fechar": libera a página; as pendências seguem contando em silêncio. */
function giveUp(): void {
  silent = true;
  slowTimer = clear(slowTimer);
  hide('timeout');
}

/** "Continuar aguardando": reinicia a contagem. */
function keepWaiting(): void {
  slow = false;
  removeActions();
  renderTexts();
  armSlow();
  dialog?.focus();
}

function finish(item: Pending): void {
  const index = pendings.indexOf(item);
  if (index < 0) return;
  pendings.splice(index, 1);
  if (pendings.length > 0) {
    renderTexts();
    return;
  }
  showTimer = clear(showTimer);
  slowTimer = clear(slowTimer);
  silent = false;
  if (isVisible()) {
    const wait = Math.max(0, config.minVisible - (Date.now() - visibleSince));
    if (wait === 0) hide('done');
    else hideTimer = setTimeout(() => hide('done'), wait);
  } else {
    slow = false;
    setBusy(false);
  }
}

/**
 * Registra um processamento e devolve `done()`. O diálogo aparece se passar de `delay` ms e só
 * fecha quando todas as pendências terminam. A última pendência define os textos.
 */
export function start(options?: LoaderRequestOptions): () => void {
  if (config.mode === 'off' || typeof document === 'undefined') return () => undefined;
  const item: Pending = { title: options?.title, text: options?.text };
  if (pendings.length === 0) armSlow();
  pendings.push(item);
  hideTimer = clear(hideTimer);
  if (silent) return () => finish(item);
  if (isVisible()) renderTexts();
  else if (!showTimer) showTimer = setTimeout(() => show(), config.delay);
  return () => finish(item);
}

/** Acompanha uma promessa (fecha ao resolver ou rejeitar) e a devolve. */
export function track<T>(promise: PromiseLike<T>, options?: LoaderRequestOptions): Promise<T> {
  const done = start(options);
  return Promise.resolve(promise).then(
    (value) => {
      done();
      return value;
    },
    (error: unknown) => {
      done();
      throw error;
    },
  );
}

/** Fecha tudo de imediato (ex.: `pageshow` vindo do cache de histórico). */
export function reset(): void {
  pendings = [];
  silent = false;
  showTimer = clear(showTimer);
  slowTimer = clear(slowTimer);
  hide('closed');
}

export const loader = { start, track, reset };

// ---- Automático: fetch, XHR, form e link -----------------------------------------------------

const HEADER = 'x-eds-loader';
/** Links para arquivo baixam em vez de trocar a página. */
const FILE_LINK = /\.(pdf|xlsx?|csv|zip|docx?|odt|ods)$/i;
/** Depois de `beforeunload`, se a página continua viva a navegação foi cancelada. */
const UNLOAD_GRACE_MS = 800;

function isExcluded(url: string): boolean {
  return config.exclude.some((rule) =>
    typeof rule === 'string'
      ? url.includes(rule)
      : new RegExp(rule.source, rule.flags.replace('g', '')).test(url),
  );
}

/** `trigger: 'user'` só conta o que nasce de uma ação do usuário (sem suporte: conta tudo). */
function triggered(): boolean {
  if (config.trigger !== 'user') return true;
  const activation = navigator.userActivation;
  return activation ? activation.isActive : true;
}

type PatchedFetchInit = RequestInit & { edsLoader?: false | LoaderRequestOptions };

let active = 0;
let installed: (() => void) | null = null;

function installAuto(): () => void {
  const win = window;
  let enabled = true;
  const cleanups: (() => void)[] = [];

  // fetch
  const originalFetch = win.fetch;
  if (typeof originalFetch === 'function') {
    const patched = function patchedFetch(
      this: unknown,
      input: RequestInfo | URL,
      init?: PatchedFetchInit,
    ): Promise<Response> {
      const call = (i: RequestInfo | URL, n?: RequestInit) => originalFetch.call(this ?? win, i, n);
      if (!enabled) return call(input, init);
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      const { edsLoader, ...rest } = init ?? {};
      const headers = new Headers(
        rest.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      const headerOff = headers.get(HEADER)?.toLowerCase() === 'off';
      let nextInput = input;
      let nextInit: RequestInit | undefined = init ? rest : undefined;
      if (headerOff) {
        headers.delete(HEADER);
        if (input instanceof Request && !rest.headers) nextInput = new Request(input, { headers });
        else nextInit = { ...rest, headers };
      }
      if (edsLoader === false || headerOff || isExcluded(url) || !triggered()) {
        return call(nextInput, nextInit);
      }
      const done = start(typeof edsLoader === 'object' ? edsLoader : undefined);
      return call(nextInput, nextInit).then(
        (response) => {
          done();
          return response;
        },
        (error: unknown) => {
          done();
          throw error;
        },
      );
    };
    win.fetch = patched as typeof win.fetch;
    cleanups.push(() => {
      // Alguém embrulhou o fetch por cima do nosso: não dá para tirar, então só fica inerte.
      if (win.fetch === patched) win.fetch = originalFetch;
    });
  }

  // XMLHttpRequest
  if (typeof win.XMLHttpRequest === 'function') {
    const proto = win.XMLHttpRequest.prototype;
    const { open, send, setRequestHeader } = proto;
    const meta = new WeakMap<XMLHttpRequest, { url: string; async: boolean; off: boolean }>();
    const patchedOpen = function patchedOpen(this: XMLHttpRequest, ...args: unknown[]): void {
      const [method, url, async] = args as [string, string | URL, boolean | undefined];
      meta.set(this, { url: String(url), async: async !== false, off: false });
      (open as (...a: unknown[]) => void).call(this, method, url, ...args.slice(2));
    };
    const patchedSetHeader = function patchedSetHeader(
      this: XMLHttpRequest,
      name: string,
      value: string,
    ): void {
      const info = meta.get(this);
      if (info && name.toLowerCase() === HEADER) {
        // O cabeçalho é só uma instrução ao loader: não vai para o servidor.
        info.off = value.toLowerCase() === 'off';
        return;
      }
      setRequestHeader.call(this, name, value);
    };
    const patchedSend = function patchedSend(
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ): void {
      const info = meta.get(this);
      if (enabled && info?.async && !info.off && !isExcluded(info.url) && triggered()) {
        const done = start();
        this.addEventListener('loadend', done, { once: true });
      }
      send.call(this, body);
    };
    proto.open = patchedOpen as typeof open;
    proto.setRequestHeader = patchedSetHeader;
    proto.send = patchedSend;
    cleanups.push(() => {
      if (proto.open === patchedOpen) proto.open = open;
      if (proto.setRequestHeader === patchedSetHeader) proto.setRequestHeader = setRequestHeader;
      if (proto.send === patchedSend) proto.send = send;
    });
  }

  // Navegação de página inteira: envio de form e clique em link.
  const textsOf = (...els: (Element | null | undefined)[]): LoaderRequestOptions => {
    for (const el of els) {
      if (!el) continue;
      const title = el.getAttribute('data-eds-loader-title') ?? undefined;
      const text = el.getAttribute('data-eds-loader-text') ?? undefined;
      if (title !== undefined || text !== undefined) return { title, text };
    }
    return {};
  };
  const off = (...els: (Element | null | undefined)[]) =>
    els.some((el) => el?.getAttribute('data-eds-loader') === 'off');

  const navDones = new Set<() => void>();
  const navTimers = new Set<ReturnType<typeof setTimeout>>();
  let unloadTimer: Timer = null;
  let unloadSeenAt = -Infinity;

  const endNavigations = () => {
    for (const done of [...navDones]) done();
    navDones.clear();
    for (const timer of navTimers) clearTimeout(timer);
    navTimers.clear();
    unloadTimer = clear(unloadTimer);
  };
  const watchUnload = () => {
    unloadTimer = clear(unloadTimer);
    // Se a página ainda está viva depois do aviso, a navegação foi cancelada (ex.: "Ficar").
    unloadTimer = setTimeout(endNavigations, UNLOAD_GRACE_MS);
  };

  const navigating = (options: LoaderRequestOptions) => {
    const done = start(options);
    navDones.add(done);
    if (config.navigationTimeout > 0) {
      const timer = setTimeout(() => {
        navTimers.delete(timer);
        navDones.delete(done);
        done();
      }, config.navigationTimeout);
      navTimers.add(timer);
    }
    // O `beforeunload` pode ter saído antes de decidirmos que era uma navegação.
    if (Date.now() - unloadSeenAt < 200) watchUnload();
  };

  /**
   * Decide depois dos outros ouvintes (Turbo, Livewire, SPA cancelam o evento ou trocam o DOM):
   * relê `defaultPrevented` e `isConnected` no fim da tarefa.
   */
  const afterOthers = (event: Event, el: Element, fn: () => void) => {
    setTimeout(() => {
      if (event.defaultPrevented || !el.isConnected) return;
      fn();
    }, 0);
  };

  const onSubmit = (event: SubmitEvent) => {
    if (event.defaultPrevented) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const submitter = event.submitter;
    const method = (submitter?.getAttribute('formmethod') ?? form.method).toLowerCase();
    const target = submitter?.getAttribute('formtarget') ?? form.target;
    if (method === 'dialog' || (target && target !== '_self')) return;
    if (off(form, submitter)) return;
    const options = textsOf(submitter, form);
    afterOthers(event, form, () => navigating(options));
  };

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    if (off(link) || link.getAttribute('aria-disabled') === 'true') return;
    if (!/^https?:$/.test(link.protocol) || link.origin !== win.location.origin) return;
    if (FILE_LINK.test(link.pathname)) return;
    // Âncora na mesma página não recarrega.
    if (link.hash && link.pathname === win.location.pathname && link.search === win.location.search)
      return;
    if (isExcluded(link.href)) return;
    const options = textsOf(link);
    afterOthers(event, link, () => navigating(options));
  };

  const onBeforeUnload = () => {
    unloadSeenAt = Date.now();
    if (navDones.size > 0) watchUnload();
  };

  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      endNavigations();
      reset();
    }
  };

  document.addEventListener('submit', onSubmit);
  document.addEventListener('click', onClick);
  win.addEventListener('beforeunload', onBeforeUnload);
  win.addEventListener('pageshow', onPageShow);
  cleanups.push(() => {
    document.removeEventListener('submit', onSubmit);
    document.removeEventListener('click', onClick);
    win.removeEventListener('beforeunload', onBeforeUnload);
    win.removeEventListener('pageshow', onPageShow);
    endNavigations();
  });

  return () => {
    enabled = false;
    for (const cleanup of cleanups) cleanup();
  };
}

function syncAuto(): void {
  const want = active > 0 && config.mode === 'auto';
  if (want && !installed) installed = installAuto();
  else if (!want && installed) {
    installed();
    installed = null;
  }
  if (config.mode === 'off') reset();
}

/** Liga o loader (e, no modo `auto`, as interceptações) enquanto houver um `init` ativo. */
export function initLoader(): () => void {
  active += 1;
  syncAuto();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active -= 1;
    if (active === 0) {
      reset();
      syncAuto();
      if (dialog && ownsDialog) dialog.remove();
      dialog = null;
    }
  };
}
