import { Field, FileInput } from '@efds-ui/react';

export default function Simples() {
  return (
    <Field label="Comprovante" helper="PDF até 5 MB.">
      <FileInput name="comprovante" accept=".pdf" />
    </Field>
  );
}
