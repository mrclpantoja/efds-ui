import { Alert, Button, Stack } from '@efds-ui/react';

export default function PrimeiroComponente() {
  return (
    <Stack gap={3}>
      <Alert variant="success">
        <p>Cliente salvo.</p>
      </Alert>
      <div>
        <Button variant="primary">Novo cliente</Button>
      </div>
    </Stack>
  );
}
