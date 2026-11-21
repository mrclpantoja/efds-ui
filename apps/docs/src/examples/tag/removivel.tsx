import { useEffect, useRef, useState } from 'react';
import { Tag } from '@efds-ui/react';

const inicial = [
  { nome: 'Financeiro', tom: 'info' as const },
  { nome: 'Contratos', tom: 'success' as const },
  { nome: 'Rascunho', tom: 'neutral' as const },
];

export default function Removivel() {
  const [tags, setTags] = useState(inicial);
  const [aviso, setAviso] = useState('');
  // Posição da tag removida: o foco vai para o botão que ocupou o lugar (ou o anterior).
  const foco = useRef<number | null>(null);
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (foco.current === null) return;
    const botoes = lista.current?.querySelectorAll<HTMLButtonElement>('.eds-tag-remove');
    (botoes?.[foco.current] ?? botoes?.[foco.current - 1] ?? lista.current)?.focus();
    foco.current = null;
  }, [tags]);

  const remover = (indice: number) => {
    setAviso(`${tags[indice]?.nome ?? 'Marcador'} removido.`);
    setTags((atual) => atual.filter((_, i) => i !== indice));
    foco.current = indice;
  };

  return (
    <>
      <ul ref={lista} tabIndex={-1} className="eds-tag-list" aria-label="Marcadores do projeto">
        {tags.map((tag, indice) => (
          <li key={tag.nome}>
            <Tag tone={tag.tom} onRemove={() => remover(indice)}>
              {tag.nome}
            </Tag>
          </li>
        ))}
      </ul>
      <span role="status" className="eds-visually-hidden">
        {aviso}
      </span>
    </>
  );
}
