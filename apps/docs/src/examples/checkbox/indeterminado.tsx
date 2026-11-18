import { useState } from 'react';
import { Checkbox, Fieldset } from '@eds-ui/react';

const canais = ['E-mail', 'Mensagem no aplicativo', 'SMS'];

export default function Indeterminado() {
  const [marcados, setMarcados] = useState<string[]>(['E-mail']);
  const todos = marcados.length === canais.length;
  const parcial = marcados.length > 0 && !todos;

  return (
    <Fieldset legend="Canais de aviso">
      {/* `indeterminate` é só visual e vem do estado: o pai reflete os filhos. */}
      <Checkbox
        checked={todos}
        indeterminate={parcial}
        onChange={() => setMarcados(todos ? [] : canais)}
      >
        Todos
      </Checkbox>
      {canais.map((canal) => (
        <Checkbox
          key={canal}
          checked={marcados.includes(canal)}
          onChange={() =>
            setMarcados((atual) =>
              atual.includes(canal) ? atual.filter((item) => item !== canal) : [...atual, canal],
            )
          }
        >
          {canal}
        </Checkbox>
      ))}
    </Fieldset>
  );
}
