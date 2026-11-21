import { useState } from 'react';
import { Alert, Button, Stack } from '@efds-ui/react';

export default function Dinamico() {
  const [saved, setSaved] = useState(false);
  return (
    <Stack gap={3}>
      <div>
        <Button variant="primary" onClick={() => setSaved(true)} disabled={saved}>
          Salvar cliente
        </Button>
      </div>
      {/* Aviso inserido depois da carga da página: precisa de role para ser anunciado. */}
      {saved ? (
        <Alert variant="success" role="status">
          <p>Cliente salvo.</p>
        </Alert>
      ) : null}
    </Stack>
  );
}
