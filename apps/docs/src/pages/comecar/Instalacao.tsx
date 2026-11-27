import { Alert } from '@efds-ui/react';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { cdn, cssTag, scriptTag, VERSION } from '../../cdn';
import { toHref } from '../../router';

const addPnpm = 'pnpm add @efds-ui/core @efds-ui/themes @efds-ui/react @efds-ui/icons';
const addNpm = 'npm install @efds-ui/core @efds-ui/themes @efds-ui/react @efds-ui/icons';
const addHtml = 'pnpm add @efds-ui/core @efds-ui/themes @efds-ui/behavior';
const addEditor = 'pnpm add @efds-ui/editor';

const cdnSnippet = `${cssTag(cdn.coreCss)}
${cssTag(cdn.themesCss)}
${scriptTag(cdn.behavior)}`;

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
      <p className="eds-text-body-lg">
        Versão atual: <strong>{VERSION}</strong>, publicada no npm sob o escopo{' '}
        <a href="https://www.npmjs.com/org/efds-ui">@efds-ui</a>, licença MIT. A API pode mudar até
        a 1.0.
      </p>

      <Section title="Instalar os pacotes">
        <p>
          Seis pacotes. <code>react</code> e <code>react-dom</code> (18 ou 19) são peer dependencies
          de <code>@efds-ui/react</code> e <code>@efds-ui/icons</code>. Quem usa só HTML instala{' '}
          <code>@efds-ui/core</code> e <code>@efds-ui/themes</code> (CSS) e, para o comportamento de
          Tabs, Modal, Toast, Table, Combobox, DatePicker, FileUpload e PageLoader,{' '}
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
        <p>
          O editor de conteúdo é um pacote à parte (traz o ProseMirror); instale só se for usar.
          Veja <a href={toHref('/componentes/editor')}>Editor de conteúdo</a>.
        </p>
        <CodeBlock code={addEditor} label="Instalação do editor" />
      </Section>

      <Section title="Usar por CDN (sem instalar)">
        <p>
          Os mesmos arquivos estão no jsDelivr (e no unpkg), com a versão fixada no endereço. O
          atributo <code>integrity</code> faz o navegador recusar o arquivo se ele for alterado no
          caminho.
        </p>
        <CodeBlock code={cdnSnippet} label="Código HTML: CSS e comportamento pelo CDN" />
        <Alert tone="warning" title="CDN externo e LGPD">
          <p>
            Carregar do CDN envia o IP de quem acessa ao provedor do CDN. Em sistemas de órgão
            público ou com dados pessoais, prefira servir os arquivos do seu próprio servidor:
            instale pelo npm e copie o conteúdo de <code>dist/</code> de cada pacote para a sua
            pasta de arquivos estáticos. O CDN é ótimo para protótipos e testes.
          </p>
        </Alert>
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
        <Alert tone="info" title="A fonte é do consumidor">
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
