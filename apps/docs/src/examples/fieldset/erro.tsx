import { Checkbox, Fieldset } from '@eds-ui/react';

export default function Erro() {
  return (
    <Fieldset legend="Termos" error="É preciso aceitar para continuar.">
      <Checkbox>Li e aceito as condições</Checkbox>
    </Fieldset>
  );
}
