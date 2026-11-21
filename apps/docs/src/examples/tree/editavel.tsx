import { useState } from 'react';
import { Tree, type TreeChange, type TreeNodeData } from '@eds-ui/react';

const categorias: TreeNodeData[] = [
  {
    id: 'e1',
    label: 'Produtos',
    children: [
      {
        id: 'e2',
        label: 'Papelaria',
        children: [
          { id: 'e3', label: 'Canetas' },
          { id: 'e4', label: 'Cadernos' },
        ],
      },
      { id: 'e5', label: 'Escritório' },
    ],
  },
  { id: 'e6', label: 'Serviços' },
];

const acoes: Record<TreeChange['action'], string> = {
  add: 'item adicionado',
  rename: 'item renomeado',
  delete: 'item excluído',
  move: 'item movido',
  wrap: 'item agrupado',
};

/** O `DialogProvider` e o `ToastProvider` (de fora) dão a confirmação e o "Desfazer". */
export default function Editavel() {
  const [ultima, setUltima] = useState('Nenhuma mudança ainda.');
  return (
    <>
      <Tree
        label="Categorias"
        editable
        name="estrutura"
        defaultItems={categorias}
        defaultExpanded="all"
        onChange={(_itens, mudanca) =>
          setUltima(`${acoes[mudanca.action]} — ${mudanca.node.label}`)
        }
      />
      {/* Só visual: quem anuncia cada mudança é a região de status da própria Tree. */}
      <p className="eds-text-small">Última mudança: {ultima}</p>
    </>
  );
}
