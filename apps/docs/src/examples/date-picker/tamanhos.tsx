import { DatePicker, Field, Stack } from '@efds-ui/react';

export default function Tamanhos() {
  return (
    <Stack gap={3}>
      <Field label="Pequeno">
        <DatePicker size="sm" name="pequeno" />
      </Field>
      <Field label="Médio">
        <DatePicker name="medio" />
      </Field>
      <Field label="Grande">
        <DatePicker size="lg" name="grande" />
      </Field>
    </Stack>
  );
}
