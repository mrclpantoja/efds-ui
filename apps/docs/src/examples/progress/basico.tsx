import { Progress, Stack } from '@eds-ui/react';

export default function Basico() {
  return (
    <Stack gap={5}>
      <Progress label="Importando planilha" value={45} />
      <Progress label="Etapa concluída" value={100} size="sm" tone="success" />
      <Progress label="Cota de armazenamento" value={92} tone="danger" valueText="92% usado" />
      <Progress label="Processando" valueText="aguarde" />
    </Stack>
  );
}
