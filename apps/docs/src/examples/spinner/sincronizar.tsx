import { useEffect, useState } from 'react';
import { Button, Spinner, Stack } from '@eds-ui/react';

export default function Sincronizar() {
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!syncing) return;
    const timer = setTimeout(() => setSyncing(false), 3000);
    return () => clearTimeout(timer);
  }, [syncing]);

  return (
    <Stack direction="row" wrap gap={3}>
      <Button disabled={syncing} onClick={() => setSyncing(true)}>
        Sincronizar pedidos
      </Button>
      {/* O role="status" nasce montado e vazio: uma região que já nasce preenchida não é
          anunciada. O spinner é decorativo porque o texto ao lado já diz o estado. */}
      <span role="status">
        {syncing ? (
          <Stack direction="row" gap={2} as="span">
            <Spinner size="sm" decorative />
            Sincronizando pedidos…
          </Stack>
        ) : null}
      </span>
    </Stack>
  );
}
