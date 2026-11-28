import { useState } from 'react';
import { createMemoryAdapter } from '@efds-ui/behavior/files';
import { FileManager, type FileManagerChange } from '@efds-ui/react';

const adapter = createMemoryAdapter(undefined, { latency: 120 });

export default function Eventos() {
  const [path, setPath] = useState('/Contratos');
  const [last, setLast] = useState('Nenhuma operação ainda.');
  const onChange = (change: FileManagerChange) =>
    setLast(`${change.action}: ${change.items.length} item(ns)`);
  return (
    <>
      <p>
        Pasta: <code>{path}</code>. Última operação: {last}
      </p>
      <FileManager
        adapter={adapter}
        path={path}
        onPathChange={setPath}
        onChange={onChange}
        onOpen={(entry) => entry.name !== 'Leia-me.txt'}
        aria-label="Arquivos com eventos"
      />
    </>
  );
}
