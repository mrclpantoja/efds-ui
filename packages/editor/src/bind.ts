import { mountEditor, type EditorCoreOptions, type EditorHandle } from './editor';
import { getMessages } from './messages';

export interface EditorInstance extends EditorHandle {
  /** Elemento ligado (o textarea ou o `host`). */
  target: HTMLElement;
}

export interface CreateEditorOptions extends EditorCoreOptions {
  /**
   * Só com `host` que não é textarea: campo (input hidden/textarea) que recebe o HTML, para o
   * formulário enviar. Com textarea, o próprio textarea é o campo.
   */
  field?: HTMLInputElement | HTMLTextAreaElement | null;
}

const instances = new WeakMap<HTMLElement, EditorInstance>();

/** Editor já ligado a este elemento, se houver. */
export function getEditor(target: Element): EditorInstance | undefined {
  return target instanceof HTMLElement ? instances.get(target) : undefined;
}

function fire(target: EventTarget, name: string, detail: unknown): void {
  target.dispatchEvent(new CustomEvent(`eds:editor-${name}`, { bubbles: true, detail }));
}

/**
 * Cria o editor. Com `textarea`, liga o textarea (fica `hidden`, mas continua no formulário,
 * recebendo o HTML a cada mudança e no envio); com outro elemento, monta o editor dentro dele.
 * `destroy()` devolve o textarea ao que era.
 */
export function createEditor(
  target: HTMLElement,
  options: CreateEditorOptions = {},
): EditorInstance {
  const existing = instances.get(target);
  if (existing) return existing;
  return target instanceof HTMLTextAreaElement
    ? bindTextarea(target, options)
    : bindHost(target, options);
}

interface GuardOptions {
  handle: EditorHandle;
  messages: ReturnType<typeof getMessages>;
  required: () => boolean;
  disabled: () => boolean;
  /** `invalid` e `aria-describedby` do autor, sem o erro de "obrigatório". */
  base: () => { invalid: boolean; describedBy: string };
}

/**
 * Campo obrigatório vazio no envio: bloqueia o formulário, mostra `p.eds-error` ligado ao
 * conteúdo (`aria-describedby`), marca `aria-invalid` e leva o foco ao editor. O erro some ao
 * digitar ou no `reset`.
 */
function createRequiredGuard(o: GuardOptions) {
  let error: HTMLParagraphElement | null = null;
  const state = () => {
    const base = o.base();
    return {
      invalid: base.invalid || error !== null,
      describedBy: [base.describedBy, error?.id].filter(Boolean).join(' '),
    };
  };
  const apply = () => o.handle.update(state());
  return {
    state,
    apply,
    clear() {
      if (!error) return;
      error.remove();
      error = null;
      apply();
    },
    /** No `submit`: devolve `true` se bloqueou o envio. */
    check(event: Event): boolean {
      const empty = o.handle.getHTML().trim() === '';
      if (!o.required() || o.disabled() || !empty) return false;
      event.preventDefault();
      if (!error) {
        const doc = o.handle.element.ownerDocument;
        error = doc.createElement('p');
        error.className = 'eds-error';
        error.id = `${o.handle.content.id}-required`;
        error.textContent = o.messages.required;
        o.handle.element.after(error);
      }
      apply();
      o.handle.focus();
      return true;
    },
    destroy() {
      error?.remove();
      error = null;
    },
  };
}

function bindHost(host: HTMLElement, options: CreateEditorOptions): EditorInstance {
  const field = options.field ?? null;
  const messages = getMessages(options.messages);
  const base = { invalid: options.invalid ?? false, describedBy: options.describedBy ?? '' };
  let required = options.required ?? false;
  let disabled = options.disabled ?? false;
  const write = (html: string) => {
    if (field) field.value = html;
  };
  // eslint-disable-next-line prefer-const -- o guarda e o editor se referenciam.
  let guard: ReturnType<typeof createRequiredGuard>;
  const handle = mountEditor(host, {
    ...options,
    invalid: options.invalid || undefined,
    onChange(html) {
      if (html.trim() !== '') guard.clear();
      write(html);
      options.onChange?.(html);
      fire(host, 'change', { html });
    },
    onFocus() {
      options.onFocus?.();
      fire(host, 'focus', {});
    },
    onBlur() {
      options.onBlur?.();
      fire(host, 'blur', {});
    },
  });
  guard = createRequiredGuard({
    handle,
    messages,
    // Só com campo (`name`) há o que enviar.
    required: () => required && field !== null,
    disabled: () => disabled,
    base: () => base,
  });
  write(handle.getHTML());
  const form = field?.form ?? host.closest('form');
  const onSubmit = (event: Event) => {
    handle.flush();
    write(handle.getHTML());
    guard.check(event);
  };
  const onReset = () => guard.clear();
  form?.addEventListener('submit', onSubmit, true);
  form?.addEventListener('reset', onReset);
  const instance: EditorInstance = {
    ...handle,
    target: host,
    setHTML(html) {
      handle.setHTML(html);
      write(handle.getHTML());
    },
    update(next) {
      if (next.invalid !== undefined) base.invalid = next.invalid;
      if (next.describedBy !== undefined) base.describedBy = next.describedBy;
      if (next.required !== undefined) required = next.required;
      if (next.disabled !== undefined) disabled = next.disabled;
      handle.update({ ...next, ...guard.state() });
    },
    destroy() {
      form?.removeEventListener('submit', onSubmit, true);
      form?.removeEventListener('reset', onReset);
      guard.destroy();
      handle.destroy();
      instances.delete(host);
    },
  };
  instances.set(host, instance);
  queueMicrotask(() => fire(host, 'ready', { editor: instance }));
  return instance;
}

function bindTextarea(textarea: HTMLTextAreaElement, options: CreateEditorOptions): EditorInstance {
  const wasHidden = textarea.hidden;
  const hadRequired = textarea.required;
  const label = textarea.labels?.[0] ?? null;
  if (label && !label.id) label.id = `${textarea.id || 'eds-editor'}-label`;
  const messages = getMessages(options.messages);
  const rowsAttr = Number(textarea.getAttribute('rows'));

  let changedSinceFocus = false;
  // eslint-disable-next-line prefer-const -- o guarda e o editor se referenciam.
  let guard: ReturnType<typeof createRequiredGuard>;

  const write = (html: string) => {
    if (textarea.value === html) return;
    textarea.value = html;
    // `input` para quem observa o campo (guarda de alterações não salvas, bibliotecas de formulário).
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const handle = mountEditor(
    textarea.parentElement ?? textarea,
    {
      ...options,
      value: options.value ?? textarea.value,
      id: options.id ?? (textarea.id ? `${textarea.id}-editor` : undefined),
      labelledBy: options.labelledBy ?? label?.id,
      ariaLabel: options.ariaLabel ?? textarea.getAttribute('aria-label') ?? undefined,
      disabled: options.disabled ?? textarea.disabled,
      readOnly: options.readOnly ?? textarea.readOnly,
      invalid: options.invalid ?? textarea.getAttribute('aria-invalid') === 'true',
      required: options.required ?? hadRequired,
      placeholder: options.placeholder ?? textarea.placeholder,
      rows: options.rows ?? (rowsAttr > 0 ? rowsAttr : undefined),
      describedBy: options.describedBy ?? textarea.getAttribute('aria-describedby') ?? undefined,
      onChange(html) {
        changedSinceFocus = true;
        if (html.trim() !== '') guard.clear();
        write(html);
        options.onChange?.(html);
        fire(textarea, 'change', { html });
      },
      onFocus() {
        changedSinceFocus = false;
        options.onFocus?.();
        fire(textarea, 'focus', {});
      },
      onBlur() {
        options.onBlur?.();
        if (changedSinceFocus) textarea.dispatchEvent(new Event('change', { bubbles: true }));
        changedSinceFocus = false;
        fire(textarea, 'blur', {});
      },
    },
    { after: textarea },
  );

  guard = createRequiredGuard({
    handle,
    messages,
    required: () => hadRequired,
    disabled: () => textarea.disabled,
    base: () => ({
      invalid: textarea.getAttribute('aria-invalid') === 'true',
      describedBy: textarea.getAttribute('aria-describedby') ?? '',
    }),
  });

  // O textarea guarda o HTML já limpo; o required nativo não valida campo escondido (trata-se no envio).
  textarea.hidden = true;
  textarea.required = false;
  write(handle.getHTML());
  const defaultValue = textarea.defaultValue;

  const onLabelClick = () => handle.focus();
  label?.addEventListener('click', onLabelClick);

  const form = textarea.form;
  const onSubmit = (event: Event) => {
    handle.flush();
    write(handle.getHTML());
    guard.check(event);
  };
  const onFormData = (event: Event) => {
    const data = (event as FormDataEvent).formData;
    if (textarea.name && !textarea.disabled) data.set(textarea.name, handle.getHTML());
  };
  const onReset = () => {
    // O reset do formulário devolve o textarea ao valor original só depois do evento.
    setTimeout(() => {
      guard.clear();
      handle.setHTML(defaultValue);
      textarea.value = handle.getHTML();
    }, 0);
  };
  form?.addEventListener('submit', onSubmit, true);
  form?.addEventListener('formdata', onFormData);
  form?.addEventListener('reset', onReset);

  const observer = new MutationObserver(() => {
    handle.update({
      disabled: textarea.disabled,
      readOnly: textarea.readOnly,
      ...guard.state(),
      placeholder: textarea.placeholder,
      rows: Number(textarea.getAttribute('rows')) || undefined,
    });
  });
  observer.observe(textarea, {
    attributes: true,
    attributeFilter: [
      'disabled',
      'readonly',
      'aria-invalid',
      'aria-describedby',
      'placeholder',
      'rows',
    ],
  });

  const instance: EditorInstance = {
    ...handle,
    target: textarea,
    setHTML(html) {
      handle.setHTML(html);
      write(handle.getHTML());
    },
    destroy() {
      handle.flush();
      textarea.value = handle.getHTML();
      guard.destroy();
      observer.disconnect();
      label?.removeEventListener('click', onLabelClick);
      form?.removeEventListener('submit', onSubmit, true);
      form?.removeEventListener('formdata', onFormData);
      form?.removeEventListener('reset', onReset);
      handle.destroy();
      textarea.hidden = wasHidden;
      textarea.required = hadRequired;
      instances.delete(textarea);
    },
  };
  instances.set(textarea, instance);
  queueMicrotask(() => fire(textarea, 'ready', { editor: instance }));
  return instance;
}
