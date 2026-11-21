import { SegmentedControl } from '@efds-ui/react';

export default function Basico() {
  return (
    <SegmentedControl
      legend="Período"
      name="periodo-react"
      defaultValue="dia"
      options={[
        { value: 'dia', label: 'Dia' },
        { value: 'semana', label: 'Semana' },
        { value: 'mes', label: 'Mês' },
      ]}
    />
  );
}
