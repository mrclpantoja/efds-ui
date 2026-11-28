import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/stat/basico';
import basicoHtml from '../../examples/stat/basico.html?raw';
import basicoSource from '../../examples/stat/basico.tsx?raw';
import ComIcone from '../../examples/stat/icone';
import iconeHtml from '../../examples/stat/icone.html?raw';
import iconeSource from '../../examples/stat/icone.tsx?raw';
import Grade from '../../examples/stat/grade';
import gradeHtml from '../../examples/stat/grade.html?raw';
import gradeSource from '../../examples/stat/grade.tsx?raw';

export default function StatPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Indicador (KPI): um número grande, o que ele mede e como variou. Só CSS; no React,{' '}
        <code>Stat</code> e <code>StatGrid</code>.
      </p>

      <UseCases
        use={[
          'Para os números que abrem um painel: pedidos, faturamento, inadimplência.',
          'Em grade, no topo de uma listagem ou do dashboard.',
        ]}
        avoid={[
          'Para séries e comparações ao longo do tempo: isso é um gráfico, fora do escopo do efDS.ui por enquanto.',
          'Para mais de uns seis indicadores lado a lado: ninguém lê tudo.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Indicador"
          description="A seta (data-trend) mostra a direção; a cor (tom, classe eds-stat-delta-success, -danger ou -warning) mostra se é bom ou ruim. São eixos separados: inadimplência subindo é up + negative. A direção também vai em texto oculto (“Aumento de”)."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Grade e carregando"
          description="A grade passa de 1 para 2 e 4 colunas conforme a largura do contêiner. O último indicador mostra o estado carregando: aria-busy, Skeleton nas mesmas dimensões e anúncio."
          html={gradeHtml}
          react={{ Component: Grade, source: gradeSource }}
        />
        <Example
          title="Com ícone"
          description="Um disco de ícone decorativo no canto (o IconDisc do core), sem mudar a leitura do número. O tom do disco é independente do tom da variação, e o rótulo ganha folga para não passar por baixo dele. O ícone é aria-hidden: o significado vem do rótulo."
          html={iconeHtml}
          react={{ Component: ComIcone, source: iconeSource }}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Stat"
          rows={[
            { name: 'label', type: 'string', required: true, description: 'O que o número mede.' },
            {
              name: 'value',
              type: 'ReactNode',
              required: true,
              description: 'Valor já formatado, com algarismos tabulares.',
            },
            {
              name: 'delta',
              type: 'ReactNode',
              description: 'Variação já formatada (“12,4%”). Sem ela, não há linha de variação.',
            },
            {
              name: 'trend',
              type: "'up' | 'down' | 'flat'",
              default: "'flat'",
              description: 'Direção da seta.',
            },
            {
              name: 'tone',
              type: "'success' | 'danger' | 'warning' | 'neutral'",
              default: "'neutral'",
              description: 'Leitura do resultado (cor de status em texto).',
            },
            {
              name: 'meta',
              type: 'string',
              description: 'Referência da variação (“vs. mês anterior”).',
            },
            {
              name: 'loading',
              type: 'boolean',
              default: 'false',
              description: 'aria-busy e Skeleton no lugar do conteúdo.',
            },
            {
              name: 'icon',
              type: 'ReactNode',
              description:
                'Ícone (um <svg>) num disco no canto, decorativo (aria-hidden). Independe de tone.',
            },
            {
              name: 'iconTone',
              type: "'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'danger'",
              default: "'accent'",
              description: 'Tom do disco do ícone.',
            },
            {
              name: 'texts',
              type: 'Partial<StatTexts>',
              description: 'up, down, flat (texto oculto da direção) e loading.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos do Stat"
          rows={[
            {
              name: '.eds-stat',
              effect: 'Conteúdo do indicador; sem fundo nem borda: use junto de .eds-card.',
            },
            { name: '.eds-stat-label', effect: 'Nome do indicador.' },
            {
              name: '.eds-stat-value',
              effect:
                'O número, grande e tabular. Em .eds-stat-grid, rótulo, valor e variação alinham por subgrade entre os cards da mesma fileira (rótulo de duas linhas não desalinha os números); fora dela, o valor fica ancorado na base do card.',
            },
            { name: '.eds-stat-delta', effect: 'Variação, com seta (svg) e texto.' },
            {
              name: '[data-trend="up|down|flat"]',
              effect: 'Direção da seta (o svg é desenhado para cima e o CSS gira).',
            },
            {
              name: '.eds-stat-delta-success / -danger / -warning',
              effect: 'Cor do texto de status.',
            },
            { name: '.eds-stat-meta', effect: 'Referência da variação, em tom secundário.' },
            {
              name: 'span.eds-icon-disc.eds-stat-icon',
              effect:
                'Disco de ícone no canto (primeiro filho do .eds-stat); o rótulo reserva o espaço. Tons por .eds-icon-disc-*.',
            },
            {
              name: 'svg.eds-stat-icon',
              effect: 'Ícone simples, sem disco, na coluna do indicador.',
            },
            { name: '[aria-busy="true"]', effect: 'Estado carregando (com Skeleton dentro).' },
            { name: '.eds-stat-grid', effect: 'Grade de 1, 2 e 4 colunas conforme o contêiner.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Cor nunca sozinha:</strong> a direção tem seta e texto oculto (“Aumento de”,
            “Queda de”, “Sem variação,”); o bom ou ruim vem da cor, então escreva a meta (“vs. mês
            anterior”) e, se importar, diga na descrição se subir é ruim.
          </li>
          <li>
            <strong>Contraste:</strong> as cores de tom usam os tokens de texto de status, que
            passam AA sobre o card.
          </li>
          <li>
            <strong>Carregando:</strong> <code>aria-busy=&quot;true&quot;</code> e uma região de
            status; os Skeleton são decorativos.
          </li>
          <li>
            <strong>Estrutura:</strong> são parágrafos, não cabeçalhos: o indicador não polui a
            navegação por títulos.
          </li>
        </ul>
      </Section>
    </>
  );
}
