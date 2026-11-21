import { useState } from 'react';
import { DateRangePicker, Field, type DateRangeValue } from '@efds-ui/react';

export default function Basico() {
  const [range, setRange] = useState<DateRangeValue>({ start: null, end: null });
  return (
    <>
      <Field label="Período do relatório">
        <DateRangePicker nameStart="inicio" nameEnd="fim" onChange={setRange} />
      </Field>
      <p className="eds-text-small">
        Valores enviados: {range.start ?? 'nenhum'} e {range.end ?? 'nenhum'}
      </p>
    </>
  );
}
