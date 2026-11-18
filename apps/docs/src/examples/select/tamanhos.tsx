import { Field, Select, Stack } from '@eds-ui/react';

export default function Tamanhos() {
  return (
    <Stack direction="row" wrap align="end" gap={3}>
      <Field label="Pequeno">
        <Select size="sm">
          <option>Opção A</option>
          <option>Opção B</option>
        </Select>
      </Field>
      <Field label="Médio">
        <Select>
          <option>Opção A</option>
          <option>Opção B</option>
        </Select>
      </Field>
      <Field label="Grande">
        <Select size="lg">
          <option>Opção A</option>
          <option>Opção B</option>
        </Select>
      </Field>
    </Stack>
  );
}
