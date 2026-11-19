import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

const scriptTag = `<link rel="stylesheet" href="/assets/eds/core/index.css" />
<link rel="stylesheet" href="/assets/eds/themes/index.css" />

<!-- No fim do <head>, com defer: liga tudo quando o DOM estiver pronto. -->
<script src="/assets/eds/behavior/eds-behavior.js" defer></script>`;

const scriptApi = `<script>
  // window.EDS expõe a API quando o script é carregado por <script>.
  EDS.toast({ variant: 'success', message: 'Pedido salvo.' });

  const done = EDS.loader.start({ title: 'Gerando relatório…' });
  fetch('/relatorio').finally(done);
</script>`;

const manual = `<!-- data-eds-manual: não liga sozinho; você chama EDS.init() quando quiser. -->
<script src="/assets/eds/behavior/eds-behavior.js" data-eds-manual defer></script>
<script>
  document.addEventListener('DOMContentLoaded', () => EDS.init());
</script>`;

const esm = `import { init, configure, toast } from '@eds-ui/behavior';

// Liga o que existe em #app e o que entrar nele depois. Nada fora de #app é tocado.
const destroy = init(document.querySelector('#app')!);

// Ao desmontar (Vue onUnmounted, Angular ngOnDestroy):
destroy();

toast({ variant: 'info', message: 'Sincronização concluída.' });`;

const porComponente = `// Só o que usa (tree shaking): cada um devolve o seu destroy().
import { initTabs, initModal, initCombobox } from '@eds-ui/behavior';

const stops = [initTabs(root), initModal(root), initCombobox(root)];`;

const observer = `<!-- htmx: o trecho devolvido pelo servidor já chega ligado, sem código. -->
<div hx-get="/clientes/lista" hx-trigger="load" hx-swap="innerHTML"></div>

<!-- Turbo, Livewire, Unpoly, fetch + innerHTML: o mesmo. O MutationObserver do init liga o
     que entra e desliga o que sai do documento. Cada elemento é ligado uma única vez. -->`;

const blade = `{{-- resources/views/layouts/app.blade.php (Laravel) --}}
<!doctype html>
<html lang="pt-BR" data-theme="blue" data-mode="light">
  <head>
    <meta charset="utf-8" />
    <title>@yield('titulo') · Gestão Exemplo</title>
    <link rel="stylesheet" href="{{ asset('eds/core/index.css') }}" />
    <link rel="stylesheet" href="{{ asset('eds/themes/index.css') }}" />
    <script src="{{ asset('eds/behavior/eds-behavior.js') }}"
      data-eds-loader="auto" data-eds-loader-title="Carregando…" defer></script>
  </head>
  <body>
    <main>
      @yield('conteudo')
    </main>
  </body>
</html>

{{-- resources/views/clientes/index.blade.php --}}
@extends('layouts.app')
@section('conteudo')
  <button type="button" class="eds-button eds-button-primary" data-eds-open="modal-novo">
    Novo cliente
  </button>
  {{-- ... dialog.eds-modal#modal-novo com <form method="post"> --}}
@endsection`;

const thymeleaf = `<!-- src/main/resources/templates/layout.html (Spring Boot + Thymeleaf) -->
<!doctype html>
<html lang="pt-BR" xmlns:th="http://www.thymeleaf.org"
      data-theme="blue" data-mode="light">
  <head>
    <meta charset="utf-8" />
    <title th:text="\${titulo} + ' · Gestão Exemplo'">Gestão Exemplo</title>
    <link rel="stylesheet" th:href="@{/eds/core/index.css}" />
    <link rel="stylesheet" th:href="@{/eds/themes/index.css}" />
    <script th:src="@{/eds/behavior/eds-behavior.js}"
      data-eds-loader="auto" data-eds-loader-title="Carregando…" defer></script>
  </head>
  <body>
    <main th:fragment="conteudo">
      <!-- cada página preenche o fragmento -->
    </main>
  </body>
</html>`;

const loaderConfig = `<!-- data-eds-loader: auto (padrão) | manual | off -->
<script src=".../eds-behavior.js" defer
  data-eds-loader="auto"
  data-eds-loader-title="Carregando…"
  data-eds-loader-text="Aguarde um instante."></script>`;

const loaderEsm = `init(document, {
  loader: { mode: 'auto', delay: 300, minVisible: 400, exclude: [/\\/api\\/poll/] },
});`;

const mensagens = `import { configure } from '@eds-ui/behavior';

// Os textos padrão estão em pt-BR. Troque qualquer um (ex.: outro idioma).
configure({
  messages: {
    toastClose: 'Close notification',
    comboNoResults: 'No results.',
    loaderTitle: 'Loading…',
    loaderText: 'Please wait.',
  },
});`;

const eventos = `// Todos os eventos são CustomEvent com prefixo eds: e bubbles. Ouça no document.
document.addEventListener('eds:tabs-change', (e) => console.log(e.detail.id));
document.addEventListener('eds:sort', (e) => {
  // Cancelável: com preventDefault, a ordenação é sua (ex.: no servidor).
  e.preventDefault();
  location.search = '?ordem=' + e.detail.column + '&sentido=' + e.detail.direction;
});`;

export default function Comportamento() {
  return (
    <>
      <p className="eds-text-body-lg">
        O CSS do core estiliza; o que o CSS e a plataforma não entregam (abrir um Modal, trocar
        Tabs, ordenar uma Table, filtrar um Combobox, o carregamento de página) vem do{' '}
        <code>@eds-ui/behavior</code>: JavaScript puro, <strong>zero dependências</strong>, para
        quem usa só HTML (PHP, Java, .NET, Vue, Angular). Quem usa React não precisa dele:{' '}
        <a href={toHref('/comecar/uso-com-react')}>@eds-ui/react</a> já traz o mesmo comportamento.
      </p>

      <Alert variant="warning" title="Pré-lançamento">
        <p>
          O pacote ainda não está publicado no npm (0.1.0, <code>private</code>). Os caminhos abaixo
          (<code>/assets/eds/...</code>) são do seu projeto: copie o conteúdo de <code>dist/</code>{' '}
          do pacote para lá, ou, depois da publicação, use o CDN ou o npm.
        </p>
      </Alert>

      <Section title="Instalar">
        <p>
          O pacote tem duas saídas: um <strong>script clássico</strong> (
          <code>eds-behavior.js</code>, para <code>&lt;script src&gt;</code>, cerca de 10 kB com
          gzip) e um <strong>módulo ESM</strong> tree-shakeable. O visual continua vindo do{' '}
          <code>@eds-ui/core</code>: o pacote não carrega CSS.
        </p>
        <CodeBlock code="pnpm add @eds-ui/behavior" label="Instalação do behavior" />
      </Section>

      <Section title="Uso por script (CDN, PHP, Java, .NET)">
        <p>
          Uma linha. Com <code>defer</code>, o pacote liga todos os componentes do documento quando
          o DOM está pronto e expõe <code>window.EDS</code>.
        </p>
        <CodeBlock code={scriptTag} label="Código HTML: carregar o eds-behavior.js" />
        <CodeBlock code={scriptApi} label="Código JavaScript: window.EDS" />
        <p>
          Para ligar quando você quiser, marque a tag com <code>data-eds-manual</code>:
        </p>
        <CodeBlock code={manual} label="Código HTML: modo manual" />
      </Section>

      <Section title="Uso por módulo (Vue, Angular, bundlers)">
        <p>
          <code>init(root)</code> liga o que existe em <code>root</code> e devolve{' '}
          <code>destroy()</code>. Ele <strong>não toca em nada fora do root</strong>: é por isso que
          este site de documentação, que é React, chama <code>init(previewEl)</code> só nos previews
          HTML, nunca <code>init(document)</code>. Markup renderizado pelo{' '}
          <code>@eds-ui/react</code> não deve ser ligado duas vezes.
        </p>
        <CodeBlock code={esm} label="Código TypeScript: init e destroy" />
        <CodeBlock code={porComponente} label="Código TypeScript: por componente" />
      </Section>

      <Section title="Conteúdo que chega depois (htmx, Livewire, Turbo)">
        <p>
          O <code>init</code> observa o <code>root</code> com <code>MutationObserver</code>: o que
          entra depois (trechos devolvidos pelo servidor, atualizações parciais) é ligado, e o que
          sai é desligado. Cada elemento é ligado uma única vez, mesmo com <code>init</code>{' '}
          repetido, sem atributo visível no DOM. Não há nada a chamar a cada resposta.
        </p>
        <CodeBlock code={observer} label="Código HTML: conteúdo parcial" />
      </Section>

      <Section title="O que cada componente espera">
        <p>
          O markup é o contrato do core; o pacote detecta por classes e ARIA. Só acrescenta{' '}
          <code>data-eds-*</code> onde o markup não basta:
        </p>
        <ClassTable
          caption="Atributos data-eds-* e o componente que os usa"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-open="ID"',
              effect: (
                <>
                  Botão que abre o <code>dialog</code> (Modal ou Drawer) com{' '}
                  <code>showModal()</code>. <a href={toHref('/componentes/modal')}>Modal</a>,{' '}
                  <a href={toHref('/componentes/drawer')}>Drawer</a>.
                </>
              ),
            },
            {
              name: 'data-eds-close',
              effect: 'Dentro do dialog: fecha. O valor do atributo vira o returnValue.',
            },
            {
              name: 'data-eds-backdrop="static"',
              effect: 'No dialog: clicar fora não fecha.',
            },
            {
              name: 'data-autofocus',
              effect: 'Elemento que recebe o foco ao abrir o dialog.',
            },
            {
              name: 'data-eds-dismiss',
              effect: (
                <>
                  Botão dentro de <code>.eds-alert</code>: remove o aviso e move o foco.{' '}
                  <a href={toHref('/componentes/alert')}>Alert</a>.
                </>
              ),
            },
            {
              name: 'data-eds-select-all / data-eds-select-row',
              effect: (
                <>
                  Checkboxes de seleção da tabela. <code>button.eds-table-sort</code> não precisa de
                  atributo. <a href={toHref('/componentes/table')}>Table</a>.
                </>
              ),
            },
            {
              name: 'data-eds-sidebar-collapse',
              effect: (
                <>
                  Botão que colapsa a <a href={toHref('/componentes/sidebar')}>Sidebar</a>.
                </>
              ),
            },
            {
              name: 'data-eds-source / data-eds-min-chars',
              effect: (
                <>
                  Busca remota do <a href={toHref('/componentes/combobox')}>Combobox</a>.
                </>
              ),
            },
            {
              name: 'data-eds-loader',
              effect: (
                <>
                  No script: modo do <a href={toHref('/componentes/page-loader')}>PageLoader</a>. Em
                  form, link ou botão: <code>off</code> exclui.
                </>
              ),
            },
          ]}
        />
        <p>
          <a href={toHref('/componentes/tabs')}>Tabs</a>,{' '}
          <a href={toHref('/componentes/dropdown')}>Dropdown</a> e o Toast (<code>EDS.toast()</code>
          , veja <a href={toHref('/componentes/toast')}>Toast</a>) não pedem atributo extra.
        </p>
      </Section>

      <Section title="Layout de servidor (PHP e Java)">
        <p>
          O pacote não conhece o servidor: basta o layout carregar o CSS e o script. Os exemplos
          usam dados fictícios.
        </p>
        <CodeBlock code={blade} label="Código Blade: layout e página (Laravel)" />
        <CodeBlock code={thymeleaf} label="Código Thymeleaf: layout (Spring Boot)" />
        <p>
          Com o PageLoader em <code>auto</code>, cada envio de formulário e cada link que troca a
          página mostram o carregamento sem código extra: é o fluxo tradicional dessas stacks.
        </p>
      </Section>

      <Section title="Configurar o PageLoader">
        <p>
          O carregamento de página liga sozinho em todo processamento (<code>auto</code>, padrão).
          Escolha o modo na tag do script, ou por módulo. Detalhes e exceções em{' '}
          <a href={toHref('/componentes/page-loader')}>PageLoader</a>.
        </p>
        <CodeBlock code={loaderConfig} label="Código HTML: configuração do loader" />
        <CodeBlock code={loaderEsm} label="Código TypeScript: configuração do loader" />
      </Section>

      <Section title="Textos">
        <p>
          Os textos padrão (&quot;Fechar notificação&quot;, &quot;Nenhum resultado&quot;,
          &quot;Carregando…&quot;, anúncios da tabela) estão em pt-BR e são configuráveis:
        </p>
        <CodeBlock code={mensagens} label="Código TypeScript: configure messages" />
      </Section>

      <Section title="Eventos">
        <p>
          Os componentes avisam o que aconteceu por <code>CustomEvent</code> com prefixo{' '}
          <code>eds:</code> (<code>eds:tabs-change</code>, <code>eds:modal-open</code>,{' '}
          <code>eds:sort</code>, <code>eds:select-change</code>, <code>eds:combobox-change</code>,{' '}
          <code>eds:dismiss</code>, <code>eds:toast-close</code>, <code>eds:loader-show</code>,{' '}
          <code>eds:loader-hide</code>, <code>eds:sidebar-collapse</code>). Todos fazem bubble;{' '}
          <code>eds:sort</code> e <code>eds:dismiss</code> são canceláveis.
        </p>
        <CodeBlock code={eventos} label="Código JavaScript: eventos" />
      </Section>

      <Section title="Limitações conhecidas">
        <ul className="docs-list">
          <li>
            Ainda não validado em leitor de tela real, Firefox e Safari (previsto para a próxima
            fase).
          </li>
          <li>
            Dropdown sem setas: continua <em>disclosure</em>, navegável por Tab.
          </li>
          <li>
            A Sidebar off-canvas só vale para <code>.eds-app &gt; .eds-sidebar</code>; o colapsar
            vale em qualquer <code>.eds-sidebar</code>.
          </li>
        </ul>
      </Section>
    </>
  );
}
