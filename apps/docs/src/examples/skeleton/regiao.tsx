import { useState } from 'react';
import { Button, Card, CardBody, Skeleton, SkeletonRegion, Stack } from '@eds-ui/react';

export default function Regiao() {
  const [loading, setLoading] = useState(true);
  return (
    <Stack gap={3}>
      <div>
        <Button aria-pressed={loading} onClick={() => setLoading((v) => !v)}>
          {loading ? 'Mostrar conteúdo' : 'Mostrar carregamento'}
        </Button>
      </div>
      <SkeletonRegion loading={loading} label="Carregando perfil">
        <Card>
          <CardBody>
            {loading ? (
              <Stack direction="row" gap={3} align="start">
                <Skeleton variant="circle" shimmer />
                <Stack className="eds-stack-grow" gap={0}>
                  <Skeleton variant="text" shimmer />
                  <Skeleton variant="text" shimmer />
                  <Skeleton variant="text" shimmer />
                </Stack>
              </Stack>
            ) : (
              <p>Maria Exemplo, analista financeira, responsável pela conciliação mensal.</p>
            )}
          </CardBody>
        </Card>
      </SkeletonRegion>
    </Stack>
  );
}
