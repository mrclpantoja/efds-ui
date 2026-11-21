import { Field, PasswordInput } from '@efds-ui/react';

export default function Basico() {
  return (
    <Field label="Nova senha" required>
      <PasswordInput name="senha" autoComplete="new-password" strength rules />
    </Field>
  );
}
