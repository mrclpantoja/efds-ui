import { Fieldset, Switch } from '@efds-ui/react';

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
