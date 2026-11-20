import { describeBy, focusEl, uid } from '../core/dom';
import { getMessages } from '../core/config';
import { refCounted } from '../core/registry';

export type DialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'question';
export type DialogInputType = 'text' | 'email' | 'number' | 'password' | 'textarea';

/** Último argumento opcional de `alert`, `confirm` e `prompt`. */
export interface DialogOptions {
  /** Padrão: `info` no alert e `question` no confirm e no prompt. */
  variant?: DialogVariant;
  /** Texto do botão principal. Padrão: "OK" (alert, prompt) ou "Confirmar" (confirm). */
  okText?: string;
  /** Texto do botão que cancela. Padrão: "Cancelar". */
  cancelText?: string;
  /** Prompt: dica do campo. */
  placeholder?: string;
  /** Prompt: exige texto (espaços não contam). */
  required?: boolean;
  /** Prompt: tipo do campo. Padrão: `text`. */
  inputType?: DialogInputType;
  /** Prompt: devolve a mensagem de erro, ou `''` quando o valor é aceito. */
  validate?: (value: string) => string;
}

type Kind = 'alert' | 'confirm' | 'prompt';

interface Request {
  kind: Kind;
  text: string;
  title: string | undefined;
  variant: DialogVariant;
  defaultValue: string;
  options: DialogOptions;
  resolve: (value: unknown) => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Traçados dos glifos (24x24, traço): check, ! (warning/danger), i e ?. */
const GLYPHS: Record<DialogVariant, string[]> = {
  success: ['M5 12.5l4.5 4.5L19 7.5'],
  warning: ['M12 6v7.5M12 17.5v.01'],
  danger: ['M12 6v7.5M12 17.5v.01'],
  info: ['M12 11v6M12 7.5v.01'],
  question: ['M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17.5v.01'],
};

function glyph(variant: DialogVariant): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of GLYPHS[variant]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function severityPrefix(variant: DialogVariant, kind: Request['kind']): string | null {
  const m = getMessages();
  // Perguntar antes de excluir não é um erro: em confirm/prompt `danger` fala "Atenção:".
  if (variant === 'danger' && kind !== 'alert') return m.severityWarning;
  switch (variant) {
    case 'info':
      return m.severityInfo;
    case 'success':
      return m.severitySuccess;
    case 'warning':
      return m.severityWarning;
    case 'danger':
      return m.severityDanger;
    default:
      return null;
  }
}

// ---- Fila: um diálogo por vez ----------------------------------------------------------------

const queue: Request[] = [];
let running = false;

function enqueue(request: Request): void {
  queue.push(request);
  if (!running) next();
}

function next(): void {
  const request = queue.shift();
  if (!request) {
    running = false;
    return;
  }
  running = true;
  present(request, () => {
    // Quem espera pelo resultado continua antes do próximo diálogo abrir.
    queueMicrotask(next);
  });
}

// ---- Diálogo ---------------------------------------------------------------------------------

function present(request: Request, done: () => void): void {
  const { kind, text, title, variant, options } = request;
  const m = getMessages();
  const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const id = uid('ad');
  const titleId = `${id}-t`;
  const textId = `${id}-d`;
  const inputId = `${id}-i`;
  const errorId = `${id}-e`;

  const dialog = document.createElement('dialog');
  dialog.className = 'eds-modal eds-alert-dialog';
  dialog.setAttribute('data-variant', variant);
  // O fechamento pelo fundo é daqui (o do Modal fecharia também o `danger`).
  dialog.setAttribute('data-eds-backdrop', 'static');
  if (kind !== 'alert' && (variant === 'danger' || variant === 'warning')) {
    dialog.setAttribute('role', 'alertdialog');
  }

  const icon = document.createElement('div');
  icon.className = 'eds-alert-dialog-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.append(glyph(variant));

  const prefix = severityPrefix(variant, kind);
  const withPrefix = (el: HTMLElement, content: string) => {
    if (prefix) {
      const hidden = document.createElement('span');
      hidden.className = 'eds-visually-hidden';
      hidden.textContent = `${prefix} `;
      el.append(hidden);
    }
    el.append(content);
  };

  const textEl = document.createElement('p');
  textEl.className = 'eds-alert-dialog-text';
  textEl.id = textId;

  dialog.append(icon);
  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'eds-alert-dialog-title';
    titleEl.id = titleId;
    withPrefix(titleEl, title);
    textEl.textContent = text;
    dialog.append(titleEl, textEl);
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', textId);
  } else {
    // Sem título o texto é o nome do diálogo.
    withPrefix(textEl, text);
    dialog.append(textEl);
    dialog.setAttribute('aria-labelledby', textId);
  }

  let input: HTMLInputElement | HTMLTextAreaElement | null = null;
  let errorEl: HTMLElement | null = null;
  if (kind === 'prompt') {
    const field = document.createElement('div');
    field.className = 'eds-field';
    const label = document.createElement('label');
    label.className = 'eds-visually-hidden';
    label.htmlFor = inputId;
    label.textContent = title || text;
    const type = options.inputType ?? 'text';
    if (type === 'textarea') {
      const area = document.createElement('textarea');
      area.className = 'eds-textarea';
      area.rows = 3;
      input = area;
    } else {
      const field1 = document.createElement('input');
      field1.className = 'eds-input';
      field1.type = type;
      input = field1;
    }
    input.id = inputId;
    input.value = request.defaultValue;
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.required) input.setAttribute('aria-required', 'true');
    errorEl = document.createElement('p');
    errorEl.className = 'eds-error';
    errorEl.id = errorId;
    errorEl.hidden = true;
    field.append(label, input, errorEl);
    dialog.append(field);
  }

  const actions = document.createElement('div');
  actions.className = 'eds-alert-dialog-actions';
  const button = (cls: string, label: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `eds-button ${cls}`;
    b.textContent = label;
    return b;
  };
  let cancelBtn: HTMLButtonElement | null = null;
  if (kind !== 'alert') {
    cancelBtn = button('eds-button-secondary', options.cancelText ?? m.dialogCancel);
    actions.append(cancelBtn);
  }
  const okDefault = kind === 'confirm' ? m.dialogConfirm : m.dialogOk;
  const okBtn = button(
    variant === 'danger' ? 'eds-button-danger' : 'eds-button-primary',
    options.okText ?? okDefault,
  );
  actions.append(okBtn);
  dialog.append(actions);

  // ---- Resultado -----------------------------------------------------------------------------

  let settled = false;
  const cancelValue = kind === 'confirm' ? false : kind === 'prompt' ? null : undefined;
  const settle = (value: unknown) => {
    if (settled) return;
    settled = true;
    if (dialog.open) dialog.close();
    dialog.remove();
    if (origin?.isConnected) focusEl(origin);
    request.resolve(value);
    done();
  };

  /** Valor aceito ou `undefined` (erro mostrado, o diálogo continua). */
  const accept = (): { value: string | null | boolean | undefined } | null => {
    if (!input || !errorEl) return null;
    const value = input.value;
    let message = '';
    if (options.required && value.trim() === '') message = m.dialogRequired;
    else if (options.validate) message = options.validate(value);
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      errorEl.setAttribute('role', 'alert');
      input.setAttribute('aria-invalid', 'true');
      describeBy(input, errorId, true);
      focusEl(input);
      return { value: undefined };
    }
    return { value };
  };

  const confirmed = () => {
    if (kind === 'alert') return settle(undefined);
    if (kind === 'confirm') return settle(true);
    const result = accept();
    if (result && result.value !== undefined) settle(result.value);
  };

  okBtn.addEventListener('click', confirmed);
  cancelBtn?.addEventListener('click', () => settle(cancelValue));

  input?.addEventListener('input', () => {
    if (!input || !errorEl || errorEl.hidden) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
    errorEl.removeAttribute('role');
    input.removeAttribute('aria-invalid');
    describeBy(input, errorId, false);
  });
  input?.addEventListener('keydown', (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Enter' || event.isComposing) return;
    // No textarea Enter quebra a linha: Ctrl/Cmd+Enter confirma.
    if (input instanceof HTMLTextAreaElement && !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    confirmed();
  });

  // Esc cancela e não chega a quem estiver por trás.
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') event.stopPropagation();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    settle(cancelValue);
  });
  // Fechado por fora (ex.: remoção do DOM, `dialog.close()` de terceiros).
  dialog.addEventListener('close', () => settle(cancelValue));

  // Fundo: pointerdown e click no próprio <dialog>, fora da caixa; `danger` não fecha.
  let downOnBackdrop = false;
  const outside = (event: MouseEvent) => {
    if (event.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return true;
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };
  dialog.addEventListener('pointerdown', (event) => {
    downOnBackdrop = outside(event);
  });
  dialog.addEventListener('click', (event) => {
    const hit = downOnBackdrop && outside(event);
    downOnBackdrop = false;
    if (hit && variant !== 'danger') settle(cancelValue);
  });

  // ---- Abrir e focar -------------------------------------------------------------------------

  const initial: HTMLElement =
    input ?? (kind === 'confirm' && variant === 'danger' && cancelBtn ? cancelBtn : okBtn);
  initial.setAttribute('autofocus', '');
  document.body.append(dialog);
  try {
    dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }
  initial.focus();
  if (input) input.select();
}

// ---- API pública -----------------------------------------------------------------------------

/** Mostra um aviso com "OK". Resolve (`undefined`) ao fechar. */
export function alert(
  text: string,
  title?: string,
  variant?: DialogVariant,
  options?: DialogOptions,
): Promise<void> {
  return new Promise<void>((resolve) => {
    enqueue({
      kind: 'alert',
      text,
      title,
      variant: variant ?? options?.variant ?? 'info',
      defaultValue: '',
      options: options ?? {},
      resolve: () => resolve(),
    });
  });
}

/** Pergunta com "Cancelar" e "Confirmar". Resolve `true` ao confirmar, `false` ao cancelar. */
export function confirm(
  text: string,
  title?: string,
  variant?: DialogVariant,
  options?: DialogOptions,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    enqueue({
      kind: 'confirm',
      text,
      title,
      variant: variant ?? options?.variant ?? 'question',
      defaultValue: '',
      options: options ?? {},
      resolve: (value) => resolve(value === true),
    });
  });
}

/** Pede um texto. Resolve a string digitada ou `null` ao cancelar. */
export function prompt(
  text: string,
  defaultValue?: string,
  title?: string,
  options?: DialogOptions,
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    enqueue({
      kind: 'prompt',
      text,
      title,
      variant: options?.variant ?? 'question',
      defaultValue: defaultValue ?? '',
      options: options ?? {},
      resolve: (value) => resolve(typeof value === 'string' ? value : null),
    });
  });
}

export const dialogs = { alert, confirm, prompt };

// ---- window.alert (opt-in) -------------------------------------------------------------------

const acquireNativeAlert = refCounted(() => {
  const original = window.alert;
  const replacement = function alertReplacement(message?: unknown): void {
    // Não bloqueia: o código seguinte ao `alert` continua sem esperar.
    void alert(message === undefined ? '' : String(message));
  };
  window.alert = replacement;
  return () => {
    if (window.alert === replacement) window.alert = original;
  };
});

/**
 * Troca `window.alert` por `EDS.alert` enquanto houver um `init` com `nativeAlert: true`.
 * `confirm` e `prompt` nativos nunca são trocados (são síncronos).
 */
export function initNativeAlert(): () => void {
  return acquireNativeAlert();
}
