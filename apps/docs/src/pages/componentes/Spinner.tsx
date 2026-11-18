import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Sincronizar from '../../examples/spinner/sincronizar';
import sincronizarHtml from '../../examples/spinner/sincronizar.html?raw';
import sincronizarSource from '../../examples/spinner/sincronizar.tsx?raw';
import Tamanhos from '../../examples/spinner/tamanhos';
import tamanhosHtml from '../../examples/spinner/tamanhos.html?raw';
import tamanhosSource from '../../examples/spinner/tamanhos.tsx?raw';

export default function SpinnerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Indicador de carregamento indeterminado: um arco que gira na cor de ação. Três tamanhos, com
        texto oculto para leitores de tela.
      </p>

      <UseCases
        use={[
          'Quando uma operação leva um tempo que não dá para estimar e a tela não tem o formato do resultado.',
          'Ao lado de um texto de estado ("Sincronizando pedidos…"), em tamanho pequeno.',
          <>
            Dentro de um botão em carregamento: o <code>Button</code> já traz o spinner do core com{' '}
            <code>loading</code>.
          </>,
        ]}
        avoid={[
          <>
            Quando a tela sabe a forma do conteúdo que virá (cards, listas, tabelas): use{' '}
            <code>Skeleton</code>.
          </>,
          'Para progresso com percentual conhecido: este componente é indeterminado.',
          'Como único sinal de espera em operações longas: diga também o que está acontecendo.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Tamanhos"
          description="sm (1rem), md (1,5rem, padrão, sem classe) e lg (2rem). A cor padrão é a de ação."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Carregamento anunciado"
          description="O role=status nasce montado e vazio; o texto e o spinner entram ao iniciar. Uma região que já nasce preenchida não é anunciada."
          html={sincronizarHtml}
          react={{ Component: Sincronizar, source: sincronizarSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Spinner</code> estende <code>&lt;span&gt;</code> (sem <code>children</code>),
          repassa <code>ref</code> e mescla <code>className</code> depois das classes do core.
        </p>
        <PropsTable
          caption="Props de Spinner"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'label',
              type: 'string',
              default: "'Carregando'",
              description: 'Texto oculto anunciado pelo leitor de tela. Substituível (i18n).',
            },
            {
              name: 'decorative',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Só visual: <code>aria-hidden</code>, sem <code>role</code> e sem texto. Use quando
                  já há um texto de estado ao lado, em uma região{' '}
                  <code>role=&quot;status&quot;</code> montada antes do carregamento.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas.</p>
        <ClassTable
          caption="Classes de Spinner"
          rows={[
            {
              name: '.eds-spinner',
              effect:
                'Arco girando sobre um trilho tênue, 1,5rem, na cor de ação. Sobrescreva a cor com color.',
            },
            { name: '.eds-spinner-sm', effect: 'Tamanho de 1rem.' },
            { name: '.eds-spinner-lg', effect: 'Tamanho de 2rem.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Papel e nome:</strong> o spinner usa <code>role=&quot;status&quot;</code> com
              texto oculto (<code>label</code>), ou fica decorativo (<code>aria-hidden</code>)
              quando há texto ao lado.
            </li>
            <li>
              <strong>Live region:</strong> uma região que já nasce preenchida não é anunciada. Para
              anunciar ao entrar em carregamento, mantenha um <code>role=&quot;status&quot;</code>{' '}
              vazio montado e renderize o spinner ou o texto dentro dele quando começar.
            </li>
            <li>
              <strong>Movimento:</strong> com <code>prefers-reduced-motion</code> o arco não gira; o
              arco fixo continua indicando &quot;em andamento&quot;. No modo de cores forçadas, o
              arco usa as cores do sistema.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> que o estado de carregamento termine
              (sucesso ou erro) com um aviso, e que operações longas digam o que está acontecendo.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
