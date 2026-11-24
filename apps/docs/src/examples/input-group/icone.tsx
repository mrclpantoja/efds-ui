import { CheckIcon, SearchIcon } from '@efds-ui/icons';
import { Field, Grid, Input, InputGroup } from '@efds-ui/react';

/* Um nó (não texto) entra no grupo como veio: leve o próprio .eds-input-group-text. */
export default function Icone() {
  return (
    <Grid auto>
      <Field label="Buscar contrato">
        <InputGroup
          prefix={
            <span className="eds-input-group-text">
              <SearchIcon />
            </span>
          }
        >
          <Input type="search" />
        </InputGroup>
      </Field>
      <Field label="E-mail">
        <InputGroup
          suffix={
            <span className="eds-input-group-text">
              <CheckIcon />
            </span>
          }
        >
          <Input type="email" defaultValue="maria@exemplo.gov.br" />
        </InputGroup>
      </Field>
    </Grid>
  );
}
