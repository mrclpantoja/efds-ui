import { useState } from 'react';
import { Sortable, SortableGroup, type SortableItemData } from '@efds-ui/react';

const colunas = [
  { id: 'afazer', titulo: 'A fazer' },
  { id: 'fazendo', titulo: 'Fazendo' },
  { id: 'feito', titulo: 'Feito' },
];

export default function Quadro() {
  const [listas, setListas] = useState<Record<string, SortableItemData[]>>({
    afazer: [
      { id: 'q1', label: 'Revisar contrato' },
      { id: 'q2', label: 'Cadastrar fornecedor' },
    ],
    fazendo: [{ id: 'q3', label: 'Conciliar extrato' }],
    feito: [],
  });
  return (
    <SortableGroup className="eds-sortable-board" lists={listas} onChange={setListas}>
      {colunas.map((coluna) => (
        <div key={coluna.id} className="eds-sortable-column">
          <h4 className="eds-sortable-column-title">{coluna.titulo}</h4>
          <Sortable
            id={coluna.id}
            label={coluna.titulo}
            renderItem={(item, { handle }) => (
              <>
                {handle}
                <span>{item.label}</span>
              </>
            )}
          />
        </div>
      ))}
    </SortableGroup>
  );
}
