import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import formularioHtml from '../../examples/sortable/formulario.html?raw';
import Formulario from '../../examples/sortable/formulario';
import formularioSource from '../../examples/sortable/formulario.tsx?raw';
import gradeHtml from '../../examples/sortable/grade.html?raw';
import Grade from '../../examples/sortable/grade';
import gradeSource from '../../examples/sortable/grade.tsx?raw';
import handleHtml from '../../examples/sortable/handle.html?raw';
import Handle from '../../examples/sortable/handle';
import handleSource from '../../examples/sortable/handle.tsx?raw';
import horizontalHtml from '../../examples/sortable/horizontal.html?raw';
import Horizontal from '../../examples/sortable/horizontal';
import horizontalSource from '../../examples/sortable/horizontal.tsx?raw';
import listaHtml from '../../examples/sortable/lista.html?raw';
import Lista from '../../examples/sortable/lista';
import listaSource from '../../examples/sortable/lista.tsx?raw';
import quadroHtml from '../../examples/sortable/quadro.html?raw';
import Quadro from '../../examples/sortable/quadro';
import quadroSource from '../../examples/sortable/quadro.tsx?raw';

const eventoHtml = `<script>
  // eds:sortable-change sai no contêiner de DESTINO e faz bubble: ouça no document.
  document.addEventListener('eds:sortable-change', (event) => {
    const { id, from, to, fromIndex, toIndex, order } = event.detail;
    // from e to são elementos; order é a lista de data-id do destino, já na nova ordem.
    fetch('/api/prioridades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, lista: to.getAttribute('aria-label'), order }),
    });
  });
</script>`;

const eventoReact = `<Sortable
  label="Tarefas"
  items={itens}
  onChange={(proximos, mudanca) => {
    setItens(proximos);
    // mudanca: { id, from, to, fromIndex, toIndex }. from e to são as chaves das listas.
    salvarOrdem(proximos.map((item) => item.id));
  }}
  renderItem={(item, { handle }) => (<>{handle}<span>{item.label}</span></>)}
/>`;

const reactGrupo = `<SortableGroup
  className="eds-sortable-board"
  lists={listas}                       // Record<chave, itens[]>
  onChange={(proximas, mudanca) => setListas(proximas)}
>
  <Sortable id="afazer"  label="A fazer"  renderItem={renderItem} />
  <Sortable id="fazendo" label="Fazendo"  renderItem={renderItem} />
</SortableGroup>`;

export default function SortablePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Reordena itens arrastando, ou pelo teclado, em listas, grades e quadros (kanban). Qualquer
        elemento serve de contêiner e o conteúdo do item é livre. Arrastar com mouse ou toque é uma
        conveniência; a alternativa por teclado e leitor de tela é completa (WCAG 2.5.7).
      </p>

      <UseCases
        use={[
          'Para o usuário definir a prioridade ou a ordem de uma lista curta.',
          'Para mover cartões entre colunas de um quadro (A fazer, Fazendo, Feito).',
          'Para reorganizar atalhos ou blocos em uma grade.',
          'Para enviar a ordem junto com um formulário, sem JavaScript seu (data-eds-name).',
        ]}
        avoid={[
          'Para listas longas (centenas de itens): o arrasto fica impreciso. Ofereça campos de posição.',
          <>
            Para ordenar as linhas de dados por coluna: use o cabeçalho ordenável da{' '}
            <a href={toHref('/componentes/table')}>Table</a>.
          </>,
          <>
            Para reordenar uma hierarquia: use a <a href={toHref('/componentes/tree')}>Tree</a>.
          </>,
          'Quando a ordem é decidida pelos dados (data, valor): ordene no servidor.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Lista simples (sem pegador)"
          description={
            <>
              Sem botão pegador, o próprio item é focável (<code>tabindex=&quot;0&quot;</code>) e
              arrastável. Com mouse, basta arrastar.{' '}
              <strong>No toque, é preciso segurar o item por 400 ms</strong> antes de arrastar
              (antes disso a página rola normalmente). Pelo teclado: Espaço ou Enter pega, setas
              movem, Espaço solta, Esc cancela.
            </>
          }
          html={listaHtml}
          react={{ Component: Lista, source: listaSource }}
        />
        <Example
          title="Com pegador (handle)"
          description={
            <>
              O botão <code>.eds-sortable-handle</code> é o controle: no toque o arrasto começa ao
              mover o dedo (4 px), sem esperar, e o botão ganha{' '}
              <code>aria-pressed=&quot;true&quot;</code> enquanto o item está pego pelo teclado.
              Prefira o pegador quando o item tiver texto selecionável ou links.
            </>
          }
          html={handleHtml}
          react={{ Component: Handle, source: handleSource }}
        />
        <Example
          title="Horizontal"
          description={
            <>
              <code>data-eds-orientation=&quot;horizontal&quot;</code>: as setas ←/→ movem o item.
            </>
          }
          html={horizontalHtml}
          react={{ Component: Horizontal, source: horizontalSource }}
        />
        <Example
          title="Grade"
          description={
            <>
              <code>data-eds-orientation=&quot;grid&quot;</code>: ←/→ movem uma posição e ↑/↓ uma
              linha (as colunas vêm da geometria). Na grade, trocar de lista é por PageUp/PageDown.
            </>
          }
          html={gradeHtml}
          react={{ Component: Grade, source: gradeSource }}
        />
        <Example
          title="Quadro com 3 colunas (grupo)"
          description={
            <>
              Contêineres com o mesmo <code>data-eds-group</code> trocam itens. Com o item pego, ←/→
              (ou PageUp/PageDown) o passam à coluna vizinha e o anúncio diz &quot;Em Fazendo,
              posição 1 de 2.&quot;. Uma coluna vazia continua sendo um alvo de soltar. Em React, o{' '}
              <code>SortableGroup</code> recebe todas as listas e devolve todas no{' '}
              <code>onChange</code>.
            </>
          }
          html={quadroHtml}
          react={{ Component: Quadro, source: quadroSource }}
        />
        <Example
          title="Envio da ordem no formulário"
          description={
            <>
              Com <code>data-eds-name=&quot;prioridade[]&quot;</code> o JS mantém um{' '}
              <code>&lt;input type=&quot;hidden&quot;&gt;</code> por item, na ordem, dentro do
              contêiner. O servidor recebe <code>prioridade[]=c3&amp;prioridade[]=c1…</code>. Em
              React, a prop <code>name</code> faz o mesmo.
            </>
          }
          html={formularioHtml}
          react={{ Component: Formulario, source: formularioSource }}
        />
        <div className="docs-example">
          <h3 className="eds-text-h4">Resultado: o evento eds:sortable-change e o onChange</h3>
          <p className="docs-muted">
            O resultado sai no contêiner de destino. No HTML, o evento{' '}
            <code>eds:sortable-change</code> carrega <code>id</code>, <code>from</code>,{' '}
            <code>to</code> (elementos), <code>fromIndex</code>, <code>toIndex</code> e{' '}
            <code>order</code> (os <code>data-id</code> do destino, na nova ordem).
          </p>
          <CodeBlock code={eventoHtml} label="Código HTML: ouvir eds:sortable-change" />
          <CodeBlock code={eventoReact} label="Código React: onChange do Sortable" />
          <CodeBlock code={reactGrupo} label="Código React: SortableGroup" />
        </div>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Sortable"
          rows={[
            {
              name: 'items',
              type: 'SortableItemData[]',
              description: (
                <>
                  Itens: <code>{'{ id, label?, disabled? }'}</code>. Dentro de um{' '}
                  <code>SortableGroup</code> vêm do grupo e esta prop é ignorada.
                </>
              ),
            },
            {
              name: 'onChange',
              type: '(items: T[], change: SortableChange) => void',
              description: (
                <>
                  Chamado quando o usuário solta, com a nova ordem. <code>change</code> traz{' '}
                  <code>id</code>, <code>from</code>, <code>to</code>, <code>fromIndex</code> e{' '}
                  <code>toIndex</code>. Estado controlado: devolva os itens ao <code>items</code>.
                </>
              ),
            },
            {
              name: 'renderItem',
              type: '(item: T, state: SortableRenderState) => ReactNode',
              required: true,
              description: (
                <>
                  Conteúdo do item. <code>state.handle</code> é o pegador pronto (<code>null</code>{' '}
                  com <code>handle=&#123;false&#125;</code>); <code>state.handleProps</code> serve
                  para quem desenha o próprio botão; <code>index</code>, <code>listId</code> e{' '}
                  <code>dragging</code> completam o estado.
                </>
              ),
            },
            {
              name: 'label',
              type: 'string',
              required: true,
              description: 'Nome da lista, falado nas instruções (vira o aria-label).',
            },
            {
              name: 'id',
              type: 'string',
              description: 'Chave da lista. Obrigatória dentro de um SortableGroup.',
            },
            {
              name: 'orientation',
              type: "'vertical' | 'horizontal' | 'grid'",
              default: "'vertical'",
              description: 'Define as setas: ↑/↓, ←/→ ou as quatro.',
            },
            {
              name: 'handle',
              type: 'boolean',
              default: 'true',
              description: 'Sem pegador, o próprio item é focável e arrastável.',
            },
            {
              name: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Desliga o arrasto da lista (um item também aceita disabled).',
            },
            {
              name: 'name',
              type: 'string',
              description: 'Um hidden por item, na ordem, para o formulário.',
            },
            {
              name: 'getLabel',
              type: '(item: T) => string',
              default: 'item.label ?? item.id',
              description: 'Nome falado do item.',
            },
            {
              name: 'as',
              type: "'div' | 'ul' | 'ol'",
              default: "'div'",
              description: 'ul e ol geram li nos itens.',
            },
            {
              name: 'texts',
              type: 'Partial<SortableTexts>',
              description: 'Instruções e anúncios substituíveis (outro idioma).',
            },
          ]}
        />
        <PropsTable
          caption="Props de SortableGroup"
          rows={[
            {
              name: 'lists',
              type: 'Record<string, T[]>',
              required: true,
              description: 'Itens de cada lista, por chave (a id do Sortable filho).',
            },
            {
              name: 'onChange',
              type: '(lists: Record<string, T[]>, change: SortableChange) => void',
              description: 'Todas as listas, depois de soltar, inclusive entre listas.',
            },
            {
              name: 'group',
              type: 'string',
              description: 'Nome do grupo (data-eds-group). Padrão: gerado.',
            },
            {
              name: 'texts',
              type: 'Partial<SortableTexts>',
              description: 'Textos do grupo.',
            },
          ]}
        />
      </Section>

      <Section title="Atributos e eventos HTML">
        <p>
          Com o <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a>, o contêiner leva{' '}
          <code>data-eds-sortable</code> e os itens, <code>.eds-sortable-item</code> com{' '}
          <code>data-id</code>. A instrução de teclado (&quot;Espaço pega o item…&quot;), a região
          de status e os <code>aria-*</code> são criados pelo JS.
        </p>
        <ClassTable
          caption="Atributos e eventos do Sortable"
          headers={['Atributo ou evento', 'Efeito']}
          rows={[
            {
              name: 'data-eds-sortable',
              effect: 'No contêiner (div, ul, ol...): liga o comportamento.',
            },
            {
              name: 'data-id',
              effect: 'Em cada .eds-sortable-item: identifica o item no evento e nos hidden.',
            },
            {
              name: 'data-eds-group="nome"',
              effect:
                'Contêineres com o mesmo nome trocam itens. Sem o atributo, só reordena dentro do próprio.',
            },
            {
              name: 'data-eds-orientation="horizontal | grid"',
              effect: 'Muda as setas. Padrão: vertical.',
            },
            {
              name: 'data-eds-name="campo[]"',
              effect: 'Um <input type="hidden"> por item, na ordem, dentro do contêiner.',
            },
            {
              name: 'data-eds-disabled',
              effect: 'No contêiner ou no item: desliga o arrasto.',
            },
            {
              name: 'data-eds-label',
              effect: 'No item: nome falado nos anúncios (padrão: o texto do item, sem o pegador).',
            },
            {
              name: 'data-eds-help="ID"',
              effect:
                'Elemento com a instrução ligada por aria-describedby. Padrão: um parágrafo oculto criado pelo JS.',
            },
            {
              name: 'eds:sortable-change',
              effect: (
                <>
                  Evento no contêiner de destino, com <code>detail</code>: <code>id</code>,{' '}
                  <code>from</code>, <code>to</code>, <code>fromIndex</code>, <code>toIndex</code> e{' '}
                  <code>order</code>. Não é cancelável.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e estados do Sortable"
          rows={[
            {
              name: '.eds-sortable',
              effect:
                'Contêiner: coluna (padrão), linha (horizontal) ou grade, com espaçamento. Vazio, continua sendo um alvo.',
            },
            {
              name: '.eds-sortable-item',
              effect:
                'O item: superfície com borda; conteúdo livre. Sem pegador, o cursor e o foco são do item.',
            },
            {
              name: '.eds-sortable-handle',
              effect:
                'Botão pegador, com alvo de toque de 24px ou mais. touch-action: none: arrastar não rola a página.',
            },
            {
              name: '.eds-sortable-placeholder',
              effect:
                'Espaço que reserva o destino, com a altura do item e borda tracejada na cor de ação.',
            },
            {
              name: '.eds-sortable-ghost',
              effect: 'Clone que segue o ponteiro, com sombra.',
            },
            {
              name: '[data-dragging]',
              effect:
                'No item arrastado por ponteiro: some (display: none) enquanto o placeholder reserva o espaço.',
            },
            {
              name: '[data-grabbed]',
              effect:
                'Item sem pegador pego pelo teclado (com pegador, vale o aria-pressed do botão).',
            },
            {
              name: '[data-drop-target]',
              effect:
                'Contêiner sob o ponteiro: borda tracejada e fundo (o tracejado é o sinal além da cor).',
            },
            {
              name: '.eds-sortable-board / -column / -column-title',
              effect: 'Quadro: colunas lado a lado quando há espaço, empilhadas no estreito.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ClassTable
            caption="Teclado do Sortable"
            headers={['Tecla', 'Efeito']}
            rows={[
              { name: 'Espaço ou Enter', effect: 'Pega o item; com o item pego, solta.' },
              {
                name: '↑ ↓ (vertical) · ← → (horizontal)',
                effect: 'Move o item uma posição. Na ponta, não move e repete "Posição N de M.".',
              },
              { name: '← → (grade)', effect: 'Uma posição; ↑/↓ movem uma linha.' },
              {
                name: '← → (vertical) · ↑ ↓ (horizontal) · PageUp/PageDown',
                effect: 'Com grupo: passa o item à lista vizinha. Na grade, só PageUp/PageDown.',
              },
              {
                name: 'Esc',
                effect: 'Cancela e devolve o item à posição original ("Movimento cancelado.").',
              },
              { name: 'Perder o foco', effect: 'Cancela o movimento.' },
            ]}
          />
          <ul className="docs-list">
            <li>
              <strong>Alternativa ao arrasto (2.5.7):</strong> tudo o que o ponteiro faz, o teclado
              faz, com anúncios por região de status: &quot;Revisar contrato pego. Posição 2 de 5 em
              A fazer…&quot;, &quot;Posição 3 de 5.&quot;, &quot;Em Fazendo, posição 1 de 2.&quot;,
              &quot;Revisar contrato solto na posição 3 de 5 em Fazendo.&quot;.
            </li>
            <li>
              <strong>Estado:</strong> o pegador (botão) leva <code>aria-pressed</code> enquanto o
              item está pego; o item sem pegador usa <code>data-grabbed</code> e o anúncio, nunca{' '}
              <code>aria-pressed</code> em <code>div</code> ou <code>li</code>. O foco acompanha o
              item.
            </li>
            <li>
              <strong>Toque:</strong> no pegador, o arrasto começa com 4 px de movimento. Sem
              pegador, é preciso <strong>segurar 400 ms parado</strong>; antes disso a página rola.
              Perto da borda, o contêiner e a página rolam sozinhos.
            </li>
            <li>
              <strong>Forçado pelo componente:</strong> o pegador tem <code>aria-label</code>{' '}
              (&quot;Mover …&quot;) e <code>aria-describedby</code> para a instrução; a lista tem
              nome (<code>aria-label</code> ou <code>aria-labelledby</code>); o pegador de um item
              desativado leva <code>aria-disabled</code>.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> nome único e descritivo de cada lista e
              de cada item, e salvar a ordem (a tela não guarda nada sozinha).
            </li>
            <li>
              <strong>Estados visuais:</strong> placeholder tracejado, ghost com sombra e destino
              tracejado: nenhum depende só de cor. Reduced-motion e forced-colors tratados.
            </li>
            <li>
              <strong>Limitação conhecida:</strong> ainda falta validar com leitor de tela real e
              com toque em celular e tablet.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
