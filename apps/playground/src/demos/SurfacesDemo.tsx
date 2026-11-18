import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';

const section: CSSProperties = { display: 'grid', gap: 'var(--eds-space-4)' };
const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--eds-space-3)',
};
const muted: CSSProperties = { color: 'var(--eds-color-text-secondary)' };
const cols: CSSProperties = { display: 'grid', gap: 'var(--eds-space-4)' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={section}>
      <h3 className="eds-text-h3">{title}</h3>
      {children}
    </section>
  );
}

function CloseIcon() {
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
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Região rolável precisa ser focável por teclado (spread evita a regra de tabindex em elemento não interativo). */
/*
 * Comportamento dos dialogs (o React fará o equivalente):
 * - Backdrop: só fecha se pointerdown E click ocorreram no próprio <dialog>; arrastar uma
 *   seleção de texto de dentro para fora não fecha.
 * - Corpo rolável: tabindex=0 + role=region + aria-labelledby só quando há rolagem
 *   (scrollHeight > clientHeight); senão o corpo não recebe nada.
 */
function useDialogBehavior(refs: RefObject<HTMLDialogElement | null>[]) {
  useEffect(() => {
    const cleanups = refs.map((ref) => {
      const dialog = ref.current;
      if (!dialog) return () => {};
      let downOnDialog = false;
      const onDown = (event: Event) => {
        downOnDialog = event.target === dialog;
      };
      const onClick = (event: Event) => {
        if (downOnDialog && event.target === dialog) dialog.close();
        downOnDialog = false;
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('click', onClick);

      const body = dialog.querySelector<HTMLElement>('.eds-modal-body, .eds-drawer-body');
      const labelledby = dialog.getAttribute('aria-labelledby');
      const sync = () => {
        const scrolls = body !== null && body.scrollHeight > body.clientHeight;
        if (!body) return;
        if (scrolls) {
          body.tabIndex = 0;
          body.setAttribute('role', 'region');
          if (labelledby) body.setAttribute('aria-labelledby', labelledby);
        } else {
          body.removeAttribute('tabindex');
          body.removeAttribute('role');
          body.removeAttribute('aria-labelledby');
        }
      };
      const observer = new ResizeObserver(sync);
      if (body) observer.observe(body);
      return () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('click', onClick);
        observer.disconnect();
      };
    });
    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Foco inicial: o autoFocus do React só age na montagem (dialog ainda fechado), então o
 * campo marcado com data-autofocus recebe foco logo após showModal().
 */
const nativeAutofocus = { 'data-autofocus': '' };

function open(ref: RefObject<HTMLDialogElement | null>) {
  const dialog = ref.current;
  if (!dialog) return;
  dialog.showModal();
  dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
}

const projects = [
  {
    id: 'aurora',
    title: 'Projeto Aurora',
    text: 'Migração do módulo de faturamento para o novo fluxo de aprovação.',
    meta: '12 tarefas · prazo em 30/11',
  },
  {
    id: 'atlas',
    title: 'Projeto Atlas',
    text: 'Catálogo de fornecedores com revisão trimestral de contratos, histórico de preços e alertas de vencimento para a equipe de compras da unidade central.',
    meta: '8 tarefas · prazo em 15/12',
  },
  {
    id: 'bussola',
    title: 'Projeto Bússola',
    text: 'Painel de indicadores.',
    meta: '3 tarefas · prazo em 05/01',
  },
];

export function SurfacesDemo() {
  const novoRef = useRef<HTMLDialogElement>(null);
  const excluirRef = useRef<HTMLDialogElement>(null);
  const termosRef = useRef<HTMLDialogElement>(null);
  const filtrosRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  useDialogBehavior([novoRef, excluirRef, termosRef, filtrosRef, menuRef]);

  return (
    <div
      style={{ display: 'grid', gap: 'var(--eds-space-6)', marginBlockStart: 'var(--eds-space-7)' }}
    >
      <h2 className="eds-text-h2">Superfícies</h2>

      <Section title="Card: variantes">
        <div className="eds-grid eds-grid-auto">
          <article className="eds-card">
            <header className="eds-card-header">
              <h4 className="eds-card-title">Padrão</h4>
            </header>
            <div className="eds-card-body">
              Fundo de superfície, borda de 1px e raio médio. Sem sombra.
            </div>
          </article>

          <article className="eds-card eds-card-outlined">
            <header className="eds-card-header">
              <h4 className="eds-card-title">Contornado</h4>
            </header>
            <div className="eds-card-body">Borda mais forte, para separar áreas densas.</div>
          </article>

          <article className="eds-card eds-card-elevated">
            <header className="eds-card-header">
              <h4 className="eds-card-title">Elevado</h4>
              <div className="eds-card-actions">
                <button
                  type="button"
                  className="eds-button eds-button-ghost eds-button-sm eds-button-icon"
                  aria-label="Dispensar cartão"
                >
                  <CloseIcon />
                </button>
              </div>
            </header>
            <div className="eds-card-body">Sombra suave; a borda permanece no modo escuro.</div>
            <footer className="eds-card-footer">
              <button type="button" className="eds-button eds-button-secondary eds-button-sm">
                Detalhes
              </button>
            </footer>
          </article>

          <article className="eds-card eds-card-interactive">
            <header className="eds-card-header">
              <h4 className="eds-card-title">
                <a className="eds-card-link" href="#surfaces-card">
                  Interativo
                </a>
              </h4>
            </header>
            <div className="eds-card-body">
              O card inteiro é um link esticado. Passe o mouse ou use Tab.
            </div>
          </article>
        </div>
      </Section>

      <Section title="Card: grade com subgrid (header, corpo e rodapé alinhados)">
        <p style={muted}>
          Texto de tamanhos diferentes; os rodapés e os corpos ficam na mesma altura entre os cards.
        </p>
        <div className="eds-grid eds-grid-auto">
          {projects.map((p) => (
            <article key={p.id} className="eds-card eds-card-elevated eds-card-subgrid">
              <header className="eds-card-header">
                <h4 className="eds-card-title">{p.title}</h4>
              </header>
              <div className="eds-card-body">
                <p>{p.text}</p>
              </div>
              <footer className="eds-card-footer">
                <span className="eds-text-small" style={muted}>
                  {p.meta}
                </span>
              </footer>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Card: clicável (link esticado) com ação interna">
        <div className="eds-grid eds-grid-auto">
          <article className="eds-card eds-card-interactive">
            <header className="eds-card-header">
              <h4 className="eds-card-title">
                <a className="eds-card-link" href="#surfaces-relatorio">
                  Relatório mensal
                </a>
              </h4>
            </header>
            <div className="eds-card-body">Clique em qualquer área, exceto no botão abaixo.</div>
            <footer className="eds-card-footer">
              <button type="button" className="eds-button eds-button-secondary eds-button-sm">
                Baixar PDF
              </button>
            </footer>
          </article>
        </div>
      </Section>

      <Section title="Modal e Drawer">
        <div style={row}>
          <button
            type="button"
            className="eds-button eds-button-primary"
            onClick={() => open(novoRef)}
          >
            Novo projeto
          </button>
          <button
            type="button"
            className="eds-button eds-button-danger"
            onClick={() => open(excluirRef)}
          >
            Excluir projeto
          </button>
          <button
            type="button"
            className="eds-button eds-button-secondary"
            onClick={() => open(termosRef)}
          >
            Termos de uso (grande, rolável)
          </button>
          <button
            type="button"
            className="eds-button eds-button-secondary"
            onClick={() => open(filtrosRef)}
          >
            Filtros (drawer)
          </button>
          <button
            type="button"
            className="eds-button eds-button-tertiary"
            onClick={() => open(menuRef)}
          >
            Menu (drawer à esquerda)
          </button>
        </div>
      </Section>

      {/* Modal com formulário. Os botões do rodapé usam form= para pertencer ao formulário do corpo. */}
      <dialog ref={novoRef} className="eds-modal" aria-labelledby="m-novo-t">
        <header className="eds-modal-header">
          <h2 className="eds-modal-title" id="m-novo-t">
            Novo projeto
          </h2>
          <button
            type="submit"
            form="m-novo-f"
            formMethod="dialog"
            formNoValidate
            className="eds-button eds-button-ghost eds-button-icon"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="eds-modal-body">
          <form id="m-novo-f" method="dialog" style={cols}>
            <p className="eds-helper">* campo obrigatório</p>
            <div className="eds-field">
              <label className="eds-label" htmlFor="m-nome" data-required>
                Nome do projeto
              </label>
              <input
                id="m-nome"
                {...nativeAutofocus}
                className="eds-input"
                required
                placeholder="Ex.: Projeto Horizonte"
              />
            </div>
            <div className="eds-field">
              <label className="eds-label" htmlFor="m-dep" data-required>
                Departamento
              </label>
              <select id="m-dep" className="eds-select" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                <option>Compras</option>
                <option>Financeiro</option>
                <option>Tecnologia</option>
              </select>
            </div>
            <div className="eds-field">
              <label className="eds-label" htmlFor="m-desc">
                Descrição
              </label>
              <textarea
                id="m-desc"
                className="eds-textarea"
                aria-describedby="m-desc-h"
                placeholder="Objetivo e escopo"
              />
              <p className="eds-helper" id="m-desc-h">
                Máximo de 500 caracteres.
              </p>
            </div>
            <label className="eds-check">
              <input type="checkbox" className="eds-checkbox" defaultChecked />
              Notificar a equipe por e-mail
            </label>
          </form>
        </div>
        <footer className="eds-modal-footer">
          <button
            type="submit"
            form="m-novo-f"
            formMethod="dialog"
            formNoValidate
            className="eds-button eds-button-secondary"
          >
            Cancelar
          </button>
          <button type="submit" form="m-novo-f" className="eds-button eds-button-primary">
            Criar projeto
          </button>
        </footer>
      </dialog>

      {/* Modal pequeno de confirmação, sem formulário (form method=dialog no rodapé). */}
      <dialog
        ref={excluirRef}
        className="eds-modal eds-modal-sm"
        aria-labelledby="m-exc-t"
        aria-describedby="m-exc-d"
      >
        <header className="eds-modal-header">
          <h2 className="eds-modal-title" id="m-exc-t">
            Excluir projeto?
          </h2>
        </header>
        <div className="eds-modal-body" id="m-exc-d">
          O projeto Aurora e suas 12 tarefas serão removidos. Esta ação não pode ser desfeita.
        </div>
        <footer className="eds-modal-footer">
          <form method="dialog" style={row}>
            <button className="eds-button eds-button-secondary" value="cancelar">
              Cancelar
            </button>
            <button className="eds-button eds-button-danger" value="excluir">
              Excluir
            </button>
          </form>
        </footer>
      </dialog>

      {/* Modal grande com corpo rolável (tabindex para rolar por teclado). */}
      <dialog ref={termosRef} className="eds-modal eds-modal-lg" aria-labelledby="m-ter-t">
        <header className="eds-modal-header">
          <h2 className="eds-modal-title" id="m-ter-t">
            Termos de uso
          </h2>
          <form method="dialog">
            <button className="eds-button eds-button-ghost eds-button-icon" aria-label="Fechar">
              <CloseIcon />
            </button>
          </form>
        </header>
        <div className="eds-modal-body">
          <div style={cols}>
            {Array.from({ length: 14 }, (_, i) => (
              <p key={i}>
                {i + 1}. Cláusula fictícia de exemplo. O serviço é prestado conforme descrito neste
                documento, sem valor jurídico, apenas para demonstrar a rolagem do corpo do modal
                enquanto o cabeçalho e o rodapé permanecem visíveis.
              </p>
            ))}
          </div>
        </div>
        <footer className="eds-modal-footer">
          <form method="dialog" style={row}>
            <button className="eds-button eds-button-secondary">Recusar</button>
            <button className="eds-button eds-button-primary">Aceitar</button>
          </form>
        </footer>
      </dialog>

      {/* Drawer de filtros (borda final). */}
      <dialog ref={filtrosRef} className="eds-drawer" aria-labelledby="d-fil-t">
        <header className="eds-drawer-header">
          <h2 className="eds-drawer-title" id="d-fil-t">
            Filtros
          </h2>
          <button
            type="submit"
            form="d-fil-f"
            formMethod="dialog"
            formNoValidate
            className="eds-button eds-button-ghost eds-button-icon"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="eds-drawer-body">
          <form id="d-fil-f" method="dialog" style={cols}>
            <div className="eds-field">
              <label className="eds-label" htmlFor="d-busca">
                Buscar
              </label>
              <input id="d-busca" className="eds-input" placeholder="Nome ou código" />
            </div>
            <div className="eds-field">
              <label className="eds-label" htmlFor="d-dep">
                Departamento
              </label>
              <select id="d-dep" className="eds-select" defaultValue="">
                <option value="">Todos</option>
                <option>Compras</option>
                <option>Financeiro</option>
                <option>Tecnologia</option>
              </select>
            </div>
            <fieldset className="eds-fieldset">
              <legend className="eds-legend">Situação</legend>
              <label className="eds-check">
                <input type="checkbox" className="eds-checkbox" defaultChecked />
                Em andamento
              </label>
              <label className="eds-check">
                <input type="checkbox" className="eds-checkbox" />
                Concluído
              </label>
              <label className="eds-check">
                <input type="checkbox" className="eds-checkbox" />
                Arquivado
              </label>
            </fieldset>
            <fieldset className="eds-fieldset">
              <legend className="eds-legend">Prioridade</legend>
              <label className="eds-check">
                <input type="radio" name="d-prio" className="eds-radio" defaultChecked />
                Todas
              </label>
              <label className="eds-check">
                <input type="radio" name="d-prio" className="eds-radio" />
                Alta
              </label>
              <label className="eds-check">
                <input type="radio" name="d-prio" className="eds-radio" />
                Baixa
              </label>
            </fieldset>
            <label className="eds-check">
              <input type="checkbox" role="switch" className="eds-switch" />
              Somente meus projetos
            </label>
          </form>
        </div>
        <footer className="eds-drawer-footer">
          <button
            type="reset"
            form="d-fil-f"
            className="eds-button eds-button-tertiary"
            style={{ marginInlineEnd: 'auto' }}
          >
            Limpar
          </button>
          <button
            type="submit"
            form="d-fil-f"
            formMethod="dialog"
            formNoValidate
            className="eds-button eds-button-secondary"
          >
            Cancelar
          </button>
          <button type="submit" form="d-fil-f" className="eds-button eds-button-primary">
            Aplicar
          </button>
        </footer>
      </dialog>

      {/* Drawer na borda inicial (menu). */}
      <dialog ref={menuRef} className="eds-drawer eds-drawer-start" aria-labelledby="d-menu-t">
        <header className="eds-drawer-header">
          <h2 className="eds-drawer-title" id="d-menu-t">
            Menu
          </h2>
          <form method="dialog">
            <button className="eds-button eds-button-ghost eds-button-icon" aria-label="Fechar">
              <CloseIcon />
            </button>
          </form>
        </header>
        <div className="eds-drawer-body">
          <ul style={cols}>
            <li>
              <a href="#surfaces-inicio">Início</a>
            </li>
            <li>
              <a href="#surfaces-projetos">Projetos</a>
            </li>
            <li>
              <a href="#surfaces-relatorios">Relatórios</a>
            </li>
          </ul>
        </div>
      </dialog>
    </div>
  );
}
