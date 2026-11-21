import { Spinner, Stack } from '@efds-ui/react';

export default function Tamanhos() {
  return (
    <Stack direction="row" wrap gap={4}>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
    </Stack>
  );
}
