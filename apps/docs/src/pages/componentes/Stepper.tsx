import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/stepper/basico';
import basicoHtml from '../../examples/stepper/basico.html?raw';
import basicoSource from '../../examples/stepper/basico.tsx?raw';
import Indicador from '../../examples/stepper/indicador';
import indicadorHtml from '../../examples/stepper/indicador.html?raw';
import indicadorSource from '../../examples/stepper/indicador.tsx?raw';
import Vertical from '../../examples/stepper/vertical';
import verticalHtml from '../../examples/stepper/vertical.html?raw';
import verticalSource from '../../examples/stepper/vertical.tsx?raw';
import WizardExemplo from '../../examples/stepper/wizard';
import wizardHtml from '../../examples/stepper/wizard.html?raw';
import wizardSource from '../../examples/stepper/wizard.tsx?raw';

export default function StepperPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Mostra em que etapa de um processo a pessoa está. O <strong>Stepper</strong> é só o
        indicador; o <strong>Wizard</strong> junta o indicador a painéis, validação por etapa, foco
        e anúncio.
      </p>

      <UseCases
        use={[
          'Para formulários longos e sequenciais (cadastro, contratação, importação).',
          'Para acompanhar o andamento de uma solicitação (Stepper sozinho, na vertical).',
        ]}
        avoid={[
          'Para dividir conteúdo em visões irmãs: use Tabs.',
          'Para menos de três etapas ou para etapas que o usuário faz em qualquer ordem.',
          'Para formulários curtos: um só formulário é mais rápido de preencher.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Stepper"
          description="Só visual: o estado vem de data-state (done, current, upcoming, error) e aria-current. Número, check e “!” são do CSS e o estado também vai em texto oculto, nunca só em cor. Em contêiner estreito mostra só a etapa atual e “Etapa 2 de 4”."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Vertical, com erro e etapa clicável"
          description="No React, onStepClick faz as etapas concluídas virarem botões (o rótulo é um <button>)."
          html={verticalHtml}
          react={{ Component: Vertical, source: verticalSource }}
        />
        <Example
          title="Indicador de seções de uma página longa"
          description="Cada rótulo é um link para a seção. aria-current marca a seção lida (sem rolar sozinho); a seção fica concluída quando nenhum campo é inválido e há obrigatório ou campo preenchido, e isso é anunciado uma vez. Clicar no link leva o foco ao título da seção. Preencha os campos e role a página."
          html={indicadorHtml}
          react={{ Component: Indicador, source: indicadorSource }}
        />
        <Example
          title="Wizard"
          description="Avançar valida os campos do painel (cada inválido mostra o erro na página), move o foco ao título da nova etapa e anuncia “Etapa 2 de 3: Endereço.”. Enter também avança. Etapas concluídas voltam por clique. O envio final valida todos os painéis. Os valores se preservam ao voltar."
          html={wizardHtml}
          react={{ Component: WizardExemplo, source: wizardSource }}
        />
      </Section>

      <Section title="HTML puro: o Wizard">
        <Alert tone="info" title="Wizard com data-eds-wizard">
          <p>
            No <code>&lt;form&gt;</code>, <code>data-eds-wizard</code>; em cada painel,{' '}
            <code>data-eds-wizard-step</code> (os outros ficam <code>hidden</code>); nos botões,{' '}
            <code>data-eds-wizard-prev</code> e <code>data-eds-wizard-next</code>. O{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> valida com{' '}
            <code>checkValidity</code> e <code>reportValidity</code>, troca os painéis, atualiza o{' '}
            <code>.eds-stepper</code> do formulário e anuncia a etapa. O título do painel é o{' '}
            <code>data-eds-wizard-title</code>, o primeiro cabeçalho ou o valor de{' '}
            <code>data-eds-wizard-step</code>. Sem <code>data-eds-wizard-finish</code> (botão que só
            aparece na última etapa), o &quot;avançar&quot; da última etapa envia o formulário.
          </p>
          <p>
            Eventos no formulário: <code>eds:wizard-beforechange</code> (cancelável,{' '}
            <code>detail.from</code>, <code>to</code> e <code>direction</code>) e{' '}
            <code>eds:wizard-change</code> (<code>from</code>, <code>to</code>, <code>step</code>,{' '}
            <code>total</code>). Enter antes da última etapa avança; o evento <code>submit</code> só
            chega ao seu código no envio final.
          </p>
        </Alert>
      </Section>

      <Section title="HTML puro: indicador de seções">
        <Alert tone="info" title="data-eds-stepper-sections">
          <p>
            No <code>ol.eds-stepper</code> (ou no <code>nav</code> que o contém), ponha{' '}
            <code>data-eds-stepper-sections</code>; em cada item, um{' '}
            <code>a.eds-stepper-link href=&quot;#secao&quot;</code> para o elemento da seção. O{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> usa
            IntersectionObserver para marcar <code>aria-current=&quot;step&quot;</code> no link da
            seção lida (a última cujo topo passou dos 40% superiores da janela), atualiza{' '}
            <code>data-state</code> (<code>done</code>, <code>current</code>, <code>upcoming</code>)
            e escreve “Seção N de M” no item atual. Seção concluída: nenhum controle inválido e ao
            menos um obrigatório ou campo preenchido; ela ganha o texto oculto “(concluída)” e o
            anúncio “Seção X concluída.” (uma vez, pela região de status comum). O evento{' '}
            <code>eds:stepper-section-change</code> traz <code>{'{ id, index, label }'}</code>{' '}
            quando a seção lida muda.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Stepper"
          rows={[
            {
              name: 'aria-label',
              type: 'string',
              required: true,
              description: 'Nome do indicador (a lista é um <ol>).',
            },
            {
              name: 'steps',
              type: '{ label: string; state?: StepperStepState; href?: string }[]',
              required: true,
              description: (
                <>
                  <code>state</code> sobrescreve o estado derivado (<code>error</code>, por
                  exemplo). Com <code>href</code> em alguma etapa, o Stepper vira o indicador de
                  seções: o rótulo é um link e o clique leva o foco ao título da seção.
                </>
              ),
            },
            {
              name: 'current',
              type: 'number',
              required: true,
              description:
                'Índice da etapa atual (a partir de 0). Antes: concluídas; depois: futuras.',
            },
            {
              name: 'orientation',
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: 'Direção do indicador.',
            },
            {
              name: 'onStepClick',
              type: '(index: number) => void',
              description: 'Torna as etapas concluídas clicáveis (o rótulo vira botão).',
            },
            {
              name: 'texts',
              type: 'Partial<StepperTexts>',
              description:
                'complete, error (textos ocultos), summary e sectionSummary(current, total).',
            },
          ]}
        />
        <PropsTable
          caption="useSectionProgress(sections, options?)"
          rows={[
            {
              name: 'sections',
              type: '{ id: string; label: string }[]',
              required: true,
              description: 'Os elementos da página (por id) que o indicador acompanha.',
            },
            {
              name: 'options.sectionDone',
              type: '(label: string) => string',
              description: 'Texto do anúncio "Seção X concluída.".',
            },
            {
              name: 'retorno',
              type: '{ current: number; states: StepperStepState[] }',
              description:
                'current é a seção lida; states (done, current, upcoming) vai em steps[i].state.',
            },
          ]}
        />
        <PropsTable
          caption="Props de Wizard"
          rows={[
            {
              name: 'aria-label',
              type: 'string',
              required: true,
              description: 'Nome do indicador de etapas.',
            },
            {
              name: 'steps',
              type: '{ title: string; content: ReactNode }[]',
              required: true,
              description: 'Todos os painéis ficam montados (os valores se preservam).',
            },
            { name: 'defaultStep', type: 'number', default: '0', description: 'Etapa inicial.' },
            {
              name: 'step',
              type: 'number',
              description:
                'Etapa atual (controlada). Use com onStepChange: quem controla decide se step muda.',
            },
            {
              name: 'validate',
              type: '(index, panel) => boolean',
              description: 'Validação extra, depois da nativa. false impede o avanço.',
            },
            {
              name: 'onBeforeStepChange',
              type: '(from, to) => boolean | void',
              description: 'false cancela a mudança.',
            },
            {
              name: 'onStepChange',
              type: '(index, from) => void',
              description: 'Depois de mudar de etapa.',
            },
            {
              name: 'onComplete',
              type: '(data: FormData, form) => void',
              description: 'Envio final com todos os painéis válidos. O envio nativo é impedido.',
            },
            {
              name: 'texts',
              type: 'Partial<WizardTexts>',
              description: 'back, next, finish, step(current, total, title) e stepper.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos do Stepper"
          rows={[
            { name: '.eds-stepper', effect: 'A lista (<ol>) de etapas.' },
            { name: '.eds-stepper-vertical', effect: 'Na vertical.' },
            {
              name: '.eds-stepper-item',
              effect: 'Uma etapa. Estado em data-state e, na atual, aria-current="step".',
            },
            {
              name: '.eds-stepper-link',
              effect:
                'Link do rótulo (indicador de seções); aria-current="step" no link da seção lida.',
            },
            {
              name: '[data-state="done|current|upcoming|error"]',
              effect: 'Concluída (check), atual, futura e com erro (“!”): sempre também em texto.',
            },
            {
              name: '.eds-stepper-marker',
              effect: 'Círculo com o número (contador CSS), o check ou o “!”; aria-hidden.',
            },
            {
              name: '.eds-stepper-label',
              effect: 'Rótulo; pode ser <button> (etapa clicável) ou <a>.',
            },
            {
              name: '.eds-stepper-summary',
              effect:
                '“Etapa N de M” dentro do item atual; só aparece em contêiner estreito (< 36rem).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Estado em texto:</strong> concluída e com erro têm texto oculto no rótulo; a
            atual leva <code>aria-current=&quot;step&quot;</code>. Cor, check e “!” são reforço.
          </li>
          <li>
            <strong>Foco:</strong> ao mudar de etapa o foco vai ao título do novo painel (
            <code>tabindex=&quot;-1&quot;</code>) e uma região <code>role=&quot;status&quot;</code>{' '}
            anuncia &quot;Etapa 2 de 3: Endereço.&quot;. Sem isso o leitor de tela não percebe a
            troca.
          </li>
          <li>
            <strong>Validação:</strong> cada painel é validado antes de avançar; cada campo inválido
            ganha <code>aria-invalid</code> e um <code>p.eds-error</code> ligado por{' '}
            <code>aria-describedby</code> (a mensagem nativa ou o texto de{' '}
            <code>data-eds-error-message</code>; um <code>p.eds-error</code> do{' '}
            <code>.eds-field</code> é reaproveitado), o primeiro recebe o foco e o erro some quando
            o campo fica válido. Não há balão nativo. No envio final, um painel anterior que ficou
            inválido volta a ser aberto e marcado com erro.
          </li>
          <li>
            <strong>Voltar:</strong> só etapas concluídas são clicáveis; não se pula para a frente.
          </li>
          <li>
            <strong>Estreito:</strong> o resumo &quot;Etapa N de M&quot; substitui a fila de
            marcadores, que não caberia.
          </li>
        </ul>
      </Section>
    </>
  );
}
