import { useState } from 'react';
import { NotificationBell, type NotificationItem } from '@efds-ui/react';

const Icone = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const initial: NotificationItem[] = [
  {
    id: 'n1',
    icon: <Icone d="M20 6L9 17l-5-5" />,
    iconTone: 'success',
    title: 'Pedido PED-0001 aprovado',
    text: 'Entrega prevista para 28/11.',
    time: 'há 5 minutos',
    dateTime: '2026-11-20T10:30',
    href: '#/componentes/notifications',
    unread: true,
  },
  {
    id: 'n2',
    icon: <Icone d="M4 4h16v12H5.2L4 17.2zM8 9h8M8 12h5" />,
    iconTone: 'info',
    title: 'Nova mensagem de Maria Exemplo',
    time: 'há 45 minutos',
    dateTime: '2026-11-20T09:50',
    href: '#/componentes/notifications',
    unread: true,
  },
  {
    id: 'n3',
    icon: <Icone d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h4" />,
    iconTone: 'neutral',
    title: 'Relatório mensal gerado',
    time: 'ontem',
    dateTime: '2026-11-19T18:00',
    href: '#/componentes/notifications',
  },
];

export default function ComIcones() {
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
