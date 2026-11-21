import { useState } from 'react';
import { NotificationBell, type NotificationItem } from '@efds-ui/react';

const initial: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Pedido PED-0001 aprovado',
    text: 'Entrega prevista para 28/11.',
    time: 'há 5 minutos',
    dateTime: '2026-11-20T10:30',
    href: '#/componentes/notifications',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Nova mensagem de Maria Exemplo',
    time: 'há 45 minutos',
    dateTime: '2026-11-20T09:50',
    href: '#/componentes/notifications',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Relatório mensal gerado',
    time: 'ontem',
    dateTime: '2026-11-19T18:00',
    href: '#/componentes/notifications',
  },
];

export default function Basico() {
  const [items, setItems] = useState(initial);
  return (
    <NotificationBell
      items={items}
      onRead={(id) =>
        setItems((list) => list.map((item) => (item.id === id ? { ...item, unread: false } : item)))
      }
      onReadAll={() => setItems((list) => list.map((item) => ({ ...item, unread: false })))}
    />
  );
}
