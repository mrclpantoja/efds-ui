import { Checkbox, Fieldset } from '@efds-ui/react';

export default function Notificacoes() {
  return (
    <Fieldset legend="Notificações" helper="Escolha como deseja ser avisado.">
      <Checkbox defaultChecked>E-mail</Checkbox>
      <Checkbox>Mensagem no aplicativo</Checkbox>
      <Checkbox disabled>Telefone (indisponível)</Checkbox>
    </Fieldset>
  );
}
