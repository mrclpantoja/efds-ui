import { Field, Input, Stack } from '@efds-ui/react';

export default function Tamanhos() {
  return (
    <Stack gap={3}>
      <Field label="Pequeno">
        <Input size="sm" defaultValue="Texto" />
      </Field>
      <Field label="Médio">
        <Input defaultValue="Texto" />
      </Field>
      <Field label="Grande">
        <Input size="lg" defaultValue="Texto" />
      </Field>
    </Stack>
  );
}
