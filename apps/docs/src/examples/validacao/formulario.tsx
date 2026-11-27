import { useState } from 'react';
import { Alert, Button, ErrorSummary, Field, Input, useFormValidation } from '@efds-ui/react';

// Dados fictícios. As regras são as mesmas do `data-eds-validate` do HTML.
export default function Formulario() {
  const [enviado, setEnviado] = useState(false);
  const { formProps, errorOf, summaryProps } = useFormValidation({
    onSubmit: (event) => {
      event.preventDefault();
      setEnviado(true);
    },
    onInvalid: () => setEnviado(false),
  });

  return (
    <form {...formProps} className="eds-stack eds-gap-4" aria-label="Cadastro">
      <ErrorSummary {...summaryProps} />
      <div className="eds-grid eds-grid-auto">
        <Field label="Nome completo" required error={errorOf('nome')}>
          <Input name="nome" autoComplete="off" minLength={5} />
        </Field>
        <Field
          label="CPF"
          required
          helper="Para testar: 529.982.247-25 é válido."
          error={errorOf('cpf')}
        >
          <Input name="cpf" autoComplete="off" mask="cpf" validate="cpf" />
        </Field>
        <Field label="E-mail institucional" required error={errorOf('email')}>
          <Input
            name="email"
            type="email"
            autoComplete="off"
            validate="email"
            validateMessage="Use o e-mail institucional, como nome@orgao.gov.br."
          />
        </Field>
        <Field label="Telefone" error={errorOf('telefone')}>
          <Input name="telefone" autoComplete="off" mask="telefone" validate="telefone" />
        </Field>
        <Field label="Data de nascimento" error={errorOf('nascimento')}>
          <Input
            name="nascimento"
            autoComplete="off"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            min="01/01/1900"
            max="31/12/2026"
            validate="data"
          />
        </Field>
      </div>
      <div>
        <Button type="submit" variant="primary">
          Cadastrar
        </Button>
      </div>
      {enviado && (
        <Alert variant="success" title="Cadastro válido">
          Todos os campos passaram na validação (fictício: nada foi enviado).
        </Alert>
      )}
    </form>
  );
}
