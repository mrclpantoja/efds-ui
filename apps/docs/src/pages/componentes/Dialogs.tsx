import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import confirmarHtml from '../../examples/dialogs/confirmar.html?raw';
import Confirmar from '../../examples/dialogs/confirmar';
import confirmarSource from '../../examples/dialogs/confirmar.tsx?raw';
import declarativoHtml from '../../examples/dialogs/declarativo.html?raw';
import promptHtml from '../../examples/dialogs/prompt.html?raw';
import Prompt from '../../examples/dialogs/prompt';
import promptSource from '../../examples/dialogs/prompt.tsx?raw';
import tiposHtml from '../../examples/dialogs/tipos.html?raw';
import Tipos from '../../examples/dialogs/tipos';
import tiposSource from '../../examples/dialogs/tipos.tsx?raw';

const provider = `import { DialogProvider } from '@eds-ui/react';

// Um único provider na raiz do app. Os textos são substituíveis (outro idioma, outro tom).
<DialogProvider texts={{ cancel: 'Voltar', confirm: 'Sim', severity: { danger: 'Falha:' } }}>
  <App />
</DialogProvider>`;

const reactUse = `const dialog = useDialog();

await dialog.alert('Pedido salvo com sucesso.', 'Pedido', 'success');

if (await dialog.confirm('Excluir o pedido PED-0001?', 'Excluir', 'danger', { okText: 'Excluir' })) {
  // ...excluir
}

const nome = await dialog.prompt('Nome do arquivo', 'relatorio', 'Salvar como');
if (nome !== null) {
  // ...salvar
}`;

const behaviorApi = `// Com o eds-behavior.js carregado por <script> (window.EDS) ou por módulo:
import { alert, confirm, prompt } from '@eds-ui/behavior';

await alert('Pedido salvo com sucesso.', 'Pedido', 'success');               // -> undefined

if (await confirm('Excluir o pedido PED-0001?', 'Excluir', 'danger', { okText: 'Excluir' })) {
  // ...excluir                                                               // -> boolean
}

const nome = await prompt('Nome do arquivo', 'relatorio', 'Salvar como', {
  required: true,
  validate: (valor) => (valor.includes('/') ? 'Não use a barra no nome.' : ''),
});                                                                           // -> string | null`;

const nativeAlert = `<!-- window.alert(msg) passa a abrir o diálogo do eDS.ui, sem mudar o seu código antigo. -->
<script src="/assets/eds/behavior/eds-behavior.js" data-eds-native-alert defer></script>

<!-- Ou, por módulo: -->
<script type="module">
  import { init } from '@eds-ui/behavior';
  const destroy = init(document, { nativeAlert: true });   // destroy() devolve o window.alert original
</script>`;

const nativeAlertCaveat = `alert('Pedido salvo.');
irParaListagem();      // ATENÇÃO: roda já, sem esperar o usuário fechar o aviso.

// Com a API nova, espere de propósito:
await EDS.alert('Pedido salvo.');
irParaListagem();`;

const markup = `<dialog class="eds-modal eds-alert-dialog" data-variant="danger" role="alertdialog"
  aria-labelledby="ad-t" aria-describedby="ad-d">
  <div class="eds-alert-dialog-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">
      <path d="M12 6v7.5M12 17.5v.01" />
    </svg>
  </div>
  <h2 class="eds-alert-dialog-title" id="ad-t">
    <span class="eds-visually-hidden">Atenção: </span>Excluir pedido
  </h2>
  <p class="eds-alert-dialog-text" id="ad-d">Excluir o pedido PED-0001?</p>
  <div class="eds-alert-dialog-actions">
    <button type="button" class="eds-button eds-button-secondary">Cancelar</button>
    <button type="button" class="eds-button eds-button-danger">Excluir</button>
  </div>
</dialog>`;

const mensagens = `import { configure } from '@eds-ui/behavior';

configure({
  messages: {
    dialogOk: 'OK',
    dialogCancel: 'Cancel',
    dialogConfirm: 'Confirm',
    dialogRequired: 'Fill in this field.',
    severityDanger: 'Error:',
  },
});`;

export default function DialogsPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Substitutos de <code>alert</code>, <code>confirm</code> e <code>prompt</code> do navegador,
        com a aparência do eDS.ui e a resposta por <code>Promise</code>: cinco tipos (informação,
        sucesso, atenção, erro e pergunta), campo de texto com validação, fila e teclado completo.
        Usam o <code>&lt;dialog&gt;</code> modal.
      </p>

      <UseCases
        use={[
          'Para confirmar uma ação destrutiva em uma linha: "Excluir o pedido PED-0001?".',
          'Para pedir um texto curto (nome do arquivo, motivo) sem montar um formulário.',
          'Para avisar um resultado que o usuário precisa ver antes de continuar.',
          'Para trocar os alert/confirm do navegador de um sistema legado, sem refazer as telas.',
        ]}
        avoid={[
          <>
            Para formulários com vários campos ou conteúdo próprio: use o{' '}
            <a href={toHref('/componentes/modal')}>Modal</a>.
          </>,
          <>
            Para um aviso que não exige decisão: use{' '}
            <a href={toHref('/componentes/toast')}>Toast</a> ou{' '}
            <a href={toHref('/componentes/alert')}>Alert</a>.
          </>,
          'Para erro de validação de campo: a mensagem fica junto ao campo.',
          'Para encadear vários diálogos em sequência: o fluxo fica confuso; reorganize a tela.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Alert: os cinco tipos"
          description={
            <>
              <code>alert(texto, título?, tipo?)</code> mostra um aviso com um botão. O tipo (
              <code>info</code>, <code>success</code>, <code>warning</code>, <code>danger</code> ou{' '}
              <code>question</code>) escolhe o ícone e a cor; o prefixo de severidade (
              &quot;Erro:&quot;, &quot;Atenção:&quot;) é lido pelo leitor de tela, mas não aparece.
              Em <code>confirm</code> e <code>prompt</code> do tipo <code>danger</code> o prefixo é
              &quot;Atenção:&quot;: perguntar antes de excluir não é um erro. Sem título, o texto dá
              o nome ao diálogo. O <code>DialogProvider</code> é um só, na raiz deste site (
              <code>Layout.tsx</code>).
            </>
          }
          html={tiposHtml}
          react={{ Component: Tipos, source: tiposSource }}
        />
        <Example
          title="Confirm"
          description={
            <>
              Devolve <code>true</code> ao confirmar e <code>false</code> em Cancelar, Esc ou clique
              no fundo. No tipo <code>danger</code> o foco começa em Cancelar e o clique no fundo
              não fecha: perder o diálogo por acidente não pode significar apagar algo.
            </>
          }
          html={confirmarHtml}
          react={{ Component: Confirmar, source: confirmarSource }}
        />
        <Example
          title="Prompt com validação"
          description={
            <>
              Devolve o texto ou <code>null</code>. Com <code>required</code> ou{' '}
              <code>validate</code>, um valor recusado mantém o diálogo aberto: o erro aparece junto
              ao campo (<code>aria-invalid</code> e <code>aria-describedby</code>), o foco fica no
              campo e o leitor de tela lê a mensagem. No <code>textarea</code>, Enter quebra a linha
              e Ctrl+Enter confirma.
            </>
          }
          html={promptHtml}
          react={{ Component: Prompt, source: promptSource }}
        />
        <Example
          title="Confirmação declarativa (HTML)"
          description={
            <>
              Para quem usa só HTML: <code>data-eds-confirm</code> em <code>button</code>,{' '}
              <code>a</code> ou <code>form</code> pergunta antes de agir, sem uma linha de
              JavaScript. Opcionais: <code>data-eds-confirm-title</code>,{' '}
              <code>data-eds-confirm-variant</code> e <code>data-eds-confirm-ok</code>. Em React,
              use <code>useDialog().confirm()</code> no próprio handler.
            </>
          }
          html={declarativoHtml}
        />
        <div className="docs-example">
          <h3 className="eds-text-h4">Provider e textos (React)</h3>
          <p className="docs-muted">
            Um <code>DialogProvider</code> envolve a árvore e renderiza o{' '}
            <code>&lt;dialog&gt;</code>; <code>useDialog()</code> devolve a API em qualquer
            componente abaixo e lança um erro fora do provider.
          </p>
          <CodeBlock code={provider} label="Código React: DialogProvider com textos" />
          <CodeBlock code={reactUse} label="Código React: useDialog" />
        </div>
        <div className="docs-example">
          <h3 className="eds-text-h4">HTML puro: API do @eds-ui/behavior</h3>
          <p className="docs-muted">
            No HTML, as três funções são exportadas pelo{' '}
            <a href={toHref('/comecar/comportamento')}>@eds-ui/behavior</a> e ficam em{' '}
            <code>window.EDS</code> quando o script é carregado por <code>&lt;script&gt;</code>.
            Chamadas simultâneas formam uma fila: um diálogo por vez, na ordem.
          </p>
          <CodeBlock code={behaviorApi} label="Código JavaScript: alert, confirm e prompt" />
          <CodeBlock code={markup} label="Código HTML: markup gerado" />
        </div>
        <div className="docs-example">
          <h3 className="eds-text-h4">Trocar o window.alert (opt-in)</h3>
          <p className="docs-muted">
            Com <code>data-eds-native-alert</code> na tag do script (ou{' '}
            <code>init(root, {'{ nativeAlert: true }'})</code>), <code>window.alert(msg)</code> abre
            o diálogo do eDS.ui. É só o <code>alert</code>: <code>confirm</code> e{' '}
            <code>prompt</code> nativos <strong>nunca</strong> são trocados, porque devolvem o valor
            de forma síncrona e o código que os chama não saberia esperar. Por isso a troca{' '}
            <strong>não bloqueia</strong> como o nativo: o código seguinte ao <code>alert</code>{' '}
            continua sem esperar o usuário fechar o aviso.
          </p>
          <CodeBlock code={nativeAlert} label="Código HTML: ativar a troca do window.alert" />
          <CodeBlock
            code={nativeAlertCaveat}
            label="Código JavaScript: a diferença do alert não bloqueante"
          />
        </div>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de DialogProvider"
          rows={[
            {
              name: 'children',
              type: 'ReactNode',
              description:
                'A aplicação. O diálogo é renderizado ao lado dela, quando há um pedido.',
            },
            {
              name: 'texts',
              type: 'Partial<{ ok, cancel, confirm, required }> & { severity?: Partial<Record<DialogVariant, string>> }',
              default:
                "{ ok: 'OK', cancel: 'Cancelar', confirm: 'Confirmar', required: 'Preencha este campo.' }",
              description: (
                <>
                  Textos substituíveis. <code>severity</code> traz o prefixo oculto de cada tipo
                  (&quot;Informação:&quot;, &quot;Sucesso:&quot;, &quot;Atenção:&quot;,
                  &quot;Erro:&quot;; <code>question</code> não tem prefixo). Em confirm e prompt do
                  tipo <code>danger</code> vale o prefixo de <code>warning</code>.
                </>
              ),
            },
          ]}
        />
        <p>
          <code>ConfirmButton</code> é o equivalente em React do <code>data-eds-confirm</code>: um{' '}
          <code>Button</code> (ou link, com <code>href</code>) que pergunta antes de agir. Fica fora
          do <code>Button</code> para que quem não confirma nada não carregue o diálogo. Exige um{' '}
          <code>DialogProvider</code> acima.
        </p>
        <PropsTable
          caption="Props de ConfirmButton (além das de Button)"
          rows={[
            {
              name: 'confirm',
              type: 'string',
              required: true,
              description:
                'A pergunta. Só se o usuário confirmar, a ação segue: o botão de envio envia o formulário, o link navega e o onClick roda.',
            },
            {
              name: 'confirmTitle / confirmVariant / confirmOkText',
              type: "string / 'info' | 'success' | 'warning' | 'danger' | 'question' / string",
              default: "— / 'question' / 'Confirmar'",
              description: 'Título, tipo e texto do botão principal do diálogo.',
            },
          ]}
        />
        <PropsTable
          caption="API de useDialog() (DialogApi)"
          rows={[
            {
              name: 'alert',
              type: '(text, title?, variant?, options?) => Promise<void>',
              default: "variant: 'info'",
              description: 'Aviso com um botão. Resolve ao fechar.',
            },
            {
              name: 'confirm',
              type: '(text, title?, variant?, options?) => Promise<boolean>',
              default: "variant: 'question'",
              description: (
                <>
                  <code>true</code> ao confirmar; <code>false</code> em Cancelar, Esc ou fundo.
                </>
              ),
            },
            {
              name: 'prompt',
              type: '(text, defaultValue?, title?, options?) => Promise<string | null>',
              description: 'O texto digitado, ou null ao cancelar.',
            },
          ]}
        />
        <PropsTable
          caption="DialogOptions (último argumento)"
          rows={[
            {
              name: 'variant',
              type: "'info' | 'success' | 'warning' | 'danger' | 'question'",
              default: "'question'",
              description: 'Só no prompt (nos outros o tipo é o 3º argumento): ícone e cor.',
            },
            {
              name: 'okText',
              type: 'string',
              default: "'OK' (alert, prompt) · 'Confirmar' (confirm)",
              description: 'Texto do botão principal.',
            },
            {
              name: 'cancelText',
              type: 'string',
              default: "'Cancelar'",
              description: 'Texto do botão que cancela.',
            },
            {
              name: 'placeholder',
              type: 'string',
              description: 'Prompt: dica do campo.',
            },
            {
              name: 'required',
              type: 'boolean',
              default: 'false',
              description: 'Prompt: exige texto (só espaços não conta).',
            },
            {
              name: 'inputType',
              type: "'text' | 'email' | 'number' | 'password' | 'textarea'",
              default: "'text'",
              description: 'Prompt: tipo do campo.',
            },
            {
              name: 'validate',
              type: '(value: string) => string',
              description: 'Prompt: devolve a mensagem de erro, ou "" quando o valor é aceito.',
            },
          ]}
        />
      </Section>

      <Section title="API HTML (@eds-ui/behavior)">
        <p>
          As mesmas assinaturas e os mesmos retornos, como funções (<code>alert</code>,{' '}
          <code>confirm</code>, <code>prompt</code>), com as mesmas <code>DialogOptions</code>. Os
          textos padrão (&quot;OK&quot;, &quot;Cancelar&quot;, &quot;Confirmar&quot;, &quot;Preencha
          este campo.&quot;) são configuráveis:
        </p>
        <CodeBlock code={mensagens} label="Código TypeScript: configure messages dos diálogos" />
        <ClassTable
          caption="Atributos HTML dos diálogos"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-confirm="texto"',
              effect: (
                <>
                  Em <code>button</code>, <code>a</code> ou <code>form</code>: pergunta antes de
                  agir. Só confirmado, o link navega, o botão age (um botão de envio envia o
                  formulário com ele como <code>submitter</code>) e o formulário é enviado.
                </>
              ),
            },
            {
              name: 'data-eds-confirm-title / -variant / -ok',
              effect: (
                <>
                  Título, tipo (<code>info</code>, <code>success</code>, <code>warning</code>,{' '}
                  <code>danger</code>, <code>question</code>; padrão <code>question</code>) e texto
                  do botão principal da confirmação.
                </>
              ),
            },
            {
              name: 'data-eds-native-alert',
              effect: (
                <>
                  Na tag do <code>&lt;script&gt;</code>: <code>window.alert</code> passa a abrir o
                  diálogo, sem bloquear.
                </>
              ),
            },
          ]}
        />
        <p>
          Os diálogos não emitem eventos: o resultado vem da <code>Promise</code>.
        </p>
      </Section>

      <Section title="Classes CSS">
        <p>
          O markup é o do core; o JS (behavior) e o React só o montam. O diálogo reutiliza{' '}
          <code>.eds-modal</code> (<code>&lt;dialog&gt;</code>, fundo e foco) e acrescenta{' '}
          <code>.eds-alert-dialog</code>.
        </p>
        <ClassTable
          caption="Classes dos diálogos rápidos"
          rows={[
            {
              name: '.eds-alert-dialog',
              effect:
                'Com .eds-modal: caixa centralizada de cerca de 26rem (100% menos margens a 320px), conteúdo centralizado; aparece e some sem animação (o diálogo é criado e destruído a cada chamada, e chamadas em sequência não se sobrepõem).',
            },
            {
              name: '.eds-alert-dialog[data-variant="info | success | warning | danger | question"]',
              effect: 'Cor do círculo do ícone e do glifo, sempre pelos tokens de status.',
            },
            {
              name: '.eds-alert-dialog-icon',
              effect: 'Círculo grande (cerca de 4rem) com o glifo; decorativo (aria-hidden).',
            },
            {
              name: '.eds-alert-dialog-title / -text',
              effect:
                'Título (h2) e texto de apoio. Sem título, o texto é o nome e mantém o contraste pleno.',
            },
            {
              name: '.eds-alert-dialog-actions',
              effect:
                'Botões lado a lado; abaixo de 400px empilhados, com a ação principal em cima.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Papel e nome:</strong> <code>&lt;dialog&gt;</code> modal com{' '}
              <code>aria-labelledby</code> (título, ou o texto quando não há título) e{' '}
              <code>aria-describedby</code> (o texto). <code>confirm</code> e <code>prompt</code>{' '}
              dos tipos <code>danger</code> e <code>warning</code> levam{' '}
              <code>role=&quot;alertdialog&quot;</code>.
            </li>
            <li>
              <strong>Foco inicial:</strong> alert no OK; confirm em Cancelar quando{' '}
              <code>danger</code> e no OK nos demais; prompt no campo, com o texto selecionado. Ao
              fechar, o foco volta ao elemento de antes. O fundo fica inerte.
            </li>
            <li>
              <strong>Teclado:</strong> Tab circula dentro do diálogo; Enter confirma (no prompt,
              dentro do campo); Esc cancela sem fechar o que estiver por trás.
            </li>
            <li>
              <strong>Cancelar sem perder nada:</strong> o clique no fundo cancela, exceto no tipo{' '}
              <code>danger</code>, para evitar a perda acidental.
            </li>
            <li>
              <strong>Erro no prompt:</strong>{' '}
              <code>&lt;p class=&quot;eds-error&quot; role=&quot;alert&quot;&gt;</code> ligado ao
              campo por <code>aria-describedby</code>, com <code>aria-invalid</code>; o foco fica no
              campo e não há anúncio duplicado.
            </li>
            <li>
              <strong>Cor nunca sozinha:</strong> o tipo vai no glifo e num prefixo de severidade
              lido pelo leitor de tela (&quot;Erro:&quot;, &quot;Atenção:&quot;).
            </li>
            <li>
              <strong>Fila:</strong> um diálogo por vez; o seguinte abre depois que quem esperava o
              resultado já continuou.
            </li>
            <li>
              <strong>Limitação conhecida:</strong> <code>window.alert</code> trocado (opt-in) não
              bloqueia como o nativo. Ainda falta validar com leitor de tela real.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
