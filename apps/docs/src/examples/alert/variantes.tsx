import { Alert, Stack } from '@efds-ui/react';

export default function Variantes() {
  return (
    <Stack gap={3}>
      <Alert tone="info">
        <p>A conciliação roda todos os dias às 02h.</p>
      </Alert>
      <Alert tone="success">
        <p>O contrato foi assinado e arquivado.</p>
      </Alert>
      <Alert tone="warning">
        <p>O certificado digital vence em 7 dias.</p>
      </Alert>
      <Alert tone="danger">
        <p>Não foi possível enviar a nota fiscal.</p>
      </Alert>
    </Stack>
  );
}
