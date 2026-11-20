import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import editavelHtml from '../../examples/tree/editavel.html?raw';
import Editavel from '../../examples/tree/editavel';
import editavelSource from '../../examples/tree/editavel.tsx?raw';
import estaticaHtml from '../../examples/tree/estatica.html?raw';
import Estatica from '../../examples/tree/estatica';
import estaticaSource from '../../examples/tree/estatica.tsx?raw';
import SobDemanda from '../../examples/tree/sob-demanda';
import sobDemandaSource from '../../examples/tree/sob-demanda.tsx?raw';

const jsonHtml = `<!-- O servidor responde [{ "id": "n1", "label": "Diretoria Fictícia", "children": [...] }].
     Um nó com "hasChildren": true busca os filhos ao expandir, em data-eds-children-url
     ({id} é trocado pelo id do nó; sem {id}, o id é acrescentado ao fim). -->
<div class="eds-tree" data-eds-tree data-eds-editable
  data-eds-source="/api/estrutura.json"
  data-eds-children-url="/api/estrutura/{id}/filhos"
  data-eds-name="estrutura"
  aria-label="Estrutura organizacional"></div>`;

const jsonResposta = `[
  { "id": "n1", "label": "Diretoria Fictícia", "children": [
    { "id": "n2", "label": "Sede Modelo", "hasChildren": true },
    { "id": "n3", "label": "Filial Teste" }
  ] }
]`;

const eventosHtml = `<script>
  const tree = document.querySelector('[data-eds-tree]');

  // Cancelável: com preventDefault a mudança não acontece (ex.: o servidor recusou).
  tree.addEventListener('eds:tree-beforechange', (event) => {
    const { action, node } = event.detail;       // 'add' | 'rename' | 'move' | 'delete' | 'wrap'
    if (action === 'delete' && node.getAttribute('data-id') === 'n1') event.preventDefault();
  });

  tree.addEventListener('eds:tree-change', (event) => {
    const { action, node, parent, index, id, label, tree: estrutura } = event.detail;
    // estrutura: a árvore inteira em JSON [{ id, label, children? }]
    fetch('/api/estrutura', { method: 'PUT', body: JSON.stringify(estrutura) });
  });

  tree.addEventListener('eds:tree-select',   (event) => console.log(event.detail.selected));
  tree.addEventListener('eds:tree-activate', (event) => console.log(event.detail.id));
  tree.addEventListener('eds:tree-toggle',   (event) => console.log(event.detail.expanded));
</script>`;

const reactEventos = `<Tree
  label="Categorias"
  editable
  items={itens}                                  // controlado; ou defaultItems
  onChange={(proximos, mudanca) => setItens(proximos)}
  onBeforeChange={(mudanca, proximos) => (podeMudar(mudanca) ? undefined : false)}   // false cancela
  onSelect={(ids) => console.log(ids)}
  onActivate={(no) => abrir(no.id)}
  loadChildren={(no) => fetchFilhos(no.id)}      // nós com hasChildren: true
/>`;

export default function TreePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Árvore de nós expansíveis, navegável pelo teclado (padrão APG Tree View) e, se você quiser,
        editável: renomear, adicionar filho, irmão ou pai, excluir com desfazer e mover por teclado
        ou arrastando. Os nós podem vir prontos do servidor, de um JSON ou sob demanda.
      </p>

      <UseCases
        use={[
          'Para navegar ou editar uma hierarquia: estrutura organizacional, categorias, pastas.',
          'Para escolher um ou vários nós de uma estrutura profunda.',
          'Para manter a hierarquia num formulário, enviando o JSON da árvore (data-eds-name).',
          'Para estruturas grandes: os filhos podem ser carregados só ao expandir.',
        ]}
        avoid={[
          'Para um menu de navegação do site: use a Sidebar.',
          <>
            Para uma lista plana que só muda de ordem: use o{' '}
            <a href={toHref('/componentes/sortable')}>Sortable</a>.
          </>,
          <>
            Para dados em colunas: use a <a href={toHref('/componentes/table')}>Table</a>.
          </>,
          'Para hierarquias de uns poucos itens fixos: uma lista aninhada comum basta.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Árvore estática"
          description={
            <>
              Markup do servidor: <code>ul[role=&quot;tree&quot;]</code> com{' '}
              <code>li[role=&quot;treeitem&quot;]</code>, <code>.eds-tree-row</code> e, para os
              filhos, <code>ul[role=&quot;group&quot;]</code>. O JS numera <code>aria-level</code>,{' '}
              <code>aria-setsize</code> e <code>aria-posinset</code> e liga o teclado. Com{' '}
              <code>data-eds-multiselect</code>, Ctrl e Shift escolhem vários nós (Shift+setas
              estende a seleção). Digitar uma letra vai ao próximo nó que começa com ela.
            </>
          }
          html={estaticaHtml}
          react={{ Component: Estatica, source: estaticaSource }}
        />
        <Example
          title="Árvore editável"
          description={
            <>
              Com <code>data-eds-editable</code> (React: <code>editable</code>): F2 ou duplo clique
              renomeia (Enter e blur salvam, Esc cancela; nome vazio mantém o anterior); Insert ou
              Ctrl+Enter adiciona um filho e Shift+Enter, um irmão; Delete exclui (com confirmação
              quando há subitens) e oferece &quot;Desfazer&quot; por 8 s num toast, ou Ctrl+Z
              (Cmd+Z) enquanto o toast estiver na tela; Alt+setas movem; Shift+F10 ou a tecla de
              Menu abre o menu &quot;⋯&quot; (também acrescenta um pai ao nó); e o arraste solta
              antes, dentro ou depois. Tente excluir &quot;Papelaria&quot;.
            </>
          }
          html={editavelHtml}
          react={{ Component: Editavel, source: editavelSource }}
        />
        <Example
          title="Filhos sob demanda"
          description={
            <>
              Um nó com <code>hasChildren: true</code> carrega os filhos ao ser expandido pela
              primeira vez. Enquanto espera, o nó fica com <code>aria-busy</code> e um anel no lugar
              do chevron; se a carga falhar, o nó mostra &quot;Não foi possível carregar&quot;
              (texto e ícone), o erro é anunciado com o nome do nó e expandir de novo tenta outra
              vez (a &quot;Região Sudeste&quot; falha na primeira tentativa, para você ver). O
              servidor deste site não existe: a resposta é simulada com <code>loadChildren</code>.
            </>
          }
          react={{ Component: SobDemanda, source: sobDemandaSource }}
        />
        <div className="docs-example">
          <h3 className="eds-text-h4">HTML: árvore de um JSON (data-eds-source)</h3>
          <p className="docs-muted">
            Com <code>data-eds-source</code>, o contêiner nasce vazio e o JS monta a árvore da
            resposta. Este exemplo não roda aqui (não há servidor na documentação): é o markup que
            você usaria com o seu.
          </p>
          <CodeBlock code={jsonHtml} label="Código HTML: árvore carregada de um JSON" />
          <CodeBlock code={jsonResposta} label="Código JSON: resposta do servidor" />
        </div>
        <div className="docs-example">
          <h3 className="eds-text-h4">Eventos e validação</h3>
          <p className="docs-muted">
            No HTML, os eventos <code>eds:tree-*</code> saem no contêiner e fazem bubble; o{' '}
            <code>eds:tree-beforechange</code> é cancelável e serve para validar no servidor. Em
            React, <code>onBeforeChange</code> devolve <code>false</code> para cancelar.
          </p>
          <CodeBlock code={eventosHtml} label="Código HTML: eventos da árvore" />
          <CodeBlock code={reactEventos} label="Código React: callbacks da árvore" />
        </div>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Tree"
          rows={[
            {
              name: 'label',
              type: 'string',
              required: true,
              description: 'Nome falado da árvore (aria-label).',
            },
            {
              name: 'items / defaultItems',
              type: 'TreeNodeData[]',
              description: (
                <>
                  Nós, controlado (<code>items</code> com <code>onChange</code>) ou não (
                  <code>defaultItems</code>). <code>TreeNodeData</code>:{' '}
                  <code>{'{ id, label, children?, icon?, hasChildren? }'}</code>.
                </>
              ),
            },
            {
              name: 'onChange',
              type: '(items: TreeNodeData[], change: TreeChange) => void',
              description: (
                <>
                  A cada mudança, com a nova estrutura. <code>change</code>: <code>action</code> (
                  <code>add</code>, <code>rename</code>, <code>move</code>, <code>delete</code>,{' '}
                  <code>wrap</code>), <code>node</code>, <code>parent</code> e <code>index</code>.
                </>
              ),
            },
            {
              name: 'onBeforeChange',
              type: '(change: TreeChange, next: TreeNodeData[]) => boolean | void',
              description: 'Devolver false cancela a mudança (validação no servidor).',
            },
            {
              name: 'editable',
              type: 'boolean',
              default: 'false',
              description: 'Renomear, adicionar, excluir, mover, arrastar e o menu "⋯".',
            },
            {
              name: 'multiselect',
              type: 'boolean',
              default: 'false',
              description: 'Seleção múltipla: Ctrl/Shift + clique e Shift + setas.',
            },
            {
              name: 'selected / defaultSelected / onSelect',
              type: 'string[] · (ids: string[]) => void',
              description: 'Ids selecionados, controlado ou não.',
            },
            {
              name: 'expanded / defaultExpanded / onExpandedChange',
              type: "string[] · 'all'",
              description: 'Ids expandidos, controlado ou não; defaultExpanded aceita "all".',
            },
            {
              name: 'onActivate',
              type: '(node: TreeNodeData) => void',
              description: 'Enter no nó.',
            },
            {
              name: 'loadChildren',
              type: '(node: TreeNodeData) => Promise<TreeNodeData[]>',
              description: (
                <>
                  Carrega os filhos de um nó com <code>hasChildren</code> ao expandir. Durante a
                  espera o nó fica com <code>aria-busy</code>; se rejeitar, anuncia o erro e uma
                  nova expansão tenta de novo.
                </>
              ),
            },
            {
              name: 'name',
              type: 'string',
              description: 'Um hidden com o JSON da árvore, para formulário.',
            },
            {
              name: 'createId',
              type: '() => string',
              description: 'Gera o id de um nó novo. Padrão: contador local.',
            },
            {
              name: 'texts',
              type: 'Partial<TreeTexts>',
              description: 'Anúncios e rótulos do menu substituíveis (outro idioma).',
            },
          ]}
        />
        <p>
          Se houver um <code>DialogProvider</code> acima, a confirmação de exclusão usa o diálogo do
          eDS.ui; sem ele, o <code>window.confirm</code>. Se houver um <code>ToastProvider</code>, o
          &quot;Desfazer&quot; aparece num toast de 8 s; sem ele, a exclusão não oferece desfazer.
        </p>
      </Section>

      <Section title="Atributos e eventos HTML">
        <ClassTable
          caption="Atributos e eventos da Tree"
          headers={['Atributo ou evento', 'Efeito']}
          rows={[
            { name: 'data-eds-tree', effect: 'No .eds-tree: liga o comportamento.' },
            {
              name: 'data-id',
              effect: 'Em cada li[role="treeitem"]: identifica o nó nos eventos e no JSON.',
            },
            { name: 'data-eds-editable', effect: 'Liga a edição (o botão "⋯" é criado pelo JS).' },
            {
              name: 'data-eds-multiselect',
              effect: 'Seleção múltipla; põe aria-multiselectable na lista.',
            },
            {
              name: 'data-eds-name="campo"',
              effect: 'Hidden com o JSON da árvore, atualizado a cada mudança.',
            },
            {
              name: 'data-eds-source="URL"',
              effect:
                'Contêiner vazio: monta a árvore de [{ id, label, children?, hasChildren? }].',
            },
            {
              name: 'data-eds-children-url="URL/{id}"',
              effect: 'Endereço dos filhos de um nó com hasChildren (ou data-eds-lazy no li).',
            },
            {
              name: 'eds:tree-change',
              effect: (
                <>
                  Depois de cada mudança. <code>detail</code>: <code>action</code>,{' '}
                  <code>node</code>, <code>parent</code>, <code>index</code>, <code>id</code>,{' '}
                  <code>label</code> e <code>tree</code> (a estrutura em JSON).
                </>
              ),
            },
            {
              name: 'eds:tree-beforechange',
              effect: (
                <>
                  Antes de mudar; <strong>cancelável</strong>. <code>detail</code>:{' '}
                  <code>action</code>, <code>node</code>, <code>parent</code>, <code>index</code>.
                </>
              ),
            },
            {
              name: 'eds:tree-select / -activate / -toggle',
              effect: (
                <>
                  Seleção (<code>selected</code>), Enter (<code>id</code>) e expandir ou recolher (
                  <code>expanded</code>), todos com <code>node</code> e <code>id</code>.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e estados da Tree"
          rows={[
            {
              name: '.eds-tree',
              effect: 'Contêiner: listas sem marcador; o recuo vem do aria-level da linha.',
            },
            {
              name: '.eds-tree-row',
              effect:
                'A linha: altura de controle sm, hover em bg-subtle e guias verticais por nível.',
            },
            {
              name: '.eds-tree-toggle',
              effect:
                'Chevron, só em nós com aria-expanded; gira ao expandir (sem animação em reduced-motion).',
            },
            {
              name: '.eds-tree-label / .eds-tree-icon',
              effect: 'Rótulo (quebra linha no estreito) e ícone opcional e decorativo.',
            },
            {
              name: '.eds-tree-actions / .eds-tree-action',
              effect:
                'Botão "⋯": aparece no hover, no foco e na seleção, e fica sempre visível em toque.',
            },
            {
              name: '[aria-selected="true"]',
              effect: 'Fundo e barra na cor de ação no início da linha: forma, não só cor.',
            },
            {
              name: '[aria-busy="true"]',
              effect: 'O chevron vira um anel girando enquanto os filhos carregam.',
            },
            {
              name: '[data-drop="before | inside | after"]',
              effect:
                'Na linha: indicador de soltar (linha de 2px antes e depois; contorno para "dentro").',
            },
            {
              name: '[data-drop-invalid]',
              effect: 'Soltar dentro de um descendente: tracejado e glifo, não só cor.',
            },
            {
              name: '.eds-tree-ghost',
              effect: 'Fantasma do arrasto (com .eds-sortable-ghost): clone da linha com sombra.',
            },
          ]}
        />
      </Section>

      <Section title="Desempenho">
        <p>Os números abaixo são uma referência de uso, não um limite imposto pelo código.</p>
        <ul className="docs-list">
          <li>
            <strong>Referência prática:</strong> até cerca de 2.000 nós no DOM, com a navegação por
            teclado instantânea. Acima disso, use <code>data-eds-lazy</code> para carregar os filhos
            sob demanda e manter os ramos fechados.
          </li>
          <li>
            A renumeração (<code>aria-level</code>, <code>aria-posinset</code>) acontece uma vez por
            lote de mudanças, e a lista de itens visíveis fica em cache até a árvore mudar.
          </li>
          <li>Não há virtualização: um nó fechado continua no DOM depois de carregado.</li>
        </ul>
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ClassTable
            caption="Teclado da Tree"
            headers={['Tecla', 'Efeito']}
            rows={[
              {
                name: '↑ ↓',
                effect: 'Nó anterior ou próximo visível (Shift estende a seleção no multiselect).',
              },
              { name: '→', effect: 'Expande; se já está expandido, vai ao primeiro filho.' },
              { name: '←', effect: 'Recolhe; se já está recolhido ou é folha, vai ao pai.' },
              { name: 'Home · End', effect: 'Primeiro e último nó visíveis.' },
              {
                name: '* · letra',
                effect: 'Expande os irmãos · vai ao próximo nó que começa com a letra.',
              },
              {
                name: 'Espaço · Enter',
                effect:
                  'Seleciona · ativa (eds:tree-activate; sem edição também alterna a expansão).',
              },
              { name: 'F2', effect: 'Editável: renomeia (Enter ou blur salvam, Esc cancela).' },
              {
                name: 'Insert · Ctrl+Enter · Shift+Enter',
                effect: 'Editável: adiciona filho · filho · irmão abaixo.',
              },
              {
                name: 'Delete',
                effect:
                  'Editável: exclui; com subitens, pede confirmação. Toast "Desfazer" por 8 s.',
              },
              {
                name: 'Ctrl+Z · Cmd+Z',
                effect:
                  'Editável: desfaz a última exclusão enquanto o toast "Desfazer" estiver na tela.',
              },
              {
                name: 'Alt+↑ ↓ · Alt+→ ←',
                effect: 'Editável: sobe ou desce entre irmãos · avança ou recua o nível.',
              },
              {
                name: 'Shift+F10 · tecla de Menu',
                effect: 'Editável: abre o menu de ações do nó.',
              },
            ]}
          />
          <ul className="docs-list">
            <li>
              <strong>Padrão APG:</strong> <code>role=&quot;tree&quot;</code>, <code>treeitem</code>
              , <code>group</code>, <code>aria-expanded</code>, <code>aria-selected</code>,{' '}
              <code>aria-level</code>, <code>aria-setsize</code> e <code>aria-posinset</code>; o
              foco usa roving tabindex (um só nó no Tab).
            </li>
            <li>
              <strong>Alternativa ao arrasto (2.5.7):</strong> mover é possível pelo teclado
              (Alt+setas) e pelo menu &quot;Mover para cima/baixo&quot;, &quot;Avançar/Recuar
              nível&quot;. Cada movimento é anunciado: &quot;Diretoria Fictícia: nível 2, posição 1
              de 3, dentro de Sede Modelo.&quot;.
            </li>
            <li>
              <strong>Arrastar:</strong> usa o mesmo motor do Sortable; com mouse basta arrastar, e{' '}
              <strong>no toque é preciso segurar a linha 400 ms</strong> antes de arrastar. Parado
              600 ms sobre um nó recolhido, ele expande. Soltar um nó em si mesmo ou num descendente
              é bloqueado, com indicador e anúncio.
            </li>
            <li>
              <strong>Menu &quot;⋯&quot;:</strong> o botão tem <code>tabindex=&quot;-1&quot;</code>{' '}
              (não polui o Tab); o menu abre com Shift+F10, tecla de Menu ou clique, no padrão
              disclosure do <a href={toHref('/componentes/dropdown')}>Dropdown</a>.
            </li>
            <li>
              <strong>Edição:</strong> o campo de renomear tem rótulo (&quot;Renomear …&quot;);
              mudanças e erros (&quot;O nome não pode ficar vazio&quot;) vão para uma região de
              status.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> nome de cada nó único e descritivo,
              persistir a estrutura (o evento <code>eds:tree-change</code> ou <code>onChange</code>{' '}
              traz o JSON) e validar mudanças no servidor.
            </li>
            <li>
              <strong>Limitações conhecidas:</strong> a busca e a digitação por letra só alcançam os
              nós que estão no DOM (filhos ainda não carregados não participam); o
              &quot;Desfazer&quot; só existe com o Toast disponível. Ainda falta validar com leitor
              de tela real e com toque em celular e tablet.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
