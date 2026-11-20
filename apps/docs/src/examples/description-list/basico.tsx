import { Badge, DescriptionList } from '@eds-ui/react';

export default function Basico() {
  return (
    <DescriptionList
      items={[
        { label: 'Número', value: 'PED-0001' },
        { label: 'Cliente', value: 'Cliente Exemplo A' },
        { label: 'Situação', value: <Badge variant="success">Pago</Badge> },
        { label: 'Valor', value: 'R$ 1.250,00' },
        { label: 'Observação', value: null },
      ]}
    />
  );
}
