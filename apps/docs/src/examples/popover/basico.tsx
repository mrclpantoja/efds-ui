import { Button, Popover } from '@eds-ui/react';

export default function Basico() {
  return (
    <Popover
      trigger={<Button variant="secondary">Detalhes do pedido</Button>}
      title="Pedido PED-0001"
      actions={({ popoverId }) => (
        <>
          <Button
            variant="secondary"
            size="sm"
            popoverTarget={popoverId}
            popoverTargetAction="hide"
          >
            Fechar
          </Button>
          <Button variant="primary" size="sm">
            Abrir pedido
          </Button>
        </>
      )}
    >
      <p>Cliente: Atelier Exemplo. Total de R$ 1.280,50, em 3 itens.</p>
      <p>Previsão de entrega em 28/11.</p>
    </Popover>
  );
}
