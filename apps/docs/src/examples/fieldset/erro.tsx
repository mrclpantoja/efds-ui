import { Checkbox, Fieldset } from '@efds-ui/react';

export default function Erro() {
  return (
    <Fieldset legend="Termos" error="É preciso aceitar para continuar.">
      <Checkbox>Li e aceito as condições</Checkbox>
    </Fieldset>
  );
}
