import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { Drawer } from './Drawer';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => restore());

describe('Drawer', () => {
  it('renderiza as partes do core na borda final por padrão', () => {
    const ref = createRef<HTMLDialogElement>();
    render(
      <Drawer ref={ref} open={false} onClose={() => {}} title="Filtros" footer={<p>rodapé</p>}>
        corpo
      </Drawer>,
    );
    expect(ref.current).toHaveClass('eds-drawer');
    expect(ref.current).not.toHaveClass('eds-drawer-start');
    const title = ref.current!.querySelector('.eds-drawer-title')!;
    expect(ref.current).toHaveAttribute('aria-labelledby', title.id);
    expect(ref.current!.querySelector('.eds-drawer-header')).toBeInTheDocument();
    expect(ref.current!.querySelector('.eds-drawer-body')).toHaveTextContent('corpo');
    expect(ref.current!.querySelector('footer.eds-drawer-footer')).toBeInTheDocument();
  });

  it('placement="start" aplica eds-drawer-start', () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Menu" placement="start" className="x">
        corpo
      </Drawer>,
    );
    expect(document.querySelector('dialog')).toHaveClass('eds-drawer', 'eds-drawer-start', 'x');
  });

  it('abre com showModal, Esc e Fechar pedem onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Filtros">
        <input aria-label="Buscar" />
      </Drawer>,
    );
    expect(document.querySelector('dialog')).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('fecha pelo backdrop só com pointerdown e click no dialog', () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Filtros">
        <p>texto</p>
      </Drawer>,
    );
    const dialog = document.querySelector('dialog')!;
    fireEvent.pointerDown(screen.getByText('texto'));
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
