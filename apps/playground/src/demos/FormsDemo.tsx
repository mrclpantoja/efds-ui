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

/* Combobox: demo estático do contrato de markup. O popup é aberto na carga e posicionado como o
   JS do @eds-ui/behavior fará (propriedades --_combobox-* em px, recalculadas em scroll/resize). */
type ComboState = 'options' | 'empty' | 'loading';

function ComboboxDemo({
  id,
  label,
  size,
  state = 'options',
  invalid,
  disabled,
  placement,
  live,
}: {
  id: string;
  label: string;
  size?: 'sm' | 'lg';
  state?: ComboState;
  invalid?: boolean;
  disabled?: boolean;
  placement?: 'top';
  /** Fechado e interativo: o @eds-ui/behavior assume (sem estado forçado). */
  live?: boolean;
}) {
  const field = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const open = !disabled && (state !== 'options' || id === 'cb-aberto');

  useEffect(() => {
    const box = field.current;
    const pop = popup.current;
    if (!box || !pop || !open) return;
    const place = () => {
      const r = box.getBoundingClientRect();
      pop.style.setProperty('--_combobox-x', `${r.left}px`);
      pop.style.setProperty('--_combobox-y', `${placement === 'top' ? r.top : r.bottom}px`);
      pop.style.setProperty('--_combobox-width', `${r.width}px`);
    };
    place();
    if (!pop.matches(':popover-open')) pop.showPopover();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      if (pop.matches(':popover-open')) pop.hidePopover();
    };
  }, [open, placement]);

  const cidades = [
    ['poa', 'Porto Alegre'],
    ['pel', 'Pelotas'],
    ['pf', 'Passo Fundo'],
    ['pot', 'Potiraguá (indisponível)'],
  ];

  return (
    <div className="eds-field" data-eds-live={live ? '' : undefined}>
      <label className="eds-label" htmlFor={id}>
        {label}
      </label>
      <div className="eds-combobox" ref={field}>
        <input
          id={id}
          className={`eds-input${size ? ` eds-input-${size}` : ''}`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-lista`}
          aria-activedescendant={open && state === 'options' ? `${id}-2` : undefined}
          aria-invalid={invalid ? 'true' : undefined}
          autoComplete="off"
          disabled={disabled}
          defaultValue={disabled ? 'Porto Alegre' : state === 'options' && open ? 'Po' : ''}
        />
        <input type="hidden" name={id} />
        <div className="eds-combobox-popup" popover="manual" ref={popup} data-placement={placement}>
          <ul
            id={`${id}-lista`}
            className="eds-combobox-listbox"
            role="listbox"
            aria-label="Cidades"
            hidden={state !== 'options'}
          >
            {cidades.map(([value, text], i) => (
              <li
                key={value}
                id={`${id}-${i + 1}`}
                className="eds-combobox-option"
                role="option"
                data-value={value}
                aria-selected={live ? undefined : i === 1 ? 'true' : 'false'}
                aria-disabled={i === 3 ? 'true' : undefined}
                data-current={!live && i === 0 ? '' : undefined}
              >
                {text}
              </li>
            ))}
          </ul>
          <p className="eds-combobox-empty" hidden={state !== 'empty'}>
            Nenhum resultado
          </p>
          <p className="eds-combobox-loading" hidden={state !== 'loading'}>
            <span className="eds-spinner eds-spinner-sm" aria-hidden="true" /> Carregando…
          </p>
        </div>
        <span className="eds-visually-hidden" role="status" />
      </div>
    </div>
  );
}

/* DatePicker / DateRangePicker: demo estático do contrato de markup (março de 2026, dados
   fictícios; hoje = 18). O calendário é aberto na carga e posicionado como o JS do
   @eds-ui/behavior fará (--_calendar-x/-y em px, recalculadas em scroll/resize). */
type RangeMode = 'done' | 'preview';

const MES = 'março de 2026';
const DIAS_SEMANA: [string, string][] = [
  ['D', 'domingo'],
  ['S', 'segunda-feira'],
  ['T', 'terça-feira'],
  ['Q', 'quarta-feira'],
  ['Q', 'quinta-feira'],
  ['S', 'sexta-feira'],
  ['S', 'sábado'],
];
const NOME_DIA = DIAS_SEMANA.map(([, nome]) => nome);
const HOJE = 18;
const BLOQUEADOS = [4, 21, 28];

function IconCalendar() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1zM2.5 7h11M5.5 2v3M10.5 2v3" />
    </svg>
  );
}

function CalendarDemo({
  id,
  label,
  mode,
  chosen,
  focusDay,
  range,
  placement,
  invalid,
  disabled,
  size,
  open = true,
  live,
}: {
  id: string;
  label: string;
  mode?: 'range';
  chosen?: number;
  focusDay?: number;
  range?: { mode: RangeMode; start: number; end: number };
  placement?: 'top';
  invalid?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  open?: boolean;
  /** Fechado e interativo: o @eds-ui/behavior monta o calendário. */
  live?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const isOpen = open && !disabled;
  const isRange = mode === 'range';

  useEffect(() => {
    const field = box.current;
    const cal = pop.current;
    if (!field || !cal || !isOpen) return;
    const place = () => {
      const r = field.getBoundingClientRect();
      cal.style.setProperty('--_calendar-x', `${r.left}px`);
      cal.style.setProperty('--_calendar-y', `${placement === 'top' ? r.top : r.bottom}px`);
    };
    place();
    if (!cal.matches(':popover-open')) cal.showPopover();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      if (cal.matches(':popover-open')) cal.hidePopover();
    };
  }, [isOpen, placement]);

  const start = 0; // 1º de março de 2026 é domingo
  const total = 31;
  const rows = Math.ceil((start + total) / 7);
  const iso = (d: number) => `2026-03-${String(d).padStart(2, '0')}`;
  const dayCell = (d: number) => {
    const weekday = NOME_DIA[(start + d - 1) % 7];
    let selected = d === chosen;
    let dataRange: string | undefined;
    if (range) {
      const last = range.mode === 'done' ? range.end : range.start;
      selected = d >= range.start && d <= last;
      if (selected) {
        dataRange =
          range.mode === 'preview'
            ? 'single'
            : d === range.start
              ? 'start'
              : d === range.end
                ? 'end'
                : 'middle';
      }
    }
    const preview = range?.mode === 'preview' && d > range.start && d <= range.end;
    const blocked = BLOQUEADOS.includes(d);
    return (
      <td
        key={d}
        className="eds-calendar-day"
        data-date={iso(d)}
        tabIndex={d === (focusDay ?? chosen ?? range?.start ?? HOJE) ? 0 : -1}
        aria-selected={selected ? 'true' : undefined}
        aria-current={d === HOJE ? 'date' : undefined}
        aria-disabled={blocked ? 'true' : undefined}
        aria-label={`${d} de março de 2026, ${weekday}${blocked ? ', indisponível' : ''}`}
        data-range={dataRange}
        data-range-preview={preview ? '' : undefined}
      >
        {d}
      </td>
    );
  };
  const cells: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const tds: ReactNode[] = [];
    for (let c = 0; c < 7; c++) {
      const d = r * 7 + c - start + 1;
      tds.push(d < 1 || d > total ? <td key={c} /> : dayCell(d));
    }
    cells.push(<tr key={r}>{tds}</tr>);
  }

  const sizeCls = size ? ` eds-input-${size}` : '';
  const toggle = (
    <button
      type="button"
      className="eds-datepicker-toggle"
      aria-label={isRange ? 'Escolher período' : 'Escolher data'}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={`${id}-cal`}
      disabled={disabled}
    >
      <IconCalendar />
    </button>
  );

  return (
    <div className="eds-field" data-eds-live={live ? '' : undefined}>
      {isRange ? (
        <span className="eds-label" id={`${id}-l`}>
          {label}
        </span>
      ) : (
        <label className="eds-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className={`eds-datepicker${isRange ? ' eds-daterange' : ''}`}
        ref={box}
        role={isRange ? 'group' : undefined}
        aria-labelledby={isRange ? `${id}-l` : undefined}
        data-eds-datepicker={live && !isRange ? '' : undefined}
        data-eds-daterange={live && isRange ? '' : undefined}
      >
        {isRange ? (
          <>
            <input
              className={`eds-input eds-datepicker-input${sizeCls}`}
              type="text"
              inputMode="numeric"
              maxLength={10}
              aria-label="Data inicial"
              placeholder="dd/mm/aaaa"
              autoComplete="off"
              defaultValue={range ? '09/03/2026' : ''}
              disabled={disabled}
            />
            <span className="eds-daterange-sep" aria-hidden="true">
              até
            </span>
            <input
              className={`eds-input eds-datepicker-input${sizeCls}`}
              type="text"
              inputMode="numeric"
              maxLength={10}
              aria-label="Data final"
              placeholder="dd/mm/aaaa"
              autoComplete="off"
              defaultValue={range?.mode === 'done' ? `${range.end}/03/2026` : ''}
              disabled={disabled}
            />
            {toggle}
            <input type="hidden" name={`${id}-inicio`} />
            <input type="hidden" name={`${id}-fim`} />
          </>
        ) : (
          <>
            <input
              id={id}
              className={`eds-input eds-datepicker-input${sizeCls}`}
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="dd/mm/aaaa"
              autoComplete="off"
              defaultValue={
                chosen ? `${String(chosen).padStart(2, '0')}/03/2026` : invalid ? '31/02/2026' : ''
              }
              aria-invalid={invalid ? 'true' : undefined}
              disabled={disabled}
            />
            {toggle}
            <input type="hidden" name={id} />
          </>
        )}
        <div
          className="eds-calendar"
          id={`${id}-cal`}
          role="dialog"
          aria-label={isRange ? 'Escolher período' : 'Escolher data'}
          popover="manual"
          ref={pop}
          data-placement={placement}
        >
          {!live && (
            <>
              <div className="eds-calendar-header">
                <button type="button" className="eds-calendar-nav" aria-label="Mês anterior" />
                <h2 className="eds-calendar-title" id={`${id}-cal-t`} aria-live="polite">
                  {MES}
                </h2>
                <button type="button" className="eds-calendar-nav" aria-label="Próximo mês" />
              </div>
              <div className="eds-calendar-jump">
                <select className="eds-select eds-select-sm" aria-label="Mês" defaultValue="2">
                  <option value="1">fevereiro</option>
                  <option value="2">março</option>
                  <option value="3">abril</option>
                </select>
                <select className="eds-select eds-select-sm" aria-label="Ano" defaultValue="2026">
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
              <table className="eds-calendar-grid" role="grid" aria-labelledby={`${id}-cal-t`}>
                <thead>
                  <tr>
                    {DIAS_SEMANA.map(([letra, nome]) => (
                      <th key={nome} scope="col" abbr={nome} className="eds-calendar-weekday">
                        {letra}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{cells}</tbody>
              </table>
              <div className="eds-calendar-footer">
                <button type="button" className="eds-button eds-button-ghost eds-button-sm">
                  Hoje
                </button>
                <button type="button" className="eds-button eds-button-secondary eds-button-sm">
                  Fechar
                </button>
              </div>
            </>
          )}
        </div>
        <span className="eds-visually-hidden" role="status" />
      </div>
    </div>
  );
}

/* FileUpload: ícones do contrato (decorativos). */
function IconUpload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5 4 4 0 0 1 17 18" />
      <path d="M12 21v-9m0 0-3 3m3-3 3 3" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg
      className="eds-upload-item-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

type UploadState = 'ready' | 'uploading' | 'done' | 'error';

function UploadItem({
  name,
  meta,
  state,
  progress,
  retry,
}: {
  name: string;
  meta: string;
  state: UploadState;
  progress?: number;
  retry?: boolean;
}) {
  return (
    <li className="eds-upload-item" data-state={state}>
      <IconFile />
      <div className="eds-upload-item-body">
        <span className="eds-upload-item-name">{name}</span>
        <span className="eds-upload-item-meta">{meta}</span>
        {state === 'uploading' && (
          <progress
            className="eds-upload-progress"
            max={100}
            value={progress}
            aria-label={`Enviando ${name}`}
          />
        )}
      </div>
      {retry && (
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-sm"
          aria-label={`Tentar enviar ${name} de novo`}
        >
          Tentar de novo
        </button>
      )}
      <button
        type="button"
        className="eds-button eds-button-ghost eds-button-icon eds-button-sm"
        aria-label={`Remover ${name}`}
      >
        <IconClose />
      </button>
    </li>
  );
}

function UploadDemo({
  id,
  label,
  hint = 'PDF, JPG ou PNG, até 5 MB cada (máx. 5)',
  dragover,
  invalid,
  disabled,
  compact,
  live,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  dragover?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  compact?: boolean;
  /** Interativo: o @eds-ui/behavior liga arrastar e soltar, lista e validação. */
  live?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="eds-field" data-eds-live={live ? '' : undefined}>
      <span className="eds-label" id={`${id}-l`}>
        {label}
      </span>
      <div
        className={`eds-upload${compact ? ' eds-upload-compact' : ''}`}
        data-dragover={dragover ? '' : undefined}
        data-eds-upload={live ? '' : undefined}
        data-eds-max-size={live ? 5 * 1024 * 1024 : undefined}
        data-eds-max-files={live ? 5 : undefined}
      >
        <input
          id={id}
          className="eds-upload-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.png"
          disabled={disabled}
          aria-invalid={invalid ? 'true' : undefined}
          aria-labelledby={`${id}-l`}
          aria-describedby={`${id}-h`}
        />
        <label className="eds-upload-dropzone" htmlFor={id}>
          <IconUpload />
          <span className="eds-upload-title">
            Arraste arquivos aqui ou <span className="eds-upload-link">escolha no computador</span>
          </span>
          <span className="eds-upload-hint" id={`${id}-h`}>
            {hint}
          </span>
        </label>
        {children && (
          <ul className="eds-upload-list" aria-label="Arquivos selecionados">
            {children}
          </ul>
        )}
        <span className="eds-visually-hidden" role="status" />
      </div>
      {invalid && <p className="eds-error">Anexe ao menos um documento do contrato.</p>}
    </div>
  );
}

/* MultiSelect: demo estático do contrato de markup (como o ComboboxDemo, o popup aberto é
   posicionado pela borda do campo). Escolhidas = aria-selected; destaque = data-active. */
const cidadesMulti: [string, string][] = [
  ['poa', 'Porto Alegre'],
  ['pel', 'Pelotas'],
  ['pf', 'Passo Fundo'],
  ['cax', 'Caxias do Sul'],
  ['sm', 'Santa Maria'],
];

function MultiSelectDemo({
  id,
  label,
  chosen,
  open,
  active,
  maxReached,
  size,
  invalid,
  disabled,
  placeholder,
  live,
}: {
  id: string;
  label: string;
  chosen: string[];
  open?: boolean;
  active?: string;
  maxReached?: boolean;
  size?: 'sm' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Fechado e interativo: o @eds-ui/behavior assume. */
  live?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const isOpen = !!open && !disabled;

  useEffect(() => {
    const field = box.current;
    const pop = popup.current;
    if (!field || !pop || !isOpen) return;
    const place = () => {
      const r = field.getBoundingClientRect();
      pop.style.setProperty('--_combobox-x', `${r.left}px`);
      pop.style.setProperty('--_combobox-y', `${r.bottom}px`);
      pop.style.setProperty('--_combobox-width', `${r.width}px`);
    };
    place();
    if (!pop.matches(':popover-open')) pop.showPopover();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      if (pop.matches(':popover-open')) pop.hidePopover();
    };
  }, [isOpen]);

  const tags = cidadesMulti.filter(([v]) => chosen.includes(v));
  return (
    <div className="eds-field" data-eds-live={live ? '' : undefined}>
      <label className="eds-label" htmlFor={id}>
        {label}
      </label>
      <div
        className={`eds-combobox eds-combobox-multiple${size ? ` eds-combobox-${size}` : ''}`}
        data-eds-multiple=""
        ref={box}
      >
        <div className="eds-combobox-control">
          <ul className="eds-combobox-tags" aria-label={`${label}: selecionadas`}>
            {tags.map(([v, text]) => (
              <li className="eds-combobox-tag" key={v}>
                <span>{text}</span>
                <button
                  type="button"
                  className="eds-combobox-tag-remove"
                  aria-label={`Remover ${text}`}
                  disabled={disabled}
                />
              </li>
            ))}
          </ul>
          <input
            id={id}
            className="eds-combobox-input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={`${id}-lista`}
            aria-activedescendant={isOpen && active ? `${id}-${active}` : undefined}
            aria-invalid={invalid ? 'true' : undefined}
            autoComplete="off"
            disabled={disabled}
            placeholder={tags.length === 0 ? placeholder : undefined}
          />
        </div>
        {chosen.map((v) => (
          <input type="hidden" name={`${id}[]`} value={v} key={v} />
        ))}
        <div className="eds-combobox-popup" popover="manual" ref={popup}>
          <ul
            id={`${id}-lista`}
            className="eds-combobox-listbox"
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
          >
            {cidadesMulti.map(([v, text]) => (
              <li
                key={v}
                id={`${id}-${v}`}
                className="eds-combobox-option"
                role="option"
                data-value={v}
                aria-selected={chosen.includes(v) ? 'true' : 'false'}
                aria-disabled={maxReached && !chosen.includes(v) ? 'true' : undefined}
                data-active={active === v ? '' : undefined}
              >
                {text}
              </li>
            ))}
          </ul>
        </div>
        <span className="eds-visually-hidden" role="status" />
      </div>
      {invalid && <p className="eds-error">Escolha ao menos uma cidade.</p>}
    </div>
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

      <Section title="Combobox (autocomplete)">
        <p className="eds-helper">
          Interativos (com @eds-ui/behavior): Pequeno, Grande e Com erro. Os demais são estados
          fixos.
        </p>
        <div style={cols}>
          <ComboboxDemo id="cb-aberto" label="Cidade (aberto)" />
          <ComboboxDemo id="cb-vazio" label="Sem resultado" state="empty" />
          <ComboboxDemo id="cb-carregando" label="Carregando" state="loading" />
        </div>
        <div style={cols}>
          <ComboboxDemo id="cb-sm" label="Pequeno" size="sm" live />
          <ComboboxDemo id="cb-lg" label="Grande" size="lg" live />
          <ComboboxDemo id="cb-erro" label="Com erro" invalid live />
          <ComboboxDemo id="cb-dis" label="Desabilitado" disabled />
        </div>
        <div style={{ paddingBlockStart: '14rem' }}>
          <ComboboxDemo id="cb-topo" label="Abre para cima" state="loading" placement="top" />
        </div>
      </Section>

      <Section title="FileInput (upload simples)">
        <div style={cols}>
          <div className="eds-field">
            <label className="eds-label" htmlFor="fi-1">
              Comprovante
            </label>
            <input
              id="fi-1"
              className="eds-file"
              type="file"
              name="comprovante"
              accept=".pdf"
              aria-describedby="fi-1-h"
            />
            <p className="eds-helper" id="fi-1-h">
              PDF até 5 MB.
            </p>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="fi-sm">
              Pequeno
            </label>
            <input id="fi-sm" className="eds-file eds-file-sm" type="file" />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="fi-lg">
              Grande
            </label>
            <input id="fi-lg" className="eds-file eds-file-lg" type="file" />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="fi-err">
              Com erro
            </label>
            <input
              id="fi-err"
              className="eds-file"
              type="file"
              aria-invalid="true"
              aria-describedby="fi-err-e"
            />
            <p className="eds-error" id="fi-err-e">
              Anexe o comprovante.
            </p>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="fi-dis">
              Desabilitado
            </label>
            <input id="fi-dis" className="eds-file" type="file" disabled />
          </div>
        </div>
      </Section>

      <Section title="FileUpload (arrastar e soltar)">
        <p className="eds-helper">
          Interativos (com @eds-ui/behavior): Documentos do contrato e a versão de uma linha. Os
          demais são estados fixos.
        </p>
        <div style={cols}>
          <UploadDemo id="up-vazio" label="Documentos do contrato" live />
          <UploadDemo id="up-drag" label="Arrastando sobre a área (simulado)" dragover />
          <UploadDemo id="up-err" label="Com erro" invalid />
          <UploadDemo id="up-dis" label="Desabilitado" disabled />
        </div>
        <UploadDemo id="up-compact" label="Versão de uma linha" hint="PDF até 5 MB" compact live />
        <UploadDemo id="up-lista" label="Todos os estados dos itens">
          <UploadItem
            name="proposta-comercial.pdf"
            meta="850 KB · Pronto para enviar"
            state="ready"
          />
          <UploadItem
            name="contrato-assinado.pdf"
            meta="1,2 MB · Enviando 45%"
            state="uploading"
            progress={45}
          />
          <UploadItem name="anexo-tecnico.pdf" meta="2,4 MB · Enviado" state="done" />
          <UploadItem name="planta-baixa.png" meta="Arquivo maior que 5 MB" state="error" />
          <UploadItem name="planilha.xlsx" meta="Tipo não permitido" state="error" />
          <UploadItem
            name="relatorio-de-vistoria-com-um-nome-de-arquivo-bastante-longo-para-testar-reticencias-2026.pdf"
            meta="3,1 MB · Falha no envio"
            state="error"
            retry
          />
        </UploadDemo>
      </Section>

      <Section title="MultiSelect (combobox múltiplo)">
        <p className="eds-helper">
          Interativos (com @eds-ui/behavior): Sem escolha, Com escolhidas, Com erro, Pequeno e
          Grande. Os demais são estados fixos.
        </p>
        <div style={cols}>
          <MultiSelectDemo
            id="ms-vazio"
            label="Sem escolha"
            chosen={[]}
            placeholder="Digite uma cidade"
            live
          />
          <MultiSelectDemo id="ms-escolhidas" label="Com escolhidas" chosen={['poa', 'pel']} live />
          <MultiSelectDemo
            id="ms-quebra"
            label="Etiquetas quebram de linha"
            chosen={['poa', 'pel', 'pf', 'cax', 'sm']}
          />
          <MultiSelectDemo id="ms-erro" label="Com erro" chosen={[]} invalid live />
          <MultiSelectDemo id="ms-dis" label="Desabilitado" chosen={['poa', 'pf']} disabled />
        </div>
        <div style={cols}>
          <MultiSelectDemo id="ms-sm" label="Pequeno" chosen={['poa']} size="sm" live />
          <MultiSelectDemo id="ms-lg" label="Grande" chosen={['poa']} size="lg" live />
        </div>
        <div style={{ ...cols, paddingBlockEnd: '21rem' }}>
          <MultiSelectDemo
            id="ms-aberto"
            label="Aberto: escolhidas e destaque"
            chosen={['poa', 'pf']}
            active="pel"
            open
          />
          <MultiSelectDemo
            id="ms-max"
            label="Aberto: máximo atingido (3)"
            chosen={['poa', 'pel', 'pf']}
            active="poa"
            maxReached
            open
          />
        </div>
      </Section>

      <Section title="Data nativa (sem JS)">
        <div style={cols}>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-data">
              Data
            </label>
            <input id="dn-data" className="eds-input" type="date" defaultValue="2026-03-15" />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-hora">
              Hora
            </label>
            <input id="dn-hora" className="eds-input" type="time" defaultValue="14:30" />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-dh">
              Data e hora
            </label>
            <input
              id="dn-dh"
              className="eds-input"
              type="datetime-local"
              defaultValue="2026-03-15T14:30"
            />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-mes">
              Mês
            </label>
            <input id="dn-mes" className="eds-input" type="month" defaultValue="2026-03" />
          </div>
        </div>
        <div style={cols}>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-erro">
              Data (erro)
            </label>
            <input
              id="dn-erro"
              className="eds-input"
              type="date"
              defaultValue="2026-03-15"
              aria-invalid="true"
              aria-describedby="dn-erro-e"
            />
            <p className="eds-error" id="dn-erro-e">
              A data deve ser posterior a hoje.
            </p>
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-ok">
              Data (sucesso)
            </label>
            <input
              id="dn-ok"
              className="eds-input"
              type="date"
              defaultValue="2026-03-15"
              data-valid="true"
            />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-dis">
              Data (desabilitado)
            </label>
            <input
              id="dn-dis"
              className="eds-input"
              type="date"
              defaultValue="2026-03-15"
              disabled
            />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-sm">
              Pequeno
            </label>
            <input
              id="dn-sm"
              className="eds-input eds-input-sm"
              type="date"
              defaultValue="2026-03-15"
            />
          </div>
          <div className="eds-field">
            <label className="eds-label" htmlFor="dn-lg">
              Grande
            </label>
            <input
              id="dn-lg"
              className="eds-input eds-input-lg"
              type="date"
              defaultValue="2026-03-15"
            />
          </div>
        </div>
      </Section>

      <Section title="DatePicker (calendário próprio)">
        <div style={{ ...cols, minBlockSize: '27rem' }}>
          <CalendarDemo id="dp-aberto" label="Vencimento (aberto)" chosen={15} focusDay={12} />
        </div>
        <div style={cols}>
          <CalendarDemo id="dp-fechado" label="Fechado" open={false} live />
          <CalendarDemo id="dp-erro" label="Com erro" open={false} invalid live />
          <CalendarDemo id="dp-dis" label="Desabilitado" open={false} disabled live />
          <CalendarDemo id="dp-sm" label="Pequeno" open={false} size="sm" live />
          <CalendarDemo id="dp-lg" label="Grande" open={false} size="lg" live />
        </div>
        <p className="eds-helper">
          Março de 2026: hoje = 18, escolhido = 15, indisponíveis = 4, 21 e 28. O anel de foco
          aparece ao navegar com Tab e setas.
        </p>
        <p className="eds-helper">
          Interativos (com @eds-ui/behavior): Fechado, Com erro, Desabilitado, Pequeno e Grande.
          Estados fixos, sem JavaScript: o calendário aberto e "Abre para cima".
        </p>
        <div style={{ paddingBlockStart: '25rem' }}>
          <CalendarDemo id="dp-topo" label="Abre para cima" chosen={15} placement="top" />
        </div>
      </Section>

      <Section title="DateRangePicker (período)">
        <div style={{ ...cols, minBlockSize: '27rem' }}>
          <CalendarDemo
            id="dr-feito"
            label="Período escolhido (9 a 17)"
            mode="range"
            range={{ mode: 'done', start: 9, end: 17 }}
          />
        </div>
        <div style={{ ...cols, minBlockSize: '27rem' }}>
          <CalendarDemo
            id="dr-previa"
            label="Início escolhido, prévia até 14"
            mode="range"
            range={{ mode: 'preview', start: 9, end: 14 }}
            focusDay={14}
          />
        </div>
        <div style={cols}>
          <CalendarDemo id="dr-fechado" label="Fechado" mode="range" open={false} live />
          <CalendarDemo id="dr-dis" label="Desabilitado" mode="range" open={false} disabled live />
        </div>
        <p className="eds-helper">
          Interativos (com @eds-ui/behavior): Fechado e Desabilitado. Estados fixos, sem JavaScript:
          o período escolhido e a prévia, com o calendário aberto.
        </p>
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
