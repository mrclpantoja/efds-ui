import { createMemoryAdapter } from '@efds-ui/behavior/files';
import { FileManager } from '@efds-ui/react';

// Dados fictícios, só na memória da página. Em produção: <FileManager api="/api/arquivos" />.
const adapter = createMemoryAdapter(undefined, { latency: 120 });

export default function Basico() {
  return <FileManager adapter={adapter} aria-label="Arquivos do contrato" />;
}
