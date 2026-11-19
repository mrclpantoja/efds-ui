import { useState } from 'react';
import { DatePicker, Field } from '@eds-ui/react';

export default function Basico() {
  const [iso, setIso] = useState<string | null>(null);
  return (
    <>
      <Field label="Vencimento">
        <DatePicker name="vencimento" onChange={(value) => setIso(value)} />
      </Field>
      <p className="eds-text-small">Valor enviado: {iso ?? 'nenhum'}</p>
    </>
  );
}
