import { Checkbox, Stack } from '@efds-ui/react';

export default function Estados() {
  return (
    <Stack gap={1}>
      <Checkbox defaultChecked>Marcado</Checkbox>
      <Checkbox>Desmarcado</Checkbox>
      <Checkbox disabled defaultChecked>
        Desabilitado marcado
      </Checkbox>
      <Checkbox disabled>Desabilitado</Checkbox>
      {/* Fora de um Fieldset com `error`, ligue invalid e a descrição à mão. */}
      <Checkbox invalid aria-describedby="chk-erro">
        Li e aceito as condições
      </Checkbox>
      <p className="eds-error" id="chk-erro">
        É preciso aceitar para continuar.
      </p>
    </Stack>
  );
}
