import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  formatMessage as format,
  getMessages,
  isEmptyFilter,
  parseNumber,
  type FilterValue,
} from '@efds-ui/behavior/export';
import { Glyph } from '../../internal/Glyph';
import { mergeTexts } from '../../utils/texts';
import { Popover } from '../Popover';

export type TableColumnFilterType = 'text' | 'select' | 'number' | 'date';

export interface TableColumnFilterOption {
  value: string;
  label: ReactNode;
}

export type { FilterValue };

export interface TableColumnFilterTexts {
  /** Nome do botão (oculto): "Filtrar {coluna}". */
  button: (column: string) => string;
  /** Complemento do nome quando há filtro: ", filtro ativo". */
  active: string;
  apply: string;
  clear: string;
  /** Texto da opção "sem filtro" do `<select>`. */
  all: string;
  min: string;
  max: string;
  from: string;
  to: string;
  /** Faixa invertida. */
  rangeInvalid: string;
}

const defaultTexts = (): TableColumnFilterTexts => {
  const m = getMessages();
  return {
    button: (column) => format(m.tableColumnFilterLabel, { column }),
    active: m.tableColumnFilterActive,
    apply: m.tableColumnFilterApply,
    clear: m.tableColumnFilterClear,
    all: 'Todos',
    min: m.tableColumnFilterMin,
    max: m.tableColumnFilterMax,
    from: m.tableColumnFilterFrom,
    to: m.tableColumnFilterTo,
    rangeInvalid: m.tableColumnFilterRangeInvalid,
  };
};

export interface TableColumnFilterProps {
  /** `text` (contém), `select` (lista de `options`), `number` (mín/máx) ou `date` (de/até). */
  type: TableColumnFilterType;
  /** Filtro aplicado (`null`/vazio = sem filtro). `select` usa `string[]`. */
  value: FilterValue | null | undefined;
  /** Chamado ao aplicar (valor) ou limpar (`null`). Não filtra a cada tecla. */
  onValueChange: (value: FilterValue | null) => void;
  /** Opções do `select`. */
  options?: readonly TableColumnFilterOption[];
  /** `select` com várias opções (caixas de seleção). */
  multiple?: boolean;
  /** Nome da coluna (botão, painel e rótulos). Padrão: o `label` da definição de colunas. */
  label?: string;
  texts?: Partial<TableColumnFilterTexts>;
}

const FilterGlyph = () => <Glyph d="M3 5h18l-7 8v6l-4 2v-8z" />;

/** Valor de um campo de faixa já comparável (número ou data ISO); `null` se vazio/inválido. */
const rangeKey = (type: TableColumnFilterType, text: string): number | string | null => {
  const t = text.trim();
  if (t === '') return null;
  if (type === 'date') return t;
  return parseNumber(t);
};

/**
 * Filtro de uma coluna: botão no cabeçalho (`filter` do `<TableHeaderCell>`) que abre um painel
 * (Popover nativo) com o campo do tipo. Aplica por Enter ou "Aplicar"; Esc fecha sem aplicar e os
 * campos voltam ao valor aplicado; "Limpar" zera e aplica. O foco volta ao botão ao fechar.
 */
export const TableColumnFilter = forwardRef<HTMLDivElement, TableColumnFilterProps>(
  function TableColumnFilter(
    { type, value, onValueChange, options = [], multiple = false, label, texts },
    ref,
  ) {
    const t = mergeTexts(defaultTexts(), texts);
    const id = useId();
    const name = label ?? 'coluna';
    const active = !isEmptyFilter(value);
    const button = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');

    // Rascunho dos campos: o valor aplicado volta ao abrir e ao fechar sem aplicar.
    const fromValue = () => ({
      text: typeof value === 'string' ? value : '',
      list: Array.isArray(value) ? value : [],
      min: value && typeof value === 'object' && !Array.isArray(value) ? (value.gte ?? '') : '',
      max: value && typeof value === 'object' && !Array.isArray(value) ? (value.lte ?? '') : '',
    });
    const [draft, setDraft] = useState(fromValue);
    const sync = useRef(() => undefined as void);
    useEffect(() => {
      sync.current = () => {
        setDraft(fromValue());
        setError('');
      };
    });
    const wasOpen = useRef(false);
    useEffect(() => {
      if (wasOpen.current && !open) sync.current();
      wasOpen.current = open;
    }, [open]);
    const valueKey = JSON.stringify(value ?? null);
    useEffect(() => {
      sync.current();
    }, [valueKey]);

    const close = () => {
      setOpen(false);
      button.current?.focus();
    };

    const submit = (event: FormEvent) => {
      event.preventDefault();
      let next: FilterValue | null = null;
      if (type === 'text') next = draft.text.trim() === '' ? null : draft.text.trim();
      else if (type === 'select') next = draft.list.length === 0 ? null : draft.list;
      else {
        const lo = rangeKey(type, draft.min);
        const hi = rangeKey(type, draft.max);
        if (lo !== null && hi !== null && lo > hi) {
          setError(t.rangeInvalid);
          return;
        }
        const range: { gte?: string; lte?: string } = {};
        if (draft.min.trim() !== '') range.gte = draft.min.trim();
        if (draft.max.trim() !== '') range.lte = draft.max.trim();
        next = isEmptyFilter(range) ? null : range;
      }
      setError('');
      onValueChange(next);
      close();
    };

    const clear = () => {
      setDraft({ text: '', list: [], min: '', max: '' });
      setError('');
      onValueChange(null);
      close();
    };

    const errorId = `${id}-erro`;
    const field = (fieldId: string, text: string, key: 'min' | 'max', inputType: string) => (
      <div className="eds-field">
        <label className="eds-label" htmlFor={fieldId}>
          {text}
        </label>
        <input
          id={fieldId}
          className="eds-input"
          type={inputType}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={draft[key]}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setDraft({ ...draft, [key]: e.target.value });
            setError('');
          }}
        />
      </div>
    );

    const toggleOption = (optionValue: string, checked: boolean) =>
      setDraft({
        ...draft,
        list: checked ? [...draft.list, optionValue] : draft.list.filter((v) => v !== optionValue),
      });

    return (
      <Popover
        ref={ref}
        placement="bottom"
        className="eds-table-filter"
        aria-label={t.button(name)}
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            ref={button}
            type="button"
            className="eds-table-filter-btn"
            aria-haspopup="dialog"
            data-active={active ? '' : undefined}
          >
            <FilterGlyph />
            <span className="eds-visually-hidden">
              {t.button(name)}
              {active ? t.active : ''}
            </span>
          </button>
        }
      >
        {/* Esc é atalho de um diálogo, não um controle novo: o <form> só repassa a tecla dos campos. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <form
          onSubmit={submit}
          noValidate
          onKeyDown={(event) => {
            // Esc num campo de busca só limpa o texto; aqui ele fecha o filtro sem aplicar.
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            close();
          }}
        >
          {type === 'text' && (
            <div className="eds-field">
              <label className="eds-label" htmlFor={`${id}-q`}>
                {name}
              </label>
              <input
                id={`${id}-q`}
                className="eds-input"
                type="search"
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </div>
          )}
          {type === 'select' && !multiple && (
            <div className="eds-field">
              <label className="eds-label" htmlFor={`${id}-s`}>
                {name}
              </label>
              <select
                id={`${id}-s`}
                className="eds-select"
                value={draft.list[0] ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, list: e.target.value === '' ? [] : [e.target.value] })
                }
              >
                <option value="">{t.all}</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {type === 'select' && multiple && (
            <fieldset className="eds-fieldset">
              <legend className="eds-legend">{name}</legend>
              {options.map((o) => (
                <label key={o.value} className="eds-check">
                  <input
                    type="checkbox"
                    className="eds-checkbox"
                    checked={draft.list.includes(o.value)}
                    onChange={(e) => toggleOption(o.value, e.target.checked)}
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>
          )}
          {type === 'number' && (
            <>
              {field(`${id}-min`, t.min, 'min', 'text')}
              {field(`${id}-max`, t.max, 'max', 'text')}
            </>
          )}
          {type === 'date' && (
            <>
              {field(`${id}-min`, t.from, 'min', 'date')}
              {field(`${id}-max`, t.to, 'max', 'date')}
            </>
          )}
          {error && (
            <p className="eds-error" id={errorId}>
              {error}
            </p>
          )}
          <div className="eds-table-filter-actions">
            <button type="submit" className="eds-button eds-button-primary eds-button-sm">
              {t.apply}
            </button>
            <button
              type="button"
              className="eds-button eds-button-ghost eds-button-sm"
              onClick={clear}
            >
              {t.clear}
            </button>
          </div>
        </form>
      </Popover>
    );
  },
);
TableColumnFilter.displayName = 'TableColumnFilter';
