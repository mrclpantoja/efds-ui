import { useState } from 'react';
import { Sortable, type SortableItemData } from '@eds-ui/react';

export default function Lista() {
  const [itens, setItens] = useState<SortableItemData[]>([
    { id: 'p1', label: 'Revisar contrato' },
    { id: 'p2', label: 'Enviar proposta' },
    { id: 'p3', label: 'Agendar reunião' },
    { id: 'p4', label: 'Conciliar extrato' },
  ]);
  return (
    <Sortable
      as="ul"
      label="Prioridades da semana"
      handle={false}
      items={itens}
      onChange={setItens}
      renderItem={(item) => item.label}
    />
  );
}
