import { Field, Input } from '@efds-ui/react';

export default function Basico() {
  return (
    <Field label="Nome completo" helper="Como consta no documento." required>
      <Input autoComplete="name" placeholder="Ex.: Maria Exemplo" />
    </Field>
  );
}
