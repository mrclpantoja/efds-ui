import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, init, resetMessages } from '../index';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { loader, reset, resetLoaderConfig, setLoaderConfig } from './loader';

const dialog = () => document.getElementById('eds-page-loader') as HTMLDialogElement | null;
const isOpen = () => !!dialog()?.open;
const text = () => document.querySelector('.eds-page-loader-text');
const buttons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('[data-eds-loader-actions] button'));

describe('page loader: saída por demora, reabertura, adoção, trigger e navegação', () => {
  let restore: () => void;
  let stop: (() => void) | undefined;
  let baseFetch: ReturnType<typeof vi.fn>;
  let deferred: (() => void)[];
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const resolveAll = () => deferred.forEach((resolve) => resolve());

  beforeEach(() => {
    vi.useFakeTimers();
    restore = installDomPolyfills();
    document.body.innerHTML = '<main id="main"></main>';
    deferred = [];
    baseFetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          deferred.push(() => resolve({ ok: true } as Response));
        }),
    );
    window.fetch = baseFetch as unknown as typeof fetch;
    XMLHttpRequest.prototype.setRequestHeader = function () {};
    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest) {
      setTimeout(() => this.dispatchEvent(new Event('loadend')), 1000);
    };
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    resetLoaderConfig();
    reset();
    document.querySelectorAll('dialog').forEach((d) => d.remove());
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
    XMLHttpRequest.prototype.setRequestHeader = originalSetHeader;
    window.fetch = originalFetch;
    restore();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('slowAfter', () => {
    beforeEach(() => {
      stop = init(document);
    });
    const openSlow = async () => {
      void window.fetch('/api/lento');
      await vi.advanceTimersByTimeAsync(20000);
    };

    it('depois de 20 s troca o texto, mostra os dois botões e foca "Continuar aguardando"', async () => {
      const onTimeout = vi.fn();
      document.addEventListener('eds:loader-timeout', onTimeout);
      await openSlow();
      expect(text()).toHaveTextContent('Está demorando mais que o esperado.');
      const [close, keep] = buttons();
      expect(close).toHaveTextContent('Fechar');
      expect(close).toHaveClass('eds-button', 'eds-button-secondary');
      expect(keep).toHaveTextContent('Continuar aguardando');
      expect(keep).toHaveClass('eds-button', 'eds-button-primary');
      expect(close?.parentElement).toHaveClass('eds-stack', 'eds-stack-row', 'eds-gap-3');
      expect(document.activeElement).toBe(keep);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      document.removeEventListener('eds:loader-timeout', onTimeout);
    });

    it('antes do tempo não há botões', async () => {
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(19000);
      expect(isOpen()).toBe(true);
      expect(buttons()).toHaveLength(0);
    });

    it('Fechar libera a página e mantém as pendências em silêncio', async () => {
      const hides: unknown[] = [];
      const onHide = (e: Event) => hides.push((e as CustomEvent).detail);
      document.addEventListener('eds:loader-hide', onHide);
      await openSlow();
      buttons()[0]?.click();
      expect(isOpen()).toBe(false);
      expect(document.getElementById('main')).not.toHaveAttribute('aria-busy');
      expect(hides).toEqual([{ reason: 'timeout' }]);
      // Outra requisição enquanto a anterior segue pendente: não reabre.
      void window.fetch('/api/outra');
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
      // Tudo terminou: volta ao normal.
      resolveAll();
      await vi.advanceTimersByTimeAsync(10);
      void window.fetch('/api/nova');
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      expect(buttons()).toHaveLength(0);
      expect(text()).toHaveTextContent('Aguarde um instante.');
      document.removeEventListener('eds:loader-hide', onHide);
    });

    it('Continuar aguardando reinicia a contagem', async () => {
      await openSlow();
      buttons()[1]?.click();
      expect(buttons()).toHaveLength(0);
      expect(text()).toHaveTextContent('Aguarde um instante.');
      expect(isOpen()).toBe(true);
      await vi.advanceTimersByTimeAsync(19000);
      expect(buttons()).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1500);
      expect(buttons()).toHaveLength(2);
    });

    it('slowAfter é configurável e 0 desliga', async () => {
      setLoaderConfig({ slowAfter: 1000 });
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(1100);
      expect(buttons()).toHaveLength(2);
      reset();
      setLoaderConfig({ slowAfter: 0 });
      void window.fetch('/api/y');
      await vi.advanceTimersByTimeAsync(60000);
      expect(isOpen()).toBe(true);
      expect(buttons()).toHaveLength(0);
    });

    it('os textos vêm das mensagens configuráveis', async () => {
      configure({
        messages: { loaderSlowText: 'Slow.', loaderClose: 'Close', loaderContinue: 'Keep waiting' },
      });
      await openSlow();
      expect(text()).toHaveTextContent('Slow.');
      expect(buttons().map((b) => b.textContent)).toEqual(['Close', 'Keep waiting']);
      resetMessages();
    });

    it('vale também para XHR', async () => {
      stop?.();
      XMLHttpRequest.prototype.send = function () {};
      stop = init(document);
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/x');
      xhr.send();
      await vi.advanceTimersByTimeAsync(20000);
      expect(buttons()).toHaveLength(2);
    });
  });

  describe('motivo do eds:loader-hide', () => {
    it('done e closed (reset)', async () => {
      const hides: unknown[] = [];
      const onHide = (e: Event) => hides.push((e as CustomEvent).detail);
      document.addEventListener('eds:loader-hide', onHide);
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(300);
      done();
      await vi.advanceTimersByTimeAsync(500);
      loader.start();
      await vi.advanceTimersByTimeAsync(300);
      reset();
      expect(hides).toEqual([{ reason: 'done' }, { reason: 'closed' }]);
      document.removeEventListener('eds:loader-hide', onHide);
    });
  });

  describe('fechamento externo do diálogo', () => {
    it('reabre enquanto houver pendências e mantém aria-busy', async () => {
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(300);
      dialog()?.close();
      await vi.advanceTimersByTimeAsync(5);
      expect(isOpen()).toBe(true);
      expect(document.getElementById('main')).toHaveAttribute('aria-busy', 'true');
      done();
      await vi.advanceTimersByTimeAsync(500);
      expect(isOpen()).toBe(false);
      expect(document.getElementById('main')).not.toHaveAttribute('aria-busy');
      await vi.advanceTimersByTimeAsync(10);
      expect(isOpen()).toBe(false);
    });

    it('não reabre depois do Fechar do usuário', async () => {
      stop = init(document);
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(20000);
      buttons()[0]?.click();
      await vi.advanceTimersByTimeAsync(10);
      expect(isOpen()).toBe(false);
    });
  });

  describe('qual dialog é adotado', () => {
    it('ignora .eds-page-loader sem id eds-page-loader nem data-eds-page-loader', async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<dialog class="eds-page-loader" id="alheio"></dialog>',
      );
      const done = loader.start();
      await vi.advanceTimersByTimeAsync(300);
      expect((document.getElementById('alheio') as HTMLDialogElement).open).toBe(false);
      expect(isOpen()).toBe(true);
      done();
    });

    it('adota dialog[data-eds-page-loader]', async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<dialog data-eds-page-loader id="meu"><p class="eds-page-loader-title"></p><p class="eds-page-loader-text"></p></dialog>',
      );
      const done = loader.start({ title: 'Meu' });
      await vi.advanceTimersByTimeAsync(300);
      expect((document.getElementById('meu') as HTMLDialogElement).open).toBe(true);
      expect(document.getElementById('eds-page-loader')).toBeNull();
      done();
    });
  });

  describe('trigger', () => {
    const setActive = (isActive: boolean | undefined) => {
      Object.defineProperty(navigator, 'userActivation', {
        value: isActive === undefined ? undefined : { isActive },
        configurable: true,
      });
    };
    afterEach(() => {
      Reflect.deleteProperty(navigator, 'userActivation');
    });

    it('all (padrão) conta tudo, mesmo sem ativação do usuário', async () => {
      setActive(false);
      stop = init(document);
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
    });

    it('user só conta fetch e XHR iniciados com ativação', async () => {
      setActive(false);
      stop = init(document, { loader: { trigger: 'user' } });
      void window.fetch('/api/poll');
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/x');
      xhr.send();
      await vi.advanceTimersByTimeAsync(500);
      expect(isOpen()).toBe(false);
      setActive(true);
      void window.fetch('/api/clique');
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
    });

    it('user sem suporte a userActivation conta tudo', async () => {
      setActive(undefined);
      stop = init(document, { loader: { trigger: 'user' } });
      void window.fetch('/api/x');
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
    });
  });

  describe('navegação: decisão depois dos outros ouvintes e cancelamento', () => {
    beforeEach(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<a id="rel" href="/rel">Relatório</a>
         <a id="pdf" href="/docs/manual.pdf">PDF</a>
         <a id="xls" href="/docs/dados.XLSX">Planilha</a>
         <a id="csv" href="/docs/lista.csv">CSV</a>
         <form id="f" method="post" action="/salvar"><button type="submit" id="ok">Salvar</button></form>`,
      );
      stop = init(document);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('ignora links para arquivos comuns', async () => {
      for (const id of ['pdf', 'xls', 'csv']) (document.getElementById(id) as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(1000);
      expect(isOpen()).toBe(false);
    });

    it('link cancelado por outro ouvinte (SPA, Turbo) não abre o loader', async () => {
      const cancel = (e: Event) => e.preventDefault();
      document.addEventListener('click', cancel);
      (document.getElementById('rel') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(1000);
      document.removeEventListener('click', cancel);
      expect(isOpen()).toBe(false);
    });

    it('submit cancelado por um ouvinte posterior não abre o loader', async () => {
      const cancel = (e: Event) => e.preventDefault();
      document.addEventListener('submit', cancel);
      document
        .getElementById('f')
        ?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
      await vi.advanceTimersByTimeAsync(1000);
      document.removeEventListener('submit', cancel);
      expect(isOpen()).toBe(false);
    });

    it('elemento removido por outro ouvinte (troca de DOM) não abre o loader', async () => {
      const remove = () => document.getElementById('rel')?.remove();
      document.addEventListener('click', remove);
      (document.getElementById('rel') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(1000);
      document.removeEventListener('click', remove);
      expect(isOpen()).toBe(false);
    });

    it('navegação normal abre o loader', async () => {
      (document.getElementById('rel') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
    });

    it('beforeunload seguido de página viva (usuário escolheu ficar) fecha o loader', async () => {
      (document.getElementById('rel') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(300);
      expect(isOpen()).toBe(true);
      window.dispatchEvent(new Event('beforeunload'));
      await vi.advanceTimersByTimeAsync(700);
      expect(isOpen()).toBe(true);
      await vi.advanceTimersByTimeAsync(200);
      expect(isOpen()).toBe(false);
    });

    it('beforeunload que saiu um instante antes da decisão também é tratado', async () => {
      const early = () => window.dispatchEvent(new Event('beforeunload'));
      document.addEventListener('click', early);
      (document.getElementById('rel') as HTMLElement).click();
      document.removeEventListener('click', early);
      await vi.advanceTimersByTimeAsync(300);
      await vi.advanceTimersByTimeAsync(900);
      expect(isOpen()).toBe(false);
    });

    it('navigationTimeout padrão é de 10 s e é configurável', async () => {
      (document.getElementById('rel') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(9000);
      expect(isOpen()).toBe(true);
      await vi.advanceTimersByTimeAsync(1500);
      expect(isOpen()).toBe(false);
      setLoaderConfig({ navigationTimeout: 2000 });
      (document.getElementById('rel') as HTMLElement).click();
      await vi.advanceTimersByTimeAsync(2600);
      expect(isOpen()).toBe(false);
    });
  });
});
