import { Field, FileUpload } from '@eds-ui/react';

export default function Validacao() {
  return (
    <Field label="Fotos da vistoria">
      <FileUpload
        name="fotos[]"
        accept=".jpg,.png"
        maxSize={2 * 1024 * 1024}
        maxFiles={3}
        hint="JPG ou PNG, até 2 MB cada (máx. 3)"
      />
    </Field>
  );
}
