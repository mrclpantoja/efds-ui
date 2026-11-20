import { useState } from 'react';
import { Button, SessionTimeout, Stack } from '@eds-ui/react';

/**
 * Em produção o tempo é o da política do sistema (`timeout={900} warnBefore={60}`). Aqui a
 * demonstração dura 25 s: o aviso abre aos 10 s de inatividade.
 */
export default function Basico() {
  const [active, setActive] = useState(false);
  const [expired, setExpired] = useState(false);
  return (
    <Stack gap={3} align="start">
      <Button
        variant="secondary"
        onClick={() => {
          setExpired(false);
          setActive(true);
        }}
      >
        Iniciar sessão de demonstração (25 s)
      </Button>
      {active && (
        <SessionTimeout
          timeout={25}
          warnBefore={15}
          storageKey="eds-docs-session-demo"
          onExpire={() => {
            setActive(false);
            setExpired(true);
          }}
        />
      )}
      {active && <p className="eds-text-small">Fique sem usar a página para ver o aviso.</p>}
      {expired && <p role="status">Sessão encerrada por inatividade.</p>}
    </Stack>
  );
}
