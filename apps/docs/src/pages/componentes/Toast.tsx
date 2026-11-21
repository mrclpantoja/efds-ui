import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import acaoHtml from '../../examples/toast/acao.html?raw';
import Acao from '../../examples/toast/acao';
import acaoSource from '../../examples/toast/acao.tsx?raw';
import dispararHtml from '../../examples/toast/disparar.html?raw';
import Disparar from '../../examples/toast/disparar';
import dispararSource from '../../examples/toast/disparar.tsx?raw';
import Fila from '../../examples/toast/fila';
import filaSource from '../../examples/toast/fila.tsx?raw';

const markup = `
<div class="eds-toast-region" aria-live="polite">
  <div class="eds-toast eds-toast-success">
    <div class="eds-toast-content">
      <strong class="eds-toast-title">Sucesso:</strong> O contrato foi assinado e arquivado.
    </div>
    <button type="button" class="eds-button eds-button-ghost eds-button-icon eds-button-sm eds-toast-close" aria-label="Fechar notificação">
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </div>
  <!-- O toast "danger" leva role="alert"; os demais herdam o aria-live="polite" da região. -->
</div>
`;

const provider = `import { ToastProvider } from '@efds-ui/react';

// Um único provider na raiz do app. Os padrões bastam para a maioria dos casos.
<ToastProvider maxVisible={2} texts={{ severity: { danger: 'Falha:' } }}>
  <App />
</ToastProvider>`;

const behaviorApi = `// Com o eds-behavior.js carregado por <script> (window.EDS) ou por módulo:
import { toast } from '@efds-ui/behavior';

const id = toast({
  variant: 'success',            // info (padrão) | success | warning | danger
  title: 'Sucesso:',             // opcional; sem ele, a severidade vai num prefixo oculto
  message: 'O contrato foi assinado e arquivado.',
  duration: 8000,                // opcional, em ms; 0 mantém até fechar
  action: { label: 'Desfazer', onClick: () => restaurar() },   // opcional: botão no toast
});

toast.dismiss(id);               // fecha um toast
toast.dismissAll();              // fecha todos
document.addEventListener('eds:toast-close', (e) => console.log(e.detail.id));`;

export default function ToastPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Notificação passageira que confirma o resultado de uma ação sem tirar o usuário do que
        estava fazendo. Quatro variantes, fila, fechamento automático e anúncio por leitor de tela.
      </p>

      <UseCases
        use={[
          'Para confirmar uma ação concluída em segundo plano: "Pedido salvo", "Exportação pronta".',
          'Para um aviso curto que não exige decisão e pode ser perdido sem prejuízo.',
          'Com ToastProvider no topo do app e useToast() em qualquer componente.',
        ]}
        avoid={[
          <>
            Para uma informação essencial: o toast some e nunca deve ser o único canal. Use{' '}
            <code>Alert</code> ou o próprio fluxo da tela.
          </>,
          'Para erro de validação de campo: a mensagem fica junto ao campo.',
          'Para uma decisão (confirmar, cancelar): use um Modal.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Disparar toasts"
          description={
            <>
              Cada botão chama <code>useToast().show()</code>. Informação e sucesso fecham sozinhos;
              atenção e erro ficam até serem fechados. Passar o mouse ou focar pausa a contagem, e
              Esc fecha o toast focado. O <code>ToastProvider</code> é um só, na raiz deste site (
              <code>Layout.tsx</code>): o exemplo apenas usa <code>useToast()</code>.
            </>
          }
          html={dispararHtml}
          react={{ Component: Disparar, source: dispararSource }}
        />
        <Example
          title="Com ação (Desfazer)"
          description={
            <>
              A opção <code>action: {'{ label, onClick }'}</code> acrescenta um botão ao toast. Ao
              ativá-lo, o toast fecha e <code>onClick</code> roda. É o padrão para
              &quot;Desfazer&quot; depois de uma exclusão (a{' '}
              <a href={toHref('/componentes/tree')}>Tree</a> usa isso). Dê tempo para o usuário
              alcançar o botão (<code>duration</code> de 8 s ou mais) e não deixe a ação ser o único
              jeito de recuperar o dado.
            </>
          }
          html={acaoHtml}
          react={{ Component: Acao, source: acaoSource }}
        />
        <Example
          title="Fila"
          description={
            <>
              O provider mostra até três toasts ao mesmo tempo (<code>maxVisible</code>); o botão
              dispara oito de uma vez, e os demais esperam na fila e entram conforme os primeiros
              fecham.
            </>
          }
          react={{ Component: Fila, source: filaSource }}
        />
        <div className="docs-example">
          <h3 className="eds-text-h4">Provider e opções</h3>
          <p className="docs-muted">
            Para mudar o limite da fila ou os rótulos de severidade, passe as props ao único
            provider.
          </p>
          <CodeBlock code={provider} label="Código React: ToastProvider com opções" />
        </div>
        <div className="docs-example">
          <h3 className="eds-text-h4">HTML puro: API do @efds-ui/behavior</h3>
          <p className="docs-muted">
            No HTML, o toast é disparado por JavaScript: <code>EDS.toast()</code>, do{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> (o botão do exemplo
            HTML acima chama exatamente essa função). Ele cria a região <code>aria-live</code> sob
            demanda, cuida da fila (máximo de 3 visíveis), do tempo, da pausa em hover e foco, do
            Esc e do foco ao fechar, e renderiza dentro do <code>dialog</code> modal aberto. O
            markup gerado é o do core, mostrado abaixo.
          </p>
          <CodeBlock code={behaviorApi} label="Código JavaScript: API do toast" />
          <CodeBlock code={markup} label="Código HTML: markup do toast" />
        </div>
      </Section>

      <Section title="API React">
        <p>
          Um único <code>ToastProvider</code> envolve a árvore e monta a região{' '}
          <code>aria-live</code>; qualquer componente abaixo dispara toasts com{' '}
          <code>useToast()</code>, que lança um erro fora do provider. Há um comportamento a mais:
          com um <code>dialog</code> modal aberto, a região é renderizada dentro dele (portal), para
          não ficar atrás do backdrop.
        </p>
        <PropsTable
          caption="Props de ToastProvider"
          rows={[
            {
              name: 'children',
              type: 'ReactNode',
              description: 'A aplicação. A região de toasts é montada depois dela.',
            },
            {
              name: 'maxVisible',
              type: 'number',
              default: '3',
              description: 'Toasts visíveis ao mesmo tempo; os demais esperam na fila.',
            },
            {
              name: 'texts',
              type: 'Partial<ToastTexts>',
              description: (
                <>
                  Textos internos. <code>close</code> (&quot;Fechar notificação&quot;) é o nome
                  acessível do botão de fechar de cada toast. <code>severity</code> traz o prefixo
                  oculto que anuncia a severidade quando o toast não tem <code>title</code>
                  (padrão: info &quot;Informação:&quot;, success &quot;Sucesso:&quot;, warning
                  &quot;Atenção:&quot;, danger &quot;Erro:&quot;); informe só os que quiser trocar.
                </>
              ),
            },
          ]}
        />
        <PropsTable
          caption="Opções de show() (ToastOptions)"
          rows={[
            {
              name: 'message',
              type: 'string',
              required: true,
              description: 'Texto da notificação.',
            },
            {
              name: 'variant',
              type: "'info' | 'success' | 'warning' | 'danger'",
              default: "'info'",
              description: (
                <>
                  <code>warning</code> e <code>danger</code> não fecham sozinhos;{' '}
                  <code>danger</code> é anunciado como <code>alert</code>.
                </>
              ),
            },
            {
              name: 'title',
              type: 'string',
              description: (
                <>
                  Rótulo visível em destaque. Sem ele, o provider anuncia a severidade por um
                  prefixo oculto (<code>texts.severity</code>); em qualquer caso a cor nunca é o
                  único canal.
                </>
              ),
            },
            {
              name: 'duration',
              type: 'number',
              description:
                'Tempo até fechar sozinho, em ms; 0 mantém até fechar. Padrão: pela variante e pelo tamanho do texto.',
            },
            {
              name: 'action',
              type: '{ label: string; onClick: () => void }',
              description: (
                <>
                  Botão de ação (ex.: Desfazer): fecha o toast e executa <code>onClick</code>.
                  Renderizado como <code>.eds-toast-action</code>.
                </>
              ),
            },
          ]}
        />
        <PropsTable
          caption="API de useToast() (ToastApi)"
          rows={[
            {
              name: 'show',
              type: '(options: ToastOptions) => number',
              description:
                'Enfileira um toast e devolve o id. Ao fechar, o foco volta ao elemento que estava ativo no momento da chamada.',
            },
            {
              name: 'dismiss',
              type: '(id: number) => void',
              description: 'Fecha o toast com o id devolvido por show().',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          Fila, temporizador, Esc e foco são do React. O core cuida do visual, da posição e da
          animação de entrada e saída; o ícone é um <code>::before</code> sem markup.
        </p>
        <ClassTable
          caption="Classes de Toast"
          rows={[
            {
              name: '.eds-toast-region',
              effect:
                'Contêiner fixo no canto inferior-final a partir de 640px; abaixo disso, largura total no rodapé. Não bloqueia cliques fora dos toasts. Em Drawer, vai para o lado oposto.',
            },
            {
              name: '.eds-toast',
              effect:
                'O toast: grade com ícone, conteúdo e botão de fechar; sombra e animação de entrada.',
            },
            {
              name: '.eds-toast-info / -success / -warning / -danger',
              effect: 'Fundo sutil e cor de status do texto e do ícone.',
            },
            {
              name: '.eds-toast-content',
              effect: 'Coluna do texto, com quebra de palavras longas.',
            },
            { name: '.eds-toast-title', effect: 'Rótulo de severidade em semibold.' },
            {
              name: '.eds-toast-action',
              effect:
                'Botão de ação (.eds-button ghost sm) entre o conteúdo e o botão de fechar: executa e fecha o toast.',
            },
            {
              name: '.eds-toast-close',
              effect: 'Em um .eds-button ghost, icon e sm: herda a cor do toast.',
            },
            {
              name: '[data-closing]',
              effect:
                'Inicia a animação de saída. Remova o nó por timer: em reduced-motion não há transitionend.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Anúncio:</strong> uma região <code>aria-live=&quot;polite&quot;</code> montada
              vazia desde o início anuncia os toasts. Só o <code>danger</code> leva{' '}
              <code>role=&quot;alert&quot;</code>.
            </li>
            <li>
              <strong>Tempo:</strong> info e success fecham em máx(5 s, cerca de 1 s a cada 10
              palavras); warning e danger só fecham pela ação do usuário. Hover e foco pausam a
              contagem, com o tempo restante preservado.
            </li>
            <li>
              <strong>Teclado:</strong> Esc fecha o toast focado (sem fechar o modal que o contém).
              Ao fechar um toast que tinha o foco, o foco volta a quem o disparou; se esse elemento
              não estiver disponível, vai ao primeiro controle do dialog ou ao{' '}
              <code>&lt;main&gt;</code>.
            </li>
            <li>
              <strong>Dentro de um modal:</strong> a região vai para dentro do <code>dialog</code>{' '}
              aberto; fora dele ficaria inerte.
            </li>
            <li>
              <strong>Forçado pelo componente:</strong> o botão de fechar tem{' '}
              <code>aria-label</code> (<code>texts.close</code>) e o ícone é decorativo; a
              severidade vai em texto: o <code>title</code>, se houver, ou um prefixo oculto (
              <code>texts.severity</code>).
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> que o toast nunca seja o único canal da
              informação (ele some), e que as mensagens sejam curtas e completas por si.
            </li>
            <li>
              <strong>Limitação conhecida:</strong> um toast persistente (<code>warning</code> ou{' '}
              <code>danger</code>) não tem saída rápida pelo teclado. A região vem por último no
              Tab, então quem navega por teclado atravessa a página inteira até chegar a ele; o core
              reserva <code>scroll-padding</code> para que o foco não fique coberto, mas o caminho
              continua longo. Prefira <code>info</code> e <code>success</code> para o que pode ser
              perdido, e não use toast para o que exige ação.
            </li>
            <li>
              <strong>Limitação conhecida:</strong> ao abrir ou fechar um modal a região é
              remontada, e o leitor de tela pode reanunciar os toasts visíveis. A região vem depois
              do conteúdo no DOM, então o Tab chega aos toasts por último. O{' '}
              <code>role=&quot;alert&quot;</code> dentro da região polite pode gerar anúncio
              duplicado em alguns leitores; ainda falta validar com leitor real.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
