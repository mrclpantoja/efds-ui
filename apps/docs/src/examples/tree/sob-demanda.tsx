import { useRef } from 'react';
import { Tree, type TreeNodeData } from '@efds-ui/react';

const regioes: TreeNodeData[] = [
  { id: 'sul', label: 'Região Sul', hasChildren: true },
  { id: 'sudeste', label: 'Região Sudeste (falha na 1ª tentativa)', hasChildren: true },
];

const filhos: Record<string, TreeNodeData[]> = {
  sul: [
    { id: 'rs', label: 'Estado Exemplo A', hasChildren: true },
    { id: 'sc', label: 'Estado Exemplo B' },
  ],
  rs: [
    { id: 'c1', label: 'Cidade Modelo' },
    { id: 'c2', label: 'Cidade Teste' },
  ],
  sudeste: [{ id: 'sp', label: 'Estado Exemplo C' }],
};

/** Em produção, `loadChildren` chama o seu servidor; aqui a resposta é simulada. */
export default function SobDemanda() {
  const tentativas = useRef(0);
  const carregar = (no: TreeNodeData) =>
    new Promise<TreeNodeData[]>((resolve, reject) => {
      window.setTimeout(() => {
        if (no.id === 'sudeste' && (tentativas.current += 1) === 1) {
          reject(new Error('indisponível'));
          return;
        }
        resolve(filhos[no.id] ?? []);
      }, 600);
    });

  return <Tree label="Regiões" defaultItems={regioes} loadChildren={carregar} />;
}
