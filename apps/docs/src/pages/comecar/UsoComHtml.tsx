import { Alert } from '@eds-ui/react';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import primeiroHtml from '../../examples/comecar/primeiro-componente.html?raw';

const pagina = `<!doctype html>
<html lang="pt-BR" data-theme="blue" data-mode="light" data-density="comfortable" data-shape="soft">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minha página</title>
    <link rel="stylesheet" href="/caminho/para/@eds-ui/core/index.css" />
    <link rel="stylesheet" href="/caminho/para/@eds-ui/themes/index.css" />
    <!-- Opcional: comportamento de Tabs, Modal, Toast, Table, Combobox... -->
    <script src="/caminho/para/@eds-ui/behavior/dist/eds-behavior.js" defer></script>
  </head>
  <body>
    <main>
      <h1 class="eds-text-h1">Clientes</h1>
      <button type="button" class="eds-button eds-button-primary">Novo cliente</button>
    </main>
  </body>
</html>`;

export default function UsoComHtml() {
  return (
    <>
      <p className="eds-text-body-lg">
        O core é CSS puro: sem JavaScript, sem build e sem conhecer React. Você escreve HTML
        semântico e aplica as classes <code>.eds-*</code>.
      </p>

      <Section title="Página mínima">
        <p>
          Carregue o CSS do core e dos temas e declare os eixos no <code>html</code>. Em um projeto
          com bundler, importe os mesmos arquivos (veja{' '}
          <a href={toHref('/comecar/instalacao')}>Instalação</a>).
        </p>
        <CodeBlock code={pagina} label="Página HTML mínima" />
      </Section>

      <Section title="Primeiro componente">
        <p>
          O estado vem de atributos HTML e ARIA, nunca de classes: <code>disabled</code>,{' '}
          <code>aria-busy</code>, <code>aria-invalid</code>, <code>aria-current</code>. O mesmo
          markup é o que o React emite.
        </p>
        <Example title="Aviso e botão" html={primeiroHtml} />
      </Section>

      <Section title="O que o CSS não faz">
        <Alert variant="info" title="Comportamento vem do @eds-ui/behavior">
          <p>
            Alguns componentes dependem de JavaScript para o teclado e o foco: Tabs (setas e roving
            tabindex), Toast (fila e temporizador), abrir Modal e Drawer, ordenação e seleção da
            Table, Combobox e o PageLoader. Para HTML puro, carregue o{' '}
            <a href={toHref('/comecar/comportamento')}>@eds-ui/behavior</a>: uma linha de{' '}
            <code>&lt;script&gt;</code>, sem build e sem dependências, que liga tudo pelo próprio
            markup. Em React, o <a href={toHref('/comecar/uso-com-react')}>@eds-ui/react</a> já traz
            esse comportamento. Modal, Drawer e Dropdown se apoiam em <code>&lt;dialog&gt;</code> e
            na Popover API do navegador.
          </p>
        </Alert>
      </Section>
    </>
  );
}
