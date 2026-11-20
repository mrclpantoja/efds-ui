import { Timeline } from '@eds-ui/react';

export default function Agrupada() {
  return (
    <Timeline
      compact
      groups={[
        {
          title: 'Hoje, 20/11/2026',
          items: [
            {
              id: 'comentario',
              title: 'Comentário adicionado',
              time: '11:02',
              dateTime: '2026-11-20T11:02',
              actor: 'por Maria Exemplo',
              tone: 'accent',
            },
            {
              id: 'aprovado',
              title: 'Pedido aprovado',
              time: '10:30',
              dateTime: '2026-11-20T10:30',
              actor: 'por Maria Exemplo',
              tone: 'success',
            },
          ],
        },
        {
          title: 'Ontem, 19/11/2026',
          items: [
            {
              id: 'recusado',
              title: 'Pagamento recusado',
              time: '17:40',
              dateTime: '2026-11-19T17:40',
              text: 'Cartão fictício sem limite.',
              tone: 'danger',
            },
            {
              id: 'criado',
              title: 'Pedido criado',
              time: '09:12',
              dateTime: '2026-11-19T09:12',
              actor: 'por João Exemplo',
            },
          ],
        },
      ]}
    />
  );
}
