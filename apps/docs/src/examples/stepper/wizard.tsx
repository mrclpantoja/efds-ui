import { useState } from 'react';
import { Alert, Field, Input, Wizard } from '@efds-ui/react';

export default function WizardExemplo() {
  const [enviado, setEnviado] = useState<string | null>(null);
  return (
    <>
      <Wizard
        aria-label="Etapas do cadastro"
        onComplete={(dados) => setEnviado(String(dados.get('nome')))}
        steps={[
          {
            title: 'Dados',
            content: (
              <div className="eds-stack eds-gap-3">
                <Field label="Nome completo" required>
                  <Input name="nome" autoComplete="off" />
                </Field>
                <Field label="E-mail" required>
                  <Input name="email" type="email" autoComplete="off" />
                </Field>
              </div>
            ),
          },
          {
            title: 'Endereço',
            content: (
              <div className="eds-stack eds-gap-3">
                <Field label="Logradouro" required>
                  <Input name="logradouro" autoComplete="off" />
                </Field>
                <Field label="Cidade" required>
                  <Input name="cidade" autoComplete="off" />
                </Field>
              </div>
            ),
          },
          {
            title: 'Confirmação',
            content: <p>Revise os dados informados e conclua o cadastro.</p>,
          },
        ]}
      />
      {enviado !== null && (
        <Alert tone="success" title="Cadastro concluído">
          Dados de {enviado} recebidos (fictício: nada foi enviado).
        </Alert>
      )}
    </>
  );
}
