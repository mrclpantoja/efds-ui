import { Fieldset, Switch } from '@eds-ui/react';

export default function Preferencias() {
  return (
    <Fieldset legend="Preferências">
      <Switch defaultChecked>Modo automático</Switch>
      <Switch>Relatório semanal</Switch>
      <Switch disabled defaultChecked>
        Sincronização (indisponível, ligada)
      </Switch>
    </Fieldset>
  );
}
