import { Button, Stack, useDialog } from '@efds-ui/react';

/** O `DialogProvider` vem de fora: um único, na raiz do app (neste site, em Layout.tsx). */
export default function Tipos() {
  const dialog = useDialog();
  return (
    <Stack direction="row" wrap gap={3}>
      <Button
        onClick={() =>
          void dialog.alert('A conciliação roda todos os dias às 02h.', 'Aviso', 'info')
        }
      >
        Informação
      </Button>
      <Button
        onClick={() => void dialog.alert('Pedido PED-0001 salvo com sucesso.', 'Pedido', 'success')}
      >
        Sucesso
      </Button>
      <Button
        onClick={() =>
          void dialog.alert('O certificado digital vence em 7 dias.', 'Atenção', 'warning')
        }
      >
        Atenção
      </Button>
      <Button
        onClick={() =>
          void dialog.alert('Não foi possível enviar a nota fiscal.', 'Falha no envio', 'danger')
        }
      >
        Erro
      </Button>
      <Button
        onClick={() => void dialog.alert('Sem título, o próprio texto dá o nome ao diálogo.')}
      >
        Sem título
      </Button>
    </Stack>
  );
}
