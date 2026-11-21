import { Field, FileInput, Stack } from '@efds-ui/react';

export default function Tamanhos() {
  return (
    <Stack direction="row" wrap align="start" gap={3}>
      <Field label="Pequeno">
        <FileInput size="sm" />
      </Field>
      <Field label="Médio (padrão)">
        <FileInput />
      </Field>
      <Field label="Grande">
        <FileInput size="lg" />
      </Field>
    </Stack>
  );
}
