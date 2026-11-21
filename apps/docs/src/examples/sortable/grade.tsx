import { useState } from 'react';
import { Sortable, type SortableItemData } from '@efds-ui/react';

export default function Grade() {
  const [itens, setItens] = useState<SortableItemData[]>([
    { id: 'g1', label: 'Pedidos' },
    { id: 'g2', label: 'Clientes' },
    { id: 'g3', label: 'Estoque' },
    { id: 'g4', label: 'Relatórios' },
    { id: 'g5', label: 'Fornecedores' },
    { id: 'g6', label: 'Financeiro' },
  ]);
  return (
    <Sortable
      label="Atalhos"
      orientation="grid"
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
