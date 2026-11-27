import './interaction-demo.css';
import type { ReactNode } from 'react';

/* Estados estáticos da Fase 6e (diálogos rápidos, Sortable, Tree). O markup abaixo é o CONTRATO
   que o JS (@efds-ui/behavior) gera/consome e que o React reproduz. Dados fictícios. */

function Frame({
  caption,
  children,
  wide,
}: {
  caption: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'id-frame id-frame-wide' : 'id-frame'}>
      <p className="id-caption">{caption}</p>
      {children}
    </div>
  );
}

/* ------------------------------ Diálogos rápidos ------------------------------ */

type Variant = 'info' | 'success' | 'warning' | 'danger' | 'question';

const glyphs: Record<Variant, string> = {
  success: 'M5 12.5l4.5 4.5L19 7.5',
  warning: 'M12 6v7.5M12 17.5v.01',
  danger: 'M12 6v7.5M12 17.5v.01',
  info: 'M12 11v6M12 7.5v.01',
  question: 'M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17.5v.01',
};

function QuickDialog({
  id,
  variant,
  title,
  text,
  ok,
  cancel,
  danger,
  prompt,
}: {
  id: string;
  variant: Variant;
  title?: string;
  text: string;
  ok: string;
  cancel?: string;
  danger?: boolean;
  prompt?: { value: string; error?: string };
}) {
  const alertish = variant === 'danger' || variant === 'warning';
  return (
    <div className="id-stage">
      <dialog
        open
        className={`eds-modal eds-alert-dialog${variant === 'info' || variant === 'question' ? '' : ` eds-alert-dialog-${variant}`}`}
        role={cancel && alertish ? 'alertdialog' : undefined}
        aria-labelledby={title ? `${id}-t` : `${id}-d`}
        aria-describedby={title ? `${id}-d` : undefined}
      >
        <div className="eds-alert-dialog-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d={glyphs[variant]} />
          </svg>
        </div>
        {title ? (
          <h2 className="eds-alert-dialog-title" id={`${id}-t`}>
            {variant === 'danger' ? <span className="eds-visually-hidden">Erro: </span> : null}
            {title}
          </h2>
        ) : null}
        <p className="eds-alert-dialog-text" id={`${id}-d`}>
          {text}
        </p>
        {prompt ? (
          <div className="eds-field">
            <label className="eds-visually-hidden" htmlFor={`${id}-i`}>
              {title}
            </label>
            <input
              className="eds-input"
              id={`${id}-i`}
              defaultValue={prompt.value}
              aria-invalid={prompt.error ? 'true' : undefined}
              aria-describedby={prompt.error ? `${id}-e` : undefined}
            />
            {prompt.error ? (
              <p className="eds-error" id={`${id}-e`}>
                {prompt.error}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="eds-alert-dialog-actions">
          {cancel ? (
            <button type="button" className="eds-button eds-button-secondary">
              {cancel}
            </button>
          ) : null}
          <button
            type="button"
            className={`eds-button ${danger ? 'eds-button-danger' : 'eds-button-primary'}`}
          >
            {ok}
          </button>
        </div>
      </dialog>
    </div>
  );
}

function Dialogs() {
  return (
    <section className="id-section" aria-labelledby="id-dialogs">
      <h3 className="eds-text-h3" id="id-dialogs">
        Diálogos rápidos
      </h3>
      <p>
        <code>EDS.alert</code>, <code>EDS.confirm</code> e <code>EDS.prompt</code> sobre o{' '}
        <code>.eds-modal</code>. Em tela estreita as ações empilham com a principal em cima.
      </p>
      <div className="id-grid">
        <Frame caption="alert · info">
          <QuickDialog
            id="id-d1"
            variant="info"
            title="Aviso"
            text="A conciliação roda todos os dias às 02h."
            ok="OK"
          />
        </Frame>
        <Frame caption="alert · success">
          <QuickDialog
            id="id-d2"
            variant="success"
            title="Pedido"
            text="Pedido salvo com sucesso."
            ok="OK"
          />
        </Frame>
        <Frame caption="confirm · warning">
          <QuickDialog
            id="id-d3"
            variant="warning"
            title="Atenção"
            text="O certificado digital vence em 7 dias. Renovar agora?"
            ok="Renovar"
            cancel="Agora não"
          />
        </Frame>
        <Frame caption="confirm · danger (sem título: o texto é o nome)">
          <QuickDialog
            id="id-d4"
            variant="danger"
            text="Excluir o pedido PED-0001? Esta ação não pode ser desfeita."
            ok="Excluir"
            cancel="Cancelar"
            danger
          />
        </Frame>
        <Frame caption="confirm · question">
          <QuickDialog
            id="id-d5"
            variant="question"
            title="Enviar"
            text="Enviar a nota fiscal ao cliente?"
            ok="Confirmar"
            cancel="Cancelar"
          />
        </Frame>
        <Frame caption="prompt · com erro de validação">
          <QuickDialog
            id="id-d6"
            variant="question"
            title="Salvar como"
            text="Nome do arquivo"
            ok="Salvar"
            cancel="Cancelar"
            prompt={{ value: '', error: 'Informe o nome do arquivo.' }}
          />
        </Frame>
      </div>
    </section>
  );
}

/* --------------------------------- Sortable --------------------------------- */

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M5 3a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 5 3Zm6 0a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 11 3ZM5 6.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm6 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM5 10.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm6 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
    </svg>
  );
}

function SItem({
  id,
  label,
  pressed,
  dragging,
  ghost,
  disabled,
  noHandle,
  grabbed,
}: {
  id: string;
  label: string;
  pressed?: boolean;
  dragging?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  noHandle?: boolean;
  grabbed?: boolean;
}) {
  return (
    <div
      className={`eds-sortable-item${ghost ? ' eds-sortable-ghost' : ''}`}
      data-id={id}
      data-dragging={dragging ? '' : undefined}
      data-grabbed={grabbed ? '' : undefined}
      data-eds-disabled={disabled ? '' : undefined}
    >
      {noHandle ? null : (
        <button
          type="button"
          className="eds-sortable-handle"
          aria-label={`Mover ${label}`}
          aria-describedby="eds-sortable-help"
          aria-pressed={pressed ? 'true' : undefined}
          disabled={disabled}
        >
          <GripIcon />
        </button>
      )}
      <span>{label}</span>
    </div>
  );
}

function Column({
  title,
  count,
  target,
  children,
}: {
  title: string;
  count: number;
  target?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="eds-sortable-column" aria-label={title}>
      <h4 className="eds-sortable-column-title">
        {title}
        <span className="eds-badge eds-badge-neutral">{count}</span>
      </h4>
      <div
        className="eds-sortable"
        data-eds-sortable=""
        data-eds-group="quadro"
        aria-label={title}
        data-drop-target={target ? '' : undefined}
      >
        {children}
      </div>
    </section>
  );
}

function SortableDemos() {
  return (
    <section className="id-section" aria-labelledby="id-sortable">
      <h3 className="eds-text-h3" id="id-sortable">
        Sortable
      </h3>
      <p id="eds-sortable-help" className="id-caption">
        Espaço pega o item; setas movem; Espaço solta; Esc cancela. (Na página real este texto fica
        oculto.)
      </p>
      <div className="id-grid">
        <Frame caption="Reordenando: o original some (display:none), o espaço reservado mostra o destino">
          <div className="id-stage">
            <div className="eds-sortable" data-eds-sortable="" aria-label="Prioridades">
              <SItem id="s1" label="Revisar contrato" />
              <div className="eds-sortable-placeholder" aria-hidden="true" />
              <SItem id="s2" label="Enviar proposta" dragging />
              <SItem id="s3" label="Agendar reunião" />
            </div>
          </div>
        </Frame>
        <Frame caption="Fantasma sob o ponteiro (sombra, borda de ação)">
          <div className="id-stage">
            <SItem id="s2g" label="Enviar proposta" ghost />
          </div>
        </Frame>
        <Frame caption="Pego pelo teclado: handle com aria-pressed, item sem handle com data-grabbed, e um desativado">
          <div className="id-stage">
            <div className="eds-sortable" data-eds-sortable="" aria-label="Rotina">
              <SItem id="s4" label="Conferir estoque" pressed />
              <SItem id="s5" label="Fechar caixa" disabled />
              <SItem id="s6" label="Sem pegador, pego (data-grabbed)" noHandle grabbed />
            </div>
          </div>
        </Frame>
        <Frame caption="Horizontal">
          <div className="id-stage">
            <div
              className="eds-sortable"
              data-eds-sortable=""
              data-eds-orientation="horizontal"
              aria-label="Etapas"
            >
              <SItem id="h1" label="Rascunho" />
              <SItem id="h2" label="Análise" />
              <SItem id="h3" label="Aprovado" />
            </div>
          </div>
        </Frame>
        <Frame caption="Grade (4 setas)" wide>
          <div className="id-stage">
            <div
              className="eds-sortable"
              data-eds-sortable=""
              data-eds-orientation="grid"
              aria-label="Atalhos"
            >
              <SItem id="g1" label="Pedidos" />
              <SItem id="g2" label="Clientes" />
              <SItem id="g3" label="Estoque" />
              <SItem id="g4" label="Relatórios" />
            </div>
          </div>
        </Frame>
      </div>
      <h4 className="eds-text-h4">Quadro com 3 colunas (a coluna do meio é o alvo)</h4>
      <div className="eds-sortable-board">
        <Column title="A fazer" count={2}>
          <SItem id="t1" label="Revisar contrato" />
          <SItem id="t2" label="Cadastrar fornecedor" />
        </Column>
        <Column title="Fazendo" count={1} target>
          <SItem id="t3" label="Conciliar extrato" />
          <div className="eds-sortable-placeholder" aria-hidden="true" />
        </Column>
        <Column title="Feito" count={0}>
          {null}
        </Column>
      </div>
    </section>
  );
}

/* ----------------------------------- Tree ----------------------------------- */

type DropMark = 'before' | 'inside' | 'after' | 'invalid';

type TNode = {
  id: string;
  label: string;
  level: number;
  pos: number;
  size: number;
  expanded?: boolean;
  selected?: boolean;
  focus?: boolean;
  editing?: boolean;
  drop?: DropMark;
  busy?: boolean;
  disabled?: boolean;
  icon?: boolean;
  menu?: boolean;
  children?: ReactNode;
};

function FolderIcon() {
  return (
    <svg className="eds-tree-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M1.5 4A1.5 1.5 0 0 1 3 2.5h2.6c.4 0 .8.2 1.1.5L7.5 4H13A1.5 1.5 0 0 1 14.5 5.500v6.500A1.500 1.500 0 0 1 13 13.500H3A1.500 1.500 0 0 1 1.500 12V4Z" />
    </svg>
  );
}

function MenuPopover({ anchorId, menuId }: { anchorId: string; menuId: string }) {
  const items = [
    'Adicionar filho',
    'Adicionar irmão',
    'Adicionar pai',
    'Renomear',
    'Mover para cima',
    'Mover para baixo',
    'Recuar nível',
    'Avançar nível',
  ];
  return (
    <div id={menuId} className="eds-dropdown id-menu-open" role="group" aria-labelledby={anchorId}>
      {items.map((item) => (
        <button key={item} type="button" className="eds-dropdown-item">
          {item}
        </button>
      ))}
      <hr className="eds-dropdown-separator" />
      <button type="button" className="eds-dropdown-item eds-dropdown-item-danger">
        Excluir
      </button>
    </div>
  );
}

function TNodeView(n: TNode) {
  const hasChildren = n.expanded !== undefined;
  const actionId = `tree-act-${n.id}`;
  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? n.expanded : undefined}
      aria-level={n.level}
      aria-setsize={n.size}
      aria-posinset={n.pos}
      aria-selected={n.selected ? 'true' : undefined}
      aria-disabled={n.disabled ? 'true' : undefined}
      aria-busy={n.busy ? 'true' : undefined}
      data-id={n.id}
      tabIndex={n.selected || n.focus ? 0 : -1}
      className={n.focus ? 'id-focus' : undefined}
    >
      <div
        className="eds-tree-row"
        data-drop-target={n.drop && n.drop !== 'invalid' ? n.drop : undefined}
        data-drop-invalid={n.drop === 'invalid' ? '' : undefined}
      >
        <span className="eds-tree-toggle" aria-hidden="true" />
        {n.icon ? <FolderIcon /> : null}
        {n.editing ? (
          <input
            className="eds-input eds-input-sm"
            aria-label={`Renomear ${n.label}`}
            defaultValue={n.label}
          />
        ) : (
          <span className="eds-tree-label">{n.label}</span>
        )}
        <span className="eds-tree-actions">
          <button
            type="button"
            id={actionId}
            className="eds-tree-action"
            tabIndex={-1}
            aria-label={`Ações de ${n.label}`}
            aria-expanded={n.menu ? 'true' : undefined}
            aria-controls={n.menu ? `${actionId}-menu` : undefined}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M3 6.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm5 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm5 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
            </svg>
          </button>
        </span>
      </div>
      {n.children ? <ul role="group">{n.children}</ul> : null}
      {n.menu ? <MenuPopover anchorId={actionId} menuId={`${actionId}-menu`} /> : null}
    </li>
  );
}

function Tree({
  label,
  editable,
  children,
}: {
  label: string;
  editable?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="eds-tree"
      data-eds-tree=""
      data-eds-editable={editable ? '' : undefined}
      aria-label={label}
    >
      <ul role="tree" aria-label={label}>
        {children}
      </ul>
    </div>
  );
}

function TreeDemos() {
  return (
    <section className="id-section" aria-labelledby="id-tree">
      <h3 className="eds-text-h3" id="id-tree">
        Tree
      </h3>
      <div className="id-grid">
        <Frame caption="Níveis, expandido/recolhido, folha, selecionado, foco, desativado, carregando">
          <Tree label="Estrutura organizacional" editable>
            <TNodeView id="n1" label="Diretoria Fictícia" level={1} pos={1} size={2} expanded icon>
              <TNodeView
                id="n2"
                label="Sede Modelo"
                level={2}
                pos={1}
                size={3}
                expanded
                selected
                icon
              >
                <TNodeView id="n3" label="Financeiro de Exemplo" level={3} pos={1} size={2} focus />
                <TNodeView id="n4" label="Compras" level={3} pos={2} size={2} />
              </TNodeView>
              <TNodeView
                id="n5"
                label="Filial Teste"
                level={2}
                pos={2}
                size={3}
                expanded={false}
                icon
              />
              <TNodeView
                id="n6"
                label="Unidade em carga"
                level={2}
                pos={3}
                size={3}
                expanded={false}
                busy
              />
            </TNodeView>
            <TNodeView id="n7" label="Conselho (desativado)" level={1} pos={2} size={2} disabled />
          </Tree>
        </Frame>
        <Frame caption="Edição inline (F2) e ações visíveis na linha selecionada">
          <Tree label="Categorias" editable>
            <TNodeView id="c1" label="Produtos" level={1} pos={1} size={1} expanded>
              <TNodeView id="c2" label="Papelaria" level={2} pos={1} size={2} editing />
              <TNodeView
                id="c3"
                label="Escritório com um nome bastante longo para quebrar linha"
                level={2}
                pos={2}
                size={2}
                selected
              />
            </TNodeView>
          </Tree>
        </Frame>
        <Frame caption="Menu de ações aberto (aria-expanded no botão ⋯)">
          <div className="id-menu-space">
            <Tree label="Projetos" editable>
              <TNodeView id="m1" label="Projeto Aurora" level={1} pos={1} size={1} expanded>
                <TNodeView id="m2" label="Fase 1" level={2} pos={1} size={1} selected menu />
              </TNodeView>
            </Tree>
          </div>
        </Frame>
        <Frame caption="Indicadores de soltar: antes, dentro, depois e proibido (data-drop-target / data-drop-invalid)">
          <Tree label="Arrastando" editable>
            <TNodeView
              id="d1"
              label="Antes (linha acima)"
              level={1}
              pos={1}
              size={5}
              drop="before"
            />
            <TNodeView
              id="d2"
              label="Dentro (contorno)"
              level={1}
              pos={2}
              size={5}
              expanded
              drop="inside"
            >
              <TNodeView id="d3" label="Filho" level={2} pos={1} size={1} />
            </TNodeView>
            <TNodeView
              id="d4"
              label="Depois (linha abaixo)"
              level={1}
              pos={3}
              size={5}
              drop="after"
            />
            <TNodeView id="d5" label="Origem do arrasto" level={1} pos={4} size={5} expanded>
              <TNodeView
                id="d6"
                label="Descendente: proibido"
                level={2}
                pos={1}
                size={1}
                drop="invalid"
              />
            </TNodeView>
          </Tree>
        </Frame>
      </div>
    </section>
  );
}

export function InteractionDemo() {
  return (
    <section aria-labelledby="id-titulo">
      <h2 className="eds-text-h2" id="id-titulo">
        Interação: diálogos, Sortable e Tree
      </h2>
      <Dialogs />
      <SortableDemos />
      <TreeDemos />
    </section>
  );
}
