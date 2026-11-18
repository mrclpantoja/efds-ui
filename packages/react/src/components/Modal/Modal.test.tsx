import { createRef, useRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { Modal } from './Modal';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => restore());

function Harness({ closeOnBackdrop }: { closeOnBackdrop?: boolean }) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Excluir projeto?"
        closeOnBackdrop={closeOnBackdrop}
        initialFocus={cancelRef}
        footer={
          <>
            <button type="button" ref={cancelRef}>
              Cancelar
            </button>
            <button type="button">Excluir</button>
          </>
        }
      >
        Esta ação não pode ser desfeita.
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('2º Esc nativo com open mantido e onClose ignorado: reabre e o foco segue dentro', async () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Editar">
          <input aria-label="Nome" />
        </Modal>,
      );
      const dialog = document.querySelector('dialog')!;
      const input = screen.getByLabelText('Nome');
      input.focus();
      expect(dialog).toHaveAttribute('open');
      // Fechamento nativo (2º Esc sem nova ativação do usuário): `cancel` não cancelável.
      act(() => dialog.close());
      expect(dialog).not.toHaveAttribute('open');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60);
      });
      expect(onClose).toHaveBeenCalled();
      expect(dialog).toHaveAttribute('open');
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(document.body);
      // O reabrir devolve o foco ao campo que o usuário editava (não ao Fechar).
      expect(document.activeElement).toBe(input);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renderiza as partes do core, nomeado pelo título', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Título" footer={<p>rodapé</p>}>
        corpo
      </Modal>,
    );
    const dialog = document.querySelector('dialog')!;
    expect(dialog).toHaveClass('eds-modal');
    expect(dialog).not.toHaveClass('eds-modal-md');
    const title = dialog.querySelector('.eds-modal-title')!;
    expect(title.tagName).toBe('H2');
    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    expect(dialog.querySelector('.eds-modal-header')).toBeInTheDocument();
    expect(dialog.querySelector('.eds-modal-body')).toHaveTextContent('corpo');
    expect(dialog.querySelector('footer.eds-modal-footer')).toBeInTheDocument();
  });

  it('sem footer não renderiza o rodapé; size e className são aplicados; repassa ref', () => {
    const ref = createRef<HTMLDialogElement>();
    render(
      <Modal ref={ref} open={false} onClose={() => {}} title="T" size="lg" className="extra">
        x
      </Modal>,
    );
    expect(ref.current).toHaveClass('eds-modal', 'eds-modal-lg', 'extra');
    expect(ref.current?.querySelector('.eds-modal-footer')).toBeNull();
  });

  it('open abre com showModal e open=false fecha', () => {
    const spy = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const { rerender } = render(
      <Modal open={false} onClose={() => {}} title="T">
        x
      </Modal>,
    );
    const dialog = document.querySelector('dialog')!;
    expect(dialog).not.toHaveAttribute('open');
    rerender(
      <Modal open onClose={() => {}} title="T">
        x
      </Modal>,
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
    rerender(
      <Modal open={false} onClose={() => {}} title="T">
        x
      </Modal>,
    );
    expect(dialog).not.toHaveAttribute('open');
  });

  it('o onClose não dispara quando é a prop que fecha', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose} title="T">
        x
      </Modal>,
    );
    rerender(
      <Modal open={false} onClose={onClose} title="T">
        x
      </Modal>,
    );
    await act(async () => {});
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc pede o fechamento (onClose) e o estado controlado fecha', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = document.querySelector('dialog')!;
    expect(dialog).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('Esc não fecha por conta própria quando quem controla ignora o onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        x
      </Modal>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('dialog')).toHaveAttribute('open');
  });

  it('fechamento nativo com onClose no-op (2º Esc do Chrome): o dialog é reaberto', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        x
      </Modal>,
    );
    const dialog = document.querySelector('dialog')!;
    act(() => dialog.close());
    await act(async () => {});
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(dialog).toHaveAttribute('open');
  });

  it('fechamento nativo com onClose que fecha: permanece fechado', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = document.querySelector('dialog')!;
    act(() => dialog.close());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(dialog).not.toHaveAttribute('open');
  });

  it('o botão Fechar chama onClose e tem rótulo substituível', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T" closeLabel="Close">
        x
      </Modal>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('initialFocus recebe o foco depois de abrir', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('sem initialFocus, usa o elemento com data-autofocus', () => {
    render(
      <Modal open onClose={() => {}} title="T">
        <input aria-label="Nome" data-autofocus />
      </Modal>,
    );
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  describe('backdrop', () => {
    it('fecha quando pointerdown e click ocorrem no próprio dialog', () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          x
        </Modal>,
      );
      const dialog = document.querySelector('dialog')!;
      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('não fecha se o pointerdown começou dentro (arrastar seleção para fora)', () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          <p>texto</p>
        </Modal>,
      );
      const dialog = document.querySelector('dialog')!;
      fireEvent.pointerDown(screen.getByText('texto'));
      fireEvent.click(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('clique dentro do conteúdo não fecha', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T">
          <p>texto</p>
        </Modal>,
      );
      await user.click(screen.getByText('texto'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closeOnBackdrop={false} desliga o fechamento', () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="T" closeOnBackdrop={false}>
          x
        </Modal>,
      );
      const dialog = document.querySelector('dialog')!;
      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('corpo rolável', () => {
    it('só recebe region/tabIndex/aria-labelledby quando rola de fato', () => {
      let sync: () => void = () => {};
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            sync = callback;
          }
          observe() {}
          disconnect() {}
        },
      );
      render(
        <Modal open onClose={() => {}} title="Termos">
          <p>conteúdo</p>
        </Modal>,
      );
      const body = document.querySelector<HTMLElement>('.eds-modal-body')!;
      const scroll = (scrollHeight: number, clientHeight: number) => {
        Object.defineProperty(body, 'scrollHeight', { configurable: true, value: scrollHeight });
        Object.defineProperty(body, 'clientHeight', { configurable: true, value: clientHeight });
        act(() => sync());
      };

      scroll(100, 100);
      expect(body).not.toHaveAttribute('role');
      expect(body).not.toHaveAttribute('tabindex');

      scroll(400, 100);
      expect(body).toHaveAttribute('role', 'region');
      expect(body).toHaveAttribute('tabindex', '0');
      const title = document.querySelector('.eds-modal-title')!;
      expect(body).toHaveAttribute('aria-labelledby', title.id);

      scroll(100, 100);
      expect(body).not.toHaveAttribute('role');
      expect(body).not.toHaveAttribute('aria-labelledby');
      vi.unstubAllGlobals();
    });
  });
});
