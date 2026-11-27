import { useState } from 'react';
import { Button, Checkbox, Field, Input, Stack, useSubmit } from '@efds-ui/react';

// "Servidor" fictício: espera 1,5 s e responde ou falha.
const salvar = (falhar: boolean) =>
  new Promise<void>((ok, falha) =>
    setTimeout(() => (falhar ? falha(new Error('simulada')) : ok()), 1500),
  );

export default function Basico() {
  const [falhar, setFalhar] = useState(false);
  const submit = useSubmit(() => salvar(falhar));

  return (
    <form onSubmit={submit.handleSubmit}>
      <Stack gap={4}>
        <Field label="Nome do projeto" required>
          <Input name="nome" defaultValue="Projeto Aurora" />
        </Field>
        <Checkbox checked={falhar} onChange={(event) => setFalhar(event.target.checked)}>
          Simular falha no servidor
        </Checkbox>
        <Stack direction="row" wrap gap={3}>
          <Button type="submit" variant="primary" {...submit.buttonProps}>
            Salvar
          </Button>
          <Button
            type="submit"
            name="acao"
            value="rascunho"
            aria-disabled={submit.loading || undefined}
          >
            Salvar rascunho
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
