import { useState } from 'react';
import { Agenda, type AgendaEvent } from '@eds-ui/react';

// Em produção, os eventos vêm do servidor a cada troca de mês; aqui, uma lista fictícia filtrada.
const todos: AgendaEvent[] = [
  { id: 'a1', title: 'Reunião de equipe', date: '2026-03-04', time: '09:00', tone: 'info' },
  { id: 'a2', title: 'Entrega do relatório', date: '2026-03-04', time: '14:00' },
  { id: 'a3', title: 'Revisão de contrato', date: '2026-03-04', time: '16:00', tone: 'warning' },
  { id: 'a4', title: 'Treinamento', date: '2026-03-04', tone: 'success' },
  { id: 'a5', title: 'Congresso', date: '2026-03-18', end: '2026-03-20', tone: 'neutral' },
  { id: 'a6', title: 'Fechamento do mês', date: '2026-03-31', time: '17:00', tone: 'danger' },
  { id: 'a7', title: 'Planejamento de abril', date: '2026-04-02', time: '10:00', tone: 'info' },
];

export default function Dinamica() {
  const [mes, setMes] = useState('2026-03');
  const eventos = todos.filter((e) => e.date.startsWith(mes) || e.end?.startsWith(mes));
  return <Agenda events={eventos} month={mes} onMonthChange={setMes} />;
}
