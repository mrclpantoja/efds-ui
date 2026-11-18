import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Formas from '../../examples/skeleton/formas';
import formasHtml from '../../examples/skeleton/formas.html?raw';
import formasSource from '../../examples/skeleton/formas.tsx?raw';
import Regiao from '../../examples/skeleton/regiao';
import regiaoHtml from '../../examples/skeleton/regiao.html?raw';
import regiaoSource from '../../examples/skeleton/regiao.tsx?raw';

export default function SkeletonPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Marcador do formato do conteúdo que ainda está carregando. Três formas (bloco, texto e
        círculo), brilho opcional e a <code>SkeletonRegion</code>, que anuncia o estado sem que o
        leitor de tela leia os blocos.
      </p>

      <UseCases
        use={[
          'Quando a tela já conhece o formato do que virá: cards, listas, linhas de tabela, avatares.',
          'Para evitar o salto de layout: troque o skeleton pelo conteúdo em um bloco do mesmo tamanho.',
          <>
            Dentro de <code>SkeletonRegion</code>, que cuida de <code>aria-busy</code> e do anúncio.
          </>,
        ]}
        avoid={[
          <>
            Quando o formato é desconhecido ou a espera é de uma ação (enviar, sincronizar): use{' '}
            <code>Spinner</code>.
          </>,
          'Como conteúdo permanente: o skeleton some quando o dado chega.',
          'Para carregamentos muito curtos: o piscar do skeleton incomoda mais que ajuda.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Formas"
          description="Bloco (100% por 1rem), texto (altura da linha; a última de um grupo é mais curta) e círculo (quadrado redondo). O shimmer é opcional."
          html={formasHtml}
          react={{ Component: Formas, source: formasSource }}
        />
        <Example
          title="Região de carregamento"
          description="Alterne o estado: a região anuncia “Carregando perfil”, o contêiner fica aria-busy e os blocos ficam ocultos para o leitor de tela."
          html={regiaoHtml}
          react={{ Component: Regiao, source: regiaoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          O core não define tamanhos além do padrão de cada forma: para outras dimensões, o
          consumidor aplica uma classe da própria aplicação (<code>className</code>) com{' '}
          <code>inline-size</code> e <code>block-size</code>. Os exemplos acima usam só os tamanhos
          padrão.
        </p>
        <PropsTable
          caption="Props de Skeleton"
          rows={[
            {
              name: 'variant',
              type: "'block' | 'text' | 'circle'",
              default: "'block'",
              description:
                'block: 100% por 1rem. text: altura da linha herdada. circle: quadrado redondo de 2,5rem; informe só a largura.',
            },
            {
              name: 'shimmer',
              type: 'boolean',
              default: 'false',
              description: 'Faixa de brilho varrendo o bloco. Some com prefers-reduced-motion.',
            },
          ]}
        />
        <PropsTable
          caption="Props de SkeletonRegion"
          rows={[
            {
              name: 'loading',
              type: 'boolean',
              required: true,
              description: (
                <>
                  Em carregamento: <code>aria-busy=&quot;true&quot;</code> no contêiner e o{' '}
                  <code>label</code> anunciado.
                </>
              ),
            },
            {
              name: 'label',
              type: 'string',
              default: "'Carregando'",
              description: 'Texto anunciado ao começar a carregar. Substituível (i18n).',
            },
          ]}
        />
        <p>
          Os dois estendem os atributos nativos (<code>&lt;span&gt;</code> e{' '}
          <code>&lt;div&gt;</code>), repassam <code>ref</code> e mesclam <code>className</code>.{' '}
          <code>SkeletonRegion</code> renderiza uma região <code>role=&quot;status&quot;</code>{' '}
          oculta, irmã do contêiner; renderize os Skeletons enquanto <code>loading</code> e o
          conteúdo real depois.
        </p>
      </Section>

      <Section title="Classes CSS">
        <p>Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas.</p>
        <ClassTable
          caption="Classes de Skeleton"
          rows={[
            {
              name: '.eds-skeleton',
              effect: 'Bloco de 100% por 1rem, fundo tênue e raio pequeno.',
            },
            {
              name: '.eds-skeleton-text',
              effect:
                'Ocupa a altura da linha de texto (1lh), com a barra mais baixa; a última de um grupo tem 60% da largura.',
            },
            {
              name: '.eds-skeleton-circle',
              effect: 'Quadrado por aspect-ratio com raio total; 2,5rem por padrão.',
            },
            {
              name: '.eds-skeleton-shimmer',
              effect: 'Faixa de brilho que varre o bloco; não anima em reduced-motion.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Blocos ocultos:</strong> cada Skeleton tem <code>aria-hidden</code>: são só
              forma, sem significado para o leitor de tela.
            </li>
            <li>
              <strong>Estado anunciado:</strong> a região <code>role=&quot;status&quot;</code> nasce
              vazia e recebe o texto ao entrar em carregamento (uma live region que já nasce
              preenchida não é anunciada). Ela é irmã do contêiner <code>aria-busy</code>, porque
              dentro dele o anúncio seria suprimido.
            </li>
            <li>
              <strong>Sem salto de layout:</strong> troque o skeleton pelo conteúdo real em um bloco
              de mesmo tamanho.
            </li>
            <li>
              <strong>Movimento e cores forçadas:</strong> o shimmer some em{' '}
              <code>prefers-reduced-motion</code>; no modo de cores forçadas o bloco ganha uma
              borda, para continuar visível.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> que o carregamento termine com o conteúdo
              ou com uma mensagem de erro, nunca ficando em skeleton indefinidamente.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
