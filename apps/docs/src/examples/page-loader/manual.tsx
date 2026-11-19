import { Button, PageLoaderProvider, usePageLoader } from '@eds-ui/react';

function BuscarProcesso() {
  const loader = usePageLoader();
  return (
    <Button
      variant="primary"
      onClick={() =>
        // Simula a chamada ao servidor; só aparece se passar de 300 ms e fica ao menos 400 ms.
        void loader.track(new Promise((resolve) => setTimeout(resolve, 2500)), {
          title: 'Buscando processo…',
          text: 'Aguarde um instante.',
        })
      }
    >
      Buscar processo
    </Button>
  );
}

/**
 * Na aplicação real há um único PageLoaderProvider na raiz (com `auto`, o padrão, ele acompanha
 * todo fetch). Aqui o provider é local e `auto={false}`, para a navegação do site não ser
 * bloqueada: só `track` e `start` acionam o loader.
 */
export default function Manual() {
  return (
    <PageLoaderProvider auto={false}>
      <BuscarProcesso />
    </PageLoaderProvider>
  );
}
