import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { DialogProvider } from '../Dialog';
import { useUnsavedChanges, type UnsavedChangesOptions } from './useUnsavedChanges';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => restore());

function Page({ dirty, options }: { dirty: boolean; options?: UnsavedChangesOptions }) {
  useUnsavedChanges(dirty, options);
  return <a href="/outra-pagina">Outra página</a>;
}

const beforeUnload = (): boolean => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

/** Conta só os cliques que chegam ao link (ouvinte depois do hook, na fase de bolha). */
function watchLink() {
  const reached = vi.fn();
  const onClick = (event: Event) => {
    if ((event.target as Element).closest('a')) {
      reached();
      event.preventDefault();
    }
  };
  document.addEventListener('click', onClick);
  return { reached, stop: () => document.removeEventListener('click', onClick) };
}

describe('useUnsavedChanges', () => {
  it('só avisa ao fechar a aba quando há alterações', () => {
    const { rerender } = render(<Page dirty={false} />);
    expect(beforeUnload()).toBe(false);
    rerender(<Page dirty />);
    expect(beforeUnload()).toBe(true);
    rerender(<Page dirty={false} />);
    expect(beforeUnload()).toBe(false);
  });

  it('link interno pergunta no diálogo do eDS.ui; "Continuar editando" não navega', async () => {
    const user = userEvent.setup();
    const { reached, stop } = watchLink();
    render(
      <DialogProvider>
        <Page dirty options={{ message: 'Descartar o rascunho?' }} />
      </DialogProvider>,
    );
    await user.click(screen.getByRole('link', { name: 'Outra página' }));
    const dialog = await screen.findByRole('alertdialog', { name: /Alterações não salvas/ });
    expect(dialog).toHaveTextContent('Descartar o rascunho?');
    expect(reached).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(reached).not.toHaveBeenCalled();
    stop();
  });

  it('"Sair sem salvar" refaz o clique e a navegação segue', async () => {
    const user = userEvent.setup();
    const { reached, stop } = watchLink();
    render(
      <DialogProvider>
        <Page dirty />
      </DialogProvider>,
    );
    await user.click(screen.getByRole('link', { name: 'Outra página' }));
    await user.click(await screen.findByRole('button', { name: 'Sair sem salvar' }));
    expect(reached).toHaveBeenCalledTimes(1);
    stop();
  });

  it('sem alterações ou com confirmLinks=false o link passa direto; sem provider usa window.confirm', async () => {
    const user = userEvent.setup();
    const { reached, stop } = watchLink();
    const { rerender } = render(<Page dirty={false} />);
    await user.click(screen.getByRole('link', { name: 'Outra página' }));
    expect(reached).toHaveBeenCalledTimes(1);
    rerender(<Page dirty options={{ confirmLinks: false }} />);
    await user.click(screen.getByRole('link', { name: 'Outra página' }));
    expect(reached).toHaveBeenCalledTimes(2);
    rerender(<Page dirty />);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('link', { name: 'Outra página' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(reached).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
    stop();
  });
});
