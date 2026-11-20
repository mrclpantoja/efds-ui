import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/tooltip/basico';
import basicoHtml from '../../examples/tooltip/basico.html?raw';
import basicoSource from '../../examples/tooltip/basico.tsx?raw';

export default function TooltipPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Dica curta, só de texto, que aparece junto de um controle quando o ponteiro passa ou o foco
        chega nele. Cumpre a WCAG 1.4.13: pode ser dispensada, pode receber o ponteiro e não some
        sozinha.
      </p>

      <UseCases
        use={[
          'Para dar nome a um botão só de ícone (repetindo o aria-label) ou explicar uma sigla.',
          'Para uma observação curta que ajuda mas não é indispensável.',
        ]}
        avoid={[
          'Para qualquer coisa interativa (links, botões) ou com mais de uma frase: use Popover.',
          'Para informação essencial: no toque não há hover, e a dica só aparece com o foco.',
          'Para mensagens de erro ou ajuda de campo: use o texto de ajuda e erro do Field.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Botão de ícone, texto e posição"
          description="Passe o ponteiro (atraso de 300 ms) ou use Tab (sem atraso). Esc fecha sem tirar o foco; o ponteiro pode ir até o balão sem ele sumir. Se faltar espaço, ele vira para o lado oposto."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="O comportamento vem do @eds-ui/behavior">
          <p>
            Marque o gatilho com <code>data-eds-tooltip</code> e ligue-o ao balão por{' '}
            <code>aria-describedby</code>. O balão é <code>role=&quot;tooltip&quot;</code> com{' '}
            <code>popover=&quot;manual&quot;</code>. O pacote mostra, esconde e posiciona (
            <code>--_tooltip-x</code>, <code>--_tooltip-y</code> e <code>data-placement</code>); o
            lado preferido vai no valor do atributo:{' '}
            <code>data-eds-tooltip=&quot;bottom&quot;</code> (<code>top</code>, <code>bottom</code>,{' '}
            <code>start</code> ou <code>end</code>). Veja{' '}
            <a href={toHref('/comecar/comportamento')}>Comportamento (JS)</a>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Tooltip"
          rows={[
            {
              name: 'content',
              type: 'ReactNode',
              required: true,
              description: 'Texto da dica. Curto, sem elementos interativos.',
            },
            {
              name: 'placement',
              type: "'top' | 'bottom' | 'start' | 'end'",
              default: "'top'",
              description: 'Lado preferido; vira para o oposto quando não cabe.',
            },
            {
              name: 'children',
              type: 'ReactElement',
              required: true,
              description: (
                <>
                  O gatilho: um único elemento focável que repasse <code>aria-describedby</code> e{' '}
                  <code>data-eds-tooltip</code> ao DOM (Button, link, campo). O balão é renderizado
                  logo depois dele.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos do Tooltip"
          rows={[
            { name: '.eds-tooltip', effect: 'O balão (role="tooltip", popover="manual").' },
            {
              name: '--_tooltip-x, --_tooltip-y',
              effect:
                'Ponto no centro da borda do gatilho voltada ao balão, gravado pelo JS; o CSS centraliza, aplica a folga e a ponte do ponteiro.',
            },
            {
              name: '[data-placement="top|bottom|start|end"]',
              effect: 'Lado em uso, escolhido pelo JS.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>WCAG 1.4.13:</strong> dispensável (Esc, sem mover o foco nem o ponteiro),
            pairável (o ponteiro pode ir ao balão sem ele fechar) e persistente (fica enquanto há
            hover ou foco no gatilho).
          </li>
          <li>
            <strong>Nome × descrição:</strong> o tooltip entra como descrição (
            <code>aria-describedby</code>), nunca como nome. Botão só de ícone continua exigindo{' '}
            <code>aria-label</code>.
          </li>
          <li>
            <strong>Toque:</strong> não há hover; a dica aparece com o foco. Por isso nada essencial
            vive só nela.
          </li>
          <li>
            <strong>Esc em diálogos:</strong> com o balão aberto, Esc o fecha e não fecha o diálogo
            em volta; o segundo Esc fecha o diálogo.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> texto curto e que acrescente algo; o
            gatilho precisa ser focável.
          </li>
        </ul>
      </Section>
    </>
  );
}
