import { Timeline, type TimelineItem } from '@eds-ui/react';

const check = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
  >
    <path d="M5 12l5 5 9-10" />
  </svg>
);
const alert = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
  >
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

const items: TimelineItem[] = [
  {
    id: 'aprovado',
    title: 'Pedido aprovado',
    time: '20/11/2026 10:30',
    dateTime: '2026-11-20T10:30',
    text: 'Aprovado após a conferência dos 3 itens.',
    actor: 'por Maria Exemplo',
    tone: 'success',
    icon: check,
  },
  {
    id: 'pendencia',
    title: 'Pendência de documento',
    time: '19/11/2026 16:05',
    dateTime: '2026-11-19T16:05',
    text: 'Anexo da nota fiscal ausente.',
    actor: 'por Sistema',
    tone: 'warning',
    icon: alert,
  },
  {
    id: 'criado',
    title: 'Pedido criado',
    time: '19/11/2026 09:12',
    dateTime: '2026-11-19T09:12',
    actor: 'por João Exemplo',
  },
];

export default function Basico() {
  return <Timeline items={items} aria-label="Histórico do pedido" />;
}
