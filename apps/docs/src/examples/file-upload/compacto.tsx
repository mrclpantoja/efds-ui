import { Field, FileUpload } from '@eds-ui/react';

export default function Compacto() {
  return (
    <Field label="Laudo">
      <FileUpload
        name="laudo"
        accept=".pdf"
        multiple={false}
        compact
        maxSize={5 * 1024 * 1024}
        hint="PDF até 5 MB"
      />
    </Field>
  );
}
