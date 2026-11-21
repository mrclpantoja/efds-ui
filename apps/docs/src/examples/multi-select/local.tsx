import { Field, MultiSelect } from '@efds-ui/react';

const cidades = [
  { value: 'poa', label: 'Porto Alegre' },
  { value: 'pel', label: 'Pelotas' },
  { value: 'pf', label: 'Passo Fundo' },
  { value: 'cax', label: 'Caxias do Sul' },
  { value: 'sm', label: 'Santa Maria' },
];

export default function Local() {
  return (
    <Field label="Cidades atendidas">
      <MultiSelect name="cidades[]" options={cidades} defaultValue={['poa']} />
    </Field>
  );
}
