import { useState } from 'react';
import { OtpInput } from '@efds-ui/react';

export default function Basico() {
  const [codigo, setCodigo] = useState('');
  return (
    <OtpInput
      legend="Código de verificação"
      name="codigo"
      length={6}
      onComplete={setCodigo}
      aria-describedby="otp-ajuda"
    >
      <p className="eds-helper" id="otp-ajuda">
        Enviamos 6 dígitos para o seu e-mail.{codigo ? ` Código completo: ${codigo}.` : ''}
      </p>
    </OtpInput>
  );
}
