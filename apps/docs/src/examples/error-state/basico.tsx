import { useEffect, useState } from 'react';
import { ErrorState } from '@eds-ui/react';

export default function Basico() {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (!retrying) return undefined;
    const timer = setTimeout(() => setRetrying(false), 1500);
    return () => clearTimeout(timer);
  }, [retrying]);
  return (
    <ErrorState
      title="Não foi possível carregar os pedidos"
      description="Verifique a conexão e tente novamente. Se o problema continuar, informe o código abaixo ao suporte."
      detail="Código: ERR-0042"
      retrying={retrying}
      onRetry={() => setRetrying(true)}
    />
  );
}
