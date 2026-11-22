import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/editor/basico';
import basicoHtml from '../../examples/editor/basico.html?raw';
import basicoSource from '../../examples/editor/basico.tsx?raw';
import Estados from '../../examples/editor/estados';
import estadosHtml from '../../examples/editor/estados.html?raw';
import estadosSource from '../../examples/editor/estados.tsx?raw';
import exibirHtml from '../../examples/editor/exibir.html?raw';
import { cdn, cssTag, scriptTag as scriptTag_ } from '../../cdn';

const scriptTag = `${cssTag(cdn.coreCss)}
${scriptTag_(cdn.editor)}`;

const scriptApi = `EDS.editor.initEditors(document);              // liga os textarea[data-eds-editor]
const ed = EDS.editor.createEditor(textarea);  // um só; devolve a instância
ed.getHTML(); ed.setHTML('<p>Novo</p>'); ed.focus(); ed.destroy();`;

export default function EditorPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Editor de conteúdo rico, edição <strong>Básica</strong>: parágrafos, títulos, negrito,
        itálico, sublinhado, tachado, listas, alinhamento, três fontes, link e tabela simples. É um
        pacote à parte, <code>@efds-ui/editor</code>, sobre o ProseMirror, e entrega HTML limpo e
        sem o atributo <code>style</code>.
      </p>

      <Alert variant="warning" title="Sanitize o HTML no servidor">
        <p>
          O HTML que o editor produz é limpo no navegador, mas{' '}
          <strong>o navegador não é fronteira de confiança</strong>: quem envia o formulário pode
          mandar qualquer texto. Antes de gravar, sanitize o HTML no servidor com a biblioteca da
          sua linguagem (lista de tags permitidas:{' '}
          <code>
            p, h2, h3, h4, ul, ol, li, strong, em, u, s, a[href], br, table, thead, tbody, tr, th,
            td, span
          </code>{' '}
          e as classes <code>eds-prose-*</code>) e só então exiba-o. O efDS.ui nunca injeta HTML por
          conta própria.
        </p>
      </Alert>

      <UseCases
        use={[
          'Para descrições, pareceres, comunicados e textos longos que precisam de formatação simples.',
          'Quando o conteúdo será exibido de novo em outra tela, com a mesma tipografia (.eds-prose).',
        ]}
        avoid={[
          <>
            Para texto sem formatação: use <a href="#/componentes/textarea">Textarea</a>.
          </>,
          'Para imagens, vídeos, código-fonte, modelos, colunas ou mesclagem de células: ficam para as edições Completa e Pro.',
        ]}
      />

      <Alert variant="info" title="Edições">
        <p>
          Esta é a edição <strong>Básica</strong>. A edição <strong>Completa</strong> (gratuita) e a
          edição <strong>Pro</strong> virão em próximas versões.
        </p>
      </Alert>

      <Section title="Exemplos">
        <Example
          title="Editor básico"
          description="Digite, use a barra (ou os atalhos) e veja o HTML salvo no campo. Com JavaScript, o textarea fica escondido e continua no formulário."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Erro, somente leitura e desabilitado"
          description="Os estados do textarea (aria-invalid, readonly, disabled, required) viram estados do editor."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
        <Example
          title="Exibir o conteúdo salvo"
          description="O HTML salvo (já sanitizado no servidor) é exibido dentro de .eds-prose, a mesma tipografia do editor. Funciona em qualquer página, sem o pacote do editor."
          html={exibirHtml}
        />
      </Section>

      <Section title="HTML puro">
        <p>
          Marque o <code>textarea</code> com <code>data-eds-editor</code> e carregue o script. Sem
          JavaScript o campo segue sendo um <code>textarea</code> que envia o HTML como texto.
        </p>
        <CodeBlock code={scriptTag} label="Código HTML: carregar o eds-editor.js" />
        <p>
          O <code>eds-editor.js</code> liga sozinho os editores da página (e os que entrarem depois)
          e expõe <code>window.EDS.editor</code>, junto do <code>eds-behavior.js</code> se ele
          também estiver na página, em qualquer ordem. Com <code>data-eds-manual</code> na tag,
          ligue você mesmo:
        </p>
        <CodeBlock code={scriptApi} label="Código JavaScript: EDS.editor" />
        <ClassTable
          caption="O que o textarea controla"
          headers={['No textarea', 'No editor']}
          rows={[
            { name: 'data-eds-editor="basic"', effect: 'Liga o editor (edição Básica).' },
            {
              name: 'o <label for>',
              effect: 'Nomeia o conteúdo (aria-labelledby); clicar nele foca o editor.',
            },
            {
              name: 'rows',
              effect: 'Altura mínima, em linhas; o conteúdo rola depois de um máximo.',
            },
            { name: 'placeholder', effect: 'Texto de dica enquanto estiver vazio.' },
            {
              name: 'disabled / readonly',
              effect: 'Editor desabilitado / somente leitura (sem barra).',
            },
            {
              name: 'aria-invalid / aria-describedby',
              effect: 'Borda de erro e descrição do conteúdo.',
            },
            {
              name: 'required',
              effect: 'Envio bloqueado com o campo vazio (o editor recebe o foco).',
            },
          ]}
        />
        <p>
          O textarea recebe o HTML a cada mudança (agrupada em 150 ms) e de novo no envio do
          formulário; o <code>reset</code> do formulário restaura o conteúdo original, e{' '}
          <code>destroy()</code> devolve o textarea ao que era.
        </p>
      </Section>

      <Section title="React">
        <p>
          Importe de <code>@efds-ui/editor/react</code> (o React é peer opcional: quem usa só HTML
          não precisa dele). O componente não tem estilo próprio.
        </p>
        <PropsTable
          caption="Props de Editor"
          rows={[
            { name: 'label', type: 'string', description: 'Rótulo visível; nomeia o conteúdo.' },
            { name: 'id', type: 'string', description: 'id do conteúdo editável.' },
            {
              name: 'name',
              type: 'string',
              description: 'Com name, um input hidden leva o HTML no envio do formulário.',
            },
            {
              name: 'value / onChange',
              type: 'string / (html) => void',
              description: 'Uso controlado.',
            },
            {
              name: 'defaultValue',
              type: 'string',
              description: 'HTML inicial (uso não controlado).',
            },
            {
              name: 'preset',
              type: "'basic'",
              default: "'basic'",
              description: 'Edição do editor.',
            },
            { name: 'rows', type: 'number', description: 'Altura mínima, em linhas.' },
            { name: 'placeholder', type: 'string', description: 'Dica quando vazio.' },
            { name: 'disabled / readOnly / invalid', type: 'boolean', description: 'Estados.' },
            {
              name: 'aria-describedby',
              type: 'string',
              description: 'Ajuda e erro ligados ao conteúdo.',
            },
            {
              name: 'texts',
              type: 'objeto parcial',
              description:
                'Todos os textos (rótulos da barra, anúncios, diálogo do link), pt-BR por padrão. Lidos na montagem.',
            },
            {
              name: 'ref',
              type: '{ focus, getHTML, setHTML, view }',
              description: 'view é a EditorView do ProseMirror.',
            },
          ]}
        />
      </Section>

      <Section title="API">
        <ClassTable
          caption="@efds-ui/editor"
          headers={['Função', 'O que faz']}
          rows={[
            {
              name: 'createEditor(textarea | elemento, opções)',
              effect:
                'Cria o editor. Com textarea, liga o campo; com outro elemento, monta dentro dele. Devolve { getHTML, setHTML, focus, update, flush, destroy, view, element }.',
            },
            {
              name: 'initEditors(raiz?)',
              effect:
                'Liga todos os textarea[data-eds-editor] e observa os novos. Devolve destroy().',
            },
            {
              name: 'sanitizeHtml(html)',
              effect:
                'Lê o HTML pelo esquema e serializa de volta: scripts, estilos, atributos on* e style, e javascript: somem. Útil no navegador; no servidor use a biblioteca da sua linguagem.',
            },
            { name: 'basicSchema', effect: 'Esquema ProseMirror da edição Básica.' },
            {
              name: 'configure({ messages })',
              effect: 'Troca os textos de forma global (idioma).',
            },
          ]}
        />
        <p>
          A saída usa só <code>p, h2–h4, ul, ol, li, strong, em, u, s, a[href], br</code> e tabela (
          <code>thead</code>, <code>tbody</code>, <code>tr</code>, <code>th</code>, <code>td</code>
          ). Alinhamento sai como <code>eds-prose-align-center|right|justify</code> e fonte como{' '}
          <code>span.eds-prose-font-serif|mono</code>. Links aceitam http, https, mailto, tel e
          caminhos relativos; <code>javascript:</code> é recusado.
        </p>
      </Section>

      <Section title="Eventos">
        <ClassTable
          caption="Eventos no textarea (ou no elemento ligado)"
          headers={['Evento', 'Detalhe']}
          rows={[
            { name: 'eds:editor-ready', effect: '{ editor }: o editor foi montado.' },
            { name: 'eds:editor-change', effect: '{ html }: conteúdo mudou (agrupado em 150 ms).' },
            { name: 'eds:editor-focus', effect: 'O conteúdo recebeu o foco.' },
            { name: 'eds:editor-blur', effect: 'O conteúdo perdeu o foco.' },
          ]}
        />
      </Section>

      <Section title="Teclado e acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Barra (APG Toolbar):</strong> uma só parada de Tab; ←/→ movem entre os
            controles, Home e End vão ao primeiro e ao último, Esc volta ao texto. No texto, Alt+F10
            leva à barra.
          </li>
          <li>
            <strong>Estado:</strong> negrito, itálico e afins usam <code>aria-pressed</code>; os
            selects de estilo do bloco e de fonte refletem a seleção; os botões sem efeito agora
            ficam com <code>aria-disabled</code> e continuam alcançáveis.
          </li>
          <li>
            <strong>Atalhos:</strong> Ctrl/Cmd+B, I, U e Shift+X (tachado); K (link); Z, Y ou
            Shift+Z (desfazer e refazer); Ctrl+Alt+0 (parágrafo) e Ctrl+Alt+2, 3 e 4 (títulos);
            Ctrl+Shift+7 e 8 (lista numerada e com marcadores). Shift+Enter quebra a linha.
          </li>
          <li>
            <strong>Tabela:</strong> o menu Tabela é um <em>disclosure</em> (insere 3×3 com linha de
            cabeçalho, linha e coluna acima, abaixo, à esquerda e à direita, exclui). Dentro da
            tabela, Tab e Shift+Tab navegam pelas células; fora dela o Tab sai do editor.
          </li>
          <li>
            <strong>Digitação rápida:</strong> <code>- </code> e <code>1. </code> criam listas;{' '}
            <code>## </code>, <code>### </code> e <code>#### </code> criam títulos.
          </li>
          <li>
            <strong>Colar:</strong> o esquema descarta o que não conhece (cores, tamanhos, classes).
            Do Word, parágrafos de lista viram listas. Não há imagens nem mesclagem de células.
          </li>
          <li>
            <strong>Anúncios:</strong> ações sem retorno visual óbvio (tabela inserida, linha
            removida, link aplicado) são anunciadas de forma educada; o diálogo do link valida o
            endereço com erro visível ligado ao campo.
          </li>
        </ul>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do editor e do conteúdo"
          rows={[
            {
              name: '.eds-editor',
              effect:
                'Casca do campo. Estados por atributo: data-disabled, data-readonly, data-invalid.',
            },
            {
              name: '.eds-editor-toolbar / -group / -separator',
              effect: 'Barra (role="toolbar") e seus grupos.',
            },
            {
              name: '.eds-editor-button / -select',
              effect: 'Botão (aria-pressed) e select da barra.',
            },
            {
              name: '.eds-editor-content',
              effect: 'O texto editável; data-placeholder e data-empty mostram a dica.',
            },
            {
              name: '.eds-prose',
              effect:
                'Tipografia do conteúdo rico (títulos, listas, links, tabela, alinhamento e fontes). Use também ao exibir o HTML salvo.',
            },
          ]}
        />
      </Section>
    </>
  );
}
