import { Button, Stack, useToast } from '@eds-ui/react';

const messages = Array.from(
  { length: 8 },
  (_, index) => `Pedido PED-${String(index + 1).padStart(4, '0')} salvo.`,
);

/**
 * O `ToastProvider` vem de fora, com o padrão de 3 toasts visíveis: oito disparos de uma vez
 * mostram três, e os demais entram conforme os primeiros fecham.
 */
export default function Fila() {
  const toast = useToast();
  return (
    <Stack direction="row" wrap gap={3}>
      <Button
        onClick={() =>
          messages.forEach((message) =>
            toast.show({ variant: 'success', title: 'Sucesso:', message }),
          )
        }
      >
        Disparar 8 de uma vez
      </Button>
    </Stack>
  );
}
