import {
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type TdHTMLAttributes,
} from 'react';
import { format, getMessages } from '@efds-ui/behavior/export';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { mergeRefs } from '../../internal/refs-d';
import { useTableContext } from './tableContext';

export interface TableEditableCellTexts {
  /** Texto oculto do botão, depois do valor: ", editar {coluna} de {linha}". */
  edit: (column: string, row: string) => string;
  hint: string;
  saved: (column: string, row: string, value: string) => string;
  saving: string;
  error: (message: string) => string;
}

const defaultTexts = (): TableEditableCellTexts => {
  const m = getMessages();
  return {
    edit: (column, row) => format(m.editLabel, { column, row }),
    hint: m.editHint,
    saved: (column, row, value) => format(m.editSaved, { column, row, value }),
    saving: m.editSaving,
    error: (message) => format(m.editError, { message }),
  };
};

/** O que o servidor pode devolver ao salvar: o valor e o texto que ele normalizou. */
export interface TableEditCommitResult {
  value?: string;
  text?: string;
}

export interface TableEditableCellProps extends Omit<
  TdHTMLAttributes<HTMLTableCellElement>,
  'onChange' | 'children'
> {
  /** Nome do campo (`data-eds-edit-field`). */
  field: string;
  /** Valor atual, em texto (o app atualiza depois de salvar). */
  value: string;
  /** Texto exibido; padrão: `format(value)` ou o próprio valor. */
  display?: string;
  /** Campo padrão do editor. Padrão: `text`. */
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  /** Opções do `type="select"`. */
  options?: readonly { value: string; label: string }[];
  /** Campo próprio (`<Input>`, `<Select>`...): recebe `value`, `onChange`, `aria-label` e demais props. */
  editor?: ReactElement<Record<string, unknown>>;
  /** Nome da coluna e da linha (nome acessível: "Total de PED-0001"). */
  columnLabel: string;
  rowLabel: string;
  required?: boolean;
  /** Validação extra: devolva a mensagem de erro (ou vazio/`undefined` se válido). */
  validate?: (value: string) => string | null | undefined;
  format?: (value: string) => string;
  /** Alinha à direita com algarismos tabulares. */
  numeric?: boolean;
  /**
   * Salva. Sem promise: otimista. Com promise: a célula fica `aria-busy` e o editor `readOnly`;
   * rejeitar com `Error(mensagem)` volta à edição com o erro.
   */
  onCommit: (
    value: string,
    previous: string,
  ) => void | TableEditCommitResult | Promise<void | TableEditCommitResult>;
  texts?: Partial<TableEditableCellTexts>;
}

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Célula editável: o texto vira um botão (nome com o valor visível); Enter, Espaço, F2 ou clique
 * abrem o editor. Enter confirma (Ctrl+Enter em textarea), Esc cancela, Tab válido confirma e
 * inválido mantém a edição com o erro visível. A tabela segue `<table>`, sem `role="grid"`.
 */
export const TableEditableCell = forwardRef<HTMLTableCellElement, TableEditableCellProps>(
  function TableEditableCell(
    {
      field,
      value,
      display,
      type = 'text',
      options = [],
      editor,
      columnLabel,
      rowLabel,
      required,
      validate,
      format: formatValue,
      numeric,
      onCommit,
      texts,
      className,
      ...rest
    },
    ref,
  ) {
    const t = mergeTexts(defaultTexts(), texts);
    const ctx = useTableContext();
    const id = useId();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [override, setOverride] = useState<string | null>(null);
    const fieldRef = useRef<Field | null>(null);
    const button = useRef<HTMLButtonElement>(null);
    const cell = useRef<HTMLTableCellElement>(null);
    const refocusButton = useRef(false);

    // Um valor novo do app descarta o texto devolvido pelo servidor.
    useEffect(() => {
      setOverride(null);
    }, [value]);
    useEffect(() => {
      if (editing) {
        const el = fieldRef.current;
        el?.focus();
        if (el && 'select' in el && typeof el.select === 'function' && !error) el.select();
      } else if (refocusButton.current) {
        refocusButton.current = false;
        button.current?.focus();
      }
      // Foca ao entrar na edição, não a cada digitação.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing]);

    const shown = override ?? display ?? (formatValue ? formatValue(value) : value);
    const announceError = (message: string) => ctx?.announce(t.error(message));

    const fail = (message: string) => {
      setError(message);
      announceError(message);
      fieldRef.current?.focus();
    };

    const open = () => {
      if (busy) return;
      setDraft(value);
      setError('');
      setEditing(true);
    };

    const cancel = () => {
      if (busy) return;
      setEditing(false);
      setError('');
      refocusButton.current = true;
    };

    /** Valida e salva. Devolve `true` se a edição terminou. */
    const commit = async (focusButton: boolean): Promise<boolean> => {
      if (busy) return false;
      const el = fieldRef.current;
      if (draft === value) {
        setEditing(false);
        refocusButton.current = focusButton;
        return true;
      }
      const message =
        (required && draft.trim() === ''
          ? (el?.validationMessage ?? '') || 'Campo obrigatório.'
          : '') ||
        (el && !el.checkValidity() ? el.validationMessage : '') ||
        validate?.(draft) ||
        '';
      if (message) {
        fail(message);
        return false;
      }
      setError('');
      let result: void | TableEditCommitResult;
      try {
        const outcome = onCommit(draft, value);
        if (outcome instanceof Promise) {
          setBusy(true);
          ctx?.announce(t.saving);
          result = await outcome;
        } else result = outcome;
      } catch (reason) {
        setBusy(false);
        fail(reason instanceof Error ? reason.message : String(reason));
        return false;
      }
      setBusy(false);
      const next = result && typeof result === 'object' ? result : {};
      const text =
        next.text ?? (formatValue ? formatValue(next.value ?? draft) : (next.value ?? draft));
      if (next.text !== undefined || next.value !== undefined) setOverride(text);
      setEditing(false);
      refocusButton.current = focusButton;
      ctx?.announce(t.saved(columnLabel, rowLabel, text));
      return true;
    };

    const onKeyDown = (event: KeyboardEvent<Field>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      } else if (event.key === 'Enter') {
        const area = event.currentTarget instanceof HTMLTextAreaElement;
        if (area && !(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        void commit(true);
      } else if (event.key === 'Tab') {
        // Inválido: permanece em edição com o erro; válido: confirma e o foco segue.
        const el = fieldRef.current;
        const invalid =
          draft !== value &&
          ((required && draft.trim() === '') || (el && !el.checkValidity()) || !!validate?.(draft));
        if (invalid) {
          event.preventDefault();
          void commit(false);
        } else void commit(false);
      }
    };

    // Sair com o ponteiro: válido e mudado confirma; inválido mantém a edição.
    const onBlur = (event: FocusEvent<Field>) => {
      if (busy) return;
      const next = event.relatedTarget as Node | null;
      if (next && cell.current?.contains(next)) return;
      if (event.relatedTarget === null && !event.currentTarget.isConnected) return;
      void commit(false);
    };

    const props = {
      ref: (node: Field | null) => {
        fieldRef.current = node;
      },
      value: draft,
      'aria-label': `${columnLabel} de ${rowLabel}`,
      'aria-describedby': cx(error && `${id}-erro`, `${id}-dica`) || undefined,
      'aria-invalid': error ? true : undefined,
      readOnly: busy || undefined,
      required: required || undefined,
      onKeyDown,
      onBlur,
      onChange: (event: { target: { value: string } }) => {
        setDraft(event.target.value);
        if (error) setError('');
      },
    };

    const control = editor ? (
      cloneElement(editor, props)
    ) : type === 'select' ? (
      <select {...props} className="eds-select eds-select-sm" disabled={undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea {...props} className="eds-textarea" rows={2} />
    ) : (
      <input
        {...props}
        className="eds-input eds-input-sm"
        type={type === 'number' ? 'text' : type}
        inputMode={type === 'number' ? 'decimal' : undefined}
      />
    );

    return (
      <td
        {...rest}
        ref={mergeRefs(cell, ref)}
        data-eds-editable=""
        data-eds-edit-field={field}
        data-editing={editing ? '' : undefined}
        aria-busy={busy || undefined}
        className={cx(numeric && 'eds-table-num', className) || undefined}
      >
        {editing ? (
          <>
            {control}
            <p className="eds-visually-hidden" id={`${id}-dica`}>
              {t.hint}
            </p>
            {error && (
              <p className="eds-error" id={`${id}-erro`}>
                {error}
              </p>
            )}
          </>
        ) : (
          <button
            ref={button}
            type="button"
            className="eds-table-cell-edit"
            onClick={open}
            onKeyDown={(event) => {
              if (event.key === 'F2') {
                event.preventDefault();
                open();
              }
            }}
          >
            {shown}
            <span className="eds-visually-hidden">{t.edit(columnLabel, rowLabel)}</span>
          </button>
        )}
      </td>
    );
  },
);
TableEditableCell.displayName = 'TableEditableCell';
