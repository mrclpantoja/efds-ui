import { useState } from 'react';
import { Banner, Button } from '@efds-ui/react';

export default function Dinamico() {
  const [online, setOnline] = useState(false);
  if (online) return <Button onClick={() => setOnline(false)}>Simular queda de conexão</Button>;
  return (
    <Banner
      live
      tone="danger"
      actions={
        <Button variant="secondary" size="sm" onClick={() => setOnline(true)}>
          Tentar agora
        </Button>
      }
    >
      <strong>Sem conexão.</strong> As alterações serão enviadas quando a conexão voltar.
    </Banner>
  );
}
