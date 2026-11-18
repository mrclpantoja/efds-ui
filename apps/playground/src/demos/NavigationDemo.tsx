import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

/** Coluna com minmax(0, 1fr): sem isso o conteúdo largo estica a grade e causa rolagem horizontal. */
const grid = (gap: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap,
});

const tabs = [
  { id: 'info', label: 'Informações', body: 'Dados cadastrais de Ana Souza (registro fictício).' },
  { id: 'perm', label: 'Permissões', body: 'Perfis e escopos de acesso concedidos ao usuário.' },
  { id: 'hist', label: 'Histórico', body: 'Alterações recentes, da mais nova para a mais antiga.' },
  { id: 'audit', label: 'Auditoria', body: 'Indisponível.', disabled: true },
] as const;

/**
 * Referência do contrato de teclado: roving tabindex, setas (com volta), Home/End.
 * Foco e seleção são estados distintos: a aba aria-disabled recebe foco pelas setas (padrão APG),
 * mas não é ativada.
 */
function Tabs({ label, fill }: { label: string; fill?: boolean }) {
  const [active, setActive] = useState<string>(tabs[0].id);
  const [focused, setFocused] = useState<string>(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function move(id: string) {
    refs.current[id]?.focus();
    const target = tabs.find((t) => t.id === id);
    if (target && !('disabled' in target)) setActive(id);
  }

  function onKeyDown(event: KeyboardEvent) {
    const index = tabs.findIndex((t) => t.id === focused);
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    const target = next === undefined ? undefined : tabs[next];
    if (!target) return;
    event.preventDefault();
    move(target.id);
  }

  const prefix = fill ? 'fill' : 'std';
  return (
    <div className={fill ? 'eds-tabs eds-tabs-fill' : 'eds-tabs'}>
      <div className="eds-tablist" role="tablist" aria-label={label}>
        {tabs.map((tab) => {
          const disabled = 'disabled' in tab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[tab.id] = el;
              }}
              type="button"
              className="eds-tab"
              role="tab"
              id={`${prefix}-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`${prefix}-panel-${tab.id}`}
              tabIndex={focused === tab.id ? 0 : -1}
              aria-disabled={disabled || undefined}
              onFocus={() => setFocused(tab.id)}
              onClick={() => {
                if (!disabled) setActive(tab.id);
              }}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="eds-tabpanel"
          role="tabpanel"
          id={`${prefix}-panel-${tab.id}`}
          aria-labelledby={`${prefix}-tab-${tab.id}`}
          tabIndex={0}
          hidden={active !== tab.id}
        >
          {tab.body}
        </div>
      ))}
    </div>
  );
}

export function NavigationDemo() {
  return (
    <section style={grid('var(--eds-space-5)')}>
      <h2 className="eds-text-h2">Navegação</h2>

      <div style={grid('var(--eds-space-3)')}>
        <h3 className="eds-text-h3">Tabs</h3>
        <Tabs label="Dados do usuário" />
        <h4 className="eds-text-h4">Abas na largura (eds-tabs-fill)</h4>
        <Tabs label="Dados do usuário (largura total)" fill />
      </div>

      <div style={grid('var(--eds-space-3)')}>
        <h3 className="eds-text-h3">Breadcrumb</h3>
        <nav className="eds-breadcrumb" aria-label="Trilha">
          <ol className="eds-breadcrumb-list">
            <li className="eds-breadcrumb-item">
              <a href="#dashboard">Dashboard</a>
            </li>
            <li className="eds-breadcrumb-item">
              <a href="#usuarios">Usuários</a>
            </li>
            <li className="eds-breadcrumb-item">
              <a href="#ana" aria-current="page">
                Ana Souza
              </a>
            </li>
          </ol>
        </nav>
        <p className="eds-text-small">Trilha longa (quebra de linha em telas estreitas):</p>
        <nav className="eds-breadcrumb" aria-label="Trilha longa">
          <ol className="eds-breadcrumb-list">
            <li className="eds-breadcrumb-item">
              <a href="#inicio">Início</a>
            </li>
            <li className="eds-breadcrumb-item">
              <a href="#organizacao">Organização e estrutura administrativa</a>
            </li>
            <li className="eds-breadcrumb-item">
              <a href="#departamentos">Departamentos e coordenadorias regionais</a>
            </li>
            <li className="eds-breadcrumb-item">
              <a href="#equipe">Equipe de atendimento ao cidadão</a>
            </li>
            <li className="eds-breadcrumb-item">
              <span aria-current="page">
                Configurações de notificações e preferências de comunicação da equipe
                supercalifragilisticexpialidosamente-longa
              </span>
            </li>
          </ol>
        </nav>
      </div>
    </section>
  );
}
