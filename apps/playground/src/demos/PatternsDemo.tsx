/* O markup é o contrato HTML: o texto do label fica em spans aninhados (a regra não o enxerga) e a
   lista que rola leva tabindex por recomendação do contrato. */
/* eslint-disable jsx-a11y/label-has-associated-control, jsx-a11y/no-noninteractive-tabindex */
import type { ReactNode } from 'react';

/* Padrões vindos do template ERP: cartão de opção, disco de ícone, linha do tempo horizontal,
   Stepper como indicador de seções e sugestões do Lookup. O markup abaixo é o CONTRATO que o React
   reproduz (HTML cru e estático; as sugestões do Lookup ficam abertas no fluxo para inspeção). */

const section = { display: 'grid', gap: 'var(--eds-space-3)' } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={section}>
      <h3 className="eds-text-h4">{title}</h3>
      {children}
    </section>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const check = 'M5 12l5 5 9-10';

function OptionCards() {
  return (
    <Section title="Cartão de opção">
      <fieldset className="eds-fieldset">
        <legend className="eds-legend">Tipo de lançamento</legend>
        <div className="eds-option-cards">
          {[
            ['pagar', 'A pagar', 'Despesas, fornecedores e contas.', true, false],
            ['receber', 'A receber', 'Vendas, clientes e recebimentos.', false, false],
            ['transf', 'Transferência', 'Indisponível neste perfil.', false, true],
          ].map(([value, title, description, checked, disabled]) => (
            <label className="eds-option-card" key={String(value)}>
              <input
                type="radio"
                name="pt-tipo"
                value={String(value)}
                defaultChecked={Boolean(checked)}
                disabled={Boolean(disabled)}
              />
              <span className="eds-option-card-text">
                <span className="eds-option-card-title">{title}</span>
                <span className="eds-option-card-description">{description}</span>
              </span>
              <span className="eds-option-card-mark" aria-hidden="true">
                <Icon d={check} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="eds-fieldset">
        <legend className="eds-legend">Canais de aviso (checkbox, sem marca, com erro)</legend>
        <div className="eds-option-cards">
          <label className="eds-option-card">
            <input type="checkbox" name="pt-canal" value="email" defaultChecked />
            <span className="eds-option-card-text">
              <span className="eds-option-card-title">E-mail</span>
            </span>
          </label>
          <label className="eds-option-card">
            <input
              type="checkbox"
              name="pt-canal"
              value="app"
              aria-invalid="true"
              aria-describedby="pt-canal-erro"
            />
            <span className="eds-option-card-text">
              <span className="eds-option-card-title">Aplicativo</span>
              <span className="eds-option-card-description">Avisos no celular.</span>
            </span>
          </label>
        </div>
        <p className="eds-error" id="pt-canal-erro">
          Escolha ao menos um canal.
        </p>
      </fieldset>
    </Section>
  );
}

function IconDiscs() {
  const tones = ['accent', 'neutral', 'info', 'success', 'warning', 'danger'] as const;
  return (
    <Section title="Disco de ícone">
      <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-4">
        {tones.map((tone) => (
          <span className="eds-icon-disc" data-tone={tone} key={tone}>
            <Icon d="M12 8v5M12 17h.01" />
          </span>
        ))}
        <span className="eds-icon-disc eds-icon-disc-sm">
          <Icon d="M12 5v14M5 12h14" />
        </span>
        <span className="eds-icon-disc eds-icon-disc-lg eds-icon-disc-round" data-tone="info">
          <Icon d="M12 8h.01M11 12h1v5h1" />
        </span>
      </div>
      <h1 className="eds-page-title">
        <span className="eds-icon-disc">
          <Icon d="M4 7h16v12H4zM9 7V4h6v3" />
        </span>
        <span>Contas a pagar</span>
      </h1>
    </Section>
  );
}

function HorizontalTimeline() {
  const itens = [
    ['done', 'Parcela 1', '2026-09-10', '10/09/2026'],
    ['done', 'Parcela 2', '2026-10-10', '10/10/2026'],
    ['current', 'Parcela 3', '2026-11-10', '10/11/2026'],
    ['upcoming', 'Parcela 4', '2026-12-10', '10/12/2026'],
    ['upcoming', 'Parcela 5', '2027-01-10', '10/01/2027'],
    ['upcoming', 'Parcela 6', '2027-02-10', '10/02/2027'],
  ];
  return (
    <Section title="Linha do tempo horizontal">
      <ol
        className="eds-timeline eds-timeline-horizontal"
        aria-label="Vencimentos do contrato"
        tabIndex={0}
      >
        {itens.map(([state, title, iso, label]) => (
          <li className="eds-timeline-item" data-state={state} key={iso}>
            <span className="eds-timeline-marker" aria-hidden="true" />
            <div className="eds-timeline-content">
              <div className="eds-timeline-header">
                <span className="eds-timeline-title">{title}</span>
              </div>
              <time className="eds-timeline-time" dateTime={iso}>
                {label}
              </time>
              <p className="eds-timeline-text">R$ 1.250,00</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function StepperIndicator() {
  const secoes = [
    ['done', 'Dados', 'sec-dados'],
    ['current', 'Valores', 'sec-valores'],
    ['upcoming', 'Parcelas', 'sec-parcelas'],
    ['upcoming', 'Revisão', 'sec-revisao'],
  ];
  return (
    <Section title="Stepper como indicador de seções">
      <ol className="eds-stepper" aria-label="Seções do lançamento">
        {secoes.map(([state, label, id]) => (
          <li className="eds-stepper-item" data-state={state} key={id}>
            <span className="eds-stepper-marker" aria-hidden="true" />
            <span className="eds-stepper-label">
              <a
                className="eds-stepper-link"
                href={`#${id}`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {label}
                {state === 'done' ? (
                  <span className="eds-visually-hidden"> (concluída)</span>
                ) : null}
              </a>
            </span>
            {state === 'current' ? <span className="eds-stepper-summary">Seção 2 de 4</span> : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

function LookupSuggestions() {
  return (
    <Section title="Lookup com autocompletar (lista aberta no fluxo)">
      <div className="eds-field">
        <label className="eds-label" htmlFor="pt-lk">
          Cliente
        </label>
        <div className="eds-lookup">
          <input
            className="eds-input eds-lookup-code"
            id="pt-lk"
            defaultValue="00"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="pt-lk-lista"
            autoComplete="off"
          />
          <output className="eds-lookup-description" htmlFor="pt-lk" data-empty="true">
            —
          </output>
          <div
            className="eds-combobox-popup"
            style={{
              position: 'static',
              display: 'block',
              opacity: 1,
              inlineSize: '100%',
              minInlineSize: 0,
            }}
          >
            <ul
              className="eds-combobox-listbox"
              id="pt-lk-lista"
              role="listbox"
              aria-label="Sugestões de cliente"
            >
              <li className="eds-combobox-option" role="option" aria-selected="true">
                <span className="eds-combobox-option-code">0042</span>Cliente Exemplo Ltda
              </li>
              <li className="eds-combobox-option" role="option" aria-selected="false">
                <span className="eds-combobox-option-code">0107</span>Comercial Modelo S.A.
              </li>
              <li
                className="eds-combobox-option eds-combobox-option-create"
                role="option"
                aria-selected="false"
              >
                Cadastrar novo cliente…
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function PatternsDemo() {
  return (
    <div
      style={{ display: 'grid', gap: 'var(--eds-space-5)', marginBlockStart: 'var(--eds-space-7)' }}
    >
      <h2 className="eds-text-h2">Padrões do ERP</h2>
      <OptionCards />
      <IconDiscs />
      <HorizontalTimeline />
      <StepperIndicator />
      <LookupSuggestions />
    </div>
  );
}
