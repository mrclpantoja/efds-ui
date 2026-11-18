import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

const section: CSSProperties = {
  display: 'grid',
  gap: 'var(--eds-space-4)',
  padding: 'var(--eds-space-5)',
  border: '1px solid var(--eds-color-border-default)',
  borderRadius: 'var(--eds-radius-lg)',
  background: 'var(--eds-color-bg-surface)',
};
const cols: CSSProperties = {
  display: 'grid',
  gap: 'var(--eds-space-4)',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))',
};
const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--eds-space-3)',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={section}>
      <h3 className="eds-text-h4">{title}</h3>
      {children}
    </section>
  );
}

export function FormsDemo() {
  const indeterminate = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (indeterminate.current) indeterminate.current.indeterminate = true;
  }, []);

  return (
    <div
      style={{ display: 'grid', gap: 'var(--eds-space-5)', marginBlockStart: 'var(--eds-space-7)' }}
    >
      <h2 className="eds-text-h2">Formulários</h2>
      <p className="eds-helper">* campo obrigatório</p>

      <Section title="Estados do campo de texto">
        <div style={cols}>
          <div className="eds-field">
            <label className="eds-label" htmlFor="f-nome" data-required>
              Nome completo
            </label>
            <input
              id="f-nome"
              className="eds-input"
              required
              autoComplete="name"
              aria-describedby="f-nome-h"
              placeholder="Ex.: Maria Exemplo"
            />
            <p className="eds-helper" id="f-nome-h">
              Como consta no documento.
            </p>
          </div>

          <div className="eds-field">
            <label className="eds-label" htmlFor="f-email">
              E-mail (erro)
            </label>
            <input
              id="f-email"
              className="eds-input"
              type="email"
              autoComplete="email"
              inputMode="email"
              defaultValue="maria.exemplo@"
              aria-invalid="true"
              aria-describedby="f-email-e"
            />
            <p className="eds-error" id="f-email-e">
              Informe um e-mail válido, como nome@exemplo.com.br.
            </p>
          </div>

          <div className="eds-field">
            <label className="eds-label" htmlFor="f-cod">
              Código (sucesso)
            </label>
            <input
              id="f-cod"
              className="eds-input"
              defaultValue="PRJ-0042"
              data-valid="true"
              aria-describedby="f-cod-s"
            />
            <p className="eds-success" id="f-cod-s">
              Código disponível.
            </p>
          </div>

          <div className="eds-field">
            <label className="eds-label" htmlFor="f-ro">
              Matrícula (somente leitura)
            </label>
            <input id="f-ro" className="eds-input" defaultValue="000123" readOnly />
          </div>

          <div className="eds-field">
            <label className="eds-label" htmlFor="f-dis">
              Setor (desabilitado)
            </label>
            <input id="f-dis" className="eds-input" defaultValue="Financeiro" disabled />
          </div>

          <div className="eds-field">
            <label className="eds-label" htmlFor="f-focus">
              Clique para ver o foco
            </label>
            <input id="f-focus" className="eds-input" placeholder="Digite algo" />
          </div>
        </div>
      </Section>

      <Section title="Tamanhos (Input, Select e botão nativo lado a lado)">
        {(['sm', '', 'lg'] as const).map((size) => (
          <div key={size || 'md'} style={{ ...row, alignItems: 'flex-end' }}>
            <div className="eds-field" style={{ flex: '1 1 10rem' }}>
              <label className="eds-label" htmlFor={`t-i-${size}`}>
                Input {size || 'md'}
              </label>
              <input
                id={`t-i-${size}`}
                className={`eds-input${size ? ` eds-input-${size}` : ''}`}
                defaultValue="Texto"
              />
            </div>
            <div className="eds-field" style={{ flex: '1 1 10rem' }}>
              <label className="eds-label" htmlFor={`t-s-${size}`}>
                Select {size || 'md'}
              </label>
              <select
                id={`t-s-${size}`}
                className={`eds-select${size ? ` eds-select-${size}` : ''}`}
                defaultValue="b"
              >
                <option value="a">Opção A</option>
                <option value="b">Opção B</option>
              </select>
            </div>
            <button
              type="button"
              className={`eds-button eds-button-secondary${size ? ` eds-button-${size}` : ''}`}
            >
              Botão {size || 'md'}
            </button>
          </div>
        ))}
      </Section>

      <Section title="Textarea e Select">
        <div style={cols}>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-obs">
              Observações
            </label>
            <textarea
              id="x-obs"
              className="eds-textarea"
              aria-describedby="x-obs-h"
              placeholder="Detalhes adicionais"
            />
            <p className="eds-helper" id="x-obs-h">
              Máximo de 500 caracteres.
            </p>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-just">
              Justificativa (erro)
            </label>
            <textarea
              id="x-just"
              className="eds-textarea"
              aria-invalid="true"
              aria-describedby="x-just-e"
              defaultValue=""
            />
            <p className="eds-error" id="x-just-e">
              A justificativa é obrigatória.
            </p>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-ro">
              Texto (somente leitura)
            </label>
            <textarea id="x-ro" className="eds-textarea" readOnly defaultValue="Conteúdo fixo." />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-dis">
              Texto (desabilitado)
            </label>
            <textarea id="x-dis" className="eds-textarea" disabled defaultValue="Indisponível." />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-sel" data-required>
              Departamento
            </label>
            <select id="x-sel" className="eds-select" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              <option>Compras</option>
              <option>Financeiro</option>
              <option>Tecnologia</option>
            </select>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-sel-e">
              Prioridade (erro)
            </label>
            <select
              id="x-sel-e"
              className="eds-select"
              aria-invalid="true"
              aria-describedby="x-sel-e-e"
              defaultValue=""
            >
              <option value="">Selecione</option>
              <option>Alta</option>
              <option>Baixa</option>
            </select>
            <p className="eds-error" id="x-sel-e-e">
              Escolha uma prioridade.
            </p>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-sel-ok">
              Unidade (sucesso)
            </label>
            <select id="x-sel-ok" className="eds-select" data-valid="true" defaultValue="1">
              <option value="1">Unidade Central</option>
            </select>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="x-sel-d">
              Região (desabilitado)
            </label>
            <select id="x-sel-d" className="eds-select" disabled>
              <option>Sudeste</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Checkbox, Radio e Switch">
        <div style={cols}>
          <fieldset className="eds-fieldset" aria-describedby="g-notif-h">
            <legend className="eds-legend">Notificações</legend>
            <label className="eds-check">
              <input type="checkbox" className="eds-checkbox" defaultChecked />
              E-mail
            </label>
            <label className="eds-check">
              <input type="checkbox" className="eds-checkbox" />
              Mensagem no aplicativo
            </label>
            <label className="eds-check">
              <input type="checkbox" className="eds-checkbox" ref={indeterminate} />
              Todas (parcial)
            </label>
            <label className="eds-check">
              <input type="checkbox" className="eds-checkbox" disabled defaultChecked />
              Desabilitado marcado
            </label>
            <label className="eds-check">
              <input type="checkbox" className="eds-checkbox" disabled />
              Desabilitado
            </label>
            <p className="eds-helper" id="g-notif-h">
              Escolha como deseja ser avisado.
            </p>
          </fieldset>

          <fieldset className="eds-fieldset">
            <legend className="eds-legend" data-required>
              Prazo de entrega
            </legend>
            <label className="eds-check">
              <input type="radio" name="prazo" className="eds-radio" defaultChecked required />
              Padrão (5 dias úteis)
            </label>
            <label className="eds-check">
              <input type="radio" name="prazo" className="eds-radio" required />
              Expresso (2 dias úteis)
            </label>
            <label className="eds-check">
              <input type="radio" name="prazo" className="eds-radio" disabled required />
              Retirada (indisponível)
            </label>
          </fieldset>

          <fieldset className="eds-fieldset">
            <legend className="eds-legend">Termos (erro)</legend>
            <label className="eds-check">
              <input
                type="checkbox"
                className="eds-checkbox"
                aria-invalid="true"
                aria-describedby="g-termo-e"
              />
              Li e aceito as condições
            </label>
            <p className="eds-error" id="g-termo-e">
              É preciso aceitar para continuar.
            </p>
          </fieldset>

          <fieldset className="eds-fieldset">
            <legend className="eds-legend">Preferências</legend>
            <label className="eds-check">
              <input type="checkbox" role="switch" className="eds-switch" defaultChecked />
              Modo automático
            </label>
            <label className="eds-check">
              <input type="checkbox" role="switch" className="eds-switch" />
              Relatório semanal
            </label>
            <label className="eds-check">
              <input type="checkbox" role="switch" className="eds-switch" disabled defaultChecked />
              Desabilitado ligado
            </label>
            <label className="eds-check">
              <input type="checkbox" role="switch" className="eds-switch" disabled />
              Desabilitado desligado
            </label>
          </fieldset>
        </div>
      </Section>
    </div>
  );
}
