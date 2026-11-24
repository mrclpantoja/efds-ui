import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/empty-state/basico';
import basicoHtml from '../../examples/empty-state/basico.html?raw';
import basicoSource from '../../examples/empty-state/basico.tsx?raw';
import SemAcao from '../../examples/empty-state/sem-acao';
import semAcaoHtml from '../../examples/empty-state/sem-acao.html?raw';
import semAcaoSource from '../../examples/empty-state/sem-acao.tsx?raw';

export default function EmptyStatePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Explica a ausência de conteúdo: uma lista vazia, uma busca sem resultado. Ícone, título,
        texto de apoio e ações, centralizados. Parte do Table, mas vale para qualquer região.
      </p>

      <UseCases
        use={[
          'Quando uma lista ou região não tem nada para mostrar e o usuário pode fazer algo a respeito.',
          <>
            Dentro de uma tabela, na linha de <code>TableEmpty</code>; veja{' '}
            <a href="/componentes/table">Table</a>.
          </>,
          'Com uma ação que diz tudo o que faz: "Limpar busca e filtros", "Novo cliente".',
        ]}
        avoid={[
          'Para erros: use Alert, que tem o papel e a severidade certos.',
          'Para uma região ainda carregando: use Skeleton ou Spinner.',
          'Quando o vazio é esperado e sem saída (um histórico sem eventos): um texto simples basta.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Com ícone e ação"
          description="Ícone decorativo (o componente o marca como aria-hidden), título, texto e botão de ação."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Só texto"
          description="Sem ícone e sem ação. O título usa o nível de cabeçalho da hierarquia onde aparece (aqui, h4)."
          html={semAcaoHtml}
          react={{ Component: SemAcao, source: semAcaoSource }}
        />
        <p>
          O estado vazio dentro de uma tabela está em <a href="/componentes/table">Table</a>{' '}
          (exemplo &quot;Tabela vazia&quot;).
        </p>
      </Section>

      <Section title="API React">
        <p>
          <code>EmptyState</code> estende <code>&lt;div&gt;</code> (menos <code>title</code>, que
          aqui é um nó React), repassa <code>ref</code> e mescla <code>className</code> depois das
          classes do core. Dentro de uma tabela, envolva-o em <code>&lt;TableEmpty&gt;</code>.
        </p>
        <PropsTable
          caption="Props de EmptyState"
          rows={[
            {
              name: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Título do estado vazio.',
            },
            {
              name: 'description',
              type: 'ReactNode',
              description: 'Texto de apoio abaixo do título.',
            },
            {
              name: 'icon',
              type: 'ReactNode',
              description: (
                <>
                  Um <code>&lt;svg&gt;</code> (por exemplo de <code>@efds-ui/icons</code>): recebe{' '}
                  <code>.eds-empty-icon</code> e <code>aria-hidden</code>.
                </>
              ),
            },
            {
              name: 'actions',
              type: 'ReactNode',
              description: 'Botões ou links de ação, no fim.',
            },
            {
              name: 'headingLevel',
              type: '2 | 3 | 4 | 5 | 6',
              default: '3',
              description: 'Nível do título, conforme a hierarquia da página onde aparece.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas.</p>
        <ClassTable
          caption="Classes de Empty State"
          rows={[
            {
              name: '.eds-empty',
              effect: 'Contêiner em coluna, centralizado, com espaço generoso e texto secundário.',
            },
            { name: '.eds-empty-icon', effect: 'Ícone de 2,5rem, decorativo.' },
            { name: '.eds-empty-title', effect: 'Título (h2 a h6, conforme o contexto).' },
            {
              name: '.eds-empty-text',
              effect: 'Texto de apoio, com largura máxima de 45 caracteres.',
            },
            {
              name: '.eds-empty-actions',
              effect: 'Linha de botões centralizada, com quebra.',
            },
            {
              name: '.eds-table-empty',
              effect: 'Na <td colspan> que contém o estado vazio de uma tabela.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Hierarquia:</strong> o título é um cabeçalho real. Escolha{' '}
              <code>headingLevel</code> coerente com a página, sem pular níveis.
            </li>
            <li>
              <strong>Não é uma live region:</strong> o estado vazio em si não é anunciado. Em
              tabelas, &quot;Nenhum resultado&quot; é anunciado pela região de status da tabela;
              fora delas, anuncie a mudança se ela vier de uma ação do usuário (busca, filtro).
            </li>
            <li>
              <strong>Ações:</strong> o texto da ação nomeia tudo o que ela faz (&quot;Limpar busca
              e filtros&quot;, e não &quot;Limpar&quot;). Depois de limpar, leve o foco para um
              elemento existente.
            </li>
            <li>
              <strong>Forçado pelo componente:</strong> o ícone recebe <code>aria-hidden</code>{' '}
              automaticamente.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> que o texto explique o porquê do vazio e
              o que fazer em seguida; o contraste do texto secundário passa AA nos temas do core.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
