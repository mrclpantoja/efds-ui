import { Combobox, Field } from '@efds-ui/react';

const cidades = [
  { value: 'poa', label: 'Porto Alegre' },
  { value: 'pel', label: 'Pelotas' },
  { value: 'pf', label: 'Passo Fundo' },
  { value: 'cax', label: 'Caxias do Sul' },
  { value: 'pot', label: 'Potiraguá (indisponível)', disabled: true },
];

export default function Basico() {
  return (
    <Field label="Cidade">
      <Combobox name="cidade" options={cidades} />
    </Field>
  );
}
