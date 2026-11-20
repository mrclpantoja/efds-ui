import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import { ThemeGrid } from '../../components/TokenSamples';
import Subarvore from '../../examples/temas/subarvore';
import subarvoreHtml from '../../examples/temas/subarvore.html?raw';
import subarvoreSource from '../../examples/temas/subarvore.tsx?raw';

const importSeletivo = `import '@eds-ui/themes/theme-green.css';   // só o tema verde
import '@eds-ui/themes/mode-dark.css';      // só o modo escuro`;

const html = `<html lang="pt-BR" data-theme="green" data-mode="dark" data-density="compact" data-shape="rounded">`;

export default function TemasEEixos() {
  return (
    <>
      <p className="eds-text-body-lg">
        A aparência muda por quatro eixos independentes, aplicados como atributos HTML. Os
        componentes não mudam: só os tokens que eles consomem. Use o menu &quot;Aparência&quot; no
        topo desta página para ver o efeito em tempo real.
      </p>

      <Section title="Os quatro eixos">
        <ClassTable
          caption="Eixos de aparência"
          headers={['Atributo', 'Valores']}
          rows={[
            {
              name: 'data-theme',
              effect: (
                <>
                  Cor de acento: <code>blue</code> (padrão), <code>green</code>, <code>purple</code>
                  , <code>orange</code>, <code>neutral</code>.
                </>
              ),
            },
            {
              name: 'data-mode',
              effect: (
                <>
                  Claro ou escuro: <code>light</code> (padrão), <code>dark</code>.
                </>
              ),
            },
            {
              name: 'data-density',
              effect: (
                <>
                  Espaçamento: <code>compact</code>, <code>comfortable</code> (padrão),{' '}
                  <code>spacious</code>.
                </>
              ),
            },
            {
              name: 'data-shape',
              effect: (
                <>
                  Arredondamento: <code>sharp</code>, <code>soft</code> (padrão),{' '}
                  <code>rounded</code>.
                </>
              ),
            },
          ]}
        />
        <p>
          Os eixos se combinam por composição: há um arquivo por valor, nunca um por combinação. Sem
          atributo, valem os padrões.
        </p>
      </Section>

      <Section title="Densidade e forma, em números">
        <p>
          A densidade muda as alturas dos controles, os recuos internos (<code>inset-*</code>) e a
          altura da linha da Table. A escala <code>space-*</code> não varia: o que acompanha a
          densidade é o token de recuo, nunca o degrau da escala. Em todas as densidades vale{' '}
          <code>sm &lt; md &lt; lg</code>, e o menor controle nunca fica abaixo de 24px (WCAG
          2.5.8).
        </p>
        <ClassTable
          caption="Tokens por densidade"
          headers={['Token', 'compact / comfortable / spacious']}
          rows={[
            { name: '--eds-control-height-sm', effect: '28px / 32px / 38px' },
            { name: '--eds-control-height-md', effect: '32px / 38px / 44px' },
            { name: '--eds-control-height-lg', effect: '36px / 44px / 52px' },
            { name: '--eds-inset-sm', effect: '8px / 12px / 16px' },
            { name: '--eds-inset-md', effect: '12px / 16px / 20px' },
            { name: '--eds-inset-lg', effect: '16px / 24px / 32px' },
            { name: '--eds-table-row-height', effect: '36px / 44px / 52px' },
          ]}
        />
        <ClassTable
          caption="Raios por forma"
          headers={['Token', 'sharp / soft / rounded']}
          rows={[
            { name: '--eds-radius-sm', effect: '2px / 4px / 8px' },
            { name: '--eds-radius-md', effect: '4px / 8px / 12px' },
            { name: '--eds-radius-lg', effect: '6px / 12px / 16px' },
            { name: '--eds-radius-xl', effect: '8px / 16px / 24px' },
          ]}
        />
        <p>
          O <code>--eds-radius-full</code> não muda com a forma: ele só desenha círculos (rádio,
          polegar do switch, pontos de status).
        </p>
      </Section>

      <Section title="Os cinco temas">
        <p>
          Cada célula abaixo declara um <code>data-theme</code> diferente, nos dois modos (o{' '}
          <code>data-mode</code> vai junto, ver “Em uma subárvore”). A densidade e a forma seguem as
          do site.
        </p>
        <ThemeGrid />
      </Section>

      <Section title="No documento inteiro">
        <p>
          Ponha os atributos no elemento <code>html</code>. Trocar o valor em tempo de execução é só
          trocar o atributo, sem JavaScript de tematização.
        </p>
        <CodeBlock code={html} label="Eixos no html" />
      </Section>

      <Section title="Em uma subárvore">
        <p>
          Os atributos funcionam em qualquer elemento, não só no <code>html</code>: a subárvore
          herda o resto do documento e sobrescreve só o que declarar. Útil para um painel escuro
          dentro de uma página clara. Para trocar o tema numa subárvore, declare também o{' '}
          <code>data-mode</code> no mesmo elemento: a cor de ação é recalculada junto com o modo.
        </p>
        <Example
          title="Subárvore com outros eixos"
          html={subarvoreHtml}
          react={{ Component: Subarvore, source: subarvoreSource }}
        />
      </Section>

      <Section title="Importação seletiva">
        <p>
          O <code>@eds-ui/themes/index.css</code> traz todos os valores. Para reduzir o CSS, importe
          só os que a aplicação usa; mantenha os valores padrão se a aplicação puder voltar a eles.
        </p>
        <CodeBlock code={importSeletivo} label="Importação seletiva de temas" />
      </Section>

      <Section title="Impressão">
        <p>
          O core traz estilos de impressão (<code>@media print</code>) sem nada a configurar. No
          papel, as cores viram preto e branco legíveis (inclusive a partir do modo escuro), as
          sombras somem e o conteúdo corre pelas páginas.
        </p>
        <ul className="docs-list">
          <li>
            Ficam de fora: Sidebar, Navbar, Toasts, carregador, fundo dos diálogos, Pagination, a
            barra de ferramentas da Table e as colunas de seleção e de ações. Para esconder outro
            elemento, use <code>.eds-no-print</code>.
          </li>
          <li>
            O app shell deixa de ter a altura da janela e a rolagem interna; a Table perde a rolagem
            horizontal, quebra o texto das células e repete o cabeçalho em cada página.
          </li>
          <li>
            Linhas de tabela, Cards, Alertas e itens de árvore não são cortados entre páginas, e
            títulos não ficam sozinhos no fim da página.
          </li>
          <li>
            Links externos dentro do conteúdo (<code>main</code> ou <code>.eds-app-main</code>)
            mostram o endereço depois do texto. Botões e links de card ficam de fora.
          </li>
        </ul>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            Todos os temas, nos dois modos, mantêm o contraste de texto de 4,5:1 e o foco visível
            (medido nas escalas de cor).
          </li>
          <li>
            Com <code>prefers-contrast: more</code>, bordas e anel de foco ficam mais fortes sem
            mudar nenhum componente. Em ponteiro grosso (<code>pointer: coarse</code>), campos de
            texto passam a 16px (evita o zoom do iOS) e checkboxes, rádios e switches ganham o alvo
            de <code>--eds-target-min</code>.
          </li>
          <li>
            O modo escuro ajusta <code>color-scheme</code>, então controles nativos e barras de
            rolagem acompanham.
          </li>
          <li>
            O consumidor decide como o usuário escolhe a aparência; se guardar a preferência,
            aplique os atributos antes da primeira pintura para evitar um clarão.
          </li>
        </ul>
      </Section>
    </>
  );
}
