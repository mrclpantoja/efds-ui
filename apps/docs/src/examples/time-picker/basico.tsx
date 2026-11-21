import { useState } from 'react';
import { Field, TimePicker } from '@efds-ui/react';

export default function Basico() {
  const [hora, setHora] = useState('');
  return (
    <>
      <Field label="Início" helper="Das 08:00 às 18:00, de 15 em 15 minutos.">
        <TimePicker name="inicio" step={15} min="08:00" max="18:00" onChange={setHora} />
      </Field>
      <p className="eds-text-small">Valor enviado: {hora || 'nenhum'}</p>
    </>
  );
}
