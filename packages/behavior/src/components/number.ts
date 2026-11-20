import { format, getMessages } from '../core/config';
import { emit } from '../core/dom';
import { clampNumber, decimalsOf, stepNumber } from '../core/fields';
import { createMask, type Mask } from '../core/mask';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 70;

const numberAttr = (el: Element, name: string): number | undefined => {
  const raw = el.getAttribute(name);
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * NumberInput: `.eds-number[data-eds-number]` com um `input` de texto (`inputmode="decimal"`) e os
 * botões Diminuir/Aumentar (`data-eds-number-dec` / `-inc`, ou o primeiro e o último `button`).
 * Opções no `.eds-number` (ou no input): `data-eds-number-min`, `-max`, `-step` (1), `-decimals`
 * (padrão: as casas do passo) e `data-eds-number-unmask` (hidden com `1234.5`). Com casas decimais usa
 * a máscara `numero` (vírgula, milhar com ponto).
 *
 * Teclado (padrão `spinbutton`): ↑/↓ um passo, PageUp/PageDown dez, Home/End mínimo e máximo (só se
 * definidos). Segurar o botão repete. Valor fora da faixa é ajustado ao sair do campo e anunciado.
 * Evento `eds:number-change` (`{ value: number | null, text }`).
 */
export const numberBehavior: Behavior = {
  name: 'number',
  selector: '[data-eds-number]',
  bind(root) {
    const input = root.querySelector<HTMLInputElement>('input:not([type="hidden"])');
    if (!input) return;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
    const dec =
      root.querySelector<HTMLButtonElement>('[data-eds-number-dec]') ??
      (buttons.length >= 2 ? buttons[0] : undefined);
    const inc =
      root.querySelector<HTMLButtonElement>('[data-eds-number-inc]') ??
      (buttons.length >= 2 ? buttons[buttons.length - 1] : undefined);

    const read = (name: string) =>
      numberAttr(root, `data-eds-number-${name}`) ??
      numberAttr(input, `data-eds-number-${name}`) ??
      (name === 'min' || name === 'max' || name === 'step' ? numberAttr(input, name) : undefined);
    const min = read('min');
    const max = read('max');
    const stepRaw = read('step');
    const step = stepRaw !== undefined && stepRaw > 0 ? stepRaw : 1;
    // Máscara do próprio autor (`data-eds-mask` no input): ela edita o texto; aqui só se lê e formata.
    const maskSpec = input.getAttribute('data-eds-mask');
    const external = maskSpec !== null && maskSpec.trim() !== '';
    const decimals = Math.max(
      0,
      Math.min(
        8,
        Math.trunc(
          read('decimals') ?? numberAttr(input, 'data-eds-mask-decimals') ?? decimalsOf(step),
        ),
      ),
    );
    const negative = min === undefined || min < 0;
    const range = { min, max };
    const mask: Mask | null = external
      ? createMask(maskSpec.trim(), {
          decimals,
          negative,
          prefix: input.getAttribute('data-eds-mask-prefix') ?? undefined,
        })
      : decimals > 0
        ? createMask('numero', { decimals, negative })
        : null;

    const ac = new AbortController();
    const { signal } = ac;
    const added: string[] = [];
    const setDefault = (name: string, value: string | undefined) => {
      if (value === undefined || input.hasAttribute(name)) return;
      input.setAttribute(name, value);
      added.push(name);
    };
    setDefault('role', 'spinbutton');
    setDefault('inputmode', decimals > 0 ? 'decimal' : negative ? 'text' : 'numeric');
    setDefault('autocomplete', 'off');
    setDefault('aria-valuemin', min === undefined ? undefined : String(min));
    setDefault('aria-valuemax', max === undefined ? undefined : String(max));
    const m = getMessages();
    if (dec && !dec.hasAttribute('aria-label') && (dec.textContent ?? '').trim() === '') {
      dec.setAttribute('aria-label', m.numberDecrement);
    }
    if (inc && !inc.hasAttribute('aria-label') && (inc.textContent ?? '').trim() === '') {
      inc.setAttribute('aria-label', m.numberIncrement);
    }
    for (const b of [dec, inc]) if (b && !b.hasAttribute('tabindex')) b.tabIndex = -1;

    // Valor limpo para o servidor (opcional).
    const name = input.getAttribute('name');
    let hidden: HTMLInputElement | null = null;
    if (root.hasAttribute('data-eds-number-unmask') && name) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = name;
      hidden.setAttribute('data-eds-number-raw', '');
      input.removeAttribute('name');
      input.after(hidden);
    }

    const status = document.createElement('span');
    status.className = 'eds-visually-hidden';
    status.setAttribute('role', 'status');
    root.after(status);
    const announcer = createAnnouncer(status);

    // ---- Valor ----------------------------------------------------------------------------
    const parse = (text: string): number | null => {
      if (text.trim() === '') return null;
      if (mask) {
        const raw = mask.unmask(text);
        return raw === '' || raw === '-' ? null : Number(raw);
      }
      const digits = text.replace(/\D/g, '');
      if (digits === '') return null;
      return Number(negative && text.trim().startsWith('-') ? `-${digits}` : digits);
    };
    const show = (value: number | null): string => {
      if (value === null) return '';
      return mask ? mask.format(value.toFixed(decimals)) : String(value);
    };

    // Valor inicial (do servidor, p.ex. "1234.5"): a máscara o lê como número, não como centavos.
    let value = parse(mask ? mask.format(input.value) : input.value);
    let last = input.value;
    const reflect = () => {
      if (value === null) {
        input.removeAttribute('aria-valuenow');
        input.removeAttribute('aria-valuetext');
      } else {
        input.setAttribute('aria-valuenow', String(value));
        input.setAttribute('aria-valuetext', input.value);
      }
      if (hidden) hidden.value = value === null ? '' : value.toFixed(decimals);
      if (dec)
        dec.disabled = input.disabled || (value !== null && min !== undefined && value <= min);
      if (inc)
        inc.disabled = input.disabled || (value !== null && max !== undefined && value >= max);
      // Um botão que se desabilita com o foco nele (clique no limite) o perderia: o foco vai ao campo.
      for (const b of [dec, inc]) {
        if (b && b.disabled && document.activeElement === b && !input.disabled) input.focus();
      }
    };
    const write = (text: string) => {
      if (input.value !== text) input.value = text;
      // Texto posto por código: a máscara do autor (se houver) é avisada para atualizar o hidden.
      last = text;
    };
    const changed = () => emit(root, 'number-change', { value, text: input.value });

    /** Põe `next` (já dentro da faixa) no campo. */
    const setValue = (next: number | null, notify: boolean) => {
      const before = value;
      value = next;
      write(show(next));
      reflect();
      if (notify && before !== next) changed();
    };

    // Valor inicial (do servidor): normalizado pela máscara, sem avisar.
    if (value !== null) setValue(clampNumber(value, range), false);
    else reflect();

    /** Fim da edição: lê o texto, ajusta à faixa e avisa. */
    const commit = (announceAdjust: boolean) => {
      const typed = parse(input.value);
      if (typed === null) {
        setValue(null, true);
        return;
      }
      const fixed = clampNumber(typed, range);
      setValue(fixed, true);
      if (announceAdjust && fixed !== typed) {
        announcer.say(format(getMessages().numberAdjusted, { value: input.value }));
      }
    };

    const stepBy = (steps: number) => {
      const current = parse(input.value);
      setValue(stepNumber(current, steps, step, range, decimals), true);
    };

    input.addEventListener(
      'input',
      (event) => {
        if ((event as InputEvent).isComposing) return;
        if (external) {
          // A máscara do autor reescreve o texto e avisa por `eds:mask-change`.
          return;
        }
        if (mask) {
          const result = mask.edit({
            text: input.value,
            caret: input.selectionStart ?? input.value.length,
            prev: last,
            inputType: (event as InputEvent).inputType,
          });
          write(result.value);
          if (document.activeElement === input) input.setSelectionRange(result.caret, result.caret);
        } else {
          const cleaned = input.value.replace(negative ? /(?!^-)[^\d]/g : /[^\d]/g, '');
          if (cleaned !== input.value) {
            const caret = Math.max(
              0,
              (input.selectionStart ?? cleaned.length) - (input.value.length - cleaned.length),
            );
            write(cleaned);
            input.setSelectionRange(caret, caret);
          }
          last = input.value;
        }
        value = parse(input.value);
        reflect();
      },
      { signal },
    );
    input.addEventListener(
      'eds:mask-change',
      () => {
        value = parse(input.value);
        reflect();
      },
      { signal },
    );
    input.addEventListener('blur', () => commit(true), { signal });
    input.addEventListener(
      'keydown',
      (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || input.readOnly) return;
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            stepBy(1);
            break;
          case 'ArrowDown':
            event.preventDefault();
            stepBy(-1);
            break;
          case 'PageUp':
            event.preventDefault();
            stepBy(10);
            break;
          case 'PageDown':
            event.preventDefault();
            stepBy(-10);
            break;
          case 'Home':
            if (min !== undefined) {
              event.preventDefault();
              setValue(min, true);
            }
            break;
          case 'End':
            if (max !== undefined) {
              event.preventDefault();
              setValue(max, true);
            }
            break;
          case 'Enter':
            commit(true);
            break;
          default:
        }
      },
      { signal },
    );

    // ---- Botões: um passo por clique e repetição enquanto pressionado ---------------------
    let delay: ReturnType<typeof setTimeout> | null = null;
    let repeat: ReturnType<typeof setInterval> | null = null;
    const stopRepeat = () => {
      if (delay) clearTimeout(delay);
      if (repeat) clearInterval(repeat);
      delay = null;
      repeat = null;
    };
    const wire = (button: HTMLButtonElement | undefined, direction: 1 | -1) => {
      if (!button) return;
      button.addEventListener(
        'pointerdown',
        (event) => {
          if (event.button !== 0 || button.disabled || input.readOnly) return;
          // O campo não perde o foco ao usar os botões.
          if (document.activeElement === input) event.preventDefault();
          stepBy(direction);
          stopRepeat();
          delay = setTimeout(() => {
            repeat = setInterval(() => {
              if (button.disabled) stopRepeat();
              else stepBy(direction);
            }, REPEAT_INTERVAL_MS);
          }, REPEAT_DELAY_MS);
        },
        { signal },
      );
      for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
        button.addEventListener(type, stopRepeat, { signal });
      }
      // Teclado (Enter/Espaço) gera `click` sem ponteiro (`detail` 0); o clique do mouse já foi tratado.
      button.addEventListener(
        'click',
        (event) => {
          if (event.detail === 0 && !button.disabled && !input.readOnly) stepBy(direction);
        },
        { signal },
      );
    };
    wire(dec, -1);
    wire(inc, 1);

    // O formulário envia o valor já normalizado.
    input.form?.addEventListener('submit', () => commit(false), { signal, capture: true });

    return () => {
      ac.abort();
      stopRepeat();
      announcer.dispose();
      status.remove();
      hidden?.remove();
      if (hidden && name) input.setAttribute('name', name);
      for (const attr of added) input.removeAttribute(attr);
    };
  },
};

export function initNumber(root: ParentNode = document): () => void {
  return bindAll(root, [numberBehavior]);
}
