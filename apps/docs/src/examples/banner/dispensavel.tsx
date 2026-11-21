import { Banner, Button } from '@efds-ui/react';

export default function Dispensavel() {
  return (
    <Banner
      aria-label="Manutenção programada"
      tone="warning"
      dismissible
      // Em produção: rememberId="manutencao-0412" lembra o fechamento no localStorage.
      actions={
        <Button href="#/componentes/banner" variant="secondary" size="sm">
          Saiba mais
        </Button>
      }
    >
      <strong>Manutenção programada.</strong> O sistema ficará indisponível no sábado, das 22h às
      23h.
    </Banner>
  );
}
