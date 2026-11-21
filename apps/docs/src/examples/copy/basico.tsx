import { CopyButton, Stack } from '@efds-ui/react';

export default function Basico() {
  return (
    <Stack direction="row" wrap gap={3} align="start">
      <code className="eds-text-mono">CHAVE-EXEMPLO-0001</code>
      <CopyButton text="CHAVE-EXEMPLO-0001" />
      <CopyButton text="https://exemplo.gov.br/pedidos/PED-0001">Copiar link</CopyButton>
    </Stack>
  );
}
