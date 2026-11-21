import { Field, Input } from '@efds-ui/react';

// Fallback sem JS: um só campo (o `OtpInput` do React já entrega as células).
export default function CampoUnico() {
  return (
    <Field label="Código de verificação" helper="6 dígitos.">
      <Input
        className="eds-otp-single"
        name="codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
      />
    </Field>
  );
}
