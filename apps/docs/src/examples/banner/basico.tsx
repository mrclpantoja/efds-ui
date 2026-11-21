import { Banner, Button, Stack } from '@efds-ui/react';

export default function Basico() {
  return (
    <Stack gap={3}>
      <Banner aria-label="Aviso do sistema" tone="info">
        <strong>Novidade.</strong> O relatório mensal agora pode ser exportado em PDF.
      </Banner>
      <Banner
        aria-label="Ambiente"
        tone="warning"
        actions={
          <Button href="#/componentes/banner" variant="secondary" size="sm">
            Ir para produção
          </Button>
        }
      >
        <strong>Ambiente de homologação.</strong> Os dados desta tela são de teste.
      </Banner>
      <Banner aria-label="Incidente" tone="danger">
        <strong>Instabilidade.</strong> A emissão de guias está lenta; estamos trabalhando na
        correção.
      </Banner>
      <Banner aria-label="Operação normalizada" tone="success">
        <strong>Normalizado.</strong> Todos os serviços voltaram a funcionar.
      </Banner>
      <Banner aria-label="Aviso legal" tone="neutral">
        Este sistema registra os acessos. O uso indevido está sujeito às penalidades da lei.
      </Banner>
    </Stack>
  );
}
