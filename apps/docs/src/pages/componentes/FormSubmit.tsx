import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/form-submit/basico';
import basicoHtml from '../../examples/form-submit/basico.html?raw';
import basicoSource from '../../examples/form-submit/basico.tsx?raw';
import Fetch from '../../examples/form-submit/fetch';
import fetchHtml from '../../examples/form-submit/fetch.html?raw';
import fetchSource from '../../examples/form-submit/fetch.tsx?raw';

export default function FormSubmitPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Estado de envio do formulário: bloqueia o envio duplo e mostra no botão que envia o que está
        acontecendo: enviando, salvo ou falhou. Não é um componente visual: é um comportamento do
        formulário, com a mesma ideia em HTML (behavior) e em React (<code>useSubmit</code>).
      </p>

      <UseCases
        use={[
          'Em qualquer formulário que grava dados: cadastros, edição, aprovações.',
          'Quando o envio demora e o usuário clicaria de novo achando que nada aconteceu.',
        ]}
        avoid={[
          'Em busca ou filtro que reenvia a cada tecla: use o filtro local da Table.',
          'Para operações longas que bloqueiam a página inteira: use o PageLoader.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Envio com resultado no botão"
          description="Salvar mostra o spinner por 1,5 s e depois “Salvo”. Marque “Simular falha” para ver “Não foi possível salvar”. Durante o envio o outro botão fica indisponível e Enter não envia de novo."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Envio por fetch"
          description="O behavior faz o fetch com o method e o action do formulário; 2xx é sucesso. O segundo botão faz um POST num arquivo estático e recebe erro."
          html={fetchHtml}
          react={{ Component: Fetch, source: fetchSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert tone="info" title="Behavior @efds-ui/behavior">
          <p>
            Ponha <code>data-eds-submit</code> no <code>&lt;form&gt;</code>. Há três modos:
          </p>
          <ul className="docs-list">
            <li>
              <strong>Nativo</strong> (<code>data-eds-submit</code>): o navegador envia e navega. O
              estado dura até a página sair; se ela voltar do cache do histórico, volta ao normal.
              Um envio que não troca a página (download) volta ao normal sozinho em 30 s (
              <code>data-eds-submit-timeout</code>, <code>0</code> desliga).
            </li>
            <li>
              <strong>Manual</strong> (<code>data-eds-submit=&quot;manual&quot;</code>): o behavior
              cancela o envio nativo e entra em &quot;enviando&quot;; você envia como quiser e
              conclui com <code>EDS.submit(form).success()</code> ou <code>.error()</code> (ou
              <code> .track(promessa)</code>).
            </li>
            <li>
              <strong>Fetch</strong> (<code>data-eds-submit=&quot;fetch&quot;</code>): o behavior
              envia com <code>fetch</code> (method, action e enctype do formulário, ou{' '}
              <code>formmethod</code> e <code>formaction</code> do botão; urlencoded por padrão,
              multipart se o <code>enctype</code> pedir), com os cabeçalhos{' '}
              <code>X-Requested-With: XMLHttpRequest</code> e <code>Accept</code> de JSON ou HTML.
              Resposta 2xx é sucesso; outra resposta ou falha de rede é erro.
            </li>
          </ul>
          <p>
            Em todos os modos o envio só conta se for válido: a validação (do navegador ou do
            efDS.ui), a do Wizard e, depois dela, a confirmação (<code>data-eds-confirm</code>)
            acontecem antes. O evento <code>eds:form-submit</code> (cancelável) sai logo antes;
            cancelá-lo impede o envio. Em fetch, <code>detail.data</code> é o <code>FormData</code>{' '}
            e aceita campos extras (token CSRF). Depois do sucesso o behavior chama{' '}
            <code>markClean(form)</code>: o aviso de alterações não salvas some.
          </p>
        </Alert>
        <Alert tone="warning" title="Convivência com o PageLoader">
          <p>
            O botão em <code>aria-busy</code> é o sinal do envio; o PageLoader bloqueante em cima
            seria um sinal duplo. Por isso, em formulários com <code>data-eds-submit</code>: o envio
            nativo não aciona o PageLoader (o behavior põe{' '}
            <code>data-eds-loader=&quot;off&quot;</code> no formulário se você não pôs nada) e o{' '}
            <code>fetch</code> do modo fetch vai com <code>edsLoader: false</code>. Para somar o
            PageLoader num envio muito longo, escreva <code>data-eds-loader=&quot;auto&quot;</code>{' '}
            no formulário. No modo manual, o fetch é seu: passe{' '}
            <code>{'{ edsLoader: false }'}</code> (ou o cabeçalho <code>X-EDS-Loader: off</code>).
            No React, o mesmo vale para o <code>fetch</code>
            dentro do handler do <code>useSubmit</code> com <code>PageLoaderProvider auto</code>.
          </p>
        </Alert>
        <Alert tone="info" title="API de script">
          <p>
            <code>EDS.submit(form)</code> devolve <code>state</code>(
            <code>idle | busy | success | error</code>), <code>start(submitter?)</code>,{' '}
            <code>success(texto?)</code>, <code>error(texto?)</code>, <code>reset()</code> e{' '}
            <code>track(promessa)</code>. Eventos: <code>eds:form-submit</code>,{' '}
            <code>eds:form-success</code> e <code>eds:form-error</code> (<code>detail.text</code>;
            em fetch também <code>response</code>, <code>status</code> e <code>error</code>).
            Duração padrão do resultado:{' '}
            <code>EDS.configure({'{ submit: { feedback: 3000 } }'})</code>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="useSubmit(handler, options?)"
          rows={[
            {
              name: 'handler',
              type: '(data: FormData, event) => unknown',
              required: true,
              description:
                'Faz o envio (pode ser assíncrono). Resolver é sucesso; lançar é falha. O FormData já inclui o botão que enviou.',
            },
            {
              name: 'options.feedbackMs',
              type: 'number',
              default: '2000',
              description: 'Quanto o resultado fica no botão. 0 mantém até o próximo envio.',
            },
            {
              name: 'options.texts',
              type: '{ busy, success, error }',
              description:
                'Textos (pt-BR): anúncio de demora, “Salvo” e “Não foi possível salvar”.',
            },
            { name: 'options.onSuccess', type: '() => void', description: 'Depois do sucesso.' },
            {
              name: 'options.onError',
              type: '(error: unknown) => void',
              description: 'Com o que o handler lançou.',
            },
          ]}
        />
        <PropsTable
          caption="Retorno de useSubmit"
          rows={[
            {
              name: 'handleSubmit',
              type: '(event) => void',
              description:
                'Vai em <form onSubmit>. Cancela o envio nativo e ignora envio repetido.',
            },
            {
              name: 'state',
              type: "'idle' | 'busy' | 'success' | 'error'",
              description: 'Estado.',
            },
            {
              name: 'loading',
              type: 'boolean',
              description:
                'Atalho de state === busy: use em aria-disabled nos outros botões de envio.',
            },
            { name: 'error', type: 'unknown', description: 'O que o último envio lançou.' },
            { name: 'reset', type: '() => void', description: 'Volta ao normal na hora.' },
            {
              name: 'buttonProps',
              type: '{ loading, result, texts }',
              description: (
                <>
                  Espalhe no <code>Button</code> que envia.
                </>
              ),
            },
          ]}
        />
        <PropsTable
          caption="Props novas do Button"
          rows={[
            {
              name: 'result',
              type: "'success' | 'error'",
              description:
                'Troca o conteúdo pelo texto do resultado e põe data-state. Ignorado com loading.',
            },
            {
              name: 'texts',
              type: '{ success, error }',
              default: '“Salvo” / “Não foi possível salvar”',
              description: 'Textos do result.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Atributos do estado de envio"
          headers={['Atributo', 'Efeito']}
          rows={[
            { name: 'data-eds-submit', effect: 'No form: liga o estado. Valores: manual, fetch.' },
            {
              name: 'data-eds-submit-success-text / -error-text',
              effect: 'No botão ou no form: texto do resultado.',
            },
            {
              name: 'data-eds-submit-feedback',
              effect: 'No form: duração do resultado, em ms (0 = até o próximo envio).',
            },
            {
              name: 'data-eds-submit-timeout',
              effect: 'No form: tempo máximo enviando, em ms (nativo: 30000).',
            },
            {
              name: '[aria-busy="true"]',
              effect: 'No form e no botão que enviou: enviando (spinner do botão).',
            },
            {
              name: '[aria-disabled="true"]',
              effect: 'Nos outros botões de envio enquanto envia.',
            },
            {
              name: '.eds-button[data-state="success|error"]',
              effect:
                'Botão com o resultado: ícone e texto trocados (a cor nunca é o único sinal).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Foco:</strong> o botão que enviou nunca recebe <code>disabled</code>: continua
            focável, com <code>aria-busy</code>, e Enter e Espaço são ignorados. Os outros botões de
            envio usam <code>aria-disabled</code>.
          </li>
          <li>
            <strong>Anúncios (WCAG 4.1.3):</strong> o resultado é anunciado em uma região{' '}
            <code>role=&quot;status&quot;</code>; “Enviando…” só se passar de 1 s, para não falar em
            todo salvar rápido.
          </li>
          <li>
            <strong>Falha:</strong> o formulário continua editável e o foco vai para o resumo de
            erros (<code>[data-eds-error-summary]</code> dentro do formulário, se houver) ou para o
            botão.
          </li>
          <li>
            <strong>Cor nunca sozinha (1.4.1):</strong> o resultado troca o texto do botão e o
            ícone.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> dizer o que corrigir quando o servidor
            recusar (mensagens junto aos campos) e não depender só do botão para erros longos.
          </li>
        </ul>
      </Section>
    </>
  );
}
