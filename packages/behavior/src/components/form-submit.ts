import { emit, focusEl } from '../core/dom';
import { bindAll, refCounted, type Behavior } from '../core/registry';
import { pm } from './page-messages';
import { announce } from './status-region';

/** Estado do envio: `idle` (normal), `busy` (enviando), `success` e `error` (resultado temporário). */
export type SubmitStatus = 'idle' | 'busy' | 'success' | 'error';
/** `native`: o navegador envia e navega; `manual`: o autor envia; `fetch`: o behavior envia. */
export type SubmitMode = 'native' | 'manual' | 'fetch';

export interface SubmitOptions {
  /** Quanto tempo (ms) o resultado "Salvo"/"Não foi possível salvar" fica no botão. Padrão: 2000. `0` = até o próximo envio. */
  feedback?: number;
}

export interface SubmitController {
  readonly state: SubmitStatus;
  /** Entra em `busy` (idempotente): `aria-busy` no form e no botão, os outros envios bloqueados. */
  start: (submitter?: HTMLElement | null) => void;
  /** Termina com sucesso: botão "Salvo" por um tempo, anúncio e `eds:form-success`. */
  success: (text?: string) => void;
  /** Termina com falha: botão "Não foi possível salvar", anúncio, foco e `eds:form-error`. */
  error: (text?: string) => void;
  /** Volta ao normal na hora (cancela o que estiver pendente). */
  reset: () => void;
  /** `start()`, e `success()` ou `error()` conforme a promessa; devolve a mesma promessa. */
  track: <T>(promise: PromiseLike<T>) => Promise<T>;
}

const config = { feedback: 2000 };
const BUSY_ANNOUNCE_MS = 1000;
const NATIVE_TIMEOUT_MS = 30000;

export function setSubmitConfig(options: SubmitOptions | undefined): void {
  if (options?.feedback !== undefined) config.feedback = options.feedback;
}

export function resetSubmitConfig(): void {
  config.feedback = 2000;
}

interface Internal extends SubmitController {
  begin: (
    submitter: HTMLElement | null,
    hooks?: { onTimeout?: () => void; abort?: () => void },
  ) => void;
  settle: (kind: 'success' | 'error', text: string | undefined, detail: object) => void;
  token: () => number;
}

const controllers = new WeakMap<HTMLFormElement, Internal>();
const bound = new Set<HTMLFormElement>();

function submitButtons(form: HTMLFormElement): HTMLElement[] {
  return [...form.elements].filter(
    (el): el is HTMLElement =>
      (el instanceof HTMLButtonElement && el.type === 'submit') ||
      (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'image')),
  );
}

function modeOf(form: HTMLFormElement): SubmitMode {
  const value = form.getAttribute('data-eds-submit');
  return value === 'fetch' || value === 'manual' ? value : 'native';
}

function numberAttr(el: Element, name: string): number | undefined {
  const raw = el.getAttribute(name);
  if (raw === null || raw.trim() === '' || Number.isNaN(Number(raw))) return undefined;
  return Number(raw);
}

function textFor(form: HTMLFormElement, button: HTMLElement | null, kind: 'success' | 'error') {
  const attr = `data-eds-submit-${kind}-text`;
  return (
    button?.getAttribute(attr) ??
    form.getAttribute(attr) ??
    pm(kind === 'success' ? 'submitSuccess' : 'submitError')
  );
}

function createController(form: HTMLFormElement): Internal {
  let state: SubmitStatus = 'idle';
  let submitter: HTMLElement | null = null;
  let token = 0;
  let onTimeout: (() => void) | null = null;
  let abort: (() => void) | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  let busyTimer: ReturnType<typeof setTimeout> | null = null;
  let restoreOthers: (() => void) | null = null;
  let restoreButton: (() => void) | null = null;
  let restoreWidth: (() => void) | null = null;

  const endBusy = () => {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (busyTimer) clearTimeout(busyTimer);
    timeoutTimer = busyTimer = null;
    onTimeout = abort = null;
    form.removeAttribute('aria-busy');
    submitter?.removeAttribute('aria-busy');
    restoreOthers?.();
    restoreOthers = null;
  };

  const clearFeedback = () => {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = null;
    restoreButton?.();
    restoreButton = null;
    restoreWidth?.();
    restoreWidth = null;
  };

  const lockWidth = (button: HTMLElement) => {
    if (restoreWidth) return;
    const width = button.getBoundingClientRect().width;
    if (width <= 0) return;
    const previous = button.style.minInlineSize;
    button.style.minInlineSize = `${width}px`;
    restoreWidth = () => {
      button.style.minInlineSize = previous;
    };
  };

  /** Troca só o texto do botão: o ícone é do CSS (`data-state`), então os filhos originais saem. */
  const applyFeedback = (button: HTMLElement, kind: 'success' | 'error', text: string) => {
    if (button instanceof HTMLInputElement) {
      const value = button.value;
      button.value = text;
      button.setAttribute('data-state', kind);
      restoreButton = () => {
        button.value = value;
        button.removeAttribute('data-state');
      };
      return;
    }
    const original = [...button.childNodes];
    const label = button.getAttribute('aria-label');
    const span = document.createElement('span');
    span.textContent = text;
    button.replaceChildren(span);
    if (label !== null) button.setAttribute('aria-label', text);
    button.setAttribute('data-state', kind);
    restoreButton = () => {
      button.replaceChildren(...original);
      button.removeAttribute('data-state');
      if (label !== null) button.setAttribute('aria-label', label);
    };
  };

  const reset = () => {
    token += 1;
    const stop = abort;
    endBusy();
    clearFeedback();
    state = 'idle';
    submitter = null;
    stop?.();
  };

  const begin: Internal['begin'] = (by, hooks) => {
    if (state === 'busy') return;
    clearFeedback();
    token += 1;
    state = 'busy';
    submitter = by ?? submitButtons(form)[0] ?? null;
    onTimeout = hooks?.onTimeout ?? null;
    abort = hooks?.abort ?? null;
    form.setAttribute('aria-busy', 'true');
    if (submitter) {
      lockWidth(submitter);
      submitter.setAttribute('aria-busy', 'true');
    }
    const others = submitButtons(form).filter((b) => b !== submitter);
    const previous = others.map((b) => b.getAttribute('aria-disabled'));
    for (const b of others) b.setAttribute('aria-disabled', 'true');
    restoreOthers = () => {
      others.forEach((b, i) => {
        const value = previous[i];
        if (value === null || value === undefined) b.removeAttribute('aria-disabled');
        else b.setAttribute('aria-disabled', value);
      });
    };
    busyTimer = setTimeout(() => announce(pm('submitBusy')), BUSY_ANNOUNCE_MS);
    const attr = numberAttr(form, 'data-eds-submit-timeout');
    const ms =
      attr ??
      (form.hasAttribute('data-eds-submit') && modeOf(form) === 'native' ? NATIVE_TIMEOUT_MS : 0);
    if (ms > 0) {
      timeoutTimer = setTimeout(() => {
        const handler = onTimeout;
        if (handler) handler();
        else if (modeOf(form) === 'native' && form.hasAttribute('data-eds-submit')) reset();
        else settle('error', undefined, {});
      }, ms);
    }
  };

  const settle: Internal['settle'] = (kind, text, detail) => {
    const target = submitter ?? submitButtons(form)[0] ?? null;
    endBusy();
    clearFeedback();
    state = kind;
    const label = text ?? textFor(form, target, kind);
    if (target) {
      lockWidth(target);
      applyFeedback(target, kind, label);
    }
    announce(label);
    // O formulário enviado deixa de ter "alterações não salvas" (dirty-guard).
    if (kind === 'success') emit(form, 'dirty-reset', {});
    emit(form, kind === 'success' ? 'form-success' : 'form-error', { ...detail, text: label });
    if (kind === 'error') {
      const summary = form.querySelector<HTMLElement>('[data-eds-error-summary]:not([hidden])');
      if (summary && !summary.hasAttribute('tabindex')) summary.tabIndex = -1;
      focusEl(summary ?? target);
    }
    const ms = numberAttr(form, 'data-eds-submit-feedback') ?? config.feedback;
    if (ms > 0 && state === kind) {
      feedbackTimer = setTimeout(reset, ms);
    }
  };

  return {
    get state() {
      return state;
    },
    start: (by) => begin(by ?? null),
    success: (text) => settle('success', text, {}),
    error: (text) => settle('error', text, {}),
    reset,
    track(promise) {
      begin(null);
      const mine = token;
      return Promise.resolve(promise).then(
        (value) => {
          if (mine === token) settle('success', undefined, { value });
          return value;
        },
        (error: unknown) => {
          if (mine === token) settle('error', undefined, { error });
          throw error;
        },
      );
    },
    begin,
    settle,
    token: () => token,
  };
}

/** Controle do estado de envio de um formulário (criado na primeira chamada). */
export function submitState(form: HTMLFormElement): SubmitController {
  let ctl = controllers.get(form);
  if (!ctl) {
    ctl = createController(form);
    controllers.set(form, ctl);
  }
  return ctl;
}

const internal = (form: HTMLFormElement): Internal => {
  submitState(form);
  return controllers.get(form) as Internal;
};

function buildData(form: HTMLFormElement, submitter: HTMLElement | null): FormData {
  try {
    return new FormData(form, submitter instanceof HTMLElement ? (submitter as HTMLElement) : null);
  } catch {
    const data = new FormData(form);
    const name = submitter?.getAttribute('name');
    if (submitter && name) data.append(name, (submitter as HTMLButtonElement).value ?? '');
    return data;
  }
}

function toSearch(data: FormData): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of data.entries()) {
    params.append(key, typeof value === 'string' ? value : value.name);
  }
  return params;
}

async function sendFetch(
  ctl: Internal,
  form: HTMLFormElement,
  submitter: HTMLElement | null,
  data: FormData,
): Promise<void> {
  const method = (submitter?.getAttribute('formmethod') ?? form.method ?? 'get').toUpperCase();
  const hasOwnAction = submitter?.hasAttribute('formaction') === true;
  let url =
    hasOwnAction &&
    (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement)
      ? submitter.formAction
      : form.action;
  const enctype = (submitter?.getAttribute('formenctype') ?? form.enctype).toLowerCase();
  const controller = new AbortController();
  ctl.begin(submitter, { abort: () => controller.abort(), onTimeout: () => controller.abort() });
  const mine = ctl.token();
  const init: RequestInit & { edsLoader?: false } = {
    method,
    signal: controller.signal,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
    },
  };
  // O botão já sinaliza o envio: o PageLoader bloqueante só entra se o form pedir (`auto`).
  if (form.getAttribute('data-eds-loader') !== 'auto') init.edsLoader = false;
  if (method === 'GET' || method === 'HEAD') {
    const target = new URL(url, window.location.href);
    target.search = toSearch(data).toString();
    url = target.href;
  } else if (enctype === 'multipart/form-data') init.body = data;
  else init.body = toSearch(data);
  try {
    const response = await fetch(url, init);
    if (mine !== ctl.token()) return;
    if (response.ok) ctl.settle('success', undefined, { response, status: response.status });
    else ctl.settle('error', undefined, { response, status: response.status });
  } catch (error) {
    if (mine !== ctl.token()) return;
    ctl.settle('error', undefined, { error });
  }
}

/** Ouvintes globais (um conjunto só para todos os formulários ligados). */
const acquireGlobal = refCounted(() => {
  // Captura na janela: roda antes de qualquer outro ouvinte e barra o segundo envio.
  const onCapture = (event: Event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !bound.has(form)) return;
    if (controllers.get(form)?.state !== 'busy') return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  // Bolha na janela: depois dos ouvintes do form e dos ancestrais, `defaultPrevented` já diz se
  // alguém (validação, confirmação, roteador) barrou ou assumiu o envio.
  const onSubmit = (event: Event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !bound.has(form) || event.defaultPrevented) return;
    const ctl = internal(form);
    if (ctl.state === 'busy') return;
    const by = (event as SubmitEvent).submitter;
    const submitter = by instanceof HTMLElement ? by : null;
    const method = (submitter?.getAttribute('formmethod') ?? form.method).toLowerCase();
    if (method === 'dialog') return;
    const mode = modeOf(form);
    if (mode === 'native') {
      const target = submitter?.getAttribute('formtarget') ?? form.target;
      if (target && target !== '_self') return;
    }
    const data = buildData(form, submitter);
    if (!emit(form, 'form-submit', { submitter, mode, data }, true)) {
      event.preventDefault();
      return;
    }
    if (mode === 'native') {
      ctl.begin(submitter);
      // Outro ouvinte (roteador, validação tardia) cancelou depois de nós: não há envio.
      setTimeout(() => {
        if (event.defaultPrevented && ctl.state === 'busy') ctl.reset();
      }, 0);
      return;
    }
    event.preventDefault();
    if (mode === 'fetch') void sendFetch(ctl, form, submitter, data);
    else ctl.begin(submitter);
  };
  // Volta pelo histórico (bfcache): a página reaparece como estava, ainda "enviando".
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    for (const form of bound) controllers.get(form)?.reset();
  };
  window.addEventListener('submit', onCapture, true);
  window.addEventListener('submit', onSubmit);
  window.addEventListener('pageshow', onPageShow);
  return () => {
    window.removeEventListener('submit', onCapture, true);
    window.removeEventListener('submit', onSubmit);
    window.removeEventListener('pageshow', onPageShow);
  };
});

/**
 * Estado de envio: `form[data-eds-submit]` (`native` padrão, `="manual"` ou `="fetch"`). No envio
 * válido o form e o botão que enviou ganham `aria-busy`, os outros botões de envio ficam
 * `aria-disabled` e novos envios são ignorados até terminar. Veja `submitState()`.
 */
export const formSubmitBehavior: Behavior = {
  name: 'form-submit',
  selector: 'form[data-eds-submit]',
  bind(el) {
    const form = el as HTMLFormElement;
    const release = acquireGlobal();
    bound.add(form);
    // O botão já sinaliza o envio: sem `data-eds-loader` no form, o PageLoader não bloqueia a página.
    const setLoader = !form.hasAttribute('data-eds-loader');
    if (setLoader) form.setAttribute('data-eds-loader', 'off');
    return () => {
      controllers.get(form)?.reset();
      bound.delete(form);
      if (setLoader && form.getAttribute('data-eds-loader') === 'off') {
        form.removeAttribute('data-eds-loader');
      }
      release();
    };
  },
};

export function initFormSubmit(root: ParentNode = document): () => void {
  return bindAll(root, [formSubmitBehavior]);
}
