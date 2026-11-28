import { createMemoryAdapter } from '@efds-ui/behavior/files';
import { FileManager } from '@efds-ui/react';

const adapter = createMemoryAdapter(undefined, { latency: 120 });

export default function SomenteLeitura() {
  return (
    <FileManager
      adapter={adapter}
      readOnly
      defaultView="grid"
      rootLabel="Documentos"
      aria-label="Documentos publicados"
    />
  );
}
