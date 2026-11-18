import { Button, Card, CardBody, Stack } from '@eds-ui/react';

export default function Subarvore() {
  return (
    <Card data-theme="green" data-mode="dark" data-density="compact" data-shape="rounded">
      <CardBody>
        <Stack gap={3}>
          <p>Esta subárvore usa tema verde, modo escuro, densidade compacta e forma arredondada.</p>
          <div>
            <Button variant="primary">Confirmar</Button>
          </div>
        </Stack>
      </CardBody>
    </Card>
  );
}
