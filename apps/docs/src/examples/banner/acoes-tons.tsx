import { Banner, Button, Stack } from '@efds-ui/react';

export default function AcoesTons() {
  return (
    <Stack gap={3}>
      <Banner
        aria-label="Novidade"
        tone="info"
        actions={
          <>
            <Button size="sm" variant="primary">
              Conhecer
            </Button>
            <Button size="sm" variant="secondary">
              Depois
            </Button>
          </>
        }
      >
        <strong>Novidade.</strong> Painel de indicadores renovado.
      </Banner>
      <Banner
        aria-label="Manutenção"
        tone="warning"
        actions={
          <>
            <Button size="sm" variant="primary">
              Saiba mais
            </Button>
            <Button size="sm" variant="ghost">
              Lembrar
            </Button>
          </>
        }
      >
        <strong>Manutenção programada.</strong> Sábado, das 22h às 23h.
      </Banner>
      <Banner
        aria-label="Incidente"
        tone="danger"
        actions={
          <Button size="sm" variant="secondary">
            Status do serviço
          </Button>
        }
      >
        <strong>Instabilidade.</strong> A emissão de guias está lenta.
      </Banner>
      <Banner
        aria-label="Normalizado"
        tone="success"
        actions={
          <Button size="sm" variant="secondary">
            Ver relatório
          </Button>
        }
      >
        <strong>Normalizado.</strong> Todos os serviços voltaram a funcionar.
      </Banner>
      <Banner
        aria-label="Aviso legal"
        tone="neutral"
        actions={
          <>
            <Button size="sm" variant="primary">
              Li e concordo
            </Button>
            <Button size="sm" variant="secondary">
              Política
            </Button>
          </>
        }
      >
        Este sistema registra os acessos.
      </Banner>
    </Stack>
  );
}
