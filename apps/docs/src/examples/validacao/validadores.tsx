import { Field, Input, useFormValidation, type ValidatorName } from '@efds-ui/react';

// Dados fictícios, gerados por algoritmo. A prop `validate` usa as mesmas funções do HTML.
const campos: { name: string; label: string; validate: ValidatorName; ajuda?: string }[] = [
  { name: 'cpf', label: 'CPF', validate: 'cpf', ajuda: 'Válido: 529.982.247-25' },
  {
    name: 'cnpj',
    label: 'CNPJ',
    validate: 'cnpj',
    ajuda: 'Válidos: 11.222.333/0001-81 e 12.ABC.345/01DE-35',
  },
  { name: 'doc', label: 'CPF ou CNPJ', validate: 'cpf-cnpj' },
  { name: 'cep', label: 'CEP', validate: 'cep', ajuda: 'Válido: 90010-100' },
  {
    name: 'tel',
    label: 'Telefone (celular)',
    validate: 'telefone',
    ajuda: 'Válido: (53) 99912-3456',
  },
  { name: 'email', label: 'E-mail', validate: 'email' },
  { name: 'pis', label: 'PIS/PASEP/NIS', validate: 'pis', ajuda: 'Válido: 123.45678.90-0' },
  {
    name: 'titulo',
    label: 'Título de eleitor',
    validate: 'titulo',
    ajuda: 'Válido: 1234 5678 0396',
  },
  { name: 'placa', label: 'Placa', validate: 'placa', ajuda: 'Válidas: ABC-1234 e ABC1D23' },
  {
    name: 'data',
    label: 'Data',
    validate: 'data',
    ajuda: 'Recusa 31/02/2026 e 29/02 em ano comum.',
  },
];

export default function Validadores() {
  const { formProps, errorOf } = useFormValidation();
  return (
    <form {...formProps} className="eds-grid eds-grid-auto" aria-label="Validadores">
      {campos.map((campo) => (
        <Field
          key={campo.name}
          label={campo.label}
          helper={campo.ajuda}
          error={errorOf(campo.name)}
        >
          <Input
            name={campo.name}
            autoComplete="off"
            validate={campo.validate}
            data-eds-validate-phone-type={campo.name === 'tel' ? 'mobile' : undefined}
            placeholder={campo.name === 'data' ? 'dd/mm/aaaa' : undefined}
          />
        </Field>
      ))}
    </form>
  );
}
