import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { Modal } from '../Modal';
import { ToastProvider, useToast, type ToastOptions } from './Toast';

let restore: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  // O asyncWrapper do Testing Library só avança timers falsos se achar um `jest` global.
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
  restore = installDialogPolyfill();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const flush = () => act(async () => {});
const setupUser = () => userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });

function Trigger({ options, label = 'Disparar' }: { options: ToastOptions; label?: string }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show(options)}>
      {label}
    </button>
  );
}

const region = () => document.querySelector<HTMLElement>('.eds-toast-region')!;
const toasts = () => document.querySelectorAll('.eds-toast');

describe('Toast', () => {
  it('a região nasce montada e vazia, polite', () => {
    render(<ToastProvider>conteúdo</ToastProvider>);
    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(region()).toBeEmptyDOMElement();
  });

  it('useToast fora do provider falha com mensagem clara', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger options={{ message: 'x' }} />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it('renderiza variante, título e mensagem; só o danger leva role="alert"', async () => {
    const user = setupUser();
    render(
      <ToastProvider>
        <Trigger options={{ variant: 'success', title: 'Sucesso:', message: 'Pedido salvo.' }} />
        <Trigger options={{ variant: 'danger', title: 'Erro:', message: 'Falha.' }} label="Erro" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Disparar' }));
    await user.click(screen.getByRole('button', { name: 'Erro' }));
    const [ok, erro] = Array.from(toasts()) as [Element, Element];
    expect(ok).toHaveClass('eds-toast', 'eds-toast-success');
    expect(ok).not.toHaveAttribute('role');
    expect(ok.querySelector('.eds-toast-title')).toHaveTextContent('Sucesso:');
    expect(ok.querySelector('.eds-toast-content')).toHaveTextContent('Sucesso: Pedido salvo.');
    expect(erro).toHaveClass('eds-toast-danger');
    expect(screen.getByRole('alert')).toBe(erro);
  });

  it('info/success fecham sozinhos após 5 s', async () => {
    const user = setupUser();
    render(
      <ToastProvider>
        <Trigger options={{ message: 'Salvo.' }} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button'));
    advance(4999);
    expect(toasts()).toHaveLength(1);
    expect(document.querySelector('[data-closing]')).toBeNull();
    advance(1);
    expect(document.querySelector('[data-closing]')).not.toBeNull();
    advance(300);
    expect(toasts()).toHaveLength(0);
  });

  it('mensagem longa dura ~1 s a cada 10 palavras', async () => {
    const user = setupUser();
    const message = Array.from({ length: 80 }, (_, i) => `p${i}`).join(' ');
    render(
      <ToastProvider>
        <Trigger options={{ variant: 'success', message }} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button'));
    advance(7900);
    expect(document.querySelector('[data-closing]')).toBeNull();
    advance(100);
    expect(document.querySelector('[data-closing]')).not.toBeNull();
  });

  it.each(['danger', 'warning'] as const)('%s não fecha sozinho', async (variant) => {
    const user = setupUser();
    render(
      <ToastProvider>
        <Trigger options={{ variant, message: 'Atenção.' }} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button'));
    advance(120_000);
    expect(toasts()).toHaveLength(1);
    expect(document.querySelector('[data-closing]')).toBeNull();
  });

  it('o botão de fechar remove o toast; rótulo substituível', async () => {
    const user = setupUser();
    render(
      <ToastProvider closeLabel="Dismiss">
        <Trigger options={{ variant: 'warning', message: 'Aviso.' }} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Disparar' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    advance(300);
    expect(toasts()).toHaveLength(0);
  });

  it('fila: só maxVisible ao mesmo tempo; o próximo entra quando um sai', async () => {
    const user = setupUser();
    function Many() {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            ['um', 'dois', 'tres', 'quatro'].forEach((m) =>
              toast.show({ variant: 'warning', message: m }),
            )
          }
        >
          Muitos
        </button>
      );
    }
    render(
      <ToastProvider>
        <Many />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Muitos' }));
    expect(toasts()).toHaveLength(3);
    expect(screen.queryByText('quatro')).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Fechar notificação' })[0]!);
    advance(300);
    expect(screen.getByText('quatro')).toBeInTheDocument();
    expect(screen.queryByText('um')).toBeNull();
  });

  it('o tempo do próximo da fila só corre depois que ele aparece', async () => {
    const user = setupUser();
    function Fila() {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast.show({ variant: 'warning', message: 'a' });
            toast.show({ variant: 'warning', message: 'b' });
            toast.show({ variant: 'warning', message: 'c' });
            toast.show({ message: 'd' });
          }}
        >
          Fila
        </button>
      );
    }
    render(
      <ToastProvider>
        <Fila />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Fila' }));
    advance(20_000);
    expect(screen.queryByText('d')).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Fechar notificação' })[0]!);
    await user.unhover(region()); // o ponteiro deixa a região (hover pausaria o tempo)
    advance(300);
    expect(screen.getByText('d')).toBeInTheDocument();
    advance(4900);
    expect(screen.getByText('d')).toBeInTheDocument();
    advance(100 + 300);
    expect(screen.queryByText('d')).toBeNull();
  });

  it('pausa em hover e retoma com o tempo restante', async () => {
    const user = setupUser();
    render(
      <ToastProvider>
        <Trigger options={{ message: 'Salvo.' }} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Disparar' }));
    advance(3000);
    await user.hover(document.querySelector('.eds-toast')!);
    advance(60_000);
    expect(document.querySelector('[data-closing]')).toBeNull();
    await user.unhover(document.querySelector('.eds-toast')!);
    advance(1900);
    expect(document.querySelector('[data-closing]')).toBeNull();
    advance(100);
    expect(document.querySelector('[data-closing]')).not.toBeNull();
  });

  it('pausa enquanto há foco dentro da região', async () => {
    const user = setupUser();
    render(
      <ToastProvider>
        <Trigger options={{ message: 'Salvo.' }} />
        <button type="button">Fora</button>
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Disparar' }));
    await user.tab(); // Fora
    await user.tab(); // Fechar notificação (a região vem depois do conteúdo)
    expect(screen.getByRole('button', { name: 'Fechar notificação' })).toHaveFocus();
    advance(60_000);
    expect(document.querySelector('[data-closing]')).toBeNull();
    await user.tab(); // sai da região
    advance(5000);
    expect(document.querySelector('[data-closing]')).not.toBeNull();
  });

  it('Esc no toast focado fecha só ele e devolve o foco a quem o disparou', async () => {
    const user = setupUser();
    render(
      <ToastProvider>
        <Trigger options={{ variant: 'warning', message: 'Aviso.' }} />
      </ToastProvider>,
    );
    const origin = screen.getByRole('button', { name: 'Disparar' });
    await user.click(origin);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Fechar notificação' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(origin).toHaveFocus();
    advance(300);
    expect(toasts()).toHaveLength(0);
  });

  it('origem conectada mas inalcançável (focus não age): o foco vai ao <main>', async () => {
    const user = setupUser();
    render(
      <ToastProvider>
        <main tabIndex={-1}>
          <Trigger options={{ variant: 'warning', message: 'Aviso.' }} />
        </main>
      </ToastProvider>,
    );
    const origin = screen.getByRole('button', { name: 'Disparar' });
    await user.click(origin);
    vi.spyOn(origin, 'focus').mockImplementation(() => {});
    screen.getByRole('button', { name: 'Fechar notificação' }).focus();
    await user.keyboard('{Escape}');
    advance(300);
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('fechar sem foco no toast não rouba o foco', async () => {
    const user = setupUser();
    function Api() {
      const toast = useToast();
      const [id, setId] = useState(0);
      return (
        <>
          <button
            type="button"
            onClick={() => setId(toast.show({ variant: 'warning', message: 'x' }))}
          >
            Abrir
          </button>
          <button type="button" onClick={() => toast.dismiss(id)}>
            Fechar via API
          </button>
          <input aria-label="Campo" />
        </>
      );
    }
    render(
      <ToastProvider>
        <Api />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByLabelText('Campo'));
    act(() => screen.getByRole('button', { name: 'Fechar via API' }).click());
    expect(screen.getByLabelText('Campo')).toHaveFocus();
    advance(300);
    expect(toasts()).toHaveLength(0);
  });

  describe('severidade em texto', () => {
    const hidden = () => document.querySelector('.eds-toast .eds-visually-hidden');

    it.each([
      ['info', 'Informação:'],
      ['success', 'Sucesso:'],
      ['warning', 'Atenção:'],
      ['danger', 'Erro:'],
    ] as const)('sem title, %s ganha o prefixo oculto "%s"', async (variant, label) => {
      const user = setupUser();
      render(
        <ToastProvider>
          <Trigger options={{ variant, message: 'Pedido salvo.' }} />
        </ToastProvider>,
      );
      await user.click(screen.getByRole('button', { name: 'Disparar' }));
      expect(hidden()).toHaveTextContent(label);
      expect(document.querySelector('.eds-toast-content')).toHaveTextContent(
        `${label} Pedido salvo.`,
      );
    });

    it('com title, não há prefixo oculto', async () => {
      const user = setupUser();
      render(
        <ToastProvider>
          <Trigger options={{ variant: 'success', title: 'Sucesso:', message: 'Salvo.' }} />
        </ToastProvider>,
      );
      await user.click(screen.getByRole('button', { name: 'Disparar' }));
      expect(hidden()).toBeNull();
      expect(document.querySelector('.eds-toast-content')).toHaveTextContent('Sucesso: Salvo.');
    });

    it('severityLabels substitui só as variantes informadas', async () => {
      const user = setupUser();
      render(
        <ToastProvider severityLabels={{ success: 'Done:' }}>
          <Trigger options={{ variant: 'success', message: 'Ok.' }} label="S" />
          <Trigger options={{ variant: 'warning', message: 'Cuidado.' }} label="W" />
        </ToastProvider>,
      );
      await user.click(screen.getByRole('button', { name: 'S' }));
      await user.click(screen.getByRole('button', { name: 'W' }));
      const [ok, aviso] = Array.from(toasts());
      expect(ok!.querySelector('.eds-visually-hidden')).toHaveTextContent('Done:');
      expect(aviso!.querySelector('.eds-visually-hidden')).toHaveTextContent('Atenção:');
    });
  });

  describe('dentro de dialog:modal', () => {
    function Page({ open }: { open: boolean }) {
      return (
        <ToastProvider>
          <Trigger options={{ variant: 'warning', message: 'Aviso.' }} />
          <Modal open={open} onClose={() => {}} title="Modal">
            <Trigger options={{ variant: 'warning', message: 'Do modal.' }} label="No modal" />
          </Modal>
        </ToastProvider>
      );
    }

    it('a região é renderizada dentro do dialog aberto e volta à página ao fechar', async () => {
      const { rerender } = render(<Page open={false} />);
      expect(region().closest('dialog')).toBeNull();
      rerender(<Page open />);
      await flush();
      const dialog = document.querySelector('dialog')!;
      expect(region().closest('dialog')).toBe(dialog);
      expect(document.querySelectorAll('.eds-toast-region')).toHaveLength(1);
      rerender(<Page open={false} />);
      await flush();
      expect(region().closest('dialog')).toBeNull();
    });

    it('toast disparado dentro do modal aparece dentro dele', async () => {
      const user = setupUser();
      render(<Page open />);
      await flush();
      await user.click(screen.getByRole('button', { name: 'No modal' }));
      expect(document.querySelector('dialog')!.querySelector('.eds-toast')).toHaveTextContent(
        'Do modal.',
      );
    });

    it('Esc no toast do dialog, com a origem fora do alcance, mantém o foco dentro do dialog', async () => {
      const user = setupUser();
      function Host({ open }: { open: boolean }) {
        return (
          <ToastProvider>
            <Trigger options={{ variant: 'warning', message: 'Aviso.' }} />
            <Modal open={open} onClose={() => {}} title="Modal">
              <input aria-label="Campo" />
            </Modal>
          </ToastProvider>
        );
      }
      const { rerender } = render(<Host open={false} />);
      const origin = screen.getByRole('button', { name: 'Disparar' });
      await user.click(origin);
      rerender(<Host open />);
      await flush();
      const dialog = document.querySelector('dialog')!;
      // Simula a origem inerte (o jsdom não implementa `inert`): focus() não a alcança.
      vi.spyOn(origin, 'focus').mockImplementation(() => {});
      screen.getByRole('button', { name: 'Fechar notificação' }).focus();
      await user.keyboard('{Escape}');
      advance(300);
      expect(document.querySelectorAll('.eds-toast')).toHaveLength(0);
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(document.body);
      expect(dialog).toHaveAttribute('open');
    });

    it('o tempo restante sobrevive à remontagem da região', async () => {
      const user = setupUser();
      function Auto({ open }: { open: boolean }) {
        return (
          <ToastProvider>
            <Trigger options={{ message: 'Salvo.' }} />
            <Modal open={open} onClose={() => {}} title="Modal">
              x
            </Modal>
          </ToastProvider>
        );
      }
      const { rerender } = render(<Auto open={false} />);
      await user.click(screen.getByRole('button', { name: 'Disparar' }));
      advance(3000);
      rerender(<Auto open />);
      await flush();
      expect(document.querySelector('dialog')!.querySelector('.eds-toast')).not.toBeNull();
      advance(1900);
      expect(document.querySelector('[data-closing]')).toBeNull();
      advance(100);
      expect(document.querySelector('[data-closing]')).not.toBeNull();
    });
  });
});
