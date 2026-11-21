import { Button, Stack, useToast } from '@efds-ui/react';

/** O `ToastProvider` vem de fora: um único, na raiz do app (neste site, em Layout.tsx). */
export default function Disparar() {
  const toast = useToast();
  return (
    <Stack direction="row" wrap gap={3}>
      <Button
        onClick={() =>
          toast.show({
            variant: 'info',
            title: 'Informação:',
            message: 'A conciliação roda todos os dias às 02h.',
          })
        }
      >
        Informação
      </Button>
      <Button
        onClick={() =>
          toast.show({
            variant: 'success',
            title: 'Sucesso:',
            message: 'O contrato foi assinado e arquivado.',
          })
        }
      >
        Sucesso
      </Button>
      <Button
        onClick={() =>
          toast.show({
            variant: 'warning',
            title: 'Atenção:',
            message: 'O certificado digital vence em 7 dias.',
          })
        }
      >
        Atenção
      </Button>
      <Button
        onClick={() =>
          toast.show({
            variant: 'danger',
            title: 'Erro:',
            message: 'Não foi possível enviar a nota fiscal.',
          })
        }
      >
        Erro
      </Button>
    </Stack>
  );
}
