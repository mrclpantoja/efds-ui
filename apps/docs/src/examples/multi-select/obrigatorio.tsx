import { Button, Field, MultiSelect, Stack } from '@eds-ui/react';

const regioes = [
  { value: 'norte', label: 'Norte' },
  { value: 'sul', label: 'Sul' },
  { value: 'serra', label: 'Serra' },
];

export default function Obrigatorio() {
  return (
    <form
      onSubmit={(event) => {
        // Só chega aqui com ao menos uma região: a validade nativa bloqueia antes.
        event.preventDefault();
      }}
    >
      <Stack>
        <Field label="Regiões de atuação" required>
          <MultiSelect name="regioes[]" options={regioes} />
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
