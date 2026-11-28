import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { cdn, cssTag, scriptTag as tag } from '../../cdn';
import { toHref } from '../../router';

const scriptCdn = `${cssTag(cdn.coreCss)}
${cssTag(cdn.themesCss)}

<!-- No fim do <head>, com defer: liga tudo quando o DOM estiver pronto. -->
${tag(cdn.behavior)}`;

const scriptTag = `<link rel="stylesheet" href="/assets/eds/core/index.css" />
<link rel="stylesheet" href="/assets/eds/themes/index.css" />

<!-- No fim do <head>, com defer: liga tudo quando o DOM estiver pronto. -->
<script src="/assets/eds/behavior/eds-behavior.js" defer></script>`;

const scriptApi = `<script>
  // window.EDS expõe a API quando o script é carregado por <script>.
  EDS.toast({ tone: 'success', message: 'Pedido salvo.' });

  const done = EDS.loader.start({ title: 'Gerando relatório…' });
  fetch('/relatorio').finally(done);
</script>`;

const manual = `<!-- data-eds-manual: não liga sozinho; você chama EDS.init() quando quiser. -->
<script src="/assets/eds/behavior/eds-behavior.js" data-eds-manual defer></script>
<script>
  document.addEventListener('DOMContentLoaded', () => EDS.init());
</script>`;

const esm = `import { init, configure, toast } from '@efds-ui/behavior';

// Liga o que existe em #app e o que entrar nele depois. Nada fora de #app é tocado.
const destroy = init(document.querySelector('#app')!);

// Ao desmontar (Vue onUnmounted, Angular ngOnDestroy):
destroy();

toast({ tone: 'info', message: 'Sincronização concluída.' });`;

const porComponente = `// Só o que usa (tree shaking): cada um devolve o seu destroy().
import { initTabs, initModal, initCombobox } from '@efds-ui/behavior';

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
      data-eds-loader-mode="auto" data-eds-loader-title="Carregando…" defer></script>
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
      data-eds-loader-mode="auto" data-eds-loader-title="Carregando…" defer></script>
  </head>
  <body>
    <main th:fragment="conteudo">
      <!-- cada página preenche o fragmento -->
    </main>
  </body>
</html>`;

const loaderConfig = `<!-- data-eds-loader-mode: auto (padrão) | manual | off -->
<script src=".../eds-behavior.js" defer
  data-eds-loader-mode="auto"
  data-eds-loader-title="Carregando…"
  data-eds-loader-text="Aguarde um instante."></script>`;

const loaderEsm = `init(document, {
  loader: { mode: 'auto', delay: 300, minVisible: 400, exclude: [/\\/api\\/poll/] },
});`;

const mensagens = `import { configure } from '@efds-ui/behavior';

// Os textos padrão estão em pt-BR. Troque qualquer um (ex.: outro idioma).
configure({
  // Locale do Intl: ordem de texto da Table, meses e dias do DatePicker, datas e números da
  // exportação (e o /Lang do PDF). Padrão: 'pt-BR'.
  locale: 'en-US',
  messages: {
    toastClose: 'Close notification',
    comboboxResultsNone: 'No results.',
    uploadRetry: 'Try again',
    loaderTitle: 'Loading…',
    loaderText: 'Please wait.',
  },
});`;

const eventos = `// Todos os eventos são CustomEvent com prefixo eds: e bubbles. Ouça no document.
document.addEventListener('eds:tabs-change', (e) => console.log(e.detail.id));
document.addEventListener('eds:table-sort', (e) => {
  // Cancelável: com preventDefault, a ordenação é sua (ex.: no servidor).
  e.preventDefault();
  location.search = '?ordem=' + e.detail.column + '&sentido=' + e.detail.direction;
});`;

export default function Comportamento() {
  return (
    <>
      <p className="eds-text-body-lg">
        O CSS do core estiliza; o que o CSS e a plataforma não entregam (abrir um Modal, trocar
        Tabs, ordenar uma Table, filtrar um Combobox, escolher datas, enviar arquivos, exportar
        tabelas, o carregamento de página) vem do <code>@efds-ui/behavior</code>: JavaScript puro,{' '}
        <strong>zero dependências</strong>, para quem usa só HTML (PHP, Java, .NET, Vue, Angular).
        Quem usa React não precisa dele:{' '}
        <a href={toHref('/comecar/uso-com-react')}>@efds-ui/react</a> já traz o mesmo comportamento.
      </p>

      <Section title="Instalar">
        <p>
          O pacote tem duas saídas: um <strong>script clássico</strong> (
          <code>eds-behavior.js</code>, para <code>&lt;script src&gt;</code>, cerca de 88 kB com
          gzip, no pacote completo) e um <strong>módulo ESM</strong> tree-shakeable. O visual
          continua vindo do <code>@efds-ui/core</code>: o pacote não carrega CSS.
        </p>
        <CodeBlock code="pnpm add @efds-ui/behavior" label="Instalação do behavior" />
      </Section>

      <Section title="Uso por script (CDN, PHP, Java, .NET)">
        <p>
          Uma linha. Com <code>defer</code>, o pacote liga todos os componentes do documento quando
          o DOM está pronto e expõe <code>window.EDS</code>.
        </p>
        <p>Pelo CDN, com a versão fixada e verificação de integridade:</p>
        <CodeBlock code={scriptCdn} label="Código HTML: eds-behavior.js pelo CDN" />
        <p>
          Servindo do seu próprio servidor (recomendado em produção e em sistemas com dados
          pessoais, para não enviar o IP de quem acessa a terceiros): instale com{' '}
          <code>pnpm add @efds-ui/behavior</code> e copie o conteúdo de <code>dist/</code> para a
          pasta de arquivos estáticos, por exemplo <code>/assets/eds/</code>.
        </p>
        <CodeBlock code={scriptTag} label="Código HTML: eds-behavior.js do seu servidor" />
        <CodeBlock code={scriptApi} label="Código JavaScript: window.EDS" />
        <p>
          Para ligar quando você quiser, marque a tag com <code>data-eds-manual</code>:
        </p>
        <CodeBlock code={manual} label="Código HTML: modo manual" />
        <p>
          Quem não usa a exportação de tabelas, a máscara de entrada, o CEP, os formatadores nem o
          tema por cor pode carregar <code>eds-behavior-core.js</code>: é o mesmo script (mesmo{' '}
          <code>window.EDS</code>, mesmos atributos e a mesma configuração pela tag) sem esses cinco
          recursos: cerca de 60 kB com gzip, contra 88 kB do completo. Nele,{' '}
          <code>data-eds-export</code>, <code>data-eds-mask</code>, <code>data-eds-cep</code>,{' '}
          <code>data-eds-format</code> e <code>data-eds-theme-color</code> não fazem nada, e{' '}
          <code>EDS.exportData</code> e <code>EDS.createMask</code> não existem. O NumberInput
          continua formatando os decimais (usa o núcleo da máscara por dentro), mas um
          <code>data-eds-mask</code> dele só edita o texto durante a digitação no completo. Senha,
          OTP, NumberInput, Lookup, copiar, notificações, alterações não salvas, sessão por
          inatividade, campos condicionais e o estado de carregamento da imagem (
          <code>.eds-image</code>) estão nos dois; a galeria (<code>data-eds-gallery</code>) e o
          corte de foto (<code>data-eds-cropper</code>) e o visualizador de arquivos (
          <code>data-eds-viewer</code>, <code>EDS.viewer</code>) só existem no completo. O{' '}
          <code>eds-behavior.js</code> segue completo. As funções puras de imagem (carregar,
          reduzir, cortar, <code>srcset</code>) ficam no subcaminho{' '}
          <code>@efds-ui/behavior/image</code>.
        </p>
      </Section>

      <Section title="Uso por módulo (Vue, Angular, bundlers)">
        <p>
          <code>init(root)</code> liga o que existe em <code>root</code> e devolve{' '}
          <code>destroy()</code>. Ele <strong>não toca em nada fora do root</strong>: é por isso que
          este site de documentação, que é React, chama <code>init(previewEl)</code> só nos previews
          HTML, nunca <code>init(document)</code>. Markup renderizado pelo{' '}
          <code>@efds-ui/react</code> não deve ser ligado duas vezes.
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
              name: 'data-eds-close',
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
              name: 'data-eds-table-filter="ID" / data-eds-filter-columns / data-eds-filter-ignore',
              effect: (
                <>
                  Campo de busca (<code>input type=&quot;search&quot;</code>) que filtra as linhas
                  da tabela <code>ID</code> no cliente, sem acento nem caixa; as colunas (base 1) e
                  as células a ignorar são opcionais. Só alcança as linhas que estão no DOM.{' '}
                  <a href={toHref('/componentes/table')}>Table</a>.
                </>
              ),
            },
            {
              name: 'data-eds-export="csv|xlsx|json|pdf" / data-eds-export-target="ID"',
              effect: (
                <>
                  Botão ou item de menu que baixa a tabela <code>ID</code> no formato escolhido,
                  gerado no navegador, sem dependência. Opcionais:{' '}
                  <code>data-eds-export-filename</code>, <code>-title</code>, <code>-subtitle</code>{' '}
                  e <code>-scope</code>; <code>th[data-type]</code>, <code>td[data-value]</code> e{' '}
                  <code>data-eds-export-ignore</code> descrevem colunas e células. Só alcança as
                  linhas do DOM. <a href={toHref('/componentes/table')}>Table</a>.
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
              name: 'data-eds-multiple / data-eds-name / data-eds-max-selected',
              effect: (
                <>
                  No <code>.eds-combobox</code>: seleção múltipla, nome dos hidden e limite.{' '}
                  <a href={toHref('/componentes/multi-select')}>MultiSelect</a>.
                </>
              ),
            },
            {
              name: 'data-eds-datepicker / data-eds-daterange',
              effect: (
                <>
                  No <code>.eds-datepicker</code>: liga o{' '}
                  <a href={toHref('/componentes/date-picker')}>DatePicker</a> (uma data) ou o{' '}
                  <a href={toHref('/componentes/date-range-picker')}>DateRangePicker</a> (período).
                  O JS monta o conteúdo do <code>.eds-calendar</code>.
                </>
              ),
            },
            {
              name: 'data-eds-min / data-eds-max / data-eds-disabled-dates / data-eds-disable-weekends',
              effect: (
                <>
                  Limites (ISO <code>aaaa-mm-dd</code>), datas bloqueadas (lista separada por
                  vírgula) e fins de semana bloqueados, no <code>.eds-datepicker</code>.
                </>
              ),
            },
            {
              name: 'data-eds-max-days',
              effect: (
                <>
                  No <code>data-eds-daterange</code>: período máximo, em dias corridos, contando
                  início e fim.
                </>
              ),
            },
            {
              name: 'data-eds-upload',
              effect: (
                <>
                  No <code>.eds-upload</code>: liga o{' '}
                  <a href={toHref('/componentes/file-upload')}>FileUpload</a>. Com{' '}
                  <code>data-eds-max-size</code> (bytes) e <code>data-eds-max-files</code>.
                </>
              ),
            },
            {
              name: 'data-eds-upload-url / data-eds-upload-field',
              effect: (
                <>
                  Modo imediato do FileUpload: endereço do POST de cada arquivo e nome do campo
                  multipart (padrão <code>file</code>). A resposta JSON <code>{'{ "id" }'}</code>{' '}
                  vira um hidden.
                </>
              ),
            },
            {
              name: 'data-eds-confirm / -title / -tone / -ok',
              effect: (
                <>
                  Em <code>button</code>, <code>a</code> ou <code>form</code>: pergunta antes de
                  agir (o link navega, o botão age, o formulário é enviado só se confirmado).{' '}
                  <a href={toHref('/componentes/dialogos')}>Diálogos</a>.
                </>
              ),
            },
            {
              name: 'data-eds-native-alert',
              effect: (
                <>
                  Na tag do script: <code>window.alert</code> passa a abrir o diálogo do efDS.ui,
                  sem bloquear.
                </>
              ),
            },
            {
              name: 'data-eds-sortable / data-eds-group / data-eds-orientation / data-eds-name',
              effect: (
                <>
                  No contêiner: arrastar e soltar itens (<code>.eds-sortable-item[data-id]</code>);
                  itens trocam de contêiner dentro do mesmo grupo; <code>horizontal</code> ou{' '}
                  <code>grid</code> mudam as setas; o nome gera um hidden por item.{' '}
                  <a href={toHref('/componentes/sortable')}>Sortable</a>.
                </>
              ),
            },
            {
              name: 'data-eds-tree / data-eds-editable / data-eds-multiple',
              effect: (
                <>
                  No <code>.eds-tree</code>: árvore navegável; editável (renomear, adicionar,
                  excluir, mover); seleção múltipla. <code>data-eds-source</code>,{' '}
                  <code>data-eds-children-url</code> e <code>data-eds-name</code> trazem os nós de
                  um JSON, os filhos sob demanda e o JSON para o formulário.{' '}
                  <a href={toHref('/componentes/tree')}>Tree</a>.
                </>
              ),
            },
            {
              name: 'data-eds-loader-mode (no script) e data-eds-loader (form, link, botão)',
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
          , veja <a href={toHref('/componentes/toast')}>Toast</a>) não pedem atributo extra. As
          funções <code>EDS.alert()</code>, <code>EDS.confirm()</code> e <code>EDS.prompt()</code> (
          <a href={toHref('/componentes/dialogos')}>Diálogos</a>) também não.
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
          &quot;Carregando…&quot;, anúncios da tabela) estão em pt-BR e são configuráveis. O{' '}
          <code>locale</code> (padrão <code>pt-BR</code>) cuida do <code>Intl</code>: ordem de texto
          da tabela, nomes de mês e dia do calendário e formato de datas e números da exportação. No
          React, o equivalente é o <code>LocaleProvider</code> e o <code>texts</code> de cada
          componente:
        </p>
        <CodeBlock code={mensagens} label="Código TypeScript: configure messages" />
      </Section>

      <Section title="Eventos">
        <p>
          Os componentes avisam o que aconteceu por <code>CustomEvent</code> com prefixo{' '}
          <code>eds:</code> (<code>eds:tabs-change</code>, <code>eds:modal-open</code>,{' '}
          <code>eds:modal-close</code>, <code>eds:drawer-open</code>, <code>eds:drawer-close</code>,{' '}
          <code>eds:dropdown-open</code>, <code>eds:dropdown-close</code>,{' '}
          <code>eds:table-sort</code>, <code>eds:table-select-change</code>,{' '}
          <code>eds:combobox-change</code>, <code>eds:date-change</code>,{' '}
          <code>eds:daterange-change</code>, <code>eds:upload-change</code>,{' '}
          <code>eds:upload-progress</code>, <code>eds:upload-complete</code>,{' '}
          <code>eds:upload-error</code>, <code>eds:alert-close</code>, <code>eds:toast-close</code>,{' '}
          <code>eds:loader-open</code>, <code>eds:loader-close</code>,{' '}
          <code>eds:sidebar-toggle</code>, <code>eds:sortable-change</code>,{' '}
          <code>eds:tree-change</code>, <code>eds:tree-beforechange</code>,{' '}
          <code>eds:tree-select</code>, <code>eds:tree-activate</code>, <code>eds:tree-toggle</code>
          , <code>eds:table-beforeexport</code>, <code>eds:table-export</code>). Todos fazem bubble;{' '}
          <code>eds:table-sort</code> (da Table), <code>eds:alert-close</code>,{' '}
          <code>eds:tree-beforechange</code> e <code>eds:table-beforeexport</code> são canceláveis.
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
