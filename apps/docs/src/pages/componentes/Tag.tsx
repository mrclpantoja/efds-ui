import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/tag/basico';
import basicoHtml from '../../examples/tag/basico.html?raw';
import basicoSource from '../../examples/tag/basico.tsx?raw';
import Diferenca from '../../examples/tag/diferenca';
import diferencaHtml from '../../examples/tag/diferenca.html?raw';
import diferencaSource from '../../examples/tag/diferenca.tsx?raw';
import Removivel from '../../examples/tag/removivel';
import removivelHtml from '../../examples/tag/removivel.html?raw';
import removivelSource from '../../examples/tag/removivel.tsx?raw';

export default function TagPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Rótulo de classificação (área, categoria, marcador), com tom e remoção opcional. É estático:
        não clica, só informa.
      </p>

      <UseCases
        use={[
          'Para classificar um registro com termos livres, muitas vezes escolhidos pelo usuário.',
          'Removível, quando o usuário monta a lista (marcadores de um projeto).',
        ]}
        avoid={[
          'Para a situação de um registro (Pago, Atrasado): use Badge.',
          'Para um filtro que liga e desliga: use Chip, que é um controle.',
        ]}
      />

      <Section title="Badge, Tag ou Chip">
        <Example
          title="A diferença"
          description="Badge diz o estado de um registro e vem do sistema. Tag classifica, com texto livre. Chip é um controle: filtro ativo ou alternável, um botão."
          html={diferencaHtml}
          react={{ Component: Diferenca, source: diferencaSource }}
        />
      </Section>

      <Section title="Exemplos">
        <Example
          title="Tons"
          description="neutral (padrão), accent, info, success, warning e danger. O texto é quem informa; o tom reforça."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Removível"
          description="Só o botão de remover recebe foco. Ele precisa de nome (“Remover Financeiro”); o × é desenhado pelo CSS. Quem remove é o seu código."
          html={removivelHtml}
          react={{ Component: Removivel, source: removivelSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Sem JS">
          <p>
            A Tag é só marcação:{' '}
            <code>&lt;span class=&quot;eds-tag&quot; data-tone=&quot;info&quot;&gt;</code>. Remover
            é decisão da aplicação: ouça o clique em <code>.eds-tag-remove</code>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Tag"
          rows={[
            {
              name: 'tone',
              type: "'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'",
              default: "'neutral'",
              description: 'Tom do fundo e do texto.',
            },
            { name: 'onRemove', type: '() => void', description: 'Mostra o botão de remover.' },
            {
              name: 'removeLabel',
              type: 'string',
              description:
                'Nome do botão quando o texto não é uma string (obrigatório nesse caso).',
            },
            {
              name: 'texts',
              type: '{ remove(label) }',
              description: 'Nome do botão (padrão: “Remover {texto}”).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes da Tag"
          rows={[
            {
              name: '.eds-tag[data-tone]',
              effect: 'A tag; data-tone: neutral, accent, info, success, warning, danger.',
            },
            {
              name: '.eds-tag-remove',
              effect: 'Botão de remover (24 px; 32 px em toque). Vazio, desenha o ×.',
            },
            { name: '.eds-tag-list', effect: 'Lista de tags (ul com li).' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>A tag não é interativa: sem hover, sem foco, sem papel.</li>
          <li>
            O botão de remover tem <code>aria-label</code> com o texto da tag e alvo de 24 px.
          </li>
          <li>
            Ao remover, o botão focado some: leve o foco ao botão que ocupou o lugar (ou ao anterior
            e, sem tags, à lista) e avise “Marcador removido” numa região{' '}
            <code>role=&quot;status&quot;</code>, como no exemplo React.
          </li>
          <li>Texto e fundo medidos em AA nos cinco temas e nos dois modos.</li>
        </ul>
      </Section>
    </>
  );
}
