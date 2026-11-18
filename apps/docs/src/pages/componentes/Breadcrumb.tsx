import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/breadcrumb/basico';
import basicoHtml from '../../examples/breadcrumb/basico.html?raw';
import basicoSource from '../../examples/breadcrumb/basico.tsx?raw';
import Longa from '../../examples/breadcrumb/longa';
import longaHtml from '../../examples/breadcrumb/longa.html?raw';
import longaSource from '../../examples/breadcrumb/longa.tsx?raw';

export default function BreadcrumbPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Mostra onde a pessoa está na hierarquia do sistema e dá atalho para os níveis acima.
        Discreta: só o item atual ganha destaque.
      </p>

      <UseCases
        use={[
          'Em estruturas com mais de dois níveis (Dashboard › Usuários › Ana Souza).',
          'Quando a pessoa pode chegar à página por caminhos diferentes e precisa se situar.',
        ]}
        avoid={[
          'Em sites rasos, de um ou dois níveis: a trilha só ocupa espaço.',
          'Como navegação principal: use Navbar ou Sidebar.',
          'Para mostrar o histórico do que a pessoa visitou: a trilha é a hierarquia, não o histórico.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Básico"
          description="Os níveis anteriores são links; o último é o item atual, sem link."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Trilha longa"
          description="Em telas estreitas a trilha quebra em mais linhas: nenhum nível se perde e não há rolagem horizontal. Reduza a janela para ver."
          html={longaHtml}
          react={{ Component: Longa, source: longaSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Breadcrumb</code> renderiza <code>nav &gt; ol</code> e recebe{' '}
          <code>BreadcrumbItem</code> como filhos. Os dois aceitam <code>ref</code> e{' '}
          <code>className</code>, e repassam os atributos nativos ao elemento raiz.
        </p>
        <PropsTable
          caption="Props de Breadcrumb"
          rows={[
            {
              name: 'aria-label',
              type: 'string',
              default: "'Trilha'",
              description: 'Nome do landmark. Troque quando houver mais de uma trilha na página.',
            },
          ]}
        />
        <PropsTable
          caption="Props de BreadcrumbItem"
          rows={[
            {
              name: 'href',
              type: 'string',
              description: 'Destino. Sem href (ou com current), o texto não é um link.',
            },
            {
              name: 'current',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Item atual: <code>&lt;span aria-current=&quot;page&quot;&gt;</code>, sem link.
                </>
              ),
            },
            {
              name: 'linkProps',
              type: "Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>",
              description: (
                <>
                  Atributos extras do <code>&lt;a&gt;</code>, por exemplo o <code>onClick</code> de
                  um roteador.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Breadcrumb"
          rows={[
            {
              name: '.eds-breadcrumb',
              effect: 'O <nav>: tipografia de rótulo.',
            },
            {
              name: '.eds-breadcrumb-list',
              effect: 'O <ol>: linha flex que quebra, sem marcadores.',
            },
            {
              name: '.eds-breadcrumb-item',
              effect:
                'Item: texto secundário, separador "/" gerado no fim de cada item menos o último (fora da árvore de acessibilidade). Links com área de alvo mínima de 24px de altura.',
            },
            {
              name: '.eds-breadcrumb-item > [aria-current]',
              effect: 'Item atual: texto primário, peso médio. Pode ser <a> ou <span>.',
            },
            {
              name: '.eds-breadcrumb-item > a:hover',
              effect: 'Cor primária e sublinhado.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Semântica:</strong> <code>nav</code> com <code>aria-label</code> e uma lista
              ordenada; o leitor de tela anuncia &quot;lista, 3 itens&quot;. O separador é CSS com
              texto alternativo vazio, então não é lido.
            </li>
            <li>
              <strong>Item atual:</strong> <code>aria-current=&quot;page&quot;</code>. No React, o
              item atual não é um link (<code>&lt;span&gt;</code>).
            </li>
            <li>
              <strong>Teclado:</strong> links comuns, alcançados por Tab. Sem JavaScript.
            </li>
            <li>
              <strong>Reflow:</strong> a trilha quebra em linhas em vez de rolar na horizontal (WCAG
              1.4.10); um item mais largo que o contêiner ganha reticências.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> que os rótulos sejam os mesmos títulos
              das páginas, e que a trilha reflita a hierarquia do sistema, não o histórico de
              navegação.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
