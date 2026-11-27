import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Stack } from '@efds-ui/react';

export default function Fechavel() {
  const [open, setOpen] = useState(true);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  // O botão de fechar sai do DOM junto com o aviso: o foco vai para o botão que o reabre.
  useEffect(() => {
    if (!open && moveFocus.current) {
      moveFocus.current = false;
      reopenRef.current?.focus();
    }
  }, [open]);

  return (
    <Stack gap={3}>
      {open ? (
        <Alert
          tone="info"
          title="Novidade"
          onDismiss={() => {
            moveFocus.current = true;
            setOpen(false);
          }}
        >
          <p>Agora você pode exportar relatórios em PDF.</p>
        </Alert>
      ) : (
        <div>
          <Button ref={reopenRef} variant="tertiary" size="sm" onClick={() => setOpen(true)}>
            Mostrar aviso novamente
          </Button>
        </div>
      )}
    </Stack>
  );
}
