import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { applyLink, findLink, removeLink } from './commands';
import { docToHtml, htmlToDoc, isDocEmpty } from './html';
import { createLinkDialog, type LinkDialog } from './link-dialog';
import { getMessages, type EditorTexts } from './messages';
import { prepareClipboardHtml } from './paste';
import { createPlugins } from './plugins';
import { basicSchema } from './schema';
import { createAnnouncer } from './status';
import { createToolbar, type Toolbar } from './toolbar';

export type EditorPreset = 'basic';

/** Opções que mudam durante a vida do editor (`update`). */
export interface EditorDynamicOptions {
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  /** `id`(s) dos textos de ajuda/erro (`aria-describedby` do conteúdo). */
  describedBy?: string;
}

export interface EditorCoreOptions extends EditorDynamicOptions {
  preset?: EditorPreset;
  /** HTML inicial (é limpo pelo esquema). */
  value?: string;
  /** `id` do conteúdo editável. */
  id?: string;
  /** `id` do elemento que nomeia o conteúdo (o `<label>`). */
  labelledBy?: string;
  /** Nome acessível quando não há rótulo. */
  ariaLabel?: string;
  /** Textos (parcial; o resto vem de `configure`/pt-BR). */
  messages?: Partial<EditorTexts>;
  /** Pausa antes de avisar mudança e gravar no campo, em ms (padrão 150). */
  debounce?: number;
  /** Mudança do HTML (com debounce). */
  onChange?: (html: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface EditorHandle {
  /** O `.eds-editor` criado. */
  element: HTMLElement;
  /** O elemento editável (`.eds-editor-content`). */
  content: HTMLElement;
  view: EditorView;
  getHTML: () => string;
  /** Troca o conteúdo (limpo pelo esquema) e zera o histórico. Não dispara `onChange`. */
  setHTML: (html: string) => void;
  focus: () => void;
  update: (options: EditorDynamicOptions) => void;
  /** Grava na hora o que estiver pendente do debounce. */
  flush: () => void;
  destroy: () => void;
}

let uid = 0;

/** Monta o editor dentro de `host` (acrescenta `.eds-editor` ao fim dele). */
export function mountEditor(
  host: HTMLElement,
  options: EditorCoreOptions = {},
  place?: { after: HTMLElement },
): EditorHandle {
  const doc = host.ownerDocument;
  const messages = getMessages(options.messages);
  const contentId = options.id ?? `eds-editor-content-${++uid}`;
  const state = {
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    invalid: options.invalid ?? false,
    required: options.required ?? false,
    placeholder: options.placeholder ?? '',
    rows: options.rows,
    describedBy: options.describedBy ?? '',
  };

  const root = doc.createElement('div');
  root.className = 'eds-editor';
  root.setAttribute('data-preset', options.preset ?? 'basic');
  const content = doc.createElement('div');
  content.className = 'eds-editor-content eds-prose';
  content.id = contentId;
  const status = doc.createElement('div');
  status.className = 'eds-visually-hidden';
  status.setAttribute('role', 'status');
  const announcer = createAnnouncer(status);

  let toolbar: Toolbar | null = null;
  let linkDialog: LinkDialog | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let destroyed = false;
  const debounceMs = options.debounce ?? 150;

  const editable = () => !state.disabled && !state.readOnly;

  const syncShell = () => {
    const flags: [string, boolean][] = [
      ['data-disabled', state.disabled],
      ['data-readonly', state.readOnly && !state.disabled],
      ['data-invalid', state.invalid],
    ];
    for (const [name, on] of flags) {
      if (on) root.setAttribute(name, '');
      else root.removeAttribute(name);
    }
    if (state.rows && state.rows > 0) root.style.setProperty('--_editor-rows', String(state.rows));
    else root.style.removeProperty('--_editor-rows');
    toolbar?.setDisabled(state.disabled || state.readOnly);
  };

  const emit = () => {
    timer = null;
    if (!dirty) return;
    dirty = false;
    options.onChange?.(docToHtml(view.state.doc));
  };
  const flush = () => {
    if (timer) clearTimeout(timer);
    emit();
  };
  const scheduleChange = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(emit, debounceMs);
  };

  const openLink = () => {
    if (!editable() || !linkDialog) return;
    const found = findLink(view.state);
    const { from, to } = view.state.selection;
    linkDialog.open({
      href: found?.href ?? '',
      text: found?.text ?? '',
      hasLink: found !== null,
      hasSelection: from !== to,
    });
  };

  const attributes = (current: EditorState): Record<string, string> => {
    const attrs: Record<string, string> = {
      id: contentId,
      role: 'textbox',
      'aria-multiline': 'true',
    };
    if (options.labelledBy) attrs['aria-labelledby'] = options.labelledBy;
    else attrs['aria-label'] = options.ariaLabel ?? messages.contentLabel;
    if (state.describedBy) attrs['aria-describedby'] = state.describedBy;
    if (state.invalid) attrs['aria-invalid'] = 'true';
    if (state.required) attrs['aria-required'] = 'true';
    if (state.readOnly) attrs['aria-readonly'] = 'true';
    if (state.disabled) attrs['aria-disabled'] = 'true';
    // O ::before do placeholder é só visual: `aria-placeholder` o expõe à tecnologia assistiva.
    if (state.placeholder) {
      attrs['data-placeholder'] = state.placeholder;
      attrs['aria-placeholder'] = state.placeholder;
    }
    // Somente leitura sem a barra: o conteúdo é a única parada de Tab e precisa de foco para
    // ser lido linha a linha e rolado pelo teclado (2.1.1). Desabilitado não entra na ordem.
    if (state.readOnly && !state.disabled) attrs.tabindex = '0';
    if (isDocEmpty(current.doc)) attrs['data-empty'] = '';
    return attrs;
  };

  const plugins = createPlugins({
    onLink: openLink,
    onToolbar: () => {
      if (!state.disabled && !state.readOnly) toolbar?.focusActive();
    },
  });

  const initial = htmlToDoc(options.value ?? '');
  const view: EditorView = new EditorView(
    { mount: content },
    {
      state: EditorState.create({ schema: basicSchema, doc: initial, plugins }),
      editable,
      attributes,
      transformPastedHTML: prepareClipboardHtml,
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        toolbar?.update(next);
        if (tr.docChanged) scheduleChange();
      },
      handleDOMEvents: {
        focus: () => {
          options.onFocus?.();
          return false;
        },
        blur: () => {
          flush();
          options.onBlur?.();
          return false;
        },
      },
    },
  );

  toolbar = createToolbar({
    view,
    messages,
    contentId,
    announce: announcer.say,
    openLinkDialog: openLink,
  });
  linkDialog = createLinkDialog(root, messages, {
    onApply(href, text) {
      applyLink(href, text)(view.state, view.dispatch);
      announcer.say(messages.linkApplied);
      view.focus();
    },
    onRemove() {
      removeLink(view.state, view.dispatch);
      announcer.say(messages.linkRemoved);
      view.focus();
    },
    onClose: () => view.focus(),
  });

  root.prepend(toolbar.el);
  root.append(content, status);
  if (place) place.after.after(root);
  else host.append(root);
  syncShell();
  toolbar.update(view.state);

  return {
    element: root,
    content,
    view,
    getHTML: () => docToHtml(view.state.doc),
    setHTML(html) {
      const next = EditorState.create({
        schema: basicSchema,
        doc: htmlToDoc(html),
        plugins,
      });
      dirty = false;
      if (timer) clearTimeout(timer);
      view.updateState(next);
      toolbar?.update(next);
    },
    focus: () => view.focus(),
    update(next) {
      Object.assign(
        state,
        Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)),
      );
      syncShell();
      view.setProps({ editable, attributes });
    },
    flush,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer) clearTimeout(timer);
      announcer.dispose();
      toolbar?.destroy();
      linkDialog?.destroy();
      view.destroy();
      root.remove();
    },
  };
}
