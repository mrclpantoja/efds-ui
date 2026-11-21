import { Agenda, type AgendaEvent } from '@efds-ui/react';

const eventos: AgendaEvent[] = [
  {
    id: 'e1',
    title: 'Reunião de equipe',
    date: '2026-03-04',
    time: '09:00',
    href: '#/componentes/agenda',
    tone: 'info',
  },
  { id: 'e2', title: 'Entrega do relatório', date: '2026-03-04', time: '14:00' },
  { id: 'e3', title: 'Revisão de contrato', date: '2026-03-04', time: '16:00', tone: 'warning' },
  { id: 'e4', title: 'Treinamento', date: '2026-03-04', tone: 'success' },
  { id: 'e5', title: 'Congresso', date: '2026-03-18', end: '2026-03-20', tone: 'neutral' },
  { id: 'e6', title: 'Fechamento do mês', date: '2026-03-31', time: '17:00', tone: 'danger' },
];

export default function Basico() {
  return <Agenda events={eventos} defaultMonth="2026-03" />;
}
