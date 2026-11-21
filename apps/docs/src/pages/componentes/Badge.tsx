import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import EmTabela from '../../examples/badge/em-tabela';
import emTabelaHtml from '../../examples/badge/em-tabela.html?raw';
import emTabelaSource from '../../examples/badge/em-tabela.tsx?raw';
import Ponto from '../../examples/badge/ponto';
import pontoHtml from '../../examples/badge/ponto.html?raw';
import pontoSource from '../../examples/badge/ponto.tsx?raw';
import Variantes from '../../examples/badge/variantes';
import variantesHtml from '../../examples/badge/variantes.html?raw';
import variantesSource from '../../examples/badge/variantes.tsx?raw';

export default function BadgePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Rótulo pequeno e não interativo que classifica um item: a situação de uma fatura, o estado
        de um cadastro. Cinco variantes de cor e uma forma com ponto.
      </p>

      <UseCases
        use={[
          'Para mostrar a situação de um registro, em tabelas, listas e cabeçalhos de cards.',
          'Sempre com texto: "Pago", "Pendente", "Atrasado". A cor reforça, o texto informa.',
          'Na forma com ponto (dot) quando o rótulo precisa de menos peso visual.',
        ]}
        avoid={[
          'Para uma ação ou um filtro clicável: o Badge não é interativo; use Button ou um controle próprio.',
          'Como único sinal de um estado crítico: combine com texto na própria linha ou com um Alert.',
          'Para contadores de notificação sobre ícones: este componente não resolve esse caso.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Variantes"
          description="neutral (padrão), info, success, warning e danger."
          html={variantesHtml}
          react={{ Component: Variantes, source: variantesSource }}
        />
        <Example
          title="Com ponto"
          description="Ponto colorido e texto, sem fundo."
          html={pontoHtml}
          react={{ Component: Ponto, source: pontoSource }}
        />
        <Example
          title="Em uma tabela"
          description="Uso mais comum: a situação de cada linha, sempre escrita por extenso."
          html={emTabelaHtml}
          react={{ Component: EmTabela, source: emTabelaSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Badge</code> estende <code>&lt;span&gt;</code>, repassa <code>ref</code> e mescla{' '}
          <code>className</code> depois das classes do core.
        </p>
        <PropsTable
          caption="Props de Badge"
          rows={[
            {
              name: 'variant',
              type: "'neutral' | 'info' | 'success' | 'warning' | 'danger'",
              default: "'neutral'",
              description: 'Cor semântica. A cor nunca é o único sinal: o texto diz a situação.',
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'dot',
              type: 'boolean',
              default: 'false',
              description: 'Ponto colorido antes do texto, sem fundo.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas.</p>
        <ClassTable
          caption="Classes de Badge"
          rows={[
            {
              name: '.eds-badge',
              effect:
                'Base: texto pequeno em peso médio, raio pequeno (não é pílula) e padding enxuto.',
            },
            {
              name: '.eds-badge-neutral / -info / -success / -warning / -danger',
              effect:
                'Fundo sutil e texto na cor de status (AA). Sempre use uma delas junto de .eds-badge.',
            },
            { name: '.eds-badge-sm / -lg', effect: 'Texto e padding menores e maiores.' },
            {
              name: '.eds-badge-dot',
              effect: 'Tira o fundo e põe um ponto (::before) na cor da variante.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Não é interativo:</strong> o Badge é um <code>&lt;span&gt;</code> sem papel,
              sem foco e sem teclado.
            </li>
            <li>
              <strong>Cor nunca sozinha:</strong> o significado vem do texto. Um Badge sem texto (só
              o ponto) não comunica nada a quem não vê a cor.
            </li>
            <li>
              <strong>Contraste:</strong> texto e fundo de cada variante passam 4,5:1 em todos os
              temas e modos; no modo de cores forçadas do sistema o Badge ganha uma borda, e o texto
              continua a dizer a situação.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> rótulos curtos e consistentes (o mesmo
              texto para a mesma situação em toda a aplicação).
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
