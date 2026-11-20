import { Button, Field, Grid, Input, InputGroup } from '@eds-ui/react';

export default function Basico() {
  return (
    <Grid auto>
      <Field label="Valor">
        <InputGroup prefix="R$">
          <Input inputMode="decimal" defaultValue="1.280,50" />
        </InputGroup>
      </Field>
      <Field label="Peso">
        <InputGroup suffix="kg">
          <Input inputMode="decimal" defaultValue="12,5" />
        </InputGroup>
      </Field>
      <Field label="Usuário">
        <InputGroup prefix="@" suffix=".exemplo.gov.br">
          <Input defaultValue="maria.exemplo" />
        </InputGroup>
      </Field>
      <Field label="Buscar">
        <InputGroup
          suffix={
            <Button variant="secondary" className="eds-input-group-button">
              Buscar
            </Button>
          }
        >
          <Input type="search" />
        </InputGroup>
      </Field>
      <Field label="Valor com erro" error="O valor não pode ser negativo.">
        <InputGroup prefix="R$">
          <Input inputMode="decimal" defaultValue="-5" />
        </InputGroup>
      </Field>
      <Field label="Desabilitado">
        <InputGroup prefix="R$">
          <Input defaultValue="0,00" disabled />
        </InputGroup>
      </Field>
    </Grid>
  );
}
