import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import Escala from '../../examples/tipografia/escala';
import escalaHtml from '../../examples/tipografia/escala.html?raw';
import escalaSource from '../../examples/tipografia/escala.tsx?raw';
import Semantica from '../../examples/tipografia/semantica';
import semanticaHtml from '../../examples/tipografia/semantica.html?raw';
import semanticaSource from '../../examples/tipografia/semantica.tsx?raw';

const fonte = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
/>`;

const fonteOutra = `:root {
  --eds-font-family: 'Source Sans 3', system-ui, sans-serif;
}`;

export default function Tipografia() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        A escala tipográfica é aplicada por classes <code>.eds-text-*</code>, não por tags. O nível
        semântico do título (h2, h3) fica independente da aparência, e o core não briga com o CSS da
        sua aplicação.
      </p>

      <Section title="A escala">
        <p>
          São nove estilos. Cada um define tamanho, altura de linha e peso por tokens, então seguem
          a família escolhida e não mudam com a densidade.
        </p>
        <Example
          title="Os nove estilos"
          html={escalaHtml}
          react={{ Component: Escala, source: escalaSource }}
        />
        <ClassTable
          caption="Classes de tipografia"
          rows={[
            { name: '.eds-text-display', effect: '40px / 48px, semibold. Destaques de abertura.' },
            { name: '.eds-text-h1', effect: '32px / 40px, semibold.' },
            { name: '.eds-text-h2', effect: '24px / 32px, semibold.' },
            { name: '.eds-text-h3', effect: '20px / 28px, semibold.' },
            { name: '.eds-text-h4', effect: '16px / 24px, semibold.' },
            { name: '.eds-text-body-lg', effect: '16px / 24px, regular. Parágrafo de abertura.' },
            { name: '.eds-text-body', effect: '14px / 20px, regular. Texto corrido da interface.' },
            { name: '.eds-text-label', effect: '13px / 18px, medium. Rótulos e legendas.' },
            { name: '.eds-text-small', effect: '12px / 16px, regular. Apoio, notas e metadados.' },
          ]}
        />
      </Section>

      <Section title="Classe, não tag">
        <p>
          O core não estiliza <code>h1</code> a <code>h4</code> pela tag. Um título sem classe
          aparece com o estilo do navegador (ou do seu reset). Escolha a tag pela hierarquia do
          documento e a classe pela aparência, mesmo que não coincidam: um <code>h2</code> pode ter
          a aparência de <code>.eds-text-h4</code>.
        </p>
        <Example
          title="Nível semântico e aparência separados"
          html={semanticaHtml}
          react={{ Component: Semantica, source: semanticaSource }}
        />
        <p>
          Não há componente de texto no React: use <code>className</code> com a classe do core. O
          componente <code>CardTitle</code> e similares já aplicam a classe adequada.
        </p>
      </Section>

      <Section title="Fonte Inter">
        <p>
          O core define <code>Inter</code> como família padrão (<code>--eds-font-family</code>), mas{' '}
          <strong>não carrega a fonte</strong>: a aplicação decide como (CDN, autohospedagem,
          pacote). Sem ela, o navegador usa a próxima fonte da lista, sem prejuízo funcional.
          Carregue os pesos 400, 500 e 600, que são os usados.
        </p>
        <CodeBlock code={fonte} label="Carregando a Inter pelo Google Fonts" />
        <p>
          Prefira autohospedar quando a política de privacidade da aplicação restringir serviços
          externos. Para outra família, reatribua o token:
        </p>
        <CodeBlock code={fonteOutra} label="Trocando a família tipográfica" />
        <p>
          Veja também <a href="/comecar/instalacao">Instalação</a>.
        </p>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Hierarquia:</strong> use um único <code>h1</code> por página e não pule níveis.
            A classe nunca substitui a tag correta.
          </li>
          <li>
            <strong>Zoom:</strong> o texto deve continuar legível com zoom de 200%; não limite a
            largura de contêineres de texto em valores fixos.
          </li>
          <li>
            <strong>Contraste:</strong> use <code>--eds-color-text-muted</code> só em texto de
            apoio; ele passa 4,5:1 sobre os fundos do sistema, mas nada abaixo disso.
          </li>
          <li>
            <strong>Não use a classe para parecer título:</strong> um parágrafo com aparência de
            título não é anunciado como título por leitores de tela.
          </li>
        </ul>
      </Section>
    </>
  );
}
