import { useState } from 'react';
import {
  Alert,
  Button,
  ErrorSummary,
  Field,
  Input,
  Select,
  Textarea,
  useFormValidation,
} from '@efds-ui/react';

export default function Basico() {
  const [enviado, setEnviado] = useState(false);
  const { formProps, errorOf, summaryProps } = useFormValidation({
    onSubmit: (event) => {
      event.preventDefault();
      setEnviado(true);
    },
    onInvalid: () => setEnviado(false),
  });

  return (
    <form {...formProps} className="eds-stack eds-gap-4" aria-label="Contato">
      <ErrorSummary {...summaryProps} />
      <Field label="Nome" required error={errorOf('nome')}>
        <Input name="nome" autoComplete="off" />
      </Field>
      <Field label="E-mail" required error={errorOf('email')}>
        <Input name="email" type="email" autoComplete="off" />
      </Field>
      <Field label="Assunto" required error={errorOf('assunto')}>
        <Select name="assunto" defaultValue="">
          <option value="">Escolha</option>
          <option value="duvida">Dúvida</option>
          <option value="sugestao">Sugestão</option>
        </Select>
      </Field>
      <Field label="Mensagem" required error={errorOf('mensagem')}>
        <Textarea name="mensagem" rows={3} minLength={10} />
      </Field>
      <div>
        <Button type="submit" variant="primary">
          Enviar mensagem
        </Button>
      </div>
      {enviado && (
        <Alert tone="success" title="Mensagem válida">
          Nada foi enviado (fictício).
        </Alert>
      )}
    </form>
  );
}
