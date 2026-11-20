import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import { Textarea } from '../Textarea';
import { CheckGlyph } from '../../internal/glyphs';
import { ExclamationGlyph, InfoGlyph, QuestionGlyph } from '../../internal/glyphs-dialog';

export type DialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'question';
export type DialogInputType = 'text' | 'email' | 'number' | 'password' | 'textarea';

export interface DialogOptions {
  /** Texto do botão de confirmação. Padrão: `texts.ok` (alert/prompt) ou `texts.confirm` (confirm). */
  okText?: string;
  /** Texto do botão de cancelar. Padrão: `texts.cancel`. */
  cancelText?: string;
  /** Prompt: dica do campo. */
  placeholder?: string;
  /** Prompt: exige valor (não vazio). */
  required?: boolean;
  /** Prompt: tipo do diálogo (ícone e cor). Padrão: `question`. */
  variant?: DialogVariant;
  /** Prompt: tipo do campo. Padrão: `text`. */
  inputType?: DialogInputType;
  /** Prompt: devolve a mensagem de erro, ou `''` quando o valor é válido. */
  validate?: (value: string) => string;
}

export interface DialogApi {
  /** Aviso com um botão. Resolve (`undefined`) ao fechar. Padrão de `variant`: `info`. */
  alert: (
    text: string,
    title?: string,
    variant?: DialogVariant,
    options?: DialogOptions,
  ) => Promise<void>;
  /** Pergunta. `true` ao confirmar; `false` em Cancelar, Esc ou fundo. Padrão: `question`. */
  confirm: (
    text: string,
    title?: string,
    variant?: DialogVariant,
    options?: DialogOptions,
  ) => Promise<boolean>;
  /** Pede um texto. Devolve o valor, ou `null` ao cancelar. */
  prompt: (
    text: string,
    defaultValue?: string,
    title?: string,
    options?: DialogOptions,
  ) => Promise<string | null>;
}

export interface DialogTexts {
  ok: string;
  cancel: string;
  confirm: string;
  /** Mensagem do prompt `required` vazio. */
  required: string;
  /** Prefixo oculto de severidade (leitores de tela), como no Alert. `question`: nenhum. */
  severity: Record<DialogVariant, string>;
}

export interface DialogProviderProps {
  /** Textos substituíveis (i18n). */
  texts?: Partial<Omit<DialogTexts, 'severity'>> & { severity?: Partial<DialogTexts['severity']> };
  children?: ReactNode;
}

const defaultTexts: DialogTexts = {
  ok: 'OK',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  required: 'Preencha este campo.',
  severity: {
    info: 'Informação:',
    success: 'Sucesso:',
    warning: 'Atenção:',
    danger: 'Erro:',
    question: '',
  },
};

interface Request {
  id: number;
  kind: 'alert' | 'confirm' | 'prompt';
  text: string;
  title?: string;
  variant: DialogVariant;
  defaultValue: string;
  options: DialogOptions;
  resolve: (value: never) => void;
}

const cancelValue = (request: Request): undefined | boolean | null =>
  request.kind === 'alert' ? undefined : request.kind === 'confirm' ? false : null;

const DialogContext = createContext<DialogApi | null>(null);

/** Uso interno (Tree etc.): a API do provider mais próximo, ou `null` se não houver. Não exportado pelo pacote. */
export function useOptionalDialog(): DialogApi | null {
  return useContext(DialogContext);
}

/** `alert`/`confirm`/`prompt` assíncronos. Exige `<DialogProvider>` acima. */
export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog deve ser usado dentro de <DialogProvider>.');
  return api;
}

const glyphs = {
  success: CheckGlyph,
  warning: ExclamationGlyph,
  danger: ExclamationGlyph,
  info: InfoGlyph,
  question: QuestionGlyph,
} as const;

interface QuickDialogProps {
  request: Request;
  texts: DialogTexts;
  onDone: (value: unknown) => void;
}

function QuickDialog({ request, texts, onDone }: QuickDialogProps) {
  const { kind, variant, options } = request;
  const uid = useId();
  const titleId = `${uid}-t`;
  const textId = `${uid}-d`;
  const inputId = `${uid}-i`;
  const errorId = `${uid}-e`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const [error, setError] = useState('');
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const finish = useCallback((value: unknown) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onDoneRef.current(value);
  }, []);
  const cancel = useCallback(() => finish(cancelValue(request)), [finish, request]);

  // Abre como modal e dá o foco inicial por tipo.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    if (kind === 'prompt') {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    } else if (kind === 'confirm' && variant === 'danger') {
      cancelRef.current?.focus();
    } else {
      okRef.current?.focus();
    }
  }, [kind, variant]);

  // Esc (cancel nativo) e fechamento nativo sem pedido do código (2º Esc) cancelam.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      cancel();
    };
    const onClose = () => cancel();
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
    };
  }, [cancel]);

  // Fundo: pointerdown e click no próprio <dialog>. `danger` não fecha pelo fundo.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || variant === 'danger') return;
    let down = false;
    const onDown = (event: Event) => {
      down = event.target === dialog;
    };
    const onClick = (event: Event) => {
      if (down && event.target === dialog) cancel();
      down = false;
    };
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('click', onClick);
    };
  }, [variant, cancel]);

  const submit = () => {
    if (kind === 'alert') return finish(undefined);
    if (kind === 'confirm') return finish(true);
    const value = fieldRef.current?.value ?? '';
    let message = '';
    if (options.required && value.trim() === '') message = texts.required;
    else if (options.validate) message = options.validate(value);
    if (message) {
      setError(message);
      fieldRef.current?.focus();
      return;
    }
    finish(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      // Cancela aqui (sem deixar o Esc subir): não fecha um Modal em volta.
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return; // o botão focado age sozinho
    if (target.tagName === 'TEXTAREA' && !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    submit();
  };

  const hasTitle = request.title != null && request.title !== '';
  // Perguntar antes de excluir não é um erro: em confirm/prompt `danger` fala "Atenção:".
  const severity = texts.severity[variant === 'danger' && kind !== 'alert' ? 'warning' : variant];
  const hidden = severity ? <span className="eds-visually-hidden">{severity} </span> : null;
  const VariantGlyph = glyphs[variant];
  const alertRole = kind !== 'alert' && (variant === 'danger' || variant === 'warning');
  const okVariant = variant === 'danger' ? 'danger' : 'primary';
  const okLabel = options.okText ?? (kind === 'confirm' ? texts.confirm : texts.ok);
  const cancelLabel = options.cancelText ?? texts.cancel;
  const fieldProps = {
    id: inputId,
    placeholder: options.placeholder,
    'aria-required': options.required ? (true as const) : undefined,
    defaultValue: request.defaultValue,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? errorId : undefined,
    onChange: () => {
      if (error) setError('');
    },
  };

  return (
    <dialog
      ref={dialogRef}
      className="eds-modal eds-alert-dialog"
      data-variant={variant}
      role={alertRole ? 'alertdialog' : undefined}
      aria-labelledby={hasTitle ? titleId : textId}
      aria-describedby={hasTitle ? textId : undefined}
      onKeyDown={onKeyDown}
    >
      <div className="eds-alert-dialog-icon" aria-hidden="true">
        <VariantGlyph />
      </div>
      {hasTitle ? (
        <h2 className="eds-alert-dialog-title" id={titleId}>
          {hidden}
          {request.title}
        </h2>
      ) : null}
      <p className="eds-alert-dialog-text" id={textId}>
        {hasTitle ? null : hidden}
        {request.text}
      </p>
      {kind === 'prompt' ? (
        <div className="eds-field">
          <label className="eds-visually-hidden" htmlFor={inputId}>
            {hasTitle ? request.title : request.text}
          </label>
          {options.inputType === 'textarea' ? (
            <Textarea {...fieldProps} ref={fieldRef} />
          ) : (
            <Input {...fieldProps} ref={fieldRef} type={options.inputType ?? 'text'} />
          )}
          <p className="eds-error" id={errorId} role="alert" hidden={!error}>
            {error}
          </p>
        </div>
      ) : null}
      <div className="eds-alert-dialog-actions">
        {kind === 'alert' ? null : (
          <Button ref={cancelRef} variant="secondary" onClick={cancel}>
            {cancelLabel}
          </Button>
        )}
        <Button ref={okRef} variant={okVariant} onClick={submit}>
          {okLabel}
        </Button>
      </div>
    </dialog>
  );
}

/** Provedor de `useDialog()`: renderiza um `<dialog>` por vez e enfileira as chamadas. */
export function DialogProvider({ texts, children }: DialogProviderProps) {
  const merged = useMemo<DialogTexts>(
    () => ({
      ...defaultTexts,
      ...texts,
      severity: { ...defaultTexts.severity, ...texts?.severity },
    }),
    [texts],
  );
  const [current, setCurrent] = useState<Request | null>(null);
  const currentRef = useRef<Request | null>(null);
  const queue = useRef<Request[]>([]);
  const opener = useRef<HTMLElement | null>(null);
  const nextId = useRef(0);

  const start = useCallback((request: Request) => {
    if (currentRef.current) {
      queue.current.push(request);
      return;
    }
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    currentRef.current = request;
    setCurrent(request);
  }, []);

  const api = useMemo<DialogApi>(() => {
    const enqueue = <T,>(fields: Omit<Request, 'id' | 'resolve'>) =>
      new Promise<T>((resolve) =>
        start({ ...fields, id: ++nextId.current, resolve: resolve as (value: never) => void }),
      );
    return {
      alert: (text, title, variant = 'info', options = {}) =>
        enqueue<void>({ kind: 'alert', text, title, variant, defaultValue: '', options }),
      confirm: (text, title, variant = 'question', options = {}) =>
        enqueue<boolean>({ kind: 'confirm', text, title, variant, defaultValue: '', options }),
      prompt: (text, defaultValue = '', title, options = {}) =>
        enqueue<string | null>({
          kind: 'prompt',
          text,
          title,
          variant: options.variant ?? 'question',
          defaultValue,
          options,
        }),
    };
  }, [start]);

  const onDone = useCallback((value: unknown) => {
    const done = currentRef.current;
    if (!done) return;
    done.resolve(value as never);
    const next = queue.current.shift() ?? null;
    currentRef.current = next;
    setCurrent(next);
    if (!next) {
      const target = opener.current;
      opener.current = null;
      if (target?.isConnected) target.focus();
    }
  }, []);

  // Desmontar o provider resolve o que sobrou como cancelado (nenhuma Promise fica pendente).
  useEffect(
    () => () => {
      const pending = [currentRef.current, ...queue.current];
      currentRef.current = null;
      queue.current = [];
      for (const request of pending) request?.resolve(cancelValue(request) as never);
    },
    [],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current ? (
        <QuickDialog key={current.id} request={current} texts={merged} onDone={onDone} />
      ) : null}
    </DialogContext.Provider>
  );
}
