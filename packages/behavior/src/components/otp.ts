import { format, getMessages } from '../core/config';
import { emit } from '../core/dom';
import { otpFill, otpSanitize, type OtpKind } from '../core/fields';
import { bindAll, type Behavior } from '../core/registry';

const DEFAULT_LENGTH = 6;

/**
 * Código de verificação (OTP): `fieldset[data-eds-otp]` com uma célula por caractere
 * (`input.eds-otp-cell`) e um hidden com o código inteiro (`data-eds-otp-name`). Se o fieldset traz
 * só um `input.eds-otp-single` (o fallback sem JS), as células são criadas e o campo único some.
 *
 * Digitar avança; Backspace volta (e apaga); setas, Home e End movem; colar (ou o preenchimento do
 * SMS, que entra na primeira célula) distribui o código. `autocomplete="one-time-code"` só na
 * primeira. `data-eds-otp-length` (6), `data-eds-otp-type="numeric|alphanumeric"`. Eventos
 * `eds:otp-change` e `eds:otp-complete` (`{ value }`), no fieldset.
 */
export const otpBehavior: Behavior = {
  name: 'otp',
  selector: '[data-eds-otp]',
  bind(root) {
    const kind: OtpKind =
      root.getAttribute('data-eds-otp-type') === 'alphanumeric' ? 'alphanumeric' : 'numeric';
    const lengthAttr = Number(root.getAttribute('data-eds-otp-length'));
    const ac = new AbortController();
    const { signal } = ac;
    const undo: (() => void)[] = [];

    let cells = Array.from(root.querySelectorAll<HTMLInputElement>('input.eds-otp-cell'));
    let hidden = root.querySelector<HTMLInputElement>('input[type="hidden"]');
    const single = root.querySelector<HTMLInputElement>('input.eds-otp-single');
    const name =
      root.getAttribute('data-eds-otp-name') ??
      hidden?.getAttribute('name') ??
      single?.getAttribute('name') ??
      '';

    // Fallback sem JS (campo único) -> células.
    if (cells.length === 0 && single) {
      const total = Number.isFinite(lengthAttr) && lengthAttr > 0 ? lengthAttr : DEFAULT_LENGTH;
      const wrap = document.createElement('div');
      wrap.className = 'eds-otp-cells';
      for (let i = 0; i < total; i++) {
        const cell = document.createElement('input');
        cell.className = 'eds-input eds-otp-cell';
        cell.type = 'text';
        cell.maxLength = 1;
        if (single.required) cell.required = true;
        if (single.disabled) cell.disabled = true;
        wrap.append(cell);
      }
      single.after(wrap);
      const keep = single.getAttribute('name');
      single.hidden = true;
      single.disabled = true;
      single.removeAttribute('name');
      if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        if (name) hidden.name = name;
        wrap.after(hidden);
      }
      undo.push(() => {
        wrap.remove();
        single.hidden = false;
        single.disabled = false;
        if (keep) single.setAttribute('name', keep);
      });
      cells = Array.from(wrap.querySelectorAll<HTMLInputElement>('input'));
    }
    if (cells.length === 0) return;
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      if (name) hidden.name = name;
      cells[cells.length - 1]?.parentElement?.after(hidden);
      const made = hidden;
      undo.push(() => made.remove());
    }
    const out = hidden;
    const total = cells.length;
    const m = getMessages();

    // Atributos das células (sem sobrescrever os do autor).
    const added: [HTMLInputElement, string][] = [];
    const setDefault = (cell: HTMLInputElement, attr: string, value: string) => {
      if (cell.hasAttribute(attr)) return;
      cell.setAttribute(attr, value);
      added.push([cell, attr]);
    };
    cells.forEach((cell, i) => {
      setDefault(cell, 'inputmode', kind === 'numeric' ? 'numeric' : 'text');
      setDefault(
        cell,
        'aria-label',
        format(kind === 'numeric' ? m.otpCell : m.otpCellChar, { n: i + 1, total }),
      );
      setDefault(cell, 'autocomplete', i === 0 ? 'one-time-code' : 'off');
      setDefault(cell, 'enterkeyhint', i === total - 1 ? 'done' : 'next');
    });
    // A primeira célula aceita o código inteiro (preenchimento do SMS), então não pode cortar em 1.
    const first = cells[0];
    const firstMax = first?.getAttribute('maxlength') ?? null;
    first?.removeAttribute('maxlength');
    undo.push(() => {
      if (first && firstMax !== null) first.setAttribute('maxlength', firstMax);
    });
    // Só a primeira leva `one-time-code`.
    for (let i = 1; i < total; i++) {
      if (cells[i]?.getAttribute('autocomplete') === 'one-time-code') {
        cells[i]?.setAttribute('autocomplete', 'off');
      }
    }

    const values = () => cells.map((c) => c.value);
    let lastCode = '';
    const sync = (announce: boolean) => {
      const code = values().join('');
      out.value = code;
      if (code === lastCode) return;
      lastCode = code;
      if (!announce) return;
      emit(root, 'otp-change', { value: code });
      if (code.length === total && values().every((v) => v !== '')) {
        emit(root, 'otp-complete', { value: code });
      }
    };
    const write = (next: readonly string[]) => {
      cells.forEach((cell, i) => {
        const v = next[i] ?? '';
        if (cell.value !== v) cell.value = v;
      });
    };
    const focusCell = (index: number, select = true) => {
      const cell = cells[Math.max(0, Math.min(total - 1, index))];
      if (!cell) return;
      cell.focus();
      if (select) cell.select();
    };

    // Valor inicial (do servidor): o hidden ou o campo único pode vir preenchido.
    const initial = otpSanitize(out.value || single?.value || '', kind);
    if (initial !== '')
      write(
        otpFill(
          values().map(() => ''),
          0,
          initial,
          kind,
        ).cells,
      );
    sync(false);

    cells.forEach((cell, index) => {
      cell.addEventListener(
        'input',
        (event) => {
          if ((event as InputEvent).isComposing) return;
          const text = otpSanitize(cell.value, kind);
          if (text === '') {
            cell.value = '';
            sync(true);
            return;
          }
          // Um caractere: fica na célula e avança. Vários (SMS, colar sem o evento): distribui.
          const filled = otpFill(values(), index, text, kind);
          const next = values();
          const merged =
            text.length > 1
              ? filled.cells
              : next.map((v, i) => (i === index ? (text[0] ?? '') : v));
          write(merged);
          sync(true);
          if (text.length > 1) focusCell(filled.next);
          else if (index < total - 1) focusCell(index + 1);
        },
        { signal },
      );
      cell.addEventListener(
        'keydown',
        (event) => {
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          switch (event.key) {
            case 'Backspace':
              // Célula vazia: volta e apaga a anterior; com valor, o navegador apaga e o `input` cuida.
              if (cell.value === '' && index > 0) {
                event.preventDefault();
                const prev = cells[index - 1];
                if (prev) prev.value = '';
                sync(true);
                focusCell(index - 1);
              }
              break;
            case 'Delete':
              event.preventDefault();
              cell.value = '';
              sync(true);
              break;
            case 'ArrowLeft':
              event.preventDefault();
              focusCell(index - 1);
              break;
            case 'ArrowRight':
              event.preventDefault();
              focusCell(index + 1);
              break;
            case 'Home':
              event.preventDefault();
              focusCell(0);
              break;
            case 'End':
              event.preventDefault();
              focusCell(total - 1);
              break;
            default:
          }
        },
        { signal },
      );
      cell.addEventListener(
        'paste',
        (event) => {
          const pasted = event.clipboardData?.getData('text') ?? '';
          const text = otpSanitize(pasted, kind);
          if (text === '') {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          // Código inteiro: sempre desde a primeira célula; trecho: a partir da célula atual.
          const start = text.length >= total ? 0 : index;
          const filled = otpFill(values(), start, text, kind);
          write(filled.cells);
          sync(true);
          focusCell(filled.next);
        },
        { signal },
      );
      cell.addEventListener('focus', () => cell.select(), { signal });
      // Enter só avança até a última; na última, o envio do formulário é o nativo.
    });

    return () => {
      ac.abort();
      for (const [cell, attr] of added) cell.removeAttribute(attr);
      for (const stop of undo.reverse()) stop();
    };
  },
};

export function initOtp(root: ParentNode = document): () => void {
  return bindAll(root, [otpBehavior]);
}
