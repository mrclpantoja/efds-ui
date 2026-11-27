import { Timeline, type TimelineItem } from '@efds-ui/react';

const items: TimelineItem[] = [
  {
    id: 'p1',
    state: 'done',
    title: (
      <>
        Parcela 1<span className="eds-visually-hidden"> (paga)</span>
      </>
    ),
    time: '10/09/2026',
    dateTime: '2026-09-10',
    text: 'R$ 1.250,00',
  },
  {
    id: 'p2',
    state: 'done',
    title: (
      <>
        Parcela 2<span className="eds-visually-hidden"> (paga)</span>
      </>
    ),
    time: '10/10/2026',
    dateTime: '2026-10-10',
    text: 'R$ 1.250,00',
  },
  {
    id: 'p3',
    state: 'current',
    title: (
      <>
        Parcela 3<span className="eds-visually-hidden"> (em aberto)</span>
      </>
    ),
    time: '10/11/2026',
    dateTime: '2026-11-10',
    text: 'R$ 1.250,00',
  },
  {
    id: 'p4',
    state: 'upcoming',
    title: (
      <>
        Parcela 4<span className="eds-visually-hidden"> (a vencer)</span>
      </>
    ),
    time: '10/12/2026',
    dateTime: '2026-12-10',
    text: 'R$ 1.250,00',
  },
];

export default function Horizontal() {
  return <Timeline orientation="horizontal" aria-label="Vencimentos do contrato" items={items} />;
}
