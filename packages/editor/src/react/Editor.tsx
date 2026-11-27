import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import type { EditorView } from 'prosemirror-view';
import { createEditor, type EditorInstance } from '../bind';
import type { EditorPreset } from '../editor';
import type { EditorTexts } from '../messages';

export interface EditorHandle {
  focus: () => void;
  getHTML: () => string;
  setHTML: (html: string) => void;
  /** A `EditorView` do ProseMirror (só existe depois de montado). */
  readonly view: EditorView | null;
}

export interface EditorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Rótulo visível; nomeia o conteúdo. */
  label?: string;
  /** `id` do conteúdo editável. */
  id?: string;
  /** Com `name`, um `<input type="hidden">` leva o HTML no envio do formulário. */
  name?: string;
  /** Controlado: HTML atual. */
  value?: string;
  /** Não controlado: HTML inicial. */
  defaultValue?: string;
  /** HTML a cada mudança (agrupa digitação em 150 ms). */
  onValueChange?: (html: string) => void;
  preset?: EditorPreset;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  /** Obrigatório: `aria-required` no conteúdo e, com `name`, bloqueia o envio vazio do formulário. */
  required?: boolean;
  'aria-describedby'?: string;
  /** Textos (parcial; pt-BR por padrão). Lidos na montagem. */
  texts?: Partial<EditorTexts>;
}

/** Editor de conteúdo (edição Básica). O visual é todo do core (`.eds-editor`). */
export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    label,
    id,
    name,
    value,
    defaultValue,
    onValueChange,
    preset = 'basic',
    rows,
    placeholder,
    disabled,
    readOnly,
    invalid,
    required,
    'aria-describedby': describedBy,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const contentId = id ?? `eds-editor-${generated.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const labelId = `${contentId}-label`;
  const fieldElRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const instanceRef = useRef<EditorInstance | null>(null);
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const lastEmitted = useRef<string | null>(null);
  const initial = useRef(value ?? defaultValue ?? '');
  // O hidden é controlado: um `defaultValue` o devolveria ao HTML inicial a cada renderização do React
  // (para `type="hidden"` o valor é o atributo), e o formulário enviaria o texto antigo.
  const [serialized, setSerialized] = useState(initial.current);

  useEffect(() => {
    const host = fieldElRef.current;
    if (!host) return undefined;
    const instance = createEditor(host, {
      preset,
      value: initial.current,
      id: contentId,
      labelledBy: label ? labelId : undefined,
      ariaLabel: label ? undefined : texts?.contentLabel,
      messages: texts,
      disabled,
      readOnly,
      invalid,
      required,
      placeholder,
      rows,
      describedBy,
      field: fieldRef.current,
      onChange(html) {
        lastEmitted.current = html;
        setSerialized(html);
        onValueChangeRef.current?.(html);
      },
    });
    instanceRef.current = instance;
    // O conteúdo não é um controle rotulável: clicar no rótulo leva o foco ao editor.
    const labelEl = label ? document.getElementById(labelId) : null;
    const focusEditor = () => instance.focus();
    labelEl?.addEventListener('click', focusEditor);
    return () => {
      labelEl?.removeEventListener('click', focusEditor);
      instance.destroy();
      instanceRef.current = null;
    };
    // Montagem única: o resto chega por `update`/`setHTML` nos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  useEffect(() => {
    instanceRef.current?.update({
      disabled: !!disabled,
      readOnly: !!readOnly,
      invalid: !!invalid,
      required: !!required,
      placeholder: placeholder ?? '',
      rows,
      describedBy: describedBy ?? '',
    });
  }, [disabled, readOnly, invalid, required, placeholder, rows, describedBy]);

  // Controlado: valor novo vindo de fora (diferente do que o editor acabou de emitir).
  useEffect(() => {
    const instance = instanceRef.current;
    if (value === undefined || !instance) return;
    if (value === lastEmitted.current || value === instance.getHTML()) return;
    instance.setHTML(value);
    lastEmitted.current = instance.getHTML();
    setSerialized(lastEmitted.current);
  }, [value]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => instanceRef.current?.focus(),
      getHTML: () => instanceRef.current?.getHTML() ?? '',
      setHTML: (html) => {
        const instance = instanceRef.current;
        if (!instance) return;
        instance.setHTML(html);
        setSerialized(instance.getHTML());
      },
      get view() {
        return instanceRef.current?.view ?? null;
      },
    }),
    [],
  );

  return (
    <div ref={fieldElRef} className={['eds-field', className].filter(Boolean).join(' ')} {...rest}>
      {label ? (
        <label className="eds-label" id={labelId} htmlFor={contentId}>
          {label}
        </label>
      ) : null}
      {name ? <input ref={fieldRef} type="hidden" name={name} value={serialized} /> : null}
    </div>
  );
});
