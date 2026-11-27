import { StrictMode, useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { PageLoader } from './PageLoader';
import { PageLoaderProvider, usePageLoader, type PageLoaderApi } from './PageLoaderProvider';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
  vi.useFakeTimers();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function dialog() {
  return document.querySelector<HTMLDialogElement>('dialog.eds-page-loader')!;
}

describe('PageLoader', () => {
  it('abre com showModal, nomeia pelo título e bloqueia Esc', () => {
    render(
      <main>
        <PageLoader open title="Buscando processo…" texts={{ text: 'Aguarde.' }} />
      </main>,
    );
    const d = dialog();
    expect(d).toHaveAttribute('open');
    expect(d.matches(':modal')).toBe(true);
    expect(d).toHaveAccessibleName('Buscando processo…');
    expect(d).toHaveAccessibleDescription('Aguarde.');
    expect(d.querySelector('.eds-spinner-lg')).toHaveAttribute('aria-hidden', 'true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(d).toHaveAttribute('open');
  });

  it('aria-busy no main enquanto aberto e fecha com open=false', () => {
    const { rerender } = render(
      <>
        <main>conteúdo</main>
        <PageLoader open />
      </>,
    );
    expect(document.querySelector('main')).toHaveAttribute('aria-busy', 'true');
    rerender(
      <>
        <main>conteúdo</main>
        <PageLoader open={false} />
      </>,
    );
    expect(document.querySelector('main')).not.toHaveAttribute('aria-busy');
    expect(dialog()).not.toHaveAttribute('open');
  });
});

describe('PageLoaderProvider', () => {
  let api: PageLoaderApi;
  function Grab() {
    api = usePageLoader();
    return null;
  }
  const mount = (props: React.ComponentProps<typeof PageLoaderProvider> = {}) =>
    render(
      <PageLoaderProvider {...props}>
        <main>
          <Grab />
        </main>
      </PageLoaderProvider>,
    );

  it('usePageLoader fora do provider lança erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Grab />)).toThrow(/PageLoaderProvider/);
  });

  it('só aparece depois de 300 ms e não pisca em trabalho curto', () => {
    mount();
    expect(dialog()).not.toHaveAttribute('open');
    let done = api.start();
    tick(299);
    expect(dialog()).not.toHaveAttribute('open');
    act(() => done());
    tick(1000);
    expect(dialog()).not.toHaveAttribute('open');

    done = api.start();
    tick(300);
    expect(dialog()).toHaveAttribute('open');
    act(() => done());
  });

  it('fica no mínimo 400 ms visível', () => {
    mount();
    const done = api.start();
    tick(300);
    expect(dialog()).toHaveAttribute('open');
    tick(100);
    act(() => done());
    tick(299);
    expect(dialog()).toHaveAttribute('open');
    tick(1);
    expect(dialog()).not.toHaveAttribute('open');
    expect(document.querySelector('main')).not.toHaveAttribute('aria-busy');
  });

  it('conta pendências e a última define os textos', () => {
    mount();
    const a = api.start({ title: 'Buscando processo…' });
    const b = api.start({ title: 'Salvando…', text: 'Quase lá.' });
    tick(300);
    expect(dialog()).toHaveAccessibleName('Salvando…');
    expect(dialog()).toHaveAccessibleDescription('Quase lá.');
    act(() => b());
    expect(dialog()).toHaveAccessibleName('Buscando processo…');
    tick(1000);
    expect(dialog()).toHaveAttribute('open');
    act(() => {
      a();
      a(); // idempotente
    });
    tick(500);
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('nova pendência durante o tempo mínimo cancela o fechamento', () => {
    mount();
    const a = api.start();
    tick(300);
    act(() => a());
    const b = api.start();
    tick(1000);
    expect(dialog()).toHaveAttribute('open');
    act(() => b());
    tick(400);
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('track acompanha a promessa e devolve o resultado', async () => {
    mount({ texts: { title: 'Padrão', text: 'Texto padrão' } });
    let resolve!: (v: number) => void;
    const promise = new Promise<number>((r) => (resolve = r));
    let result: Promise<number>;
    act(() => {
      result = api.track(promise);
    });
    tick(300);
    expect(dialog()).toHaveAccessibleName('Padrão');
    await act(async () => {
      resolve(7);
      await promise;
    });
    await expect(result!).resolves.toBe(7);
    tick(400);
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('delay e minVisible configuráveis', () => {
    mount({ delay: 50, minVisible: 10 });
    const done = api.start();
    tick(50);
    expect(dialog()).toHaveAttribute('open');
    act(() => done());
    tick(10);
    expect(dialog()).not.toHaveAttribute('open');
  });

  describe('auto', () => {
    it('auto={false} não mexe no fetch', () => {
      const original = window.fetch;
      mount({ auto: false });
      expect(window.fetch).toBe(original);
    });

    it('é ligado por padrão: faz patch de fetch, acompanha a requisição e restaura ao desmontar', async () => {
      let finish!: () => void;
      const fake = vi.fn(
        () => new Promise<Response>((r) => (finish = () => r(new Response('ok')))),
      );
      window.fetch = fake as unknown as typeof window.fetch;
      const original = window.fetch;
      const { unmount } = mount();
      expect(window.fetch).not.toBe(original);

      let request!: Promise<Response>;
      act(() => {
        request = window.fetch('/api/processos');
      });
      expect(fake).toHaveBeenCalledWith('/api/processos', undefined);
      tick(300);
      expect(dialog()).toHaveAttribute('open');
      await act(async () => {
        finish();
        await request;
      });
      tick(400);
      expect(dialog()).not.toHaveAttribute('open');

      unmount();
      expect(window.fetch).toBe(original);
    });

    it('respeita edsLoader:false, X-EDS-Loader e exclude (sem vazar o cabeçalho)', async () => {
      const fake = vi.fn(() => new Promise<Response>(() => {}));
      window.fetch = fake as unknown as typeof window.fetch;
      mount({ exclude: [/\/poll$/, 'health'] });
      act(() => {
        void window.fetch('/a', { edsLoader: false } as RequestInit);
        void window.fetch('/b', { headers: { 'X-EDS-Loader': 'off', Accept: 'json' } });
        void window.fetch('/x/poll');
        void window.fetch('/health?x=1');
      });
      tick(1000);
      expect(dialog()).not.toHaveAttribute('open');
      const calls = fake.mock.calls as unknown as [string, RequestInit | undefined][];
      expect(calls[0]![1]).not.toHaveProperty('edsLoader');
      const sent = new Headers(calls[1]![1]!.headers);
      expect(sent.has('x-eds-loader')).toBe(false);
      expect(sent.get('accept')).toBe('json');
    });

    it('fetch que falha também termina a pendência', async () => {
      window.fetch = vi.fn(() => Promise.reject(new Error('rede'))) as unknown as typeof fetch;
      mount();
      await act(async () => {
        await window.fetch('/x').catch(() => {});
      });
      tick(2000);
      expect(dialog()).not.toHaveAttribute('open');
    });

    it('faz patch de XMLHttpRequest e restaura ao desmontar', () => {
      const proto = XMLHttpRequest.prototype;
      const { open, send, setRequestHeader } = proto;
      const { unmount } = mount();
      expect(proto.send).not.toBe(send);

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/x');
      // simula o envio sem rede
      const realSend = vi.fn();
      proto.send = realSend as unknown as typeof proto.send;
      unmount();
      // o patch já foi restaurado para o `send` original (não o nosso)
      expect(proto.open).toBe(open);
      expect(proto.setRequestHeader).toBe(setRequestHeader);
      proto.send = send;
    });

    it('XHR aberto aciona o loader e termina em loadend; X-EDS-Loader: off pula', () => {
      const proto = XMLHttpRequest.prototype;
      const nativeSend = vi.fn();
      proto.send = nativeSend as unknown as typeof proto.send;
      const nativeSetHeader = vi.fn();
      proto.setRequestHeader = nativeSetHeader;
      const nativeOpen = proto.open;
      proto.open = vi.fn() as unknown as typeof proto.open;
      const { unmount } = mount();

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/x');
      xhr.send();
      expect(nativeSend).toHaveBeenCalledTimes(1);
      tick(300);
      expect(dialog()).toHaveAttribute('open');
      act(() => {
        xhr.dispatchEvent(new Event('loadend'));
      });
      tick(400);
      expect(dialog()).not.toHaveAttribute('open');

      const quiet = new XMLHttpRequest();
      quiet.open('GET', '/api/y');
      quiet.setRequestHeader('X-EDS-Loader', 'off');
      quiet.send();
      expect(nativeSetHeader).not.toHaveBeenCalled();
      tick(1000);
      expect(dialog()).not.toHaveAttribute('open');

      unmount();
      proto.open = nativeOpen;
    });
  });
});

describe('PageLoaderProvider: StrictMode, demora e opções', () => {
  let api: PageLoaderApi;
  function Grab() {
    api = usePageLoader();
    return null;
  }
  const mount = (props: React.ComponentProps<typeof PageLoaderProvider> = {}, strict = false) => {
    const tree = (
      <PageLoaderProvider {...props}>
        <main>
          <Grab />
        </main>
      </PageLoaderProvider>
    );
    return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  };

  it('abre dentro de <StrictMode> (attach/detach simétricos)', () => {
    mount({}, true);
    const done = api.start();
    tick(300);
    expect(dialog()).toHaveAttribute('open');
    act(() => done());
    tick(400);
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('pendência iniciada num efeito filho (antes do attach) também abre em StrictMode', () => {
    function Early() {
      const loader = usePageLoader();
      useEffect(() => {
        loader.start();
      }, [loader]);
      return null;
    }
    render(
      <StrictMode>
        <PageLoaderProvider>
          <Early />
        </PageLoaderProvider>
      </StrictMode>,
    );
    tick(300);
    expect(dialog()).toHaveAttribute('open');
  });

  it('na demora: avisa, oferece Fechar e Continuar aguardando, foco no segundo', () => {
    mount({ slowAfter: 1000 });
    api.start({ text: 'Buscando.' });
    tick(300);
    expect(dialog()).toHaveAccessibleDescription('Buscando.');
    expect(screen.queryByRole('button', { name: 'Continuar aguardando' })).toBeNull();
    tick(1000);
    expect(dialog()).toHaveAccessibleDescription('Está demorando mais que o esperado.');
    const keep = screen.getByRole('button', { name: 'Continuar aguardando' });
    expect(keep).toHaveClass('eds-button-primary');
    expect(keep).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveClass('eds-button-secondary');

    fireEvent.click(keep);
    expect(dialog()).toHaveAccessibleDescription('Buscando.');
    expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();
    tick(999);
    expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();
    tick(1);
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('Fechar libera a página e silencia as pendências até todas terminarem', () => {
    mount({ slowAfter: 1000 });
    const a = api.start();
    tick(1300);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(dialog()).not.toHaveAttribute('open');
    const b = api.start();
    tick(5000);
    expect(dialog()).not.toHaveAttribute('open');
    act(() => {
      a();
      b();
    });
    api.start();
    tick(300);
    expect(dialog()).toHaveAttribute('open');
  });

  it('textos da demora configuráveis', () => {
    mount({
      slowAfter: 100,
      texts: { slowText: 'Slow', close: 'Close', continue: 'Keep waiting' },
    });
    api.start();
    tick(400);
    expect(dialog()).toHaveAccessibleDescription('Slow');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep waiting' })).toBeInTheDocument();
  });

  it('reabre se o navegador fechar o diálogo sem o código pedir', async () => {
    mount();
    api.start();
    tick(300);
    expect(dialog()).toHaveAttribute('open');
    dialog().close();
    await act(async () => {});
    expect(dialog()).toHaveAttribute('open');
  });

  describe('fetch', () => {
    const original = window.fetch;
    afterEach(() => {
      window.fetch = original;
      Reflect.deleteProperty(navigator, 'userActivation');
    });
    const never = () => vi.fn(() => new Promise<Response>(() => {}));
    const activation = (isActive: boolean) =>
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive },
        configurable: true,
      });

    it("trigger='user' só conta com ativação do usuário", () => {
      window.fetch = never() as unknown as typeof fetch;
      activation(false);
      mount({ trigger: 'user' });
      act(() => {
        void window.fetch('/polling');
      });
      tick(1000);
      expect(dialog()).not.toHaveAttribute('open');
      activation(true);
      act(() => {
        void window.fetch('/salvar');
      });
      tick(300);
      expect(dialog()).toHaveAttribute('open');
    });

    it("trigger='all' (padrão) conta mesmo sem ativação", () => {
      window.fetch = never() as unknown as typeof fetch;
      mount();
      act(() => {
        void window.fetch('/x');
      });
      tick(300);
      expect(dialog()).toHaveAttribute('open');
    });

    it('edsLoader com title/text por requisição', () => {
      const fake = never();
      window.fetch = fake as unknown as typeof fetch;
      mount();
      act(() => {
        void window.fetch('/p', {
          edsLoader: { title: 'Salvando…', text: 'Quase lá.' },
        } as RequestInit);
      });
      tick(300);
      expect(dialog()).toHaveAccessibleName('Salvando…');
      expect(dialog()).toHaveAccessibleDescription('Quase lá.');
      const calls = fake.mock.calls as unknown as [string, RequestInit][];
      expect(calls[0]![1]).not.toHaveProperty('edsLoader');
    });
  });
});
