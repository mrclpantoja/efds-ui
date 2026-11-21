import { Alert } from '@efds-ui/react';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

const addPnpm = 'pnpm add @efds-ui/core @efds-ui/themes @efds-ui/react @efds-ui/icons';
const addNpm = 'npm install @efds-ui/core @efds-ui/themes @efds-ui/react @efds-ui/icons';
const addHtml = 'pnpm add @efds-ui/core @efds-ui/themes @efds-ui/behavior';

const importAll = `import '@efds-ui/core/index.css';    // tokens, base, layout e todos os componentes
import '@efds-ui/themes/index.css';  // os eixos: tema, modo, densidade e forma`;

const importSelective = `import '@efds-ui/core/tokens.css';             // todos os tokens
import '@efds-ui/core/base.css';               // reset, root, tipografia, acessibilidade
import '@efds-ui/core/layout/stack.css';       // um arquivo de layout
import '@efds-ui/core/components/button.css';  // um componente
import '@efds-ui/themes/theme-blue.css';       // um valor de eixo`;

const fontSnippet = `import '@fontsource-variable/inter';`;

const htmlSnippet = `<html lang="pt-BR" data-theme="blue" data-mode="light" data-density="comfortable" data-shape="soft">`;

export default function Instalacao() {
  return (
    <>
      <Alert variant="warning" title="Pré-lançamento">
        <p>
          Os pacotes <code>@efds-ui/*</code> ainda não estão publicados no npm: os comandos abaixo
          valem a partir da primeira publicação. Até lá, o uso é dentro do monorepo, com{' '}
          <code>workspace:*</code>.
        </p>
      </Alert>

      <Section title="Instalar os pacotes">
        <p>
          Cinco pacotes. <code>react</code> e <code>react-dom</code> (18 ou 19) são peer
          dependencies de <code>@efds-ui/react</code> e <code>@efds-ui/icons</code>. Quem usa só
          HTML instala <code>@efds-ui/core</code> e <code>@efds-ui/themes</code> (CSS) e, para o
          comportamento de Tabs, Modal, Toast, Table, Combobox, DatePicker, FileUpload e PageLoader,{' '}
          <code>@efds-ui/behavior</code> (JavaScript puro, sem dependências).
        </p>
        <CodeBlock code={addPnpm} label="Instalação com pnpm" />
        <CodeBlock code={addNpm} label="Instalação com npm" />
        <p>
          Só HTML (PHP, Java, .NET, Vue, Angular): sem React, com o comportamento em JavaScript
          puro. Veja <a href={toHref('/comecar/comportamento')}>Comportamento (JS)</a> para o uso
          por <code>&lt;script&gt;</code> ou por módulo.
        </p>
        <CodeBlock code={addHtml} label="Instalação para HTML puro" />
      </Section>

      <Section title="Importar o CSS">
        <p>
          Importação completa: o caminho mais curto, com todos os componentes. Ponha no ponto de
          entrada da aplicação.
        </p>
        <CodeBlock code={importAll} label="Importação completa do CSS" />
        <p>
          Importação seletiva: cada arquivo-fonte do core é publicado separadamente. Cada um começa
          com a declaração de ordem das <code>@layer</code>, então a cascata não depende da ordem
          dos imports.
        </p>
        <CodeBlock code={importSelective} label="Importação seletiva do CSS" />
      </Section>

      <Section title="Carregar a fonte Inter">
        <Alert variant="info" title="A fonte é do consumidor">
          <p>
            O core define <code>Inter</code> como família padrão, mas não carrega a fonte. Se ela
            não for carregada, o navegador usa a fonte de reserva do sistema.
          </p>
        </Alert>
        <p>Uma forma é o pacote self-hosted do Fontsource:</p>
        <CodeBlock
          code={`pnpm add @fontsource-variable/inter\n\n${fontSnippet}`}
          label="Carregamento da fonte"
        />
      </Section>

      <Section title="Declarar os eixos no HTML">
        <p>
          Os valores padrão (tema blue, modo light, densidade comfortable, forma soft) valem sem
          atributo algum. Para fixar ou trocar, use os atributos no elemento <code>html</code>.
          Detalhes em <a href={toHref('/fundamentos/temas-e-eixos')}>Temas e eixos</a>.
        </p>
        <CodeBlock code={htmlSnippet} label="Atributos de eixo no html" />
      </Section>

      <Section title="Próximo passo">
        <p>
          Siga para <a href={toHref('/comecar/uso-com-html')}>Uso com HTML</a> ou{' '}
          <a href={toHref('/comecar/uso-com-react')}>Uso com React</a>.
        </p>
      </Section>
    </>
  );
}
