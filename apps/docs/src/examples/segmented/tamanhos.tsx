import { SegmentedControl, Stack } from '@eds-ui/react';

export default function Tamanhos() {
  return (
    <Stack gap={4}>
      <SegmentedControl
        legend="Visualização (pequeno)"
        size="sm"
        defaultValue="lista"
        options={[
          { value: 'lista', label: 'Lista' },
          { value: 'grade', label: 'Grade' },
        ]}
      />
      <SegmentedControl
        legend="Situação (largura total)"
        fill
        defaultValue="todos"
        options={[
          { value: 'todos', label: 'Todos' },
          { value: 'abertos', label: 'Abertos' },
          { value: 'fechados', label: 'Fechados' },
        ]}
      />
    </Stack>
  );
}
