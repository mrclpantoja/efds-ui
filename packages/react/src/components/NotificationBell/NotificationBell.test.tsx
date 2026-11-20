import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { installPopoverStyle } from '../../test-utils/dom-polyfills';
import { NotificationBell, type NotificationItem } from './NotificationBell';

const initial: NotificationItem[] = [
  { id: 'n1', title: 'Pedido PED-0001 aprovado', time: 'há 5 minutos', href: '#a', unread: true },
  { id: 'n2', title: 'Nova mensagem', unread: true },
  { id: 'n3', title: 'Relatório mensal gerado', href: '#c' },
];

function Harness({ list = initial }: { list?: NotificationItem[] }) {
  const [items, setItems] = useState(list);
  return (
    <NotificationBell
      items={items}
      onRead={(id) =>
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unread: false } : i)))
      }
      onReadAll={() => setItems((prev) => prev.map((i) => ({ ...i, unread: false })))}
    />
  );
}

beforeAll(() => {
  installPopoverStyle();
});

describe('NotificationBell', () => {
  it('o sino leva a contagem no nome, e o selo é decorativo', () => {
    render(<Harness />);
    const bell = screen.getByRole('button', { name: 'Notificações, 2 não lidas' });
    expect(bell).toHaveClass('eds-notifications', 'eds-button-icon');
    const count = bell.querySelector('.eds-notifications-count')!;
    expect(count).toHaveTextContent('2');
    expect(count).toHaveAttribute('aria-hidden', 'true');
  });

  it('painel é um popover nomeado, com itens lidos e não lidos marcados', () => {
    render(<Harness />);
    const panel = document.querySelector<HTMLElement>('.eds-notifications-panel')!;
    expect(panel).toHaveAttribute('popover', 'auto');
    expect(panel).toHaveAttribute('aria-label', 'Notificações');
    const items = panel.querySelectorAll('.eds-notification');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('data-unread', 'true');
    expect(items[0]).toHaveAttribute('data-id', 'n1');
    expect(items[2]).not.toHaveAttribute('data-unread');
    expect(items[0]!.querySelector('a.eds-notification-link')).toHaveAttribute('href', '#a');
    expect(items[1]!.querySelector('button.eds-notification-link')).not.toBeNull();
    expect(items[0]!.querySelector('.eds-notification-status')).toHaveTextContent('Não lida');
  });

  it('abrir um item não lido chama onRead e atualiza a contagem', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Nova mensagem', { exact: false }));
    expect(screen.getByRole('button', { name: 'Notificações, 1 não lida' })).toBeInTheDocument();
  });

  it('Marcar todas como lidas zera, esconde o selo e anuncia', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Marcar todas como lidas', { selector: 'button' }));
    const bell = screen.getByRole('button', { name: 'Notificações, nenhuma não lida' });
    expect(bell.querySelector('.eds-notifications-count')).toHaveAttribute('hidden');
    expect(await screen.findByRole('status')).toHaveTextContent('Todas as notificações');
    expect(screen.getByText('Marcar todas como lidas', { selector: 'button' })).toBeDisabled();
    await waitFor(() => expect(document.activeElement).toHaveClass('eds-notification-link'));
  });

  it('sem itens mostra o estado vazio; selo limita a 99+', () => {
    const { unmount } = render(<Harness list={[]} />);
    expect(screen.getByText('Você não tem notificações.')).toHaveClass('eds-notifications-empty');
    unmount();
    const many = Array.from({ length: 120 }, (_, i) => ({
      id: `x${i}`,
      title: `n${i}`,
      unread: true,
    }));
    render(<Harness list={many} />);
    expect(document.querySelector('.eds-notifications-count')).toHaveTextContent('99+');
  });

  it('onItemClick recebe o item e texts troca os textos', async () => {
    const onItemClick = vi.fn();
    const user = userEvent.setup();
    render(
      <NotificationBell
        items={[{ id: 'z', title: 'Aviso' }]}
        onItemClick={onItemClick}
        texts={{ title: 'Alerts' }}
      />,
    );
    await user.click(screen.getByText('Aviso'));
    expect(onItemClick).toHaveBeenCalledWith({ id: 'z', title: 'Aviso' });
    expect(document.querySelector('.eds-notifications-panel')).toHaveAttribute(
      'aria-label',
      'Alerts',
    );
  });
});
