import { Button, Stack } from '@eds-ui/react';

const colors = [
  ['bg-page', 'Fundo da página'],
  ['bg-surface', 'Superfície: cards e campos'],
  ['bg-subtle', 'Áreas sutis'],
  ['text-primary', 'Texto principal'],
  ['text-secondary', 'Texto secundário'],
  ['text-muted', 'Texto de apoio'],
  ['border-default', 'Borda decorativa'],
  ['border-strong', 'Borda de controle'],
  ['action-primary', 'Ação principal'],
  ['action-primary-subtle', 'Ação, fundo suave'],
  ['action-danger', 'Ação destrutiva'],
  ['status-info', 'Status: informação'],
  ['status-success', 'Status: sucesso'],
  ['status-warning', 'Status: atenção'],
  ['status-danger', 'Status: erro'],
  ['focus-ring', 'Anel de foco'],
] as const;

/** Amostras das cores semânticas: acompanham tema e modo (use o menu "Aparência"). */
export function ColorSwatches() {
  return (
    <ul className="docs-swatch-grid">
      {colors.map(([name, use]) => (
        <li key={name} className="docs-swatch">
          <span className={`docs-swatch-chip docs-sw-${name}`} aria-hidden="true" />
          <code>{`--eds-color-${name}`}</code>
          <span className="docs-muted">{use}</span>
        </li>
      ))}
    </ul>
  );
}

const spaces = [
  ['1', '4px'],
  ['2', '8px'],
  ['3', '12px'],
  ['4', '16px (acompanha a densidade)'],
  ['5', '24px'],
  ['6', '32px'],
  ['7', '40px'],
  ['8', '48px'],
  ['9', '64px'],
] as const;

/** Escala de espaço: uma barra com a largura de cada token. */
export function SpaceScale() {
  return (
    <ul className="docs-scale">
      {spaces.map(([step, value]) => (
        <li key={step} className="docs-scale-row">
          <span>
            <code>{`--eds-space-${step}`}</code>
          </span>
          <span className="docs-scale-track">
            <span className={`docs-scale-bar docs-space-${step}`} aria-hidden="true" />
            <span className="docs-muted eds-text-small">{value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const radii = ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const;

/** Escala de raio: acompanha o eixo de forma (use o menu "Aparência"). */
export function RadiusScale() {
  return (
    <ul className="docs-radius-list">
      {radii.map((step) => (
        <li key={step} className="docs-radius-item">
          <span className={`docs-radius-box docs-radius-${step}`} aria-hidden="true" />
          <code>{`--eds-radius-${step}`}</code>
        </li>
      ))}
    </ul>
  );
}

const themes = [
  ['blue', 'Azul'],
  ['green', 'Verde'],
  ['purple', 'Roxo'],
  ['orange', 'Laranja'],
  ['neutral', 'Neutro'],
] as const;

const modes = [
  ['light', 'Modo claro'],
  ['dark', 'Modo escuro'],
] as const;

/**
 * Os cinco temas lado a lado, nos dois modos: cada célula declara `data-theme` e `data-mode`.
 * O modo vai junto porque os tokens semânticos de cor são recalculados com ele; só o tema não
 * troca a cor de ação numa subárvore.
 */
export function ThemeGrid() {
  return (
    <Stack gap={4}>
      {modes.map(([mode, modeLabel]) => (
        <Stack key={mode} gap={2} as="section" aria-label={modeLabel}>
          <h3 className="eds-text-h4">{modeLabel}</h3>
          <ul className="docs-theme-grid">
            {themes.map(([theme, label]) => (
              <li key={theme} className="docs-theme-cell" data-theme={theme} data-mode={mode}>
                <span className="docs-theme-cell-chip" aria-hidden="true" />
                <Stack gap={2}>
                  <strong>{label}</strong>
                  <code>{`data-theme="${theme}"`}</code>
                </Stack>
                <Stack direction="row" wrap gap={2}>
                  <Button variant="primary" size="sm">
                    Confirmar
                  </Button>
                  <Button variant="secondary" size="sm">
                    Cancelar
                  </Button>
                </Stack>
              </li>
            ))}
          </ul>
        </Stack>
      ))}
    </Stack>
  );
}
