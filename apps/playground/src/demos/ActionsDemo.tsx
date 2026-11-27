import { useState, type CSSProperties, type ReactNode } from 'react';

const variants = ['primary', 'secondary', 'tertiary', 'ghost', 'danger'] as const;
const sizes = [
  { key: 'sm', cls: ' eds-button-sm', label: 'Pequeno' },
  { key: 'md', cls: '', label: 'Médio' },
  { key: 'lg', cls: ' eds-button-lg', label: 'Grande' },
] as const;
const variantLabel = {
  primary: 'Salvar',
  secondary: 'Cancelar',
  tertiary: 'Mais opções',
  ghost: 'Ver detalhes',
  danger: 'Excluir',
} as const;

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--eds-space-3)',
};
const section: CSSProperties = { display: 'grid', gap: 'var(--eds-space-3)' };

function Icon({ d }: { d: string }) {
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
      <path d={d} />
    </svg>
  );
}

const iconPlus = 'M12 5v14M5 12h14';
const iconDownload = 'M12 3v12m0 0l-4-4m4 4l4-4M5 21h14';
const iconEdit = 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z';
const iconTrash = 'M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={section}>
      <h3 className="eds-text-h3">{title}</h3>
      {children}
    </section>
  );
}

function Menu({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="eds-button eds-button-secondary"
        id={`${id}-gatilho`}
        popoverTarget={id}
        aria-expanded={open}
      >
        {label}
      </button>
      <div
        id={id}
        className="eds-dropdown"
        aria-labelledby={`${id}-gatilho`}
        popover="auto"
        onToggle={(event) => setOpen(event.currentTarget.matches(':popover-open'))}
      >
        <button
          type="button"
          className="eds-dropdown-item"
          popoverTarget={id}
          popoverTargetAction="hide"
        >
          <Icon d={iconEdit} />
          Editar pedido
        </button>
        <button
          type="button"
          className="eds-dropdown-item"
          popoverTarget={id}
          popoverTargetAction="hide"
        >
          <Icon d={iconDownload} />
          Exportar PDF
        </button>
        <button type="button" className="eds-dropdown-item" aria-disabled="true">
          Duplicar (indisponível)
        </button>
        <hr className="eds-dropdown-separator" />
        <button
          type="button"
          className="eds-dropdown-item eds-dropdown-item-danger"
          popoverTarget={id}
          popoverTargetAction="hide"
        >
          <Icon d={iconTrash} />
          Excluir pedido
        </button>
      </div>
    </>
  );
}

export function ActionsDemo() {
  return (
    <div style={{ display: 'grid', gap: 'var(--eds-space-6)' }}>
      <h2 className="eds-text-h2">Actions</h2>

      <Section title="Button: variantes e tamanhos">
        {sizes.map((size) => (
          <div key={size.key} style={row}>
            <span style={{ inlineSize: '5rem' }}>{size.label}</span>
            {variants.map((variant) => (
              <button
                key={variant}
                type="button"
                className={`eds-button eds-button-${variant}${size.cls}`}
              >
                {variantLabel[variant]}
              </button>
            ))}
          </div>
        ))}
      </Section>

      <Section title="Ícone e texto">
        <div style={row}>
          {sizes.map((size) => (
            <button
              key={size.key}
              type="button"
              className={`eds-button eds-button-primary${size.cls}`}
            >
              <Icon d={iconPlus} />
              Novo cliente
            </button>
          ))}
          <button type="button" className="eds-button eds-button-secondary">
            Baixar relatório
            <Icon d={iconDownload} />
          </button>
        </div>
      </Section>

      <Section title="Somente ícone (com aria-label)">
        <div style={row}>
          {sizes.map((size) => (
            <button
              key={size.key}
              type="button"
              className={`eds-button eds-button-secondary eds-button-icon${size.cls}`}
              aria-label="Adicionar item"
            >
              <Icon d={iconPlus} />
            </button>
          ))}
          <button
            type="button"
            className="eds-button eds-button-ghost eds-button-icon"
            aria-label="Editar"
          >
            <Icon d={iconEdit} />
          </button>
          <button
            type="button"
            className="eds-button eds-button-danger eds-button-icon"
            aria-label="Excluir"
          >
            <Icon d={iconTrash} />
          </button>
        </div>
      </Section>

      <Section title="Loading (aria-busy) e desabilitado">
        <div style={row}>
          {variants.map((variant) => (
            <button
              key={variant}
              type="button"
              className={`eds-button eds-button-${variant}`}
              aria-busy="true"
            >
              {variantLabel[variant]}
            </button>
          ))}
        </div>
        <div style={row}>
          {variants.map((variant) => (
            <button
              key={variant}
              type="button"
              className={`eds-button eds-button-${variant}`}
              disabled
            >
              {variantLabel[variant]}
            </button>
          ))}
          <button type="button" className="eds-button eds-button-secondary" aria-disabled="true">
            aria-disabled
          </button>
        </div>
      </Section>

      <Section title="Resultado do envio (data-state)">
        {(['success', 'error'] as const).map((state) => (
          <div key={state} style={row}>
            {variants.map((variant) => (
              <button
                key={variant}
                type="button"
                className={`eds-button eds-button-${variant}`}
                data-state={state}
              >
                {state === 'success' ? 'Salvo' : 'Falhou'}
              </button>
            ))}
            <button
              type="button"
              className="eds-button eds-button-primary"
              data-state={state}
              disabled
            >
              Desabilitado
            </button>
          </div>
        ))}
      </Section>

      <Section title="Link como botão">
        <div style={row}>
          <a className="eds-button eds-button-primary" href="#ver-contratos">
            Ver contratos
          </a>
          <a className="eds-button eds-button-secondary" href="#ver-contratos">
            <Icon d={iconDownload} />
            Baixar contrato
          </a>
          <a
            className="eds-button eds-button-tertiary"
            href="#ver-contratos"
            aria-disabled="true"
            tabIndex={-1}
          >
            Link desabilitado
          </a>
        </div>
      </Section>

      <Section title="Button Group">
        <div style={row}>
          <div className="eds-button-group" role="group" aria-label="Período do relatório">
            <button type="button" className="eds-button eds-button-secondary">
              Dia
            </button>
            <button type="button" className="eds-button eds-button-secondary">
              Semana
            </button>
            <button type="button" className="eds-button eds-button-secondary">
              Mês
            </button>
          </div>
          <div className="eds-button-group" role="group" aria-label="Ações do documento">
            <button type="button" className="eds-button eds-button-primary">
              Salvar
            </button>
            <button type="button" className="eds-button eds-button-primary">
              Salvar e fechar
            </button>
          </div>
          <div className="eds-button-group" role="group" aria-label="Edição">
            <button type="button" className="eds-button eds-button-tertiary eds-button-sm">
              Anterior
            </button>
            <button type="button" className="eds-button eds-button-tertiary eds-button-sm">
              Próximo
            </button>
          </div>
          <div className="eds-button-group" role="group" aria-label="Formatação">
            <button
              type="button"
              className="eds-button eds-button-secondary eds-button-icon"
              aria-label="Editar"
            >
              <Icon d={iconEdit} />
            </button>
            <button
              type="button"
              className="eds-button eds-button-secondary eds-button-icon"
              aria-label="Baixar"
            >
              <Icon d={iconDownload} />
            </button>
            <button
              type="button"
              className="eds-button eds-button-danger eds-button-icon"
              aria-label="Excluir"
            >
              <Icon d={iconTrash} />
            </button>
          </div>
        </div>
      </Section>

      <Section title="Dropdown">
        <div style={row}>
          <Menu id="menu-pedido" label="Ações do pedido" />
          <div className="eds-button-group" role="group" aria-label="Salvar com opções">
            <button type="button" className="eds-button eds-button-primary">
              Salvar
            </button>
            <GroupMenu />
          </div>
        </div>
        <p className="eds-text-small" style={{ color: 'var(--eds-color-text-muted)' }}>
          Esc fecha e devolve o foco ao gatilho. Navegação por setas: pendente.
        </p>
      </Section>
    </div>
  );
}

function GroupMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="eds-button eds-button-primary eds-button-icon"
        id="menu-salvar-gatilho"
        popoverTarget="menu-salvar"
        aria-expanded={open}
        aria-label="Mais opções de salvar"
      />
      <div
        id="menu-salvar"
        className="eds-dropdown"
        aria-labelledby="menu-salvar-gatilho"
        popover="auto"
        onToggle={(event) => setOpen(event.currentTarget.matches(':popover-open'))}
      >
        <button
          type="button"
          className="eds-dropdown-item"
          popoverTarget="menu-salvar"
          popoverTargetAction="hide"
        >
          Salvar como rascunho
        </button>
        <button
          type="button"
          className="eds-dropdown-item"
          popoverTarget="menu-salvar"
          popoverTargetAction="hide"
        >
          Salvar e criar outro
        </button>
      </div>
    </>
  );
}
