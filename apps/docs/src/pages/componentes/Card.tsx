import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Interativo from '../../examples/card/interativo';
import interativoHtml from '../../examples/card/interativo.html?raw';
import interativoSource from '../../examples/card/interativo.tsx?raw';
import Subgrid from '../../examples/card/subgrid';
import subgridHtml from '../../examples/card/subgrid.html?raw';
import subgridSource from '../../examples/card/subgrid.tsx?raw';
import Variantes from '../../examples/card/variantes';
import variantesHtml from '../../examples/card/variantes.html?raw';
import variantesSource from '../../examples/card/variantes.tsx?raw';

export default function CardPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Superfície que agrupa um conteúdo relacionado, com cabeçalho, corpo e rodapé opcionais. Três
        variantes ajustam a ênfase; o card inteiro pode ser um atalho clicável.
      </p>

      <UseCases
        use={[
          'Para agrupar informações de um mesmo assunto: um projeto, um resumo, um bloco de configurações.',
          'Em grades de itens parecidos, com altura igual e rodapés alinhados.',
          'Como atalho para um detalhe, com o link esticado (interactive).',
        ]}
        avoid={[
          'Para envolver toda a página ou cada parágrafo: cards demais poluem a hierarquia.',
          'Para uma lista longa e comparável de registros: use Table.',
          'Para uma mensagem de estado (sucesso, erro): use Alert.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Variantes"
          description="Padrão, contornado e elevado. A elevada admite ações no cabeçalho e rodapé."
          html={variantesHtml}
          react={{ Component: Variantes, source: variantesSource }}
        />
        <Example
          title="Grade com subgrid"
          description="Com subgrid, o cabeçalho, o corpo e o rodapé ficam na mesma altura entre cards vizinhos, mesmo com textos de tamanhos diferentes."
          html={subgridHtml}
          react={{ Component: Subgrid, source: subgridSource }}
        />
        <Example
          title="Clicável (link esticado)"
          description="O link do título cobre o card inteiro; o botão do rodapé continua acionável por conta própria."
          html={interativoHtml}
          react={{ Component: Interativo, source: interativoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Card</code> renderiza um <code>&lt;article&gt;</code> e aceita os atributos nativos,{' '}
          <code>ref</code> e <code>className</code>. As partes são componentes irmãos, cada um com{' '}
          <code>ref</code> e <code>className</code>: <code>CardHeader</code> (<code>header</code>),{' '}
          <code>CardBody</code> (<code>div</code>), <code>CardFooter</code> (<code>footer</code>),{' '}
          <code>CardActions</code> (<code>div</code>) e <code>CardLink</code> (<code>a</code>).
        </p>
        <PropsTable
          caption="Props de Card"
          rows={[
            {
              name: 'variant',
              type: "'default' | 'outlined' | 'elevated'",
              default: "'default'",
              description: 'Ênfase da superfície. O padrão não emite classe.',
            },
            {
              name: 'interactive',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Card inteiro clicável (hover e foco do core). Exige um <code>CardLink</code>{' '}
                  dentro.
                </>
              ),
            },
            {
              name: 'subgrid',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Alinha header, corpo e rodapé entre cards vizinhos. Pede um pai em grade (
                  <code>Grid</code>) e as três partes como filhos diretos.
                </>
              ),
            },
          ]}
        />
        <PropsTable
          caption="Props de CardTitle"
          rows={[
            {
              name: 'level',
              type: '2 | 3 | 4 | 5 | 6',
              default: '3',
              description: 'Nível do título (h2 a h6). A hierarquia da página decide.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas.</p>
        <ClassTable
          caption="Classes de Card"
          rows={[
            {
              name: '.eds-card',
              effect:
                'Base: coluna flex, fundo de superfície, borda de 1px, raio médio, sem sombra. Os filhos crescem para igualar a altura em grades.',
            },
            { name: '.eds-card-outlined', effect: 'Borda mais forte.' },
            {
              name: '.eds-card-elevated',
              effect: 'Sombra suave; a borda permanece no modo escuro.',
            },
            {
              name: '.eds-card-interactive',
              effect: 'Borda e sombra no hover e quando algo dentro tem foco.',
            },
            { name: '.eds-card-header', effect: 'Título à esquerda e ações à direita.' },
            { name: '.eds-card-title', effect: 'Tipografia de título (h4).' },
            { name: '.eds-card-actions', effect: 'Grupo de ações do cabeçalho.' },
            { name: '.eds-card-body', effect: 'Conteúdo; cresce para empurrar o rodapé ao fim.' },
            { name: '.eds-card-footer', effect: 'Ações ou metadados, com quebra de linha.' },
            {
              name: '.eds-card-link',
              effect:
                'Link esticado: o ::after cobre o card. Botões e links extras ficam acima dele. O anel de foco contorna o card inteiro.',
            },
            {
              name: '.eds-card-subgrid',
              effect:
                'Ocupa três linhas do grid pai (subgrid) para alinhar header, corpo e rodapé. Sem suporte, cai no comportamento padrão.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Card clicável:</strong> usa o link esticado (<code>CardLink</code>), nunca o
              card como botão. O link é o único foco do card, e o anel de foco aparece em volta de
              todo o card.
            </li>
            <li>
              <strong>Limitação aceita:</strong> com o link esticado, o texto do card deixa de poder
              ser selecionado com o mouse. Use <code>interactive</code> só quando o card inteiro é
              de fato um atalho.
            </li>
            <li>
              <strong>Forçado pelo tipo:</strong> botão só de ícone nas ações exige{' '}
              <code>aria-label</code>.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> o nível do título (<code>level</code>)
              coerente com a hierarquia da página; um texto de link que descreva o destino; e não
              repetir a mesma ação no link esticado e em um botão do rodapé.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
