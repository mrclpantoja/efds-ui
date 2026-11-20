import { Field, Input, InputGroup, Spinner } from '@eds-ui/react';

export default function Carregando() {
  return (
    <Field label="CEP">
      <InputGroup
        aria-busy
        suffix={
          <span className="eds-input-group-text">
            <Spinner size="sm" label="Buscando endereço" />
          </span>
        }
      >
        <Input inputMode="numeric" defaultValue="00000-000" autoComplete="postal-code" />
      </InputGroup>
    </Field>
  );
}
