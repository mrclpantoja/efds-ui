import { Alert, Button, Stack } from '@efds-ui/react';

function Acoes({
  primary,
  secondary,
  ghost,
}: {
  primary: string;
  secondary: string;
  ghost: string;
}) {
  return (
    <>
      <Button size="sm" variant="primary">
        {primary}
      </Button>
      <Button size="sm" variant="secondary">
        {secondary}
      </Button>
      <Button size="sm" variant="ghost">
        {ghost}
      </Button>
    </>
  );
}

export default function AcoesTons() {
  return (
    <Stack gap={3}>
      <Alert
        tone="danger"
        title="Falha na conciliação"
        actions={<Acoes primary="Tentar de novo" secondary="Ver detalhes" ghost="Ignorar" />}
      >
        <p>12 lançamentos não puderam ser conciliados com o extrato.</p>
      </Alert>
      <Alert
        tone="warning"
        title="Fechamento próximo"
        actions={<Acoes primary="Revisar" secondary="Ver pendências" ghost="Lembrar depois" />}
      >
        <p>O período fecha em 2 dias.</p>
      </Alert>
      <Alert
        tone="success"
        title="Importação concluída"
        actions={<Acoes primary="Abrir lista" secondary="Baixar relatório" ghost="Dispensar" />}
      >
        <p>248 registros foram importados.</p>
      </Alert>
      <Alert
        tone="info"
        title="Nova versão disponível"
        actions={<Acoes primary="Atualizar" secondary="Novidades" ghost="Depois" />}
      >
        <p>As alterações entram em vigor no próximo acesso.</p>
      </Alert>
    </Stack>
  );
}
