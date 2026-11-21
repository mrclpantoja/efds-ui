import { OtpInput } from '@efds-ui/react';

export default function Erro() {
  return (
    <OtpInput
      legend="Código de verificação"
      length={4}
      defaultValue="1234"
      invalid
      aria-describedby="otp-erro-msg"
    >
      <p className="eds-error" id="otp-erro-msg">
        Código incorreto ou expirado. Peça um novo código.
      </p>
    </OtpInput>
  );
}
