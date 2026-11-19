import { useState, type FormEvent } from 'react';
import { Button, DatePicker, Field, Stack } from '@eds-ui/react';

export default function Obrigatorio() {
  const [iso, setIso] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(iso ? '' : 'Informe o vencimento.');
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <Field label="Vencimento" required error={error}>
          <DatePicker
            name="vencimento"
            onChange={(value) => {
              setIso(value);
              if (value) setError('');
            }}
          />
        </Field>
        <div>
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </div>
      </Stack>
    </form>
  );
}
