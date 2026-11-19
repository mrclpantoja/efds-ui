import { Field, MultiSelect } from '@eds-ui/react';

const filiais = [
  { value: 'poa', label: 'Porto Alegre' },
  { value: 'pel', label: 'Pelotas' },
  { value: 'pf', label: 'Passo Fundo' },
  { value: 'cax', label: 'Caxias do Sul' },
  { value: 'sm', label: 'Santa Maria' },
];

export default function Limite() {
  return (
    <Field label="Filiais (até 2)" helper="Ao escolher a segunda, as demais ficam indisponíveis.">
      <MultiSelect name="filiais[]" options={filiais} maxSelected={2} />
    </Field>
  );
}
