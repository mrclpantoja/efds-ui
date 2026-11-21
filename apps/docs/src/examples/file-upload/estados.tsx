import { Field, FileUpload, Stack } from '@efds-ui/react';

export default function Estados() {
  return (
    <Stack>
      <Field label="Com erro" error="Anexe ao menos um documento.">
        <FileUpload name="obrigatorios[]" hint="PDF até 5 MB" />
      </Field>
      <Field label="Desabilitado">
        <FileUpload name="bloqueados[]" hint="PDF até 5 MB" disabled />
      </Field>
    </Stack>
  );
}
