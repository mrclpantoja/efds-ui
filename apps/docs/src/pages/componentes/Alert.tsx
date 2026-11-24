import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Acoes from '../../examples/alert/acoes';
import acoesHtml from '../../examples/alert/acoes.html?raw';
import acoesSource from '../../examples/alert/acoes.tsx?raw';
import AcoesTons from '../../examples/alert/acoes-tons';
import acoesTonsHtml from '../../examples/alert/acoes-tons.html?raw';
import acoesTonsSource from '../../examples/alert/acoes-tons.tsx?raw';
import Dinamico from '../../examples/alert/dinamico';
import dinamicoHtml from '../../examples/alert/dinamico.html?raw';
import dinamicoSource from '../../examples/alert/dinamico.tsx?raw';
import Fechavel from '../../examples/alert/fechavel';
import fechavelHtml from '../../examples/alert/fechavel.html?raw';
import fechavelSource from '../../examples/alert/fechavel.tsx?raw';
import Variantes from '../../examples/alert/variantes';
import variantesHtml from '../../examples/alert/variantes.html?raw';
import variantesSource from '../../examples/alert/variantes.tsx?raw';

export default function AlertPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Mensagem de status que fica na página: informa, confirma, alerta ou reporta um erro. Quatro
        variantes (info, success, warning e danger), com ícone do core, título opcional, ações e
        botão de fechar.
      </p>

      <UseCases
        use={[
          'Para uma mensagem que precisa continuar visível até ser lida: um erro de formulário, um aviso de vencimento, um resultado de importação.',
          'Para destacar o estado de uma região da página (por exemplo, o topo de uma listagem).',
          'Com ações quando o aviso pede uma decisão: "Ver faturas", "Lembrar depois".',
        ]}
        avoid={[
          <>
            Para confirmar uma ação rápida e passageira: use <code>Toast</code>, que some sozinho.
          </>,
          'Para validar um campo: use a mensagem de erro do Field, junto ao campo.',
          'Para uma decisão que bloqueia o fluxo: use um Modal.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Variantes"
          description="O ícone vem do core e é decorativo: a severidade chega ao leitor de tela por um texto oculto (Informação, Sucesso, Atenção, Erro), e a cor nunca é o único sinal."
          html={variantesHtml}
          react={{ Component: Variantes, source: variantesSource }}
        />
        <Example
          title="Com título e ações"
          description="O título fica em linha própria; as ações ficam abaixo do conteúdo."
          html={acoesHtml}
          react={{ Component: Acoes, source: acoesSource }}
        />
        <Example
          title="Ações nos quatro tons"
          description="Os botões dentro das ações herdam o tom do alerta: o secondary vira contorno na cor do status (sem o fundo branco), o ghost fica sem borda e o primary usa a cor do status como fundo. Texto e contorno passam AA nos dois modos."
          html={acoesTonsHtml}
          react={{ Component: AcoesTons, source: acoesTonsSource }}
        />
        <Example
          title="Com botão de fechar"
          description={
            <>
              O Alert não se remove sozinho: no React, o consumidor o desmonta e leva o foco para um
              elemento lógico, já que o botão que tinha o foco sai do DOM. No HTML, o{' '}
              <code>@efds-ui/behavior</code> faz isso com <code>data-eds-dismiss</code> no botão (e
              dispara <code>eds:alert-dismiss</code>, cancelável).
            </>
          }
          html={fechavelHtml}
          react={{ Component: Fechavel, source: fechavelSource }}
        />
        <Example
          title="Inserido dinamicamente"
          description={
            <>
              Um aviso que aparece depois de uma ação precisa de <code>role</code>:{' '}
              <code>status</code> para informativo ou <code>alert</code> para urgente. O Alert
              estático não tem papel nenhum.
            </>
          }
          html={dinamicoHtml}
          react={{ Component: Dinamico, source: dinamicoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Alert</code> estende <code>&lt;div&gt;</code> (menos <code>title</code>, que aqui é
          um nó React), repassa <code>ref</code> e mescla <code>className</code> depois das classes
          do core.
        </p>
        <PropsTable
          caption="Props de Alert"
          rows={[
            {
              name: 'variant',
              type: "'info' | 'success' | 'warning' | 'danger'",
              default: "'info'",
              description: 'Severidade: define a cor e o ícone.',
            },
            {
              name: 'title',
              type: 'ReactNode',
              description: (
                <>
                  Título em linha própria, acima do conteúdo (<code>.eds-alert-title</code>).
                </>
              ),
            },
            {
              name: 'texts',
              type: 'Partial<AlertTexts>',
              description: (
                <>
                  Textos internos. <code>severity</code> (padrão por variante:
                  &quot;Informação:&quot;, &quot;Sucesso:&quot;, &quot;Atenção:&quot; ou
                  &quot;Erro:&quot;) é o texto oculto antes do título: passe outro para traduzir, ou{' '}
                  <code>false</code> quando o título já diz a severidade. <code>close</code>{' '}
                  (&quot;Fechar aviso&quot;) é o nome acessível do botão de fechar.
                </>
              ),
            },
            {
              name: 'actions',
              type: 'ReactNode',
              description: (
                <>
                  Botões de ação (por exemplo <code>&lt;Button size=&quot;sm&quot;&gt;</code>),
                  abaixo do conteúdo.
                </>
              ),
            },
            {
              name: 'onClose',
              type: 'MouseEventHandler<HTMLButtonElement>',
              description:
                'Mostra o botão de fechar. O Alert não se remove: o consumidor o desmonta e move o foco.',
            },
            {
              name: 'role',
              type: "'status' | 'alert' | …",
              description:
                'Atributo nativo, sem valor padrão. Defina ao inserir o aviso depois da carga da página.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas. O ícone é
          um <code>::before</code> do core, sem markup.
        </p>
        <ClassTable
          caption="Classes de Alert"
          rows={[
            {
              name: '.eds-alert',
              effect: 'Contêiner em grade: ícone, conteúdo e botão de fechar. Padrão: info.',
            },
            {
              name: '.eds-alert-info / -success / -warning / -danger',
              effect: 'Fundo sutil, texto e ícone na cor de status (AA em todos os temas).',
            },
            {
              name: '.eds-alert-content',
              effect: 'Coluna do texto: quebra palavras longas e não estoura a grade.',
            },
            {
              name: '.eds-alert-title',
              effect: 'Título em semibold. Pode ser um <p> (em bloco) ou um <strong> (em linha).',
            },
            {
              name: '.eds-alert-actions',
              effect:
                'Linha de botões abaixo do conteúdo, com quebra. Os botões primary, secondary e ghost herdam o tom do alerta.',
            },
            {
              name: '.eds-alert-close',
              effect:
                'Em um .eds-button .eds-button-ghost .eds-button-icon .eds-button-sm: fica no canto e herda a cor do alerta.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Severidade em texto:</strong> o ícone não tem nome acessível e a cor não pode
              ser o único canal. O React coloca um texto oculto (<code>texts.severity</code>) antes
              do conteúdo; no HTML, escreva &quot;Erro:&quot; visível ou em{' '}
              <code>.eds-visually-hidden</code>.
            </li>
            <li>
              <strong>Anúncio:</strong> o Alert estático não tem <code>role</code> e não é
              anunciado. Ao inseri-lo depois da carga, use <code>role=&quot;status&quot;</code>{' '}
              (informativo) ou <code>role=&quot;alert&quot;</code> (urgente); a região precisa
              existir antes ou nascer junto com o role.
            </li>
            <li>
              <strong>Aviso fechável:</strong> ao remover, mova o foco para um elemento lógico
              seguinte (o gatilho que reabre o aviso ou o próximo campo); nunca deixe o foco cair no{' '}
              <code>body</code>.
            </li>
            <li>
              <strong>Forçado pelo tipo e pelo componente:</strong> o botão de fechar tem{' '}
              <code>aria-label</code> (<code>texts.close</code>) e o ícone interno é{' '}
              <code>aria-hidden</code>.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> texto claro sobre o que fazer; ações
              nomeadas pelo que fazem; e que o aviso não seja o único lugar onde uma informação
              essencial aparece.
            </li>
            <li>
              <strong>Contraste e foco:</strong> texto e ícone usam as cores de status verificadas
              em AA; o botão de fechar tem o anel de foco do core.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
