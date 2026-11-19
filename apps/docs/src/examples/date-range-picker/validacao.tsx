import { useState, type FormEvent } from 'react';
import { Button, DateRangePicker, Field, Stack, type DateRangeValue } from '@eds-ui/react';

export default function Validacao() {
  const [range, setRange] = useState<DateRangeValue>({ start: null, end: null });
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(range.start && range.end ? '' : 'Informe a data inicial e a final.');
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <Field label="Período de férias" required error={error}>
          <DateRangePicker
            nameStart="ferias_inicio"
            nameEnd="ferias_fim"
            min="2026-01-01"
            max="2026-12-31"
            maxDays={30}
            onChange={(value) => {
              setRange(value);
              if (value.start && value.end) setError('');
            }}
          />
        </Field>
        <div>
          <Button type="submit" variant="primary">
            Solicitar
          </Button>
        </div>
      </Stack>
    </form>
  );
}
