import { useState } from 'react';
import { Sortable, type SortableItemData } from '@eds-ui/react';

export default function Handle() {
  const [itens, setItens] = useState<SortableItemData[]>([
    { id: 't1', label: 'Revisar contrato' },
    { id: 't2', label: 'Cadastrar fornecedor' },
    { id: 't3', label: 'Conciliar extrato' },
    { id: 't4', label: 'Fechar caixa' },
  ]);
  return (
    <Sortable
      label="Tarefas"
      items={itens}
      onChange={setItens}
      renderItem={(item, { handle }) => (
        <>
          {handle}
          <span>{item.label}</span>
        </>
      )}
    />
  );
}
