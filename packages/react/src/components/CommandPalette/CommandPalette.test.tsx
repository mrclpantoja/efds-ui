import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill, installPopoverStyle } from '../../test-utils/dom-polyfills';
import { CommandPalette, type CommandPaletteItem } from '.';

const items: CommandPaletteItem[] = [
  { value: 'inicio', label: 'Ir para o início', group: 'Navegação', href: '#/inicio' },
  { value: 'pedidos', label: 'Pedidos', description: 'Lista de pedidos', group: 'Navegação' },
  {
    value: 'novo',
    label: 'Novo cadastro',
    group: 'Ações',
    shortcut: 'N',
    keywords: 'criar incluir',
  },
  { value: 'sair', label: 'Sair', group: 'Ações', disabled: true },
];

let restore: () => void;
beforeAll(() => {
  installPopoverStyle();
});
beforeEach(() => {
  restore = installDialogPolyfill();
  localStorage.clear();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const key = (init: KeyboardEventInit) =>
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
    );
  });
const labels = () =>
  screen
    .queryAllByRole('option', { hidden: true })
    .map((o) => o.querySelector('.eds-command-label')?.textContent);
const combo = () => screen.getByRole('combobox', { hidden: true });

describe('CommandPalette', () => {
  it('é um dialog modal nomeado com combobox e listbox (APG)', () => {
    render(<CommandPalette items={items} />);
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).toHaveClass('eds-modal', 'eds-command');
    expect(dialog).toHaveAttribute('aria-label', 'Paleta de comandos');
    expect(dialog.open).toBe(false);
    expect(combo()).toHaveAttribute('aria-autocomplete', 'list');
    expect(combo().getAttribute('aria-controls')).toBe(
      screen.getByRole('listbox', { hidden: true }).id,
    );
  });

  it('Ctrl+K abre com o foco no campo, grupos e primeiro item ativo; Esc fecha', async () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette items={items} onOpenChange={onOpenChange} />);
    key({ key: 'k', ctrlKey: true });
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(combo()).toHaveFocus();
    expect(combo()).toHaveAttribute('aria-expanded', 'true');
    expect(labels()).toEqual(['Ir para o início', 'Pedidos', 'Novo cadastro', 'Sair']);
    expect(screen.getAllByRole('group', { hidden: true })).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Navegação', hidden: true })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { hidden: true })[0]).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(dialog.open).toBe(false));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('atalho configurável; false desliga', async () => {
    const { unmount } = render(<CommandPalette items={items} shortcut="ctrl+shift+p" />);
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    key({ key: 'k', ctrlKey: true });
    expect(dialog.open).toBe(false);
    key({ key: 'p', ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(dialog.open).toBe(true));
    unmount();
    render(<CommandPalette items={items} shortcut={false} />);
    key({ key: 'k', ctrlKey: true });
    expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
  });

  it('setas movem (com volta) pulando o desabilitado; Enter escolhe, fecha e chama onSelect', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette items={items} defaultOpen onSelect={onSelect} />);
    await waitFor(() => expect(combo()).toHaveFocus());
    const active = () =>
      document.querySelector('[aria-selected="true"] .eds-command-label')?.textContent;
    await user.keyboard('{ArrowDown}');
    expect(active()).toBe('Pedidos');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(active()).toBe('Ir para o início');
    await user.keyboard('{ArrowUp}');
    expect(active()).toBe('Novo cadastro');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ value: 'novo' });
    await waitFor(() =>
      expect((document.querySelector('dialog') as HTMLDialogElement).open).toBe(false),
    );
  });

  it('filtra sem acento nem caixa, por descrição e palavras-chave; mostra o vazio', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} defaultOpen />);
    await user.type(combo(), 'INICIO');
    expect(labels()).toEqual(['Ir para o início']);
    await user.clear(combo());
    await user.type(combo(), 'criar');
    expect(labels()).toEqual(['Novo cadastro']);
    await user.clear(combo());
    await user.type(combo(), 'lista ped');
    expect(labels()).toEqual(['Pedidos']);
    await user.clear(combo());
    await user.type(combo(), 'zzz');
    expect(labels()).toEqual([]);
    expect(document.querySelector('.eds-command-empty')).toHaveTextContent(
      'Nenhum resultado para "zzz".',
    );
    expect(combo()).not.toHaveAttribute('aria-activedescendant');
  });

  it('href navega, a menos que onSelect chame preventDefault; desabilitado não escolhe', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const user = userEvent.setup();
    const { rerender } = render(<CommandPalette items={items} defaultOpen />);
    await user.click(screen.getByRole('option', { name: /Ir para o início/, hidden: true }));
    expect(assign).toHaveBeenCalledWith('#/inicio');
    assign.mockClear();
    rerender(
      <CommandPalette items={items} open onSelect={(_item, event) => event.preventDefault()} />,
    );
    await user.click(screen.getByRole('option', { name: /Ir para o início/, hidden: true }));
    expect(assign).not.toHaveBeenCalled();
    const onSelect = vi.fn();
    rerender(<CommandPalette items={items} open onSelect={onSelect} />);
    await user.click(screen.getByRole('option', { name: /Sair/, hidden: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Recentes: só ids, no topo com a busca vazia; desligado por padrão', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CommandPalette items={items} defaultOpen />);
    await user.click(screen.getByRole('option', { name: /Novo cadastro/, hidden: true }));
    expect(localStorage.length).toBe(0);
    unmount();

    function Harness() {
      const [open, setOpen] = useState(true);
      return <CommandPalette items={items} open={open} onOpenChange={setOpen} recent={3} />;
    }
    render(<Harness />);
    await user.click(screen.getByRole('option', { name: /Novo cadastro/, hidden: true }));
    expect(JSON.parse(localStorage.getItem('eds:command-recent') ?? '[]')).toEqual(['novo']);
    key({ key: 'k', ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Recentes', hidden: true })).toBeInTheDocument(),
    );
    const ids = Array.from(document.querySelectorAll('dialog [id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    await user.type(combo(), 'ped');
    expect(screen.queryByRole('group', { name: 'Recentes', hidden: true })).toBeNull();
  });

  it('fonte remota: pausa, AbortSignal e erro', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const loadItems = vi.fn(async (...[q]: [string, AbortSignal]) => {
      if (q.endsWith('x')) throw new Error('falha');
      return [{ value: 'p1', label: 'Pedido 0001', group: 'Pedidos' }];
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CommandPalette loadItems={loadItems} minChars={2} defaultOpen />);
    await user.type(combo(), 'p');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(loadItems).not.toHaveBeenCalled();
    await user.type(combo(), 'ed');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(loadItems).toHaveBeenCalledTimes(1);
    expect(loadItems.mock.calls[0]?.[0]).toBe('ped');
    expect(loadItems.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
    expect(labels()).toEqual(['Pedido 0001']);
    await user.type(combo(), 'x');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(document.querySelector('.eds-command-empty')).toHaveTextContent(
      'Não foi possível carregar os comandos.',
    );
  });

  it('textos configuráveis e rodapé', () => {
    render(
      <CommandPalette
        items={items}
        texts={{ title: 'Command palette', search: 'Search' }}
        footer={<kbd>Esc</kbd>}
      />,
    );
    expect(document.querySelector('dialog')).toHaveAttribute('aria-label', 'Command palette');
    expect(combo()).toHaveAccessibleName('Search');
    expect(document.querySelector('.eds-command-footer kbd')).toHaveTextContent('Esc');
  });
});
