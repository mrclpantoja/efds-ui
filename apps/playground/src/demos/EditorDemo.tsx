import './editor-demo.css';
import { useId, type CSSProperties, type ReactNode } from 'react';

/* Contrato de markup do editor de conteúdo (edição Básica) em HTML cru e estático, sem
   ProseMirror: é o que o JS gera e o React reproduz. O conteúdo é editável nativamente só para
   experimentar o visual. Dados fictícios. */

type State = 'normal' | 'disabled' | 'readonly' | 'invalid' | 'empty';

const ICONS: Record<string, string> = {
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M19 4h-9M14 20H5M15 4 9 20',
  underline: 'M6 4v6a6 6 0 0 0 12 0V4M4 21h16',
  strike: 'M16 4H9a3 3 0 0 0-2.8 4M14 12a4 4 0 0 1 0 8H6M4 12h16',
  ul: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  ol: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  left: 'M17 6H3M21 12H3M17 18H3',
  center: 'M18 6H6M21 12H3M18 18H6',
  right: 'M21 6H7M21 12H3M21 18H7',
  justify: 'M21 6H3M21 12H3M21 18H3',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  clear: 'm7 21-4-4a2 2 0 0 1 0-3l10-10a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3L11 21zM9 21h12M7 11l6 6',
  table: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M10 3v18',
};

function Glyph({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

type BtnProps = {
  icon: string;
  label: string;
  keys?: string;
  pressed?: boolean;
  disabled?: boolean;
  first?: boolean;
};

function Btn({ icon, label, keys, pressed, disabled, first }: BtnProps) {
  return (
    <button
      type="button"
      className="eds-editor-button"
      aria-label={label}
      aria-keyshortcuts={keys}
      aria-pressed={pressed === undefined ? undefined : pressed}
      disabled={disabled}
      tabIndex={first ? 0 : -1}
    >
      <Glyph name={icon} />
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="eds-editor-group" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function Sep() {
  return <span className="eds-editor-separator" aria-hidden="true" />;
}

const TABLE_ITEMS: { label: string; disabled?: boolean; danger?: boolean }[] = [
  { label: 'Inserir tabela 3 × 3' },
  { label: 'Inserir linha acima', disabled: true },
  { label: 'Inserir linha abaixo', disabled: true },
  { label: 'Inserir coluna antes', disabled: true },
  { label: 'Inserir coluna depois', disabled: true },
  { label: 'Remover linha', disabled: true },
  { label: 'Remover coluna', disabled: true },
  { label: 'Excluir tabela', disabled: true, danger: true },
];

function TableMenu({ disabled }: { disabled: boolean }) {
  const menuId = useId();
  const btnId = useId();
  return (
    <>
      <button
        type="button"
        id={btnId}
        className="eds-editor-button"
        aria-haspopup="true"
        aria-expanded="false"
        popoverTarget={disabled ? undefined : menuId}
        disabled={disabled}
        tabIndex={-1}
        aria-label="Tabela"
      >
        <Glyph name="table" />
        <span>Tabela</span>
      </button>
      <div
        className="eds-dropdown"
        id={menuId}
        popover="auto"
        aria-labelledby={btnId}
        onToggle={(event) => {
          const open = (event.nativeEvent as ToggleEvent).newState === 'open';
          document.getElementById(btnId)?.setAttribute('aria-expanded', String(open));
        }}
      >
        {TABLE_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            className={
              item.danger ? 'eds-dropdown-item eds-dropdown-item-danger' : 'eds-dropdown-item'
            }
            disabled={item.disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

function Toolbar({ disabled }: { disabled: boolean }) {
  return (
    <div
      className="eds-editor-toolbar"
      role="toolbar"
      aria-label="Formatação"
      aria-orientation="horizontal"
    >
      <Group label="Desfazer">
        <Btn icon="undo" label="Desfazer" keys="Control+Z" disabled first />
        <Btn icon="redo" label="Refazer" keys="Control+Y" disabled />
      </Group>
      <Sep />
      <select className="eds-editor-select" aria-label="Estilo do bloco" disabled={disabled}>
        <option>Parágrafo</option>
        <option>Título 2</option>
        <option>Título 3</option>
        <option>Título 4</option>
      </select>
      <select className="eds-editor-select" aria-label="Fonte" disabled={disabled}>
        <option>Sem serifa</option>
        <option>Com serifa</option>
        <option>Monoespaçada</option>
      </select>
      <Sep />
      <Group label="Estilo do texto">
        <Btn icon="bold" label="Negrito" keys="Control+B" pressed disabled={disabled} />
        <Btn icon="italic" label="Itálico" keys="Control+I" pressed={false} disabled={disabled} />
        <Btn
          icon="underline"
          label="Sublinhado"
          keys="Control+U"
          pressed={false}
          disabled={disabled}
        />
        <Btn
          icon="strike"
          label="Tachado"
          keys="Control+Shift+X"
          pressed={false}
          disabled={disabled}
        />
      </Group>
      <Sep />
      <Group label="Listas">
        <Btn icon="ul" label="Lista com marcadores" pressed={false} disabled={disabled} />
        <Btn icon="ol" label="Lista numerada" pressed={false} disabled={disabled} />
      </Group>
      <Sep />
      <Group label="Alinhamento">
        <Btn icon="left" label="Alinhar à esquerda" pressed disabled={disabled} />
        <Btn icon="center" label="Centralizar" pressed={false} disabled={disabled} />
        <Btn icon="right" label="Alinhar à direita" pressed={false} disabled={disabled} />
        <Btn icon="justify" label="Justificar" pressed={false} disabled={disabled} />
      </Group>
      <Sep />
      <Group label="Inserir">
        <Btn icon="link" label="Link" keys="Control+K" pressed={false} disabled={disabled} />
        <TableMenu disabled={disabled} />
      </Group>
      <Sep />
      <Btn icon="clear" label="Limpar formatação" disabled={disabled} />
    </div>
  );
}

function Sample() {
  return (
    <>
      <h2>Relatório de vistoria</h2>
      <p>
        A equipe visitou o <strong>Prédio Modelo</strong> e registrou o que está <em>pendente</em>,{' '}
        <u>sublinhado</u> ou <s>já resolvido</s>. O endereço do formulário está em{' '}
        <a href="https://exemplo.test/formulario">exemplo.test/formulario</a>.
      </p>
      <h3>Itens verificados</h3>
      <ul>
        <li>Acesso e sinalização</li>
        <li>
          Instalações elétricas
          <ul>
            <li>Quadro de distribuição</li>
            <li>Iluminação de emergência</li>
          </ul>
        </li>
      </ul>
      <h4>Ordem de execução</h4>
      <ol>
        <li>Corrigir a sinalização</li>
        <li>Trocar as lâmpadas</li>
        <li>Emitir o laudo</li>
      </ol>
      <table>
        <thead>
          <tr>
            <th>Área</th>
            <th>Situação</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Térreo</td>
            <td>Concluído</td>
            <td>01/03/2026</td>
          </tr>
          <tr>
            <td>Cobertura</td>
            <td>Em andamento</td>
            <td>15/04/2026</td>
          </tr>
        </tbody>
      </table>
      <p className="eds-prose-align-center">Parágrafo centralizado.</p>
      <p className="eds-prose-align-right">Parágrafo à direita.</p>
      <p className="eds-prose-align-justify">
        Parágrafo justificado: o texto se distribui por toda a largura da linha, e por isso precisa
        ser longo o bastante para quebrar em mais de uma linha e mostrar o efeito.
      </p>
      <p>
        Fontes: <span className="eds-prose-font-serif">com serifa para citações</span>,{' '}
        <span className="eds-prose-font-mono">monoespaçada para códigos 0042-7</span> e a padrão sem
        serifa.
      </p>
    </>
  );
}

function EditorBox({
  label,
  state = 'normal',
  rows,
  children,
  hint,
}: {
  label: string;
  state?: State;
  rows?: number;
  children?: ReactNode;
  hint?: string;
}) {
  const uid = useId();
  const labelId = `${uid}-l`;
  const contentId = `${uid}-c`;
  const errorId = `${uid}-e`;
  const disabled = state === 'disabled';
  const attrs: Record<string, string> = {};
  if (state === 'disabled') attrs['data-disabled'] = '';
  if (state === 'readonly') attrs['data-readonly'] = '';
  if (state === 'invalid') attrs['data-invalid'] = '';
  return (
    <div className="eds-field">
      <span className="eds-label" id={labelId}>
        {label}
      </span>
      <div
        className="eds-editor"
        data-preset="basic"
        style={rows ? ({ '--_editor-rows': rows } as CSSProperties) : undefined}
        {...attrs}
      >
        <Toolbar disabled={disabled} />
        <div
          className="eds-editor-content eds-prose"
          id={contentId}
          contentEditable={state === 'normal' || state === 'invalid' || state === 'empty'}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          aria-readonly={state === 'readonly' ? 'true' : undefined}
          aria-disabled={disabled ? 'true' : undefined}
          aria-invalid={state === 'invalid' ? 'true' : undefined}
          aria-describedby={state === 'invalid' ? errorId : undefined}
          tabIndex={disabled ? -1 : 0}
          data-empty={state === 'empty' ? '' : undefined}
          data-placeholder={state === 'empty' ? 'Descreva o que foi encontrado…' : undefined}
        >
          {state === 'empty' ? (
            <p>
              <br />
            </p>
          ) : (
            children
          )}
        </div>
      </div>
      {state === 'invalid' && (
        <p className="eds-error" id={errorId}>
          Informe a descrição com pelo menos um parágrafo.
        </p>
      )}
      {hint && <p className="eds-hint">{hint}</p>}
    </div>
  );
}

export function EditorDemo() {
  return (
    <section className="ed-section" aria-labelledby="ed-titulo">
      <h2 className="eds-text-h2" id="ed-titulo">
        Editor de conteúdo (Básico)
      </h2>
      <p>
        Markup estático: a barra, os estados e o <code>.eds-prose</code>. Sem ProseMirror aqui; o
        conteúdo é editável só para provar foco e rolagem.
      </p>

      <EditorBox label="Descrição (completo, 8 linhas)">
        <Sample />
      </EditorBox>

      <div className="ed-grid">
        <EditorBox label="Vazio com placeholder" state="empty" rows={4} />
        <EditorBox label="Inválido" state="invalid" rows={4}>
          <p>Texto curto demais.</p>
        </EditorBox>
        <EditorBox label="Somente leitura" state="readonly" rows={4}>
          <p>
            Este conteúdo <strong>não pode</strong> ser alterado, mas pode ser selecionado.
          </p>
        </EditorBox>
        <EditorBox label="Desabilitado" state="disabled" rows={4}>
          <p>Campo indisponível neste momento.</p>
        </EditorBox>
      </div>

      <h3 className="eds-text-h3">Mesmo HTML fora do editor</h3>
      <article className="eds-prose ed-article">
        <Sample />
      </article>
    </section>
  );
}
