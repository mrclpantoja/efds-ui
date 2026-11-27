import { describeBy, emit, uid } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import { parseNumber } from '../core/data';
import { formatBy } from '../core/format';
import { columnLabel, hubFor } from '../core/table-hub';
import { isValidatorName, validateBy, VALIDATOR_MESSAGE_KEY } from '../core/validate';

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface CommitResult {
  value?: string;
  text?: string;
}

/** Nomes de formatação aceitos em `data-eds-edit-format` (os da máscara valem como apelido). */
const FORMAT_ALIAS: Record<string, string> = {
  moeda: 'currency',
  numero: 'number',
  data: 'date',
  telefone: 'phone',
};

const EDITABLE = 'td[data-eds-editable]:not([data-eds-editable="false"])';

const isField = (el: Element | null | undefined): el is Field =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement;

/**
 * Edição na célula (experimental): a tabela continua `<table>`, sem `role="grid"`. O editor da
 * coluna é um `<template>` (`th[data-eds-editor="id"]`); a célula editável (`td[data-eds-editable]`)
 * vira um botão que abre o editor. Enter confirma, Esc cancela, Tab/sair confirma se válido.
 * Eventos: `eds:table-edit-start|commit|cancel|error`.
 */
export const tableEditBehavior: Behavior = {
  name: 'table-edit',
  selector: 'table.eds-table',
  bind(el) {
    const table = el as HTMLTableElement;
    if (!table.querySelector('thead th[data-eds-editor]')) return;
    const doc = table.ownerDocument;
    const hub = hubFor(table);
    const ac = new AbortController();
    const { signal } = ac;

    interface Session {
      cell: HTMLTableCellElement;
      editor: Field;
      restore: Node[];
      previous: string;
      error: HTMLElement | null;
      hint: HTMLElement;
      busy: boolean;
    }
    let session: Session | null = null;

    // ---- Dados da célula ---------------------------------------------------------------
    const headerOf = (cell: HTMLTableCellElement) =>
      table.tHead?.rows[table.tHead.rows.length - 1]?.cells[cell.cellIndex] ?? null;
    const editorTemplate = (cell: HTMLTableCellElement): HTMLTemplateElement | null => {
      const id = headerOf(cell)?.getAttribute('data-eds-editor');
      const found = id ? doc.getElementById(id) : null;
      return found instanceof HTMLTemplateElement ? found : null;
    };
    const rowOf = (cell: HTMLTableCellElement) => cell.parentElement as HTMLTableRowElement;
    const rowName = (cell: HTMLTableCellElement) => {
      const row = rowOf(cell);
      return row.getAttribute('data-eds-row-label') ?? row.getAttribute('data-eds-row-id') ?? '';
    };
    const columnName = (cell: HTMLTableCellElement) => columnLabel(headerOf(cell));
    const fieldName = (cell: HTMLTableCellElement) =>
      cell.getAttribute('data-eds-edit-field') ??
      headerOf(cell)?.getAttribute('data-eds-col') ??
      '';
    const displayText = (cell: HTMLTableCellElement): string => {
      const clone = cell.cloneNode(true) as HTMLElement;
      for (const extra of clone.querySelectorAll('.eds-visually-hidden')) extra.remove();
      return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
    };
    const rawValue = (cell: HTMLTableCellElement): string =>
      cell.getAttribute('data-value') ?? cell.getAttribute('data-sort-value') ?? displayText(cell);

    // ---- Botão da célula ---------------------------------------------------------------
    const buildButton = (cell: HTMLTableCellElement, text: string): HTMLButtonElement => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'eds-table-cell-edit';
      button.append(doc.createTextNode(text));
      const hidden = doc.createElement('span');
      hidden.className = 'eds-visually-hidden';
      hidden.textContent = format(getMessages().tableEditLabel, {
        column: columnName(cell),
        row: rowName(cell),
      });
      button.append(hidden);
      return button;
    };

    const wrapCell = (cell: HTMLTableCellElement) => {
      if (
        cell.hasAttribute('data-editing') ||
        cell.querySelector(':scope > .eds-table-cell-edit')
      ) {
        return;
      }
      if (!editorTemplate(cell)) return;
      cell.replaceChildren(buildButton(cell, displayText(cell)));
    };
    const wrapAll = () => {
      for (const cell of table.querySelectorAll<HTMLTableCellElement>(EDITABLE)) wrapCell(cell);
    };
    wrapAll();
    const observer =
      typeof MutationObserver === 'undefined' || !table.tBodies[0]
        ? null
        : new MutationObserver((records) => {
            if (
              records.some((r) => [...r.addedNodes].some((n) => n instanceof HTMLTableRowElement))
            ) {
              wrapAll();
            }
          });
    if (table.tBodies[0]) observer?.observe(table.tBodies[0], { childList: true });

    // ---- Erro --------------------------------------------------------------------------
    const showError = (s: Session, message: string | null) => {
      if (!message) {
        s.editor.removeAttribute('aria-invalid');
        if (s.error) describeBy(s.editor, s.error.id, false);
        s.error?.remove();
        s.error = null;
        return;
      }
      if (!s.error) {
        s.error = doc.createElement('p');
        s.error.id = uid('edit-error');
        s.error.className = 'eds-error';
        s.cell.append(s.error);
      }
      s.error.textContent = message;
      s.editor.setAttribute('aria-invalid', 'true');
      describeBy(s.editor, s.error.id, true);
      hub.announce(format(getMessages().tableEditError, { message }));
    };

    const invalidMessage = (s: Session): string | null => {
      const m = getMessages();
      const custom = s.editor.getAttribute('data-eds-validate');
      if (!s.editor.checkValidity()) return s.editor.validationMessage || m.validateRequired;
      if (custom && isValidatorName(custom) && !validateBy(custom, s.editor.value)) {
        return s.editor.getAttribute('data-eds-error-message') ?? m[VALIDATOR_MESSAGE_KEY[custom]];
      }
      return null;
    };

    // ---- Sair da edição ----------------------------------------------------------------
    const leave = (s: Session, text: string | null, focusButton: boolean) => {
      const cell = s.cell;
      cell.removeAttribute('data-editing');
      cell.removeAttribute('aria-busy');
      s.hint.remove();
      const button = buildButton(cell, text ?? displayTextOf(s));
      cell.replaceChildren(button);
      session = null;
      if (focusButton) button.focus();
    };
    // Texto exibido antes da edição (guardado nos nós restaurados).
    const displayTextOf = (s: Session): string => {
      const holder = doc.createElement('div');
      holder.append(...s.restore.map((n) => n.cloneNode(true)));
      for (const extra of holder.querySelectorAll('.eds-visually-hidden')) extra.remove();
      return (holder.textContent ?? '').replace(/\s+/g, ' ').trim();
    };

    const display = (cell: HTMLTableCellElement, value: string, result: CommitResult): string => {
      if (result.text !== undefined) return result.text;
      const name = cell.getAttribute('data-eds-edit-format');
      if (name) {
        const mapped = FORMAT_ALIAS[name] ?? name;
        const n = parseNumber(value);
        const formatted = formatBy(
          mapped,
          n !== null && /currency|number/.test(mapped) ? n : value,
        );
        if (formatted !== '') return formatted;
      }
      return value;
    };

    const apply = (s: Session, value: string, result: CommitResult) => {
      const final = result.value ?? value;
      const cell = s.cell;
      const text = display(cell, final, result);
      const n = parseNumber(final);
      const normalized = n !== null ? String(n) : final;
      cell.setAttribute('data-sort-value', normalized);
      cell.setAttribute('data-value', normalized);
      const hadFocus = isFieldFocused(s);
      leave(s, text, hadFocus);
      hub.announce(
        format(getMessages().tableEditSaved, {
          column: columnName(cell),
          row: rowName(cell),
          value: text,
        }),
      );
    };
    const isFieldFocused = (s: Session) => doc.activeElement === s.editor;

    const fail = (s: Session, error: unknown) => {
      s.busy = false;
      s.cell.removeAttribute('aria-busy');
      if ('readOnly' in s.editor) s.editor.readOnly = false;
      const message = error instanceof Error ? error.message : String(error ?? '');
      showError(s, message || getMessages().tableEditError.replace('{message}', '').trim());
      s.editor.focus();
      emit(table, 'table-edit-error', {
        cell: s.cell,
        row: rowOf(s.cell),
        rowId: rowOf(s.cell).getAttribute('data-eds-row-id'),
        field: fieldName(s.cell),
        message,
        error,
      });
    };

    /** Confirma. Devolve `false` se ficou em edição (inválido ou cancelado pelo app). */
    const commit = (s: Session): boolean => {
      if (s.busy) return false;
      const message = invalidMessage(s);
      if (message) {
        showError(s, message);
        return false;
      }
      showError(s, null);
      const value = s.editor.value.trim();
      if (value === s.previous.trim() || s.editor.value === s.previous) {
        leave(s, null, isFieldFocused(s));
        return true;
      }
      let promise: Promise<CommitResult | void> | null = null;
      const detail = {
        cell: s.cell,
        row: rowOf(s.cell),
        rowId: rowOf(s.cell).getAttribute('data-eds-row-id'),
        field: fieldName(s.cell),
        value,
        number: parseNumber(value),
        previous: s.previous,
        setError: (text: string) => showError(s, text),
        respondWith: (p: Promise<CommitResult | void>) => {
          promise = p;
        },
      };
      if (!emit(table, 'table-edit-commit', detail, true)) return false;
      const pending = promise as Promise<CommitResult | void> | null;
      if (!pending) {
        apply(s, value, {});
        return true;
      }
      s.busy = true;
      s.cell.setAttribute('aria-busy', 'true');
      if ('readOnly' in s.editor) s.editor.readOnly = true;
      hub.announce(getMessages().tableEditSaving);
      pending.then(
        (result) => apply(s, value, result ?? {}),
        (error: unknown) => fail(s, error),
      );
      return true;
    };

    const cancel = (s: Session) => {
      if (s.busy) return;
      const cell = s.cell;
      emit(table, 'table-edit-cancel', {
        cell,
        row: rowOf(cell),
        rowId: rowOf(cell).getAttribute('data-eds-row-id'),
        field: fieldName(cell),
      });
      cell.removeAttribute('data-editing');
      s.hint.remove();
      cell.replaceChildren(...s.restore);
      session = null;
      cell.querySelector<HTMLElement>('.eds-table-cell-edit')?.focus();
    };

    // ---- Entrar na edição --------------------------------------------------------------
    const start = (cell: HTMLTableCellElement): boolean => {
      if (table.getAttribute('aria-busy') === 'true' || table.hasAttribute('inert')) return false;
      if (session) {
        if (session.cell === cell) return false;
        // Abrir outra confirma a atual se válida; senão a mantém e não abre.
        if (!commit(session) || session) return false;
      }
      const template = editorTemplate(cell);
      const source = template?.content.firstElementChild;
      if (!source) return false;
      const value = rawValue(cell);
      const detail = {
        cell,
        row: rowOf(cell),
        rowId: rowOf(cell).getAttribute('data-eds-row-id'),
        field: fieldName(cell),
        value,
      };
      if (!emit(table, 'table-edit-start', detail, true)) return false;
      const editor = source.cloneNode(true) as Field;
      if (!isField(editor)) return false;
      const m = getMessages();
      const restore = Array.from(cell.childNodes);
      const hint = doc.createElement('p');
      hint.id = uid('edit-hint');
      hint.className = 'eds-visually-hidden';
      hint.textContent = m.tableEditHint;
      editor.setAttribute(
        'aria-label',
        format(m.tableEditFieldLabel, { column: columnName(cell), row: rowName(cell) }),
      );
      describeBy(editor, hint.id, true);
      // Campo mascarado recebe o texto exibido; os demais, o valor cru.
      editor.value = editor.hasAttribute('data-eds-mask') ? displayText(cell) : value;
      const s: Session = {
        cell,
        editor,
        restore,
        previous: editor.value,
        error: null,
        hint,
        busy: false,
      };
      cell.setAttribute('data-editing', '');
      cell.replaceChildren(editor, hint);
      session = s;
      editor.focus();
      if (editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) {
        try {
          editor.select();
        } catch {
          /* tipos sem seleção de texto */
        }
      }
      return true;
    };

    // ---- Eventos -----------------------------------------------------------------------
    table.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element).closest<HTMLElement>('.eds-table-cell-edit');
        const cell = button?.closest('td');
        if (button && cell && table.contains(cell)) start(cell);
      },
      { signal },
    );
    table.addEventListener(
      'keydown',
      (event) => {
        const target = event.target as Element;
        const button = target.closest<HTMLElement>('.eds-table-cell-edit');
        if (button && event.key === 'F2') {
          event.preventDefault();
          const cell = button.closest('td');
          if (cell) start(cell);
          return;
        }
        const s = session;
        if (!s || target !== s.editor) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          cancel(s);
        } else if (event.key === 'Enter') {
          const multiline = s.editor instanceof HTMLTextAreaElement;
          if (multiline && !(event.ctrlKey || event.metaKey)) return;
          event.preventDefault();
          commit(s);
        }
      },
      { signal },
    );
    table.addEventListener(
      'focusout',
      (event) => {
        const s = session;
        if (!s || event.target !== s.editor || s.busy) return;
        const next = (event as FocusEvent).relatedTarget;
        if (next instanceof Node && s.cell.contains(next)) return;
        // O foco saiu da célula: confirma se válido; inválido permanece com o erro visível.
        commit(s);
      },
      { signal },
    );

    return () => {
      ac.abort();
      observer?.disconnect();
      if (session) cancel(session);
    };
  },
};

export function initTableEdit(root: ParentNode = document): () => void {
  return bindAll(root, [tableEditBehavior]);
}
