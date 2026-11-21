import { useMemo, useRef, useState } from 'react';
import * as icons from '@efds-ui/icons';
import type { IconComponent } from '@efds-ui/icons';
import { Button, Field, Input } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import Uso from '../../examples/icones/uso';
import usoHtml from '../../examples/icones/uso.html?raw';
import usoSource from '../../examples/icones/uso.tsx?raw';

/** Todos os ícones exportados pelo pacote, em ordem alfabética. */
const all = Object.entries(icons)
  .filter((entry): entry is [string, IconComponent] => entry[0].endsWith('Icon'))
  .sort(([a], [b]) => a.localeCompare(b));

/** Busca sem acento e sem caixa; "Icon" do nome não conta. */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const instalacao = `pnpm add @efds-ui/icons`;

const importacao = `import { SearchIcon, PlusIcon } from '@efds-ui/icons';

<SearchIcon />                         // decorativo: aria-hidden
<SearchIcon title="Buscar" />          // com nome: role="img" + <title>`;

/** SVG pronto para HTML puro: só os atributos de desenho, decorativo por padrão. */
function svgForHtml(svg: SVGSVGElement): string {
  const path = svg.querySelector('path')?.getAttribute('d') ?? '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">\n  <path d="${path}" />\n</svg>`;
}

function IconCell({
  name,
  Icon,
  onCopy,
}: {
  name: string;
  Icon: IconComponent;
  onCopy: (text: string, what: string) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  return (
    <li className="docs-icon-cell">
      <span className="docs-icon-glyph">
        <Icon ref={ref} />
      </span>
      <code className="docs-icon-name">{name}</code>
      <span className="docs-icon-actions">
        <Button
          size="sm"
          variant="ghost"
          aria-label={`React: copiar importação de ${name}`}
          onClick={() =>
            onCopy(`import { ${name} } from '@efds-ui/icons';`, `importação de ${name}`)
          }
        >
          React
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`SVG: copiar desenho de ${name}`}
          onClick={() => ref.current && onCopy(svgForHtml(ref.current), `SVG de ${name}`)}
        >
          SVG
        </Button>
      </span>
    </li>
  );
}

export default function Icones() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const shown = useMemo(() => {
    const q = normalize(query.trim());
    return q ? all.filter(([name]) => normalize(name.replace(/Icon$/, '')).includes(q)) : all;
  }, [query]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Copiado: ${what}.`);
    } catch {
      // Sem permissão para a API da área de transferência: cópia pelo campo temporário.
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.className = 'eds-visually-hidden';
      const active = document.activeElement as HTMLElement | null;
      document.body.append(field);
      field.select();
      const ok = document.execCommand('copy');
      field.remove();
      active?.focus();
      setStatus(ok ? `Copiado: ${what}.` : `Não foi possível copiar ${what}.`);
    }
  };

  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        O efDS.ui tem um conjunto próprio de {all.length} ícones de traço, desenhados para o projeto
        (nenhuma biblioteca de terceiros). Todos usam viewBox de 24, traço de 2 e{' '}
        <code>currentColor</code>, então herdam a cor do texto e se ajustam ao tema e ao modo.
      </p>

      <Section title="Catálogo">
        <Field label="Buscar ícone" helper="Digite parte do nome, em inglês (ex.: arrow, user).">
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <p className="eds-visually-hidden" role="status">
          {status}
        </p>
        <p className="docs-muted" aria-live="polite">
          {shown.length === all.length
            ? `${all.length} ícones.`
            : `${shown.length} de ${all.length} ícones.`}
        </p>
        {shown.length > 0 ? (
          <ul className="docs-icon-grid" aria-label="Ícones">
            {shown.map(([name, Icon]) => (
              <IconCell key={name} name={name} Icon={Icon} onCopy={copy} />
            ))}
          </ul>
        ) : (
          <p>Nenhum ícone com esse nome.</p>
        )}
        <p className="docs-muted">
          “React” copia a linha de importação; “SVG” copia o desenho pronto para HTML puro.
        </p>
      </Section>

      <Section title="Uso">
        <p>
          Com texto ao lado, o ícone é decorativo: o leitor de tela lê só o texto. Num botão só de
          ícone, o nome vai no <code>aria-label</code> do botão, nunca só no desenho.
        </p>
        <Example
          title="Ícone com texto e botões só de ícone"
          html={usoHtml}
          react={{ Component: Uso, source: usoSource }}
        />
      </Section>

      <Section title="Instalação e importação (React)">
        <CodeBlock code={instalacao} label="Instalação do pacote de ícones" />
        <CodeBlock code={importacao} label="Importação dos ícones" />
        <p>
          Cada ícone é um export nomeado: o bundler leva só os que você importar. Em HTML puro não
          há pacote a instalar: copie o SVG pelo botão do catálogo.
        </p>
      </Section>

      <Section title="Tamanho e cor">
        <ClassTable
          caption="Como o ícone se ajusta"
          rows={[
            {
              name: 'Tamanho',
              effect:
                '1em: acompanha o tamanho da fonte. Nos botões, o CSS do core o dimensiona pelo tamanho do botão.',
            },
            {
              name: 'Cor',
              effect:
                'currentColor: a mesma cor do texto ao redor, inclusive no modo escuro e no alto contraste.',
            },
            {
              name: 'title',
              effect:
                'React: dá nome ao ícone (role="img"). Use só quando o ícone sozinho transmite informação.',
            },
          ]}
        />
      </Section>
    </>
  );
}
