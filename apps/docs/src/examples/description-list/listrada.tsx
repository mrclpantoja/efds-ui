import { Badge, DescriptionList } from '@efds-ui/react';

export default function Listrada() {
  return (
    <DescriptionList
      orientation="horizontal"
      striped
      items={[
        { label: 'Número', value: 'PED-0001' },
        { label: 'Cliente', value: 'Cliente Exemplo A' },
        { label: 'Situação', value: <Badge tone="warning">Pendente</Badge> },
        { label: 'Valor', value: 'R$ 1.250,00' },
        { label: 'Observação', value: null },
      ]}
    />
  );
}
