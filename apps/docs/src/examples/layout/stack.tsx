import { Badge, Button, Stack } from '@efds-ui/react';

export default function Pilha() {
  return (
    <Stack gap={4}>
      <Stack direction="row" wrap justify="between" gap={3}>
        <h3 className="eds-text-h4">Pedidos</h3>
        <Stack direction="row" gap={2}>
          <Button>Exportar</Button>
          <Button variant="primary">Novo pedido</Button>
        </Stack>
      </Stack>
      <Stack direction="row" wrap gap={2}>
        {['Financeiro', 'Compras', 'Estoque', 'Fiscal', 'Logística'].map((setor) => (
          <Badge key={setor}>{setor}</Badge>
        ))}
      </Stack>
    </Stack>
  );
}
