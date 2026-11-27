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
import { cx } from '../../utils/cx';
import { Button } from '../Button';
import { Input } from '../Input';
import { Textarea } from '../Textarea';
import { CheckGlyph } from '../../internal/glyphs';
import { ExclamationGlyph, InfoGlyph, QuestionGlyph } from '../../internal/glyphs-dialog';
import type { Tone } from '../../internal/tone';

/**
 * Tom do diálogo rápido. `question` não é severidade: usa o visual do `info` com o glifo de
 * pergunta (padrão do confirm e do prompt).
 */
export type DialogTone = Extract<Tone, 'info' | 'success' | 'warning' | 'danger'> | 'question';
export type DialogInputType = 'text' | 'email' | 'number' | 'password' | 'textarea';

export interface DialogOptions {
  /** Título, em destaque acima do texto. Na forma posicional, o argumento `title` tem prioridade. */
  title?: string;
  /** Tom (ícone e cor). Padrão: `info` no alert e `question` no confirm e no prompt. */
  tone?: DialogTone;
  /** Prompt: valor inicial do campo. Na forma posicional, o argumento `defaultValue` tem prioridade. */
  defaultValue?: string;
  /** Texto do botão de confirmação. Padrão: `texts.ok` (alert/prompt) ou `texts.confirm` (confirm). */
  okText?: string;
  /** Texto do botão de cancelar. Padrão: `texts.cancel`. */
  cancelText?: string;
  /** Prompt: dica do campo. */
  placeholder?: string;
  /** Prompt: exige valor (não vazio). */
  required?: boolean;
  /** Prompt: tipo do campo. Padrão: `text`. */
  inputType?: DialogInputType;
  /** Prompt: devolve a mensagem de erro, ou `''` quando o valor é válido. */
  validate?: (value: string) => string;
}

/** Aviso com um botão. Resolve (`undefined`) ao fechar. Padrão de `tone`: `info`. */
export interface DialogAlert {
  (text: string, title?: string, tone?: DialogTone, options?: DialogOptions): Promise<void>;
  (text: string, options?: DialogOptions): Promise<void>;
}

/** Pergunta. `true` ao confirmar; `false` em Cancelar, Esc ou fundo. Padrão de `tone`: `question`. */
export interface DialogConfirm {
  (text: string, title?: string, tone?: DialogTone, options?: DialogOptions): Promise<boolean>;
  (text: string, options?: DialogOptions): Promise<boolean>;
}

/** Pede um texto. Devolve o valor, ou `null` ao cancelar. */
export interface DialogPrompt {
  (
    text: string,
    defaultValue?: string,
    title?: string,
    options?: DialogOptions,
  ): Promise<string | null>;
  (text: string, options?: DialogOptions): Promise<string | null>;
}

/**
 * Cada função tem duas formas: a posicional curta (estilo SweetAlert2) e `(texto, opções)`, com
 * `title`, `tone` e (no prompt) `defaultValue` dentro de `DialogOptions`.
 */
export interface DialogApi {
  alert: DialogAlert;
  confirm: DialogConfirm;
  prompt: DialogPrompt;
}

export interface DialogTexts {
  ok: string;
  cancel: string;
  confirm: string;
  /** Mensagem do prompt `required` vazio. */
  required: string;
  /** Prefixo oculto de severidade (leitores de tela), como no Alert. `question`: nenhum. */
  severity: Record<DialogTone, string>;
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
  tone: DialogTone;
  defaultValue: string;
  options: DialogOptions;
  resolve: (value: never) => void;
}

/** Separa o título e as opções das duas formas de chamada de alert e confirm. */
function split(
  second: string | DialogOptions | undefined,
  options: DialogOptions | undefined,
): { title: string | undefined; opts: DialogOptions } {
  if (typeof second === 'object' && second !== null) return { title: second.title, opts: second };
  const opts = options ?? {};
  return { title: second ?? opts.title, opts };
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
  const { kind, tone, options } = request;
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
    } else if (kind === 'confirm' && tone === 'danger') {
      cancelRef.current?.focus();
    } else {
      okRef.current?.focus();
    }
  }, [kind, tone]);

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
    if (!dialog || tone === 'danger') return;
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
  }, [tone, cancel]);

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
  const severity = texts.severity[tone === 'danger' && kind !== 'alert' ? 'warning' : tone];
  const hidden = severity ? <span className="eds-visually-hidden">{severity} </span> : null;
  const ToneGlyph = glyphs[tone];
  const alertRole = kind !== 'alert' && (tone === 'danger' || tone === 'warning');
  const okVariant = tone === 'danger' ? 'danger' : 'primary';
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
      className={cx(
        'eds-modal eds-alert-dialog',
        (tone === 'success' || tone === 'warning' || tone === 'danger') &&
          `eds-alert-dialog-${tone}`,
      )}
      role={alertRole ? 'alertdialog' : undefined}
      aria-labelledby={hasTitle ? titleId : textId}
      aria-describedby={hasTitle ? textId : undefined}
      onKeyDown={onKeyDown}
    >
      <div className="eds-alert-dialog-icon" aria-hidden="true">
        <ToneGlyph />
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
    const alert: DialogAlert = (
      text: string,
      second?: string | DialogOptions,
      tone?: DialogTone,
      options?: DialogOptions,
    ) => {
      const { title, opts } = split(second, options);
      return enqueue<void>({
        kind: 'alert',
        text,
        title,
        tone: tone ?? opts.tone ?? 'info',
        defaultValue: '',
        options: opts,
      });
    };
    const confirm: DialogConfirm = (
      text: string,
      second?: string | DialogOptions,
      tone?: DialogTone,
      options?: DialogOptions,
    ) => {
      const { title, opts } = split(second, options);
      return enqueue<boolean>({
        kind: 'confirm',
        text,
        title,
        tone: tone ?? opts.tone ?? 'question',
        defaultValue: '',
        options: opts,
      });
    };
    const prompt: DialogPrompt = (
      text: string,
      second?: string | DialogOptions,
      third?: string,
      options?: DialogOptions,
    ) => {
      const positional = typeof second !== 'object' || second === null;
      const opts = (positional ? options : second) ?? {};
      const title = positional ? (third ?? opts.title) : opts.title;
      const defaultValue = positional
        ? (second ?? opts.defaultValue ?? '')
        : (opts.defaultValue ?? '');
      return enqueue<string | null>({
        kind: 'prompt',
        text,
        title,
        tone: opts.tone ?? 'question',
        defaultValue,
        options: opts,
      });
    };
    return { alert, confirm, prompt };
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
DialogProvider.displayName = 'DialogProvider';
