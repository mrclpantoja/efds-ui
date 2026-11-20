import { useState } from 'react';
import { Sortable, type SortableItemData } from '@eds-ui/react';

export default function Horizontal() {
  const [itens, setItens] = useState<SortableItemData[]>([
    { id: 'h1', label: 'Rascunho' },
    { id: 'h2', label: 'Análise' },
    { id: 'h3', label: 'Aprovado' },
    { id: 'h4', label: 'Publicado' },
  ]);
  return (
    <Sortable
      label="Etapas"
      orientation="horizontal"
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
