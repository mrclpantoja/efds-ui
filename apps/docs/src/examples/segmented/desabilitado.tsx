import { SegmentedControl, Stack } from '@eds-ui/react';

export default function Desabilitado() {
  return (
    <Stack gap={4}>
      <SegmentedControl
        legend="Período (uma opção indisponível)"
        defaultValue="dia"
        options={[
          { value: 'dia', label: 'Dia' },
          { value: 'semana', label: 'Semana' },
          { value: 'ano', label: 'Ano', disabled: true },
        ]}
      />
      <SegmentedControl
        legend="Período (grupo desabilitado)"
        disabled
        defaultValue="dia"
        options={[
          { value: 'dia', label: 'Dia' },
          { value: 'semana', label: 'Semana' },
        ]}
      />
    </Stack>
  );
}
