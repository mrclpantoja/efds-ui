import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import PrimeiroComponente from '../../examples/comecar/primeiro-componente';
import primeiroSource from '../../examples/comecar/primeiro-componente.tsx?raw';

const entrada = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@efds-ui/core/index.css';
import '@efds-ui/themes/index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);`;

const toast = `import { ToastProvider, useToast } from '@efds-ui/react';

// Envolva a aplicação uma vez; depois, em qualquer componente:
// const toast = useToast();`;

const idioma = `import { Alert, LocaleProvider, TableExport } from '@efds-ui/react';

// Locale do Intl (nomes de mês e dia, ordem de texto, datas e números da exportação).
<LocaleProvider locale="en-US">
  <App />
</LocaleProvider>

// Textos internos de cada componente: um único objeto parcial, sempre com o nome texts.
<Alert variant="danger" onClose={fechar} texts={{ close: 'Dismiss', severity: 'Error:' }}>
  ...
</Alert>
<TableExport data={dados} texts={{ label: 'Export', csv: 'CSV file' }} />`;

export default function UsoComReact() {
  return (
    <>
      <p className="eds-text-body-lg">
        <code>@efds-ui/react</code> são wrappers sobre as classes do core. Eles não têm visual
        próprio: montam o <code>className</code> e os atributos ARIA, e acrescentam o comportamento
        que o CSS não entrega.
      </p>

      <Section title="Configuração">
        <p>
          Importe o CSS uma vez, no ponto de entrada. Não há provider de tema: tema, modo, densidade
          e forma são atributos <code>data-*</code> no <code>html</code> (veja{' '}
          <a href={toHref('/fundamentos/temas-e-eixos')}>Temas e eixos</a>). O único provider é o{' '}
          <code>ToastProvider</code>, e só para quem usa Toast.
        </p>
        <CodeBlock code={entrada} label="Ponto de entrada React" />
        <CodeBlock code={toast} label="Provider do Toast" />
      </Section>

      <Section title="Primeiro componente">
        <Example
          title="Aviso e botão"
          html={undefined}
          react={{ Component: PrimeiroComponente, source: primeiroSource }}
        />
      </Section>

      <Section title="Idioma e textos">
        <CodeBlock code={idioma} label="Código React: LocaleProvider e texts" />
      </Section>

      <Section title="Convenções">
        <ul className="docs-list">
          <li>
            Props pequenas e semânticas (<code>variant</code>, <code>size</code>,{' '}
            <code>loading</code>), com os mesmos nomes das classes do core. Nenhuma prop expõe
            aparência (cor, raio, espaçamento).
          </li>
          <li>
            Cada componente estende os atributos nativos do elemento raiz, repassa <code>ref</code>{' '}
            e aceita <code>className</code>.
          </li>
          <li>
            Onde há valor ou abertura, o componente é controlado (<code>value</code>) ou não (
            <code>defaultValue</code>).
          </li>
          <li>
            A acessibilidade é forçada pelo tipo: botão só de ícone exige <code>aria-label</code>,
            tabela exige <code>caption</code>, e assim por diante.
          </li>
          <li>
            Textos internos (&quot;Fechar&quot;, &quot;Carregando&quot;) são substituíveis pela prop{' '}
            <code>texts</code> (objeto parcial, com padrões em pt-BR), com o mesmo nome em todos os
            componentes. O <code>LocaleProvider</code> troca o idioma do <code>Intl</code>.
          </li>
          <li>
            Ícones ficam em <code>@efds-ui/icons</code>, um export nomeado por ícone (
            <code>PlusIcon</code>, <code>EditIcon</code>…).
          </li>
        </ul>
      </Section>
    </>
  );
}
