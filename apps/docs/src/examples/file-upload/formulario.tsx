import { Field, FileUpload } from '@eds-ui/react';

export default function Formulario() {
  return (
    <Field label="Documentos do contrato">
      <FileUpload name="documentos[]" accept=".pdf,.jpg,.png" hint="PDF, JPG ou PNG" />
    </Field>
  );
}
