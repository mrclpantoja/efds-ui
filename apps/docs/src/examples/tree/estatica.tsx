import { Tree, type TreeNodeData } from '@efds-ui/react';

const estrutura: TreeNodeData[] = [
  {
    id: 'n1',
    label: 'Diretoria Fictícia',
    children: [
      {
        id: 'n2',
        label: 'Sede Modelo',
        children: [
          { id: 'n3', label: 'Financeiro de Exemplo' },
          { id: 'n4', label: 'Compras' },
        ],
      },
      { id: 'n5', label: 'Filial Teste', children: [{ id: 'n6', label: 'Atendimento' }] },
    ],
  },
  { id: 'n7', label: 'Conselho Consultivo' },
];

export default function Estatica() {
  return (
    <Tree
      label="Estrutura organizacional"
      multiselect
      defaultItems={estrutura}
      defaultExpanded={['n1', 'n2']}
    />
  );
}
