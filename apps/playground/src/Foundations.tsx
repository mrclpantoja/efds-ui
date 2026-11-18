const colors = [
  { token: 'bg-page', name: 'Fundo da página' },
  { token: 'bg-surface', name: 'Superfície' },
  { token: 'bg-subtle', name: 'Fundo sutil' },
  { token: 'text-primary', name: 'Texto principal' },
  { token: 'text-secondary', name: 'Texto secundário' },
  { token: 'text-muted', name: 'Texto discreto' },
  { token: 'border-default', name: 'Borda padrão' },
  { token: 'border-strong', name: 'Borda forte' },
  { token: 'action-primary', name: 'Ação primária' },
  { token: 'focus-ring', name: 'Anel de foco' },
] as const;

const typeScale = [
  { cls: 'eds-text-display', label: 'Display' },
  { cls: 'eds-text-h1', label: 'H1' },
  { cls: 'eds-text-h2', label: 'H2' },
  { cls: 'eds-text-h3', label: 'H3' },
  { cls: 'eds-text-h4', label: 'H4' },
  { cls: 'eds-text-body-lg', label: 'Body Large' },
  { cls: 'eds-text-body', label: 'Body' },
  { cls: 'eds-text-label', label: 'Label' },
  { cls: 'eds-text-small', label: 'Small' },
] as const;

const spaces = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const radii = ['sm', 'md', 'lg', 'xl'] as const;
const shadows = ['xs', 'sm', 'md', 'lg'] as const;
const controls = ['sm', 'md', 'lg'] as const;

export function Foundations() {
  return (
    <section className="fnd" aria-labelledby="fnd-titulo">
      <h2 id="fnd-titulo" className="eds-text-h2">
        Fundações
      </h2>
      <p className="eds-text-body fnd-muted">
        Amostras renderizadas apenas com tokens. Troque os eixos acima para revisar tema, modo,
        densidade e forma.
      </p>

      <h3 className="eds-text-h3">Cor semântica</h3>
      <ul className="fnd-grid fnd-colors">
        {colors.map(({ token, name }) => (
          <li key={token} className="fnd-card">
            <span
              className="fnd-swatch"
              style={{ background: `var(--eds-color-${token})` }}
              aria-hidden="true"
            />
            <span className="eds-text-label">{name}</span>
            <code className="eds-text-small fnd-muted">--eds-color-{token}</code>
          </li>
        ))}
      </ul>

      <h3 className="eds-text-h3">Escala tipográfica</h3>
      <div className="fnd-card fnd-stack">
        {typeScale.map(({ cls, label }) => (
          <p key={cls} className={cls}>
            {label} — Relatório trimestral de operações
          </p>
        ))}
      </div>

      <h3 className="eds-text-h3">Espaçamento</h3>
      <ul className="fnd-card fnd-stack">
        {spaces.map((n) => (
          <li key={n} className="fnd-row">
            <code className="eds-text-small fnd-label">space-{n}</code>
            <span className="fnd-bar" style={{ inlineSize: `var(--eds-space-${n})` }} />
          </li>
        ))}
      </ul>

      <h3 className="eds-text-h3">Raios</h3>
      <ul className="fnd-grid fnd-small">
        {radii.map((r) => (
          <li key={r} className="fnd-item">
            <span className="fnd-box" style={{ borderRadius: `var(--eds-radius-${r})` }} />
            <code className="eds-text-small">radius-{r}</code>
          </li>
        ))}
      </ul>

      <h3 className="eds-text-h3">Sombras</h3>
      <ul className="fnd-grid fnd-small fnd-stage">
        {shadows.map((s) => (
          <li key={s} className="fnd-item">
            <span
              className="fnd-box fnd-box-raised"
              style={{ boxShadow: `var(--eds-shadow-${s})` }}
            />
            <code className="eds-text-small">shadow-{s}</code>
          </li>
        ))}
      </ul>

      <h3 className="eds-text-h3">Alturas de controle</h3>
      <ul className="fnd-card fnd-stack">
        {controls.map((c) => (
          <li key={c} className="fnd-row">
            <code className="eds-text-small fnd-label">control-height-{c}</code>
            <span
              className="fnd-control"
              style={{ minBlockSize: `var(--eds-control-height-${c})` }}
            >
              Campo de exemplo
            </span>
          </li>
        ))}
        <li className="fnd-row">
          <code className="eds-text-small fnd-label">table-row-height</code>
          <span className="fnd-control" style={{ minBlockSize: 'var(--eds-table-row-height)' }}>
            Linha de tabela
          </span>
        </li>
      </ul>
    </section>
  );
}
