import { Field, FileInput, Stack } from '@eds-ui/react';

export default function Estados() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Field label="Com erro" error="Anexe o comprovante.">
        <FileInput />
      </Field>
      <Field label="Desabilitado">
        <FileInput disabled />
      </Field>
    </Stack>
  );
}
