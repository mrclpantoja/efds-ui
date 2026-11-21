import { Alert, Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Manual from '../../examples/page-loader/manual';
import manualHtml from '../../examples/page-loader/manual.html?raw';
import manualSource from '../../examples/page-loader/manual.tsx?raw';
import dialogoHtml from '../../examples/page-loader/dialogo.html?raw';
import { toHref } from '../../router';

const scriptTag = `<script
  src=".../@efds-ui/behavior/dist/eds-behavior.js"
  defer
  data-eds-loader="auto"
  data-eds-loader-title="Carregando…"
  data-eds-loader-text="Aguarde um instante."
></script>`;

const apiJs = `// start() devolve done(); chame-o ao terminar (é idempotente).
const done = EDS.loader.start({ title: 'Gerando relatório…' });
fetch('/relatorio').finally(done);

// track() faz o mesmo com uma promessa e devolve a própria promessa.
await EDS.loader.track(fetch('/relatorio'), {
  title: 'Gerando relatório…',
  text: 'Pode levar alguns segundos.',
});`;

const excecoes = `<!-- Não mostra o loader neste envio / link / botão -->
<form method="post" action="/importar" data-eds-loader="off">…</form>
<a href="/exportar.csv" data-eds-loader="off">Baixar CSV</a>

<!-- Textos próprios para esta navegação -->
<button type="submit" data-eds-loader-title="Salvando pedido…"
  data-eds-loader-text="Não feche a página.">Salvar</button>

<script>
  // Em fetch: desliga ou troca os textos
  fetch('/api/status', { edsLoader: false });
  fetch('/api/pedidos', { edsLoader: { title: 'Atualizando pedidos…' } });
  // Ou pelo cabeçalho (removido antes de enviar)
  fetch('/api/status', { headers: { 'X-EDS-Loader': 'off' } });
</script>`;

const esm = `import { init, configure, loader } from '@efds-ui/behavior';

init(document, {
  loader: {
    mode: 'auto',               // 'auto' | 'manual' | 'off'
    delay: 300,                 // só aparece se passar disso (ms)
    minVisible: 400,            // depois de aparecer, fica ao menos isto (ms)
    title: 'Carregando…',
    text: 'Aguarde um instante.',
    exclude: [/\\/api\\/poll/, 'heartbeat'], // URLs ignoradas (RegExp ou trecho)
    navigationTimeout: 30000,   // fecha sozinho se a navegação não trocar a página
  },
});

configure({ loader: { mode: 'manual' } }); // vale também depois do init`;

const react = `import { PageLoaderProvider, usePageLoader } from '@efds-ui/react';

// Um único provider, na raiz. Com auto (padrão), todo fetch e XMLHttpRequest o aciona.
<PageLoaderProvider exclude={[/\\/api\\/poll/]} texts={{ title: 'Carregando…' }}>
  <App />
</PageLoaderProvider>

function Relatorio() {
  const loader = usePageLoader();
  const gerar = () => loader.track(fetch('/relatorio'), { title: 'Gerando relatório…' });
  // ...
}`;

export default function PageLoaderPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Carregamento que bloqueia a página inteira enquanto o servidor trabalha: o fundo fica
        desfocado e esmaecido, sem aceitar clique nem teclado, com um spinner, um título e um texto
        no centro. Pode ligar sozinho em todo processamento.
      </p>

      <UseCases
        use={[
          'Para uma operação que a tela não pode seguir sem o resultado (buscar um processo, gerar um relatório, enviar um formulário).',
          'Em aplicações tradicionais (PHP, Java, .NET), onde cada envio de formulário troca a página: o modo automático cobre isso sem código.',
        ]}
        avoid={[
          <>
            Para carregar só uma parte da tela: use{' '}
            <a href={toHref('/componentes/skeleton')}>Skeleton</a> ou{' '}
            <a href={toHref('/componentes/spinner')}>Spinner</a> no próprio componente.
          </>,
          'Para operações longas que o usuário pode deixar em segundo plano: avise com Toast e deixe-o seguir.',
          'Para polling e requisições periódicas: exclua-as (veja Exceções).',
        ]}
      />

      <Section title="Exemplo">
        <Alert variant="info" title="O site de documentação roda o loader em modo manual">
          <p>
            O modo automático interceptaria toda navegação deste site, então ele está em{' '}
            <code>manual</code>: só <code>start</code> e <code>track</code> acionam o loader. O
            botão abaixo faz uma espera simulada de 2,5 s. O loader só aparece depois de 300 ms e,
            visível, fica ao menos 400 ms (para não piscar). Esc não o fecha: só o código fecha.
          </p>
        </Alert>
        <Example
          title="Disparo manual com track()"
          description="O HTML chama EDS.loader.track(), da API do eds-behavior.js; o React usa usePageLoader() dentro de um PageLoaderProvider."
          html={manualHtml}
          react={{ Component: Manual, source: manualSource }}
        />
      </Section>

      <Section title="Modo automático (HTML)">
        <p>
          Com o <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> carregado, o modo{' '}
          <code>auto</code> (padrão) mostra o loader sem você escrever código, em:
        </p>
        <ul className="docs-list">
          <li>
            <strong>fetch</strong> e <strong>XMLHttpRequest</strong> assíncrono (patch global,
            desfeito no <code>destroy</code>);
          </li>
          <li>
            <strong>envio de formulário</strong> e <strong>clique em link</strong> que trocam a
            página inteira (o fluxo tradicional de PHP e Java). Ao voltar pelo histórico, fecha.
          </li>
        </ul>
        <p>
          Só aparece se a espera passar de 300 ms; com várias requisições juntas, fecha quando a
          última termina, e a última a começar define os textos. O diálogo é criado pelo JS; se
          preferir, ponha-o no HTML e ele será adotado:
        </p>
        <CodeBlock code={dialogoHtml} label="Código HTML: diálogo do PageLoader" />
        <p>O modo se escolhe na própria tag do script, no carregamento do pacote:</p>
        <CodeBlock code={scriptTag} label="Código HTML: configuração do loader no script" />
        <ClassTable
          caption="Valores de data-eds-loader no script"
          headers={['Valor', 'Efeito']}
          rows={[
            {
              name: 'auto',
              effect: 'Padrão. Intercepta fetch, XHR, envio de form e clique em link.',
            },
            {
              name: 'manual',
              effect: 'Cria o loader sob demanda; só EDS.loader.start e track o acionam.',
            },
            { name: 'off', effect: 'Nada é criado nem interceptado; start vira um no-op.' },
          ]}
        />
      </Section>

      <Section title="API em JavaScript">
        <CodeBlock code={apiJs} label="Código JavaScript: loader.start e loader.track" />
        <p>
          Por módulo, <code>init</code> e <code>configure</code> aceitam as mesmas opções:
        </p>
        <CodeBlock code={esm} label="Código JavaScript: configuração por módulo" />
      </Section>

      <Section title="Exceções">
        <p>
          O modo automático ignora, sem configuração: requisições do próprio Combobox, links
          externos, âncoras da mesma página, <code>target</code> diferente de <code>_self</code>,{' '}
          <code>download</code>, cliques com modificador, formulários{' '}
          <code>method=&quot;dialog&quot;</code> e itens <code>aria-disabled</code>. Para o resto,
          marque a exceção:
        </p>
        <CodeBlock code={excecoes} label="Código HTML: exceções e textos por requisição" />
        <p>
          <code>exclude</code> (na configuração) recebe expressões regulares ou trechos de texto
          testados na URL, ideal para polling. Um download pode deixar o loader aberto, porque a
          página não troca: marque-o com <code>data-eds-loader=&quot;off&quot;</code> ou{' '}
          <code>download</code>; como rede de segurança, <code>navigationTimeout</code> (30 s) o
          fecha.
        </p>
      </Section>

      <Section title="API React">
        <p>
          <code>PageLoaderProvider</code> monta o diálogo, conta as pendências e expõe{' '}
          <code>usePageLoader()</code>, que devolve <code>{'{ start, track }'}</code> (lança um erro
          fora do provider). Com <code>auto</code> (padrão <code>true</code>) faz o mesmo patch de{' '}
          <code>fetch</code> e <code>XMLHttpRequest</code> enquanto montado e o restaura ao
          desmontar. O <code>@efds-ui/react</code> não depende do <code>@efds-ui/behavior</code>.
        </p>
        <CodeBlock code={react} label="Código React: PageLoaderProvider" />
        <PropsTable
          caption="Props de PageLoaderProvider"
          rows={[
            {
              name: 'auto',
              type: 'boolean',
              default: 'true',
              description: (
                <>
                  Liga o loader a todo <code>fetch</code> e XHR. <code>false</code>: só{' '}
                  <code>start</code> e <code>track</code>.
                </>
              ),
            },
            {
              name: 'delay',
              type: 'number',
              default: '300',
              description: 'Só aparece se a espera passar disso (ms).',
            },
            {
              name: 'minVisible',
              type: 'number',
              default: '400',
              description: 'Tempo mínimo visível depois de aparecer (ms).',
            },
            {
              name: 'texts',
              type: 'Partial<PageLoaderTexts>',
              description: (
                <>
                  Textos (pt-BR): <code>title</code> (&quot;Carregando…&quot;), <code>text</code>{' '}
                  (&quot;Aguarde um instante.&quot;), <code>slowText</code>, <code>close</code> e{' '}
                  <code>continue</code> (botões da demora). Cada start/track pode trocar título e
                  texto.
                </>
              ),
            },
            {
              name: 'exclude',
              type: '(string | RegExp)[]',
              description: 'URLs ignoradas pelo modo auto (ex.: polling).',
            },
          ]}
        />
        <PropsTable
          caption="Props de PageLoader (só o visual, controlado)"
          rows={[
            {
              name: 'open',
              type: 'boolean',
              required: true,
              description: (
                <>
                  Abre com <code>showModal()</code> e fecha com <code>close()</code>.
                </>
              ),
            },
            {
              name: 'title / text',
              type: 'ReactNode',
              default: "'Carregando…' / 'Aguarde um instante.'",
              description: 'Título (nomeia o diálogo) e texto secundário.',
            },
          ]}
        />
        <p>
          <code>PageLoader</code> serve a quem quer só o visual, sem atraso nem contagem; o fluxo
          completo é o do provider. Quando <code>PageLoaderProvider</code> e{' '}
          <code>@efds-ui/behavior</code> estiverem na mesma página, ligue um só deles em modo{' '}
          <code>auto</code>.
        </p>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de PageLoader"
          rows={[
            {
              name: '.eds-page-loader',
              effect:
                'O <dialog> aberto com showModal(): sem caixa nem borda, conteúdo centralizado. O ::backdrop desfoca e esmaece a página (véu pelos tokens do modo).',
            },
            {
              name: '.eds-spinner.eds-spinner-lg',
              effect: 'Spinner grande, na cor de ação, decorativo (aria-hidden).',
            },
            { name: '.eds-page-loader-title', effect: 'Título em destaque; nomeia o diálogo.' },
            { name: '.eds-page-loader-text', effect: 'Texto secundário, menor.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Bloqueio real:</strong> aberto com <code>showModal()</code>, o resto da página
              fica inerte para clique, Tab e leitor de tela; não é só um véu visual. Esc é
              bloqueado: só o código fecha.
            </li>
            <li>
              <strong>Anúncio:</strong> o diálogo é nomeado pelo título (
              <code>aria-labelledby</code>) e descrito pelo texto, e o leitor de tela o anuncia ao
              abrir. O <code>&lt;main&gt;</code> recebe <code>aria-busy=&quot;true&quot;</code>{' '}
              enquanto aberto.
            </li>
            <li>
              <strong>Foco:</strong> vai para o diálogo ao abrir e volta ao elemento anterior ao
              fechar. Fechar não anuncia nada extra.
            </li>
            <li>
              <strong>Sem piscar:</strong> o atraso de 300 ms e o mínimo de 400 ms evitam que
              respostas rápidas façam a tela relampejar (WCAG 2.3.1 e conforto cognitivo).
            </li>
            <li>
              <strong>Movimento e contraste:</strong> com <code>prefers-reduced-motion</code> o
              spinner não gira e as transições são desligadas; em modo de alto contraste (
              <code>forced-colors</code>) o título e o texto continuam visíveis. Sem{' '}
              <code>backdrop-filter</code>, o véu fica mais opaco.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> textos que digam o que está acontecendo
              (&quot;Buscando processo…&quot;, não só &quot;Aguarde&quot;) e nunca deixar o loader
              aberto sem fim: toda pendência precisa terminar, também em caso de erro (use{' '}
              <code>finally</code>).
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
