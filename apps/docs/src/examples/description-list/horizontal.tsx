import { Badge, DescriptionList } from '@eds-ui/react';

export default function Horizontal() {
  return (
    <DescriptionList
      horizontal
      divided
      items={[
        { label: 'Número', value: 'PED-0001' },
        { label: 'Cliente', value: 'Cliente Exemplo A' },
        { label: 'Situação', value: <Badge variant="success">Pago</Badge> },
        { label: 'Valor', value: 'R$ 1.250,00' },
      ]}
    />
  );
}
