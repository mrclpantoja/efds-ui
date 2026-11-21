import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/accordion/basico';
import basicoHtml from '../../examples/accordion/basico.html?raw';
import basicoSource from '../../examples/accordion/basico.tsx?raw';
import Exclusivo from '../../examples/accordion/exclusivo';
import exclusivoHtml from '../../examples/accordion/exclusivo.html?raw';
import exclusivoSource from '../../examples/accordion/exclusivo.tsx?raw';

export default function AccordionPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Lista de itens que se abrem e fecham, escondendo o detalhe até alguém precisar dele. Feito
        sobre o elemento nativo <code>&lt;details&gt;</code>: funciona sem JavaScript.
      </p>

      <UseCases
        use={[
          'Para perguntas frequentes, regras e textos longos que poucos leem por inteiro.',
          'Para agrupar seções de um formulário longo que o usuário preenche fora de ordem.',
        ]}
        avoid={[
          'Para esconder conteúdo que quase todos precisam: mostre-o aberto.',
          'Para alternar visões irmãs de peso igual: use Tabs.',
          'Para uma sequência obrigatória de passos: use Stepper e Wizard.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Básico"
          description="Vários itens podem ficar abertos ao mesmo tempo. O último é indisponível: aria-disabled no gatilho, que não alterna."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Exclusivo e sem borda externa"
          description="O mesmo name em todos os <details> faz o navegador fechar os outros ao abrir um (nativo). .eds-accordion-flush tira a borda externa: só linhas entre os itens."
          html={exclusivoHtml}
          react={{ Component: Exclusivo, source: exclusivoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Sem JavaScript, com uma exceção">
          <p>
            Abrir, fechar, o teclado (Enter e Espaço no <code>&lt;summary&gt;</code>) e o grupo
            exclusivo (<code>name</code>) são do navegador. Só o item indisponível precisa do{' '}
            <code>@efds-ui/behavior</code>, que impede o <code>aria-disabled=&quot;true&quot;</code>{' '}
            de alternar; sem ele o item abriria mesmo marcado como indisponível.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Accordion"
          rows={[
            {
              name: 'exclusive',
              type: 'boolean',
              default: 'false',
              description: 'Só um item aberto por vez: gera o mesmo name para todos (useId).',
            },
            {
              name: 'flush',
              type: 'boolean',
              default: 'false',
              description: 'Sem a borda externa (.eds-accordion-flush).',
            },
          ]}
        />
        <PropsTable
          caption="Props de AccordionItem"
          rows={[
            {
              name: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Conteúdo do gatilho (<summary>). Curto e que diga o que há dentro.',
            },
            {
              name: 'open / defaultOpen / onOpenChange',
              type: 'boolean / boolean / (open: boolean) => void',
              description:
                'Controlado ou não. onOpenChange também avisa quando outro item do grupo exclusivo fecha este.',
            },
            {
              name: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'aria-disabled no gatilho; o clique e o teclado não alternam.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos do Accordion"
          rows={[
            { name: '.eds-accordion', effect: 'Contêiner dos itens, com borda e cantos.' },
            {
              name: '.eds-accordion-flush',
              effect: 'Sem a borda externa; linhas só entre os itens.',
            },
            { name: '.eds-accordion-item', effect: 'Um <details>.' },
            {
              name: '.eds-accordion-trigger',
              effect: 'O <summary>: chevron que gira em [open], foco visível e estado :active.',
            },
            { name: '.eds-accordion-panel', effect: 'Conteúdo do item.' },
            {
              name: '[aria-disabled="true"]',
              effect: 'Gatilho indisponível (texto esmaecido, sem hover).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Teclado:</strong> Tab chega a cada gatilho; Enter ou Espaço abrem e fecham. Não
            há setas entre os itens: o padrão disclosure não as exige.
          </li>
          <li>
            <strong>Semântica:</strong> o <code>&lt;summary&gt;</code> expõe o estado aberto/fechado
            ao leitor de tela sem ARIA. O chevron é decorativo; o estado nunca é só visual.
          </li>
          <li>
            <strong>Indisponível:</strong> <code>aria-disabled</code> mantém o gatilho focável e
            lido; avise por que o item não está disponível no próprio texto.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> títulos únicos e descritivos; nada
            essencial (erro de formulário, ação obrigatória) dentro de um item fechado.
          </li>
        </ul>
      </Section>
    </>
  );
}
