import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Stack, Textarea, useUnsavedChanges } from '@eds-ui/react';

export default function Basico() {
  const [titulo, setTitulo] = useState('Projeto Aurora');
  const [obs, setObs] = useState('');
  const [saved, setSaved] = useState({ titulo: 'Projeto Aurora', obs: '' });
  const dirty = titulo !== saved.titulo || obs !== saved.obs;
  // Fechar a aba avisa; clicar em links internos pergunta antes de sair.
  useUnsavedChanges(dirty, { message: 'Há alterações não salvas. Sair mesmo assim?' });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaved({ titulo, obs });
  };

  return (
    <form onSubmit={onSubmit}>
      <Stack gap={4}>
        <Field label="Título" required>
          <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
        </Field>
        <Field label="Observações">
          <Textarea rows={3} value={obs} onChange={(event) => setObs(event.target.value)} />
        </Field>
        <Stack direction="row" wrap gap={3}>
          <Button type="submit" variant="primary">
            Salvar
          </Button>
          <Button variant="tertiary" href="#/componentes/dirty-guard">
            Voltar à lista
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
