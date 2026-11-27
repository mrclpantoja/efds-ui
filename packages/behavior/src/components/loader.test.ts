import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from '../index';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initLoader, loader, reset, resetLoaderConfig, setLoaderConfig } from './loader';

const dialog = () => document.querySelector('dialog.eds-page-loader') as HTMLDialogElement | null;
const isOpen = () => !!dialog()?.open;
const title = () => document.querySelector('.eds-page-loader-title');
const text = () => document.querySelector('.eds-page-loader-text');

interface Deferred {
  resolve: () => void;
  reject: () => void;
}

describe('page loader', () => {
  let restore: () => void;
  let stop: (() => void) | undefined;
  let baseFetch: ReturnType<typeof vi.fn>;
  let deferred: Deferred[];
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  let sentHeaders: string[];
  let xhrSends: XMLHttpRequest[];

  beforeEach(() => {
    vi.useFakeTimers();
    restore = installDomPolyfills();
    document.body.innerHTML = '<main id="main"><a id="link" href="/pedidos">Pedidos</a></main>';
    deferred = [];
    baseFetch = vi.fn(
      () =>
        new Promise<Response>((resolve, reject) => {
          deferred.push({
            resolve: () => resolve({ ok: true } as Response),
            reject: () => reject(new Error('rede')),
          });
        }),
    );
    window.fetch = baseFetch as unknown as typeof fetch;
    sentHeaders = [];
    xhrSends = [];
    XMLHttpRequest.prototype.setRequestHeader = function (name: string) {
      sentHeaders.push(name.toLowerCase());
    };
    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest) {
      xhrSends.push(this);
      setTimeout(() => this.dispatchEvent(new Event('loadend')), 1000);
    };
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    resetLoaderConfig();
    reset();
    dialog()?.remove();
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
    XMLHttpRequest.prototype.setRequestHeader = originalSetHeader;
    window.fetch = originalFetch;
    restore();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const resolveAll = () => deferred.forEach((d) => d.resolve());

  describe('núcleo (manual)', () => {
    it('só aparece depois do atraso de 300 ms', async () => {
      const done = loader.start({ title: 'Buscando processo…', text: 'Em andamento.' });
      await vi.advanceTimersByTimeAsync(299);
      expect(isOpen()).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      expect(isOpen()).toBe(true);
      expect(dialog()?.matches(':modal')).toBe(true);
      expect(title()).toHaveTextContent('Buscando processo…');
      expect(text()).toHaveTextContent('Em andamento.');
      done();
    });

    it('processamento rápido nunca aparece', async () => {
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(100);
      done();
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
      expect(dialog()).toBeNull();
    });

    it('depois de visível, fica no mínimo 400 ms', async () => {
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      await vi.advanceTimersByTimeAsync(100);
      done();
      await vi.advanceTimersByTimeAsync(299);
      expect(isOpen()).toBe(true);
      await vi.advanceTimersByTimeAsync(2);
      expect(isOpen()).toBe(false);
    });

    it('conta pendências: fecha só quando todas terminam; a última define os textos', async () => {
      const a = loader.start({ title: 'Primeiro' });
      const b = loader.start({ title: 'Segundo' });
      await vi.advanceTimersByTimeAsync(300);
      expect(title()).toHaveTextContent('Segundo');
      b();
      expect(title()).toHaveTextContent('Primeiro');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(true);
      a();
      await vi.advanceTimersByTimeAsync(500);
      expect(isOpen()).toBe(false);
      a();
    });

    it('track fecha ao resolver e ao rejeitar', async () => {
      await expect(loader.track(Promise.resolve(7))).resolves.toBe(7);
      const failing = loader.track(Promise.reject(new Error('x')));
      await expect(failing).rejects.toThrow('x');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
    });

    it('Esc (cancel) é bloqueado; aria-busy no main e tabindex no dialog', async () => {
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(300);
      const cancel = new Event('cancel', { cancelable: true });
      dialog()?.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBe(true);
      expect(isOpen()).toBe(true);
      expect(document.getElementById('main')).toHaveAttribute('aria-busy', 'true');
      expect(dialog()).toHaveAttribute('tabindex', '-1');
      expect(dialog()).toHaveAttribute('aria-labelledby', 'eds-page-loader-title');
      done();
      await vi.advanceTimersByTimeAsync(500);
      expect(document.getElementById('main')).not.toHaveAttribute('aria-busy');
    });

    it('textos padrão e mensagens configuráveis', async () => {
      setLoaderConfig({ title: 'Processando…', text: 'Quase lá.' });
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(300);
      expect(title()).toHaveTextContent('Processando…');
      expect(text()).toHaveTextContent('Quase lá.');
      done();
    });

    it('eds:loader-open e eds:loader-close', async () => {
      const events: string[] = [];
      document.addEventListener('eds:loader-open', () => events.push('show'));
      document.addEventListener('eds:loader-close', () => events.push('hide'));
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(300);
      done();
      await vi.advanceTimersByTimeAsync(500);
      expect(events).toEqual(['show', 'hide']);
    });

    it('mode off não faz nada', async () => {
      setLoaderConfig({ mode: 'off' });
      loader.start();
      await vi.advanceTimersByTimeAsync(1000);
      expect(dialog()).toBeNull();
    });

    it('adota o dialog#eds-page-loader já existente no HTML', async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<dialog id="eds-page-loader" class="eds-page-loader" aria-labelledby="eds-page-loader-title"><p class="eds-page-loader-title" id="eds-page-loader-title"></p><p class="eds-page-loader-text"></p></dialog>',
      );
      const done = loader.start({ title: 'Meu título' });
      await vi.advanceTimersByTimeAsync(300);
      expect(document.querySelectorAll('dialog.eds-page-loader')).toHaveLength(1);
      expect(title()).toHaveTextContent('Meu título');
      done();
    });
  });

  describe('automático: fetch', () => {
    beforeEach(() => {
      stop = init(document);
    });

    it('intercepta fetch e fecha ao responder', async () => {
      const promise = window.fetch('/api/pedidos');
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      resolveAll();
      await promise;
      await vi.advanceTimersByTimeAsync(500);
      expect(isOpen()).toBe(false);
    });

    it('fetch que falha também fecha e repassa o erro', async () => {
      const promise = window.fetch('/api/pedidos');
      const caught = promise.catch((e: Error) => e.message);
      await vi.advanceTimersByTimeAsync(300);
      deferred.forEach((d) => d.reject());
      expect(await caught).toBe('rede');
      await vi.advanceTimersByTimeAsync(500);
      expect(isOpen()).toBe(false);
    });

    it('fetch rápido não mostra o loader', async () => {
      const promise = window.fetch('/api/rapido');
      await vi.advanceTimersByTimeAsync(50);
      resolveAll();
      await promise;
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
    });

    it('edsLoader: false ignora e não repassa a chave ao fetch original', async () => {
      void window.fetch('/api/x', { method: 'POST', edsLoader: false } as RequestInit);
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
      const init = baseFetch.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(init.method).toBe('POST');
      expect('edsLoader' in init).toBe(false);
    });

    it('cabeçalho X-EDS-Loader: off ignora e é removido antes de enviar', async () => {
      void window.fetch('/api/x', {
        headers: { 'X-EDS-Loader': 'off', Accept: 'application/json' },
      });
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
      const headers = new Headers((baseFetch.mock.calls[0]?.[1] as RequestInit).headers);
      expect(headers.has('x-eds-loader')).toBe(false);
      expect(headers.get('accept')).toBe('application/json');
    });

    it('lista exclude (RegExp e texto) ignora a URL', async () => {
      setLoaderConfig({ exclude: [/\/api\/poll/, 'heartbeat'] });
      void window.fetch('/api/poll?x=1');
      void window.fetch('/status/heartbeat');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
      void window.fetch('/api/outro');
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
    });

    it('textos por requisição', async () => {
      void window.fetch('/api/x', { edsLoader: { title: 'Gerando relatório…' } } as RequestInit);
      await vi.advanceTimersByTimeAsync(300);
      expect(title()).toHaveTextContent('Gerando relatório…');
    });

    it('o Combobox remoto não aciona o loader', async () => {
      stop?.();
      document.body.innerHTML = `
        <div class="eds-combobox" data-eds-source="/busca?q=">
          <input id="c" role="combobox" aria-expanded="false" aria-controls="l" />
          <div class="eds-combobox-popup" popover="manual"><ul id="l" role="listbox"></ul></div>
        </div>`;
      stop = init(document);
      const input = document.getElementById('c') as HTMLInputElement;
      input.focus();
      input.value = 'ab';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(350);
      expect(baseFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2000);
      expect(isOpen()).toBe(false);
    });
  });

  describe('automático: XMLHttpRequest', () => {
    beforeEach(() => {
      stop = init(document);
    });

    it('intercepta XHR assíncrono e fecha no loadend', async () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/x');
      xhr.send();
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      await vi.advanceTimersByTimeAsync(800);
      expect(isOpen()).toBe(false);
    });

    it('X-EDS-Loader: off ignora e não vai para o servidor', async () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/x');
      xhr.setRequestHeader('X-EDS-Loader', 'off');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();
      await vi.advanceTimersByTimeAsync(500);
      expect(isOpen()).toBe(false);
      expect(sentHeaders).toEqual(['accept']);
    });

    it('exclude também vale para XHR', async () => {
      setLoaderConfig({ exclude: [/\/poll/] });
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/poll');
      xhr.send();
      await vi.advanceTimersByTimeAsync(500);
      expect(isOpen()).toBe(false);
    });
  });

  describe('automático: formulário e link', () => {
    beforeEach(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<form id="f" method="post" action="/salvar" data-eds-loader-title="Salvando pedido…">
           <button type="submit" id="ok">Salvar</button>
           <button type="submit" id="ajuda" data-eds-loader="off">Ajuda</button>
         </form>
         <form id="f-off" method="post" data-eds-loader="off"></form>
         <form id="f-dialog" method="dialog"></form>
         <a id="externo" href="https://exemplo.test/x">Externo</a>
         <a id="ancora" href="#topo">Âncora</a>
         <a id="nova" href="/pedidos" target="_blank">Nova aba</a>
         <a id="baixar" href="/arquivo.pdf" download>Baixar</a>
         <a id="desligado" href="/outro" data-eds-loader="off">Outro</a>
         <a id="textos" href="/rel" data-eds-loader-title="Abrindo relatório…" data-eds-loader-text="Pode demorar.">Rel</a>`,
      );
      stop = init(document);
      // jsdom não implementa navegação e reclama no console; o loader precisa do clique intacto.
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    const submit = (id: string, submitter?: HTMLElement) => {
      const form = document.getElementById(id) as HTMLFormElement;
      const event = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter });
      form.dispatchEvent(event);
    };

    it('envio de form abre o loader com os textos do form', async () => {
      submit('f', document.getElementById('ok') as HTMLElement);
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      expect(title()).toHaveTextContent('Salvando pedido…');
    });

    it('form com data-eds-loader=off, submitter off e method=dialog são ignorados', async () => {
      submit('f-off');
      submit('f', document.getElementById('ajuda') as HTMLElement);
      submit('f-dialog');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
    });

    it('submit já cancelado (consumidor usa AJAX) é ignorado', async () => {
      const form = document.getElementById('f') as HTMLFormElement;
      form.addEventListener('submit', (e) => e.preventDefault(), { once: true });
      submit('f');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
    });

    it('clique em link da mesma origem abre o loader com os textos do link', async () => {
      (document.getElementById('textos') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      expect(title()).toHaveTextContent('Abrindo relatório…');
      expect(text()).toHaveTextContent('Pode demorar.');
    });

    it('ignora link externo, âncora, nova aba, download, off e clique com modificador', async () => {
      for (const id of ['externo', 'ancora', 'nova', 'baixar', 'desligado']) {
        (document.getElementById(id) as HTMLElement).click();
      }
      document
        .getElementById('link')
        ?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
        );
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
    });

    it('pageshow persistido (voltar no histórico) fecha o loader', async () => {
      (document.getElementById('textos') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', { value: true });
      window.dispatchEvent(event);
      expect(isOpen()).toBe(false);
    });

    it('navegação que não troca a página (download) fecha pelo tempo limite', async () => {
      (document.getElementById('textos') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      await vi.advanceTimersByTimeAsync(31000);
      expect(isOpen()).toBe(false);
    });
  });

  describe('configuração e destroy', () => {
    it('manual: track funciona, mas fetch/form/link não são interceptados', async () => {
      stop = init(document, { loader: { mode: 'manual' } });
      expect(window.fetch).toBe(baseFetch);
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
      void loader.track(new Promise(() => undefined));
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
    });

    it('auto: false equivale a manual', () => {
      stop = init(document, { loader: { auto: false } });
      expect(window.fetch).toBe(baseFetch);
    });

    it('off: nada é criado nem interceptado', async () => {
      stop = init(document, { loader: { mode: 'off' } });
      expect(window.fetch).toBe(baseFetch);
      loader.start();
      await vi.advanceTimersByTimeAsync(1000);
      expect(dialog()).toBeNull();
    });

    it('configure depois do init liga e desliga as interceptações', () => {
      stop = init(document, { loader: { mode: 'manual' } });
      expect(window.fetch).toBe(baseFetch);
      setLoaderConfig({ mode: 'auto' });
      expect(window.fetch).not.toBe(baseFetch);
      setLoaderConfig({ mode: 'manual' });
      expect(window.fetch).toBe(baseFetch);
    });

    it('destroy restaura fetch e XHR originais e remove o dialog criado', async () => {
      const patchedOpen = XMLHttpRequest.prototype.open;
      const patchedSend = XMLHttpRequest.prototype.send;
      stop = init(document);
      expect(window.fetch).not.toBe(baseFetch);
      expect(XMLHttpRequest.prototype.open).not.toBe(patchedOpen);
      expect(XMLHttpRequest.prototype.send).not.toBe(patchedSend);
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      stop();
      stop = undefined;
      expect(window.fetch).toBe(baseFetch);
      expect(XMLHttpRequest.prototype.open).toBe(patchedOpen);
      expect(XMLHttpRequest.prototype.send).toBe(patchedSend);
      expect(dialog()).toBeNull();
    });

    it('vários init: só restaura quando o último é destruído', () => {
      const a = initLoader();
      const b = initLoader();
      expect(window.fetch).not.toBe(baseFetch);
      a();
      expect(window.fetch).not.toBe(baseFetch);
      b();
      expect(window.fetch).toBe(baseFetch);
    });

    it('se alguém embrulhou o fetch por cima, destroy não o desfaz e o patch fica inerte', async () => {
      stop = init(document);
      const wrapped = vi.fn((...args: Parameters<typeof fetch>) =>
        window.fetch.call(window, ...args),
      );
      const ours = window.fetch;
      window.fetch = ((...args: Parameters<typeof fetch>) =>
        ours.call(window, ...args)) as typeof fetch;
      stop();
      stop = undefined;
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
      expect(wrapped).not.toHaveBeenCalled();
    });
  });
});
