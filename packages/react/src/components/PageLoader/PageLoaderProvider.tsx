import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { mergeTexts } from '../../utils/texts';
import { PageLoader } from './PageLoader';
import { Button } from '../Button';
import { Stack } from '../Stack';

export interface PageLoaderOptions {
  /** Título desta pendência (a última pendência define os textos exibidos). */
  title?: string;
  /** Texto secundário desta pendência. */
  text?: string;
}

export interface PageLoaderApi {
  /** Registra uma pendência e devolve `done()` (idempotente). */
  start: (options?: PageLoaderOptions) => () => void;
  /** Mantém o loader enquanto a promessa não termina; devolve a mesma promessa. */
  track: <T>(promise: PromiseLike<T>, options?: PageLoaderOptions) => Promise<T>;
}

const PageLoaderContext = createContext<PageLoaderApi | null>(null);

/** Acesso ao loader de página. Exige `<PageLoaderProvider>` acima. */
export function usePageLoader(): PageLoaderApi {
  const api = useContext(PageLoaderContext);
  if (!api) throw new Error('usePageLoader deve ser usado dentro de <PageLoaderProvider>.');
  return api;
}

export interface PageLoaderTexts {
  /** Título padrão ("Carregando…"). */
  title: string;
  /** Texto padrão ("Aguarde um instante."). */
  text: string;
  /** Texto na demora ("Está demorando mais que o esperado."). */
  slowText: string;
  /** Botão que libera a página na demora ("Fechar"). */
  close: string;
  /** Botão que reinicia a espera ("Continuar aguardando"). */
  continue: string;
}

const defaultPageLoaderTexts: PageLoaderTexts = {
  title: 'Carregando…',
  text: 'Aguarde um instante.',
  slowText: 'Está demorando mais que o esperado.',
  close: 'Fechar',
  continue: 'Continuar aguardando',
};

export interface PageLoaderProviderProps {
  children?: ReactNode;
  /**
   * Liga o loader a todo `fetch` e `XMLHttpRequest` enquanto montado (patch global, restaurado ao
   * desmontar). Padrão: `true`; `auto={false}` desliga (só `start`/`track`).
   *
   * Só intercepta `fetch` e `XHR` (SPA). Envio de `<form>` e navegação por link recarregam a
   * página e não passam por aqui; para isso, use o `@efds-ui/behavior` ou chame `start()`.
   *
   * Exceções: `fetch(url, { edsLoader: false })`, cabeçalho `X-EDS-Loader: off` (removido antes de
   * enviar) e `exclude`. Por requisição, `fetch(url, { edsLoader: { title, text } })` define os
   * textos.
   */
  auto?: boolean;
  /**
   * Quais requisições o modo `auto` conta: `'all'` (padrão) ou `'user'`, só as disparadas durante
   * uma ativação do usuário (`navigator.userActivation.isActive`), o que deixa de fora polling e
   * chamadas de fundo.
   */
  trigger?: 'all' | 'user';
  /** Só aparece se a espera passar disso, em ms (evita piscar). Padrão: 300. */
  delay?: number;
  /** Tempo mínimo visível depois de aparecer, em ms. Padrão: 400. */
  minVisible?: number;
  /**
   * Depois de tanto tempo visível, em ms, o diálogo avisa da demora e oferece "Fechar" e
   * "Continuar aguardando". Padrão: 20000.
   */
  slowAfter?: number;
  /** Textos (padrões em pt-BR): título, texto, texto da demora e os dois botões da demora. */
  texts?: Partial<PageLoaderTexts>;
  /** URLs ignoradas pelo modo `auto` (texto contido na URL ou expressão regular), ex.: polling. */
  exclude?: (string | RegExp)[];
}

interface Shown {
  title?: string;
  text?: string;
  slow: boolean;
}

interface EngineConfig {
  delay: number;
  minVisible: number;
  slowAfter: number;
  trigger: 'all' | 'user';
  exclude?: (string | RegExp)[];
}

const HEADER = 'x-eds-loader';

/**
 * Motor do loader (sem React). `attach`/`detach` são simétricos e idempotentes: o StrictMode
 * monta, desmonta e monta de novo o mesmo provider.
 */
function createEngine(config: { current: EngineConfig }, emit: (shown: Shown | null) => void) {
  const pending = new Map<number, PageLoaderOptions>();
  let nextId = 1;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  let visibleSince = 0;
  let visible = false;
  let slow = false;
  let dismissed = false;
  let attached = false;

  const last = (): PageLoaderOptions => {
    let result: PageLoaderOptions = {};
    for (const entry of pending.values()) result = entry;
    return result;
  };
  const publish = () => {
    if (attached) emit(visible ? { ...last(), slow } : null);
  };
  const armSlow = () => {
    clearTimeout(slowTimer);
    const ms = config.current.slowAfter;
    if (!(ms > 0) || !Number.isFinite(ms)) return;
    slowTimer = setTimeout(() => {
      slow = true;
      publish();
    }, ms);
  };
  const show = () => {
    visible = true;
    visibleSince = Date.now();
    slow = false;
    armSlow();
    publish();
  };
  const hide = () => {
    visible = false;
    slow = false;
    clearTimeout(slowTimer);
    publish();
  };
  const schedule = () => {
    if (visible || dismissed || showTimer !== undefined || pending.size === 0) return;
    showTimer = setTimeout(() => {
      showTimer = undefined;
      if (pending.size > 0 && !dismissed) show();
    }, config.current.delay);
  };
  const clearTimers = () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    clearTimeout(slowTimer);
    showTimer = hideTimer = slowTimer = undefined;
  };

  const start = (options: PageLoaderOptions = {}) => {
    const id = nextId++;
    pending.set(id, options);
    clearTimeout(hideTimer);
    hideTimer = undefined;
    if (visible) publish();
    else schedule();
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      pending.delete(id);
      if (pending.size > 0) {
        if (visible) publish();
        return;
      }
      clearTimeout(showTimer);
      showTimer = undefined;
      dismissed = false;
      if (!visible) return;
      const wait = Math.max(0, config.current.minVisible - (Date.now() - visibleSince));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        hideTimer = undefined;
        hide();
      }, wait);
    };
  };

  const api: PageLoaderApi = {
    start,
    track: (promise, options) => {
      const done = start(options);
      return Promise.resolve(promise).finally(done);
    },
  };

  return {
    api,
    start,
    attach() {
      attached = true;
      if (visible) publish();
      else schedule();
    },
    detach() {
      clearTimers();
      visible = false;
      slow = false;
      emit(null);
      attached = false;
    },
    /** "Fechar" na demora: libera a página e silencia as pendências até todas terminarem. */
    dismiss() {
      dismissed = true;
      clearTimers();
      hide();
    },
    /** "Continuar aguardando": reinicia a contagem da demora. */
    keepWaiting() {
      slow = false;
      armSlow();
      publish();
    },
  };
}

/** Provider do loader de página: contagem de pendências, atraso, tempo mínimo e modo automático. */
export function PageLoaderProvider({
  children,
  auto = true,
  trigger = 'all',
  delay = 300,
  minVisible = 400,
  slowAfter = 20000,
  texts,
  exclude,
}: PageLoaderProviderProps) {
  const t = mergeTexts(defaultPageLoaderTexts, texts);
  const [shown, setShown] = useState<Shown | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const config = useRef<EngineConfig>({ delay, minVisible, slowAfter, trigger, exclude });
  useEffect(() => {
    config.current = { delay, minVisible, slowAfter, trigger, exclude };
  });

  const [engine] = useState(() => createEngine(config, setShown));

  useEffect(() => {
    engine.attach();
    return () => engine.detach();
  }, [engine]);

  const slow = shown?.slow === true;
  useEffect(() => {
    if (slow) continueRef.current?.focus();
  }, [slow]);

  // Modo automático: patch de fetch e XMLHttpRequest enquanto montado.
  useEffect(() => {
    if (!auto) return;
    const { start } = engine;
    const skipUrl = (url: string) =>
      (config.current.exclude ?? []).some((p) =>
        typeof p === 'string' ? url.includes(p) : p.test(url),
      );
    const userDriven = () =>
      config.current.trigger === 'all' ||
      (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
        ?.isActive === true;

    const originalFetch = window.fetch;
    const patchedFetch = function patchedFetch(
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit & { edsLoader?: boolean | PageLoaderOptions },
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const perRequest = init?.edsLoader;
      let skip = perRequest === false || skipUrl(url) || !userDriven();
      let nextInput = input;
      let nextInit: RequestInit | undefined = init;
      if (init && 'edsLoader' in init) {
        const { edsLoader: _ignored, ...clean } = init;
        void _ignored;
        nextInit = clean;
      }
      const source =
        nextInit?.headers ??
        (typeof input === 'object' && 'headers' in input ? input.headers : undefined);
      if (source) {
        const headers = new Headers(source);
        if (headers.get(HEADER)?.toLowerCase() === 'off') {
          skip = true;
          headers.delete(HEADER);
          if (nextInit?.headers) nextInit = { ...nextInit, headers };
          else nextInput = new Request(input as Request, { headers });
        }
      }
      const result = originalFetch.call(window, nextInput, nextInit);
      if (skip) return result;
      const done = start(typeof perRequest === 'object' && perRequest ? perRequest : undefined);
      return result.finally(done);
    };
    window.fetch = patchedFetch as typeof window.fetch;

    const proto = XMLHttpRequest.prototype;
    const originalOpen = proto.open;
    const originalSend = proto.send;
    const originalSetHeader = proto.setRequestHeader;
    const urls = new WeakMap<XMLHttpRequest, string>();
    const skipped = new WeakSet<XMLHttpRequest>();
    proto.open = function open(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      urls.set(this, String(url));
      skipped.delete(this);
      return (originalOpen as (...args: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof proto.open;
    proto.setRequestHeader = function setRequestHeader(
      this: XMLHttpRequest,
      name: string,
      value: string,
    ) {
      if (name.toLowerCase() === HEADER && value.toLowerCase() === 'off') {
        skipped.add(this);
        return;
      }
      originalSetHeader.call(this, name, value);
    };
    proto.send = function send(
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ) {
      if (!skipped.has(this) && !skipUrl(urls.get(this) ?? '') && userDriven()) {
        const done = start();
        this.addEventListener('loadend', done, { once: true });
      }
      originalSend.call(this, body);
    };

    return () => {
      if (window.fetch === (patchedFetch as typeof window.fetch)) window.fetch = originalFetch;
      if (proto.open !== originalOpen) proto.open = originalOpen;
      if (proto.send !== originalSend) proto.send = originalSend;
      if (proto.setRequestHeader !== originalSetHeader) proto.setRequestHeader = originalSetHeader;
    };
  }, [auto, engine]);

  return (
    <PageLoaderContext.Provider value={engine.api}>
      {children}
      <PageLoader
        open={shown !== null}
        title={shown?.title ?? t.title}
        text={slow ? t.slowText : (shown?.text ?? t.text)}
      >
        {slow && (
          <Stack direction="row" gap={3} justify="center" wrap>
            <Button variant="secondary" onClick={() => engine.dismiss()}>
              {t.close}
            </Button>
            <Button ref={continueRef} variant="primary" onClick={() => engine.keepWaiting()}>
              {t.continue}
            </Button>
          </Stack>
        )}
      </PageLoader>
    </PageLoaderContext.Provider>
  );
}
