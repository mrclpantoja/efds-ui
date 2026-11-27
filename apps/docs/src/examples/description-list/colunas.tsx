import { Badge, DescriptionList } from '@efds-ui/react';

export default function Colunas() {
  return (
    <DescriptionList
      columns={3}
      items={[
        { label: 'Número', value: 'PED-0001' },
        { label: 'Cliente', value: 'Cliente Exemplo A' },
        { label: 'Situação', value: <Badge tone="success">Pago</Badge> },
        { label: 'Emissão', value: '12/03/2026' },
        { label: 'Vencimento', value: '12/04/2026' },
        { label: 'Valor', value: 'R$ 1.250,00' },
        { label: 'Endereço de entrega', value: 'Rua Exemplo, 100, Centro, Cidade Modelo' },
        { label: 'Observação', value: '' },
      ]}
    />
  );
}
