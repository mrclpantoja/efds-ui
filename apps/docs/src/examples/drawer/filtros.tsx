import { useState, type FormEvent } from 'react';
import {
  Button,
  Checkbox,
  Drawer,
  Field,
  Fieldset,
  Input,
  Select,
  Stack,
  Switch,
} from '@eds-ui/react';

export default function Filtros() {
  const [open, setOpen] = useState(false);
  const fechar = () => setOpen(false);
  const aplicar = (event: FormEvent) => {
    event.preventDefault();
    fechar();
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Filtros</Button>
      <Drawer
        open={open}
        onClose={fechar}
        title="Filtros"
        footer={
          <>
            <Button type="reset" variant="tertiary" form="filtros-projetos">
              Limpar
            </Button>
            <Button onClick={fechar}>Cancelar</Button>
            <Button variant="primary" type="submit" form="filtros-projetos">
              Aplicar
            </Button>
          </>
        }
      >
        <form id="filtros-projetos" onSubmit={aplicar}>
          <Stack gap={4}>
            <Field label="Buscar">
              <Input data-autofocus placeholder="Nome ou código" autoComplete="off" />
            </Field>
            <Field label="Departamento">
              <Select defaultValue="">
                <option value="">Todos</option>
                <option>Compras</option>
                <option>Financeiro</option>
                <option>Tecnologia</option>
              </Select>
            </Field>
            <Fieldset legend="Situação">
              <Checkbox defaultChecked>Em andamento</Checkbox>
              <Checkbox>Concluído</Checkbox>
              <Checkbox>Arquivado</Checkbox>
            </Fieldset>
            <Switch>Somente meus projetos</Switch>
          </Stack>
        </form>
      </Drawer>
    </>
  );
}
