import { Combobox, Field, Stack } from '@eds-ui/react';

const cidades = [
  { value: 'poa', label: 'Porto Alegre' },
  { value: 'pel', label: 'Pelotas' },
  { value: 'pf', label: 'Passo Fundo' },
];

export default function Estados() {
  return (
    <Stack direction="row" wrap align="start" gap={3}>
      <Field label="Pequeno">
        <Combobox size="sm" options={cidades} />
      </Field>
      <Field label="Grande">
        <Combobox size="lg" options={cidades} />
      </Field>
      <Field label="Com erro" error="Escolha uma cidade da lista.">
        <Combobox options={cidades} />
      </Field>
      <Field label="Desabilitado">
        <Combobox options={cidades} defaultValue="poa" disabled />
      </Field>
    </Stack>
  );
}
