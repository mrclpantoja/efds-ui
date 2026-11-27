import { Button, useToast } from '@efds-ui/react';

/** O `ToastProvider` vem de fora: um único, na raiz do app (neste site, em Layout.tsx). */
export default function Acao() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast.show({
          tone: 'info',
          message: 'Pedido PED-0001 excluído.',
          duration: 8000,
          action: {
            label: 'Desfazer',
            onClick: () => toast.show({ tone: 'success', message: 'Pedido PED-0001 restaurado.' }),
          },
        })
      }
    >
      Excluir pedido
    </Button>
  );
}
