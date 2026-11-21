import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Icones from '../../examples/button-group/icones';
import iconesHtml from '../../examples/button-group/icones.html?raw';
import iconesSource from '../../examples/button-group/icones.tsx?raw';
import Periodo from '../../examples/button-group/periodo';
import periodoHtml from '../../examples/button-group/periodo.html?raw';
import periodoSource from '../../examples/button-group/periodo.tsx?raw';
import Variantes from '../../examples/button-group/variantes';
import variantesHtml from '../../examples/button-group/variantes.html?raw';
import variantesSource from '../../examples/button-group/variantes.tsx?raw';

export default function ButtonGroupPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Reúne botões relacionados em uma só peça: bordas coladas, raio apenas nas pontas e uma
        divisória entre eles. É só agrupamento visual; cada botão continua independente.
      </p>

      <UseCases
        use={[
          'Ações do mesmo assunto que o usuário compara de relance (Dia, Semana, Mês).',
          'Um botão principal com um gatilho de menu ao lado (Salvar e mais opções).',
          'Conjunto curto de ações de ícone sobre o mesmo registro.',
        ]}
        avoid={[
          'Para navegar entre seções do mesmo conteúdo: use Tabs.',
          'Para mostrar a opção escolhida (seleção): o grupo não guarda estado; use Radio ou Tabs.',
          'Para muitas ações: o grupo não quebra linha; use um Dropdown.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Botões do mesmo peso"
          description="Grupo de botões secondary com nome acessível."
          html={periodoHtml}
          react={{ Component: Periodo, source: periodoSource }}
        />
        <Example
          title="Variantes e tamanhos"
          description="Use a mesma variante e o mesmo tamanho dentro de um grupo."
          html={variantesHtml}
          react={{ Component: Variantes, source: variantesSource }}
        />
        <Example
          title="Só ícones"
          description="Cada botão de ícone precisa do seu aria-label."
          html={iconesHtml}
          react={{ Component: Icones, source: iconesSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>ButtonGroup</code> renderiza um <code>div</code> com{' '}
          <code>role=&quot;group&quot;</code>. Aceita os atributos nativos de <code>div</code>{' '}
          (menos <code>role</code>), repassa <code>ref</code> e mescla <code>className</code>. Os
          filhos são <code>Button</code>.
        </p>
        <PropsTable
          caption="Props de ButtonGroup"
          rows={[
            {
              name: 'aria-label',
              type: 'string',
              required: true,
              description: (
                <>
                  Nome do grupo. Obrigatório pelo tipo: informe <code>aria-label</code> ou{' '}
                  <code>aria-labelledby</code>.
                </>
              ),
            },
            {
              name: 'aria-labelledby',
              type: 'string',
              description:
                'Alternativa ao aria-label: id de um elemento visível que nomeia o grupo.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Button Group"
          rows={[
            {
              name: '.eds-button-group',
              effect:
                'Contêiner em linha. Os .eds-button filhos perdem o raio, exceto nas pontas, e ganham divisória.',
            },
            {
              name: '.eds-button-group > .eds-button:hover / :focus-visible',
              effect: 'Sobe acima dos vizinhos para a borda e o anel de foco não serem cortados.',
            },
            {
              name: '[aria-expanded="true"]',
              effect: 'Num botão do grupo (gatilho de menu), mantém o botão acima dos vizinhos.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Forçado pelo tipo:</strong> o grupo exige nome (<code>aria-label</code> ou{' '}
              <code>aria-labelledby</code>), pois <code>role=&quot;group&quot;</code> sem nome não
              diz a que os botões se referem.
            </li>
            <li>
              <strong>Teclado:</strong> cada botão é uma parada de Tab, como fora do grupo. O grupo
              não usa setas.
            </li>
            <li>
              <strong>Botão só de ícone:</strong> exige <code>aria-label</code> (o tipo do Button
              garante).
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> o grupo não comunica seleção. Se um botão
              representa a opção ativa, use <code>aria-pressed</code> nele (e não só a cor).
            </li>
            <li>
              <strong>Foco:</strong> o botão focado sobe acima dos vizinhos; o anel nunca é cortado.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
