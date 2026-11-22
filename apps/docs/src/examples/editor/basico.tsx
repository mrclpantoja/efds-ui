import { useState } from 'react';
import { Editor } from '@efds-ui/editor/react';

const inicial =
  '<h2>Resumo do projeto</h2><p>Texto com <strong>negrito</strong>, <em>itálico</em> e uma lista:</p><ul><li>Primeiro item</li><li>Segundo item</li></ul>';

export default function Basico() {
  const [html, setHtml] = useState(inicial);
  return (
    <Editor
      label="Descrição"
      name="descricao"
      rows={8}
      placeholder="Escreva a descrição…"
      value={html}
      onChange={setHtml}
    />
  );
}
