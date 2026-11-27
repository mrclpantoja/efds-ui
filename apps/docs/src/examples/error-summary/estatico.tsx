import { ErrorSummary, Field, Input } from '@efds-ui/react';

// Dados fictícios. `errors` vem de onde você quiser (servidor, outro formulário): sem useFormValidation.
export default function Estatico() {
  return (
    <div className="eds-stack eds-gap-4">
      <ErrorSummary
        moveFocus={false}
        errors={[
          { id: 'ese-cpf', label: 'CPF', message: 'Informe um CPF válido.' },
          {
            id: 'ese-email',
            label: 'E-mail',
            message: 'Informe um e-mail válido, como nome@exemplo.com.br.',
          },
        ]}
      />
      <div className="eds-grid eds-grid-auto">
        <Field label="CPF" controlId="ese-cpf" error="Informe um CPF válido.">
          <Input defaultValue="111.111.111-11" />
        </Field>
        <Field
          label="E-mail"
          controlId="ese-email"
          error="Informe um e-mail válido, como nome@exemplo.com.br."
        >
          <Input defaultValue="maria@" />
        </Field>
      </div>
    </div>
  );
}
