import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, Input, Modal, Select, Stack, Textarea } from '@efds-ui/react';

export default function Formulario() {
  const [open, setOpen] = useState(false);
  const fechar = () => setOpen(false);
  const enviar = (event: FormEvent) => {
    event.preventDefault();
    fechar();
  };
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Novo projeto
      </Button>
      {/* Formulário com dados a perder: o backdrop não fecha. */}
      <Modal
        open={open}
        onClose={fechar}
        title="Novo projeto"
        closeOnBackdrop={false}
        footer={
          <>
            <Button onClick={fechar}>Cancelar</Button>
            <Button variant="primary" type="submit" form="novo-projeto">
              Criar projeto
            </Button>
          </>
        }
      >
        <form id="novo-projeto" onSubmit={enviar}>
          <Stack gap={4}>
            <p className="eds-helper">* campo obrigatório</p>
            <Field label="Nome do projeto" required>
              <Input data-autofocus placeholder="Ex.: Projeto Horizonte" autoComplete="off" />
            </Field>
            <Field label="Departamento" required>
              <Select defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                <option>Compras</option>
                <option>Financeiro</option>
                <option>Tecnologia</option>
              </Select>
            </Field>
            <Field label="Descrição" helper="Máximo de 500 caracteres.">
              <Textarea placeholder="Objetivo e escopo" />
            </Field>
            <Checkbox defaultChecked>Notificar a equipe por e-mail</Checkbox>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
