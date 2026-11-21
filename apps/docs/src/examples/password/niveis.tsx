import { Field, Grid, PasswordInput } from '@efds-ui/react';

// Valores fictícios só para mostrar os níveis; o medidor é calculado no navegador.
const niveis = ['abc', 'boaresposta2', 'BoaResposta9', 'Cavalo-Azul-77!'];

export default function Niveis() {
  return (
    <Grid auto>
      {niveis.map((valor, i) => (
        <Field key={valor} label={`Nível ${i + 1}`}>
          <PasswordInput defaultValue={valor} strength />
        </Field>
      ))}
    </Grid>
  );
}
