import { DashboardIcon } from '@efds-ui/icons';
import { Button, Page, PageHeader } from '@efds-ui/react';

/* O ícone é um svg direto no título (decorativo: os ícones do pacote já vêm com aria-hidden). */
export default function Icone() {
  return (
    <Page>
      <PageHeader
        title={
          <>
            <DashboardIcon />
            Contratos e aditivos vigentes
          </>
        }
        description="O ícone acompanha a primeira linha do título."
        actions={<Button variant="primary">Novo contrato</Button>}
      />
      <PageHeader
        title={
          <>
            <DashboardIcon />
            Relatório consolidado de execução orçamentária e financeira por unidade gestora,
            exercício e fonte de recurso
          </>
        }
      />
    </Page>
  );
}
