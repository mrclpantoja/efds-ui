import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
} from 'react';
import { cx } from '../../utils/cx';
import { FieldContext, useControlAttrs } from '../../internal/field-context';
import { CheckGlyph, CloseGlyph } from '../../internal/glyphs';
import { AlertGlyph, FileGlyph, UploadGlyph } from '../../internal/glyphs-e';
import { useAnnouncer } from '../../internal/announcer';
import { mergeRefs } from '../../internal/refs-d';

export interface FileUploadUploadOptions {
  /** Informe o progresso do envio (0 a 100). */
  onProgress: (percent: number) => void;
  /** Disparado ao remover o arquivo durante o envio: cancele a requisição. */
  signal: AbortSignal;
}

/** Textos substituíveis (i18n). */
export interface FileUploadTexts {
  /** Antes do link. Padrão: "Arraste arquivos aqui ou". */
  dropzone: string;
  /** Link da dropzone. Padrão: "escolha no computador". */
  link: string;
  /** Nome da lista de arquivos. Padrão: "Arquivos selecionados". */
  listLabel: string;
  /** Padrão: "Remover {nome}". */
  remove: (name: string) => string;
  /** Texto do botão de nova tentativa. Padrão: "Tentar de novo". */
  retry: string;
  /** Nome acessível do botão (começa pelo texto visível, WCAG 2.5.3). Padrão: "Tentar de novo {nome}". */
  retryLabel: (name: string) => string;
  /** Nome do `<progress>`. Padrão: "Enviando {nome}". */
  progress: (name: string) => string;
  /** Meta durante o envio. Padrão: "Enviando {n}%". */
  uploading: (percent: number) => string;
  /** Meta do arquivo enviado. Padrão: "Enviado". */
  done: string;
  /** Erro: arquivo maior que o limite. Padrão: "Arquivo maior que {tamanho}". */
  tooLarge: (maxSize: string) => string;
  /** Erro: tipo fora de `accept`. Padrão: "Tipo não permitido". */
  notAllowed: string;
  /** Erro de envio. Padrão: "Falha no envio". */
  failed: string;
  /** Validade de `required` no modo imediato. Padrão: "Envie ao menos um arquivo.". */
  requiredMessage: string;
  /** Validade enquanto há envio em andamento. Padrão: "Aguarde o envio dos arquivos.". */
  waiting: string;
  /** Status: um ou vários adicionados. Padrão: "{nome} adicionado." / "{n} arquivos adicionados.". */
  added: (names: string[]) => string;
  /** Status. Padrão: "{nome} removido.". */
  removed: (name: string) => string;
  /** Status. Padrão: "{nome} enviado.". */
  uploaded: (name: string) => string;
  /** Status. Padrão: "Limite de {n} arquivos atingido.". */
  limit: (max: number) => string;
  /** Status após o limite: quantos ficaram de fora. Padrão: "1 arquivo não adicionado." / "{n} arquivos não adicionados.". */
  notAdded: (count: number) => string;
  /** Status de arquivo repetido. Padrão: "{nome} já foi adicionado.". */
  duplicate: (name: string) => string;
  /** Status com `multiple={false}` e vários arquivos. Padrão: "Só um arquivo é aceito.". */
  onlyOne: string;
  /** Validade enquanto há envio com falha. Padrão: "Há arquivos com falha no envio. Tente de novo ou remova.". */
  failedValidity: string;
}

export interface FileUploadProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'children' | 'size'
> {
  /** `name` do input (modo formulário) ou dos campos `hidden` com o id enviado (modo imediato). */
  name?: string;
  /** Tipos aceitos (como o `accept` nativo: extensões, MIME e `tipo/*`). */
  accept?: string;
  /** Vários arquivos. Padrão: `true`. */
  multiple?: boolean;
  /** Tamanho máximo por arquivo, em bytes. */
  maxSize?: number;
  /** Máximo de arquivos válidos. */
  maxFiles?: number;
  /** Texto de apoio na dropzone (ex.: "PDF, JPG ou PNG, até 5 MB cada"). */
  hint?: string;
  /** Uma linha só (ícone + texto à esquerda). */
  compact?: boolean;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Arquivos válidos mudaram (adição ou remoção). */
  onValueChange?: (files: File[]) => void;
  /**
   * Modo imediato: cada arquivo válido é enviado na hora por esta função, que devolve o id (vira
   * um `hidden` com `name`; o input perde o `name`, para não reenviar o binário). Sem ela, os
   * arquivos ficam no próprio input e o formulário os envia normalmente.
   */
  upload?: (file: File, options: FileUploadUploadOptions) => Promise<{ id: string }>;
  /** Falha de `upload` (não chamada ao remover/abortar). */
  onUploadError?: (file: File, error: unknown) => void;
  /** Textos substituíveis. */
  texts?: Partial<FileUploadTexts>;
}

type ItemState = 'ready' | 'uploading' | 'done' | 'error';

interface Item {
  key: string;
  file: File;
  state: ItemState;
  progress: number;
  error?: string;
  retryable?: boolean;
  uploadId?: string;
}

const DEFAULT_TEXTS: FileUploadTexts = {
  dropzone: 'Arraste arquivos aqui ou',
  link: 'escolha no computador',
  listLabel: 'Arquivos selecionados',
  remove: (name) => `Remover ${name}`,
  retry: 'Tentar de novo',
  retryLabel: (name) => `Tentar de novo ${name}`,
  progress: (name) => `Enviando ${name}`,
  uploading: (percent) => `Enviando ${percent}%`,
  done: 'Enviado',
  tooLarge: (maxSize) => `Arquivo maior que ${maxSize}`,
  notAllowed: 'Tipo não permitido',
  failed: 'Falha no envio',
  requiredMessage: 'Envie ao menos um arquivo.',
  waiting: 'Aguarde o envio dos arquivos.',
  added: (names) =>
    names.length === 1 ? `${names[0]} adicionado.` : `${names.length} arquivos adicionados.`,
  removed: (name) => `${name} removido.`,
  uploaded: (name) => `${name} enviado.`,
  limit: (max) => `Limite de ${max} ${max === 1 ? 'arquivo' : 'arquivos'} atingido.`,
  notAdded: (count) =>
    count === 1 ? '1 arquivo não adicionado.' : `${count} arquivos não adicionados.`,
  duplicate: (name) => `${name} já foi adicionado.`,
  onlyOne: 'Só um arquivo é aceito.',
  failedValidity: 'Há arquivos com falha no envio. Tente de novo ou remova.',
};

// Ocupa vaga: tudo que não foi recusado por tipo/tamanho (falha de envio ainda pode ser repetida).
const occupies = (i: Item) => i.state !== 'error' || i.retryable === true;
const validFiles = (list: Item[]) => list.filter(occupies).map((i) => i.file);

/** Tamanho em pt-BR: "850 KB", "1,2 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${String(Number(mb.toFixed(1))).replace('.', ',')} MB`;
  return `${String(Number((mb / 1024).toFixed(1))).replace('.', ',')} GB`;
}

/** `accept` nativo: extensão (`.pdf`), `tipo/*` ou MIME exato. Vazio aceita tudo. */
function matchesAccept(file: File, accept: string | undefined): boolean {
  const tokens = (accept ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((t) =>
    t.startsWith('.')
      ? name.endsWith(t)
      : t.endsWith('/*')
        ? type.startsWith(t.slice(0, -1))
        : type === t,
  );
}

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Mantém no input nativo só os arquivos válidos, para o envio normal do formulário. */
function syncInput(input: HTMLInputElement | null, files: File[]) {
  if (!input || typeof DataTransfer === 'undefined') return;
  try {
    const transfer = new DataTransfer();
    for (const f of files) transfer.items.add(f);
    input.files = transfer.files;
  } catch {
    /* sem DataTransfer utilizável */
  }
}

/**
 * Upload com arrastar e soltar. Sem `upload`, os arquivos válidos ficam no próprio `<input>`
 * (o formulário envia normalmente); com `upload`, cada arquivo é enviado na hora e o id devolvido
 * vira um `hidden`. O `ref` vai para o `<input type="file">`. O `<label>` da dropzone abre o
 * seletor nativo, então a navegação por teclado é a do input.
 */
export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(function FileUpload(
  {
    name,
    accept,
    multiple = true,
    maxSize,
    maxFiles,
    hint,
    compact,
    invalid,
    disabled,
    onValueChange,
    upload,
    onUploadError,
    texts: textsProp,
    className,
    ...rest
  },
  ref,
) {
  const attrs = useControlAttrs({
    id: rest.id,
    describedBy: rest['aria-describedby'],
    ariaInvalid: rest['aria-invalid'],
    required: rest.required,
    invalid,
  });
  const field = useContext(FieldContext);
  const generated = useId();
  const id = attrs.id ?? `${generated}-input`;
  const hintId = `${generated}-hint`;
  const t: FileUploadTexts = { ...DEFAULT_TEXTS, ...textsProp };
  const tRef = useRef(t);
  tRef.current = t;
  const immediate = upload !== undefined;

  const [items, setItemsState] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const setItems = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItemsState(next);
  }, []);
  const patch = useCallback(
    (key: string, change: Partial<Item>) => {
      setItems(itemsRef.current.map((i) => (i.key === key ? { ...i, ...change } : i)));
    },
    [setItems],
  );

  const { text: status, announce, set: setStatus } = useAnnouncer();
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const counter = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  // Foco após remover: chave do botão de remover do item vizinho; null = input.
  const pendingFocus = useRef<string | null | undefined>(undefined);
  const uploadRef = useRef(upload);
  uploadRef.current = upload;
  const onUploadErrorRef = useRef(onUploadError);
  onUploadErrorRef.current = onUploadError;

  const startUpload = useCallback(
    (key: string) => {
      const send = uploadRef.current;
      const item = itemsRef.current.find((i) => i.key === key);
      if (!send || !item) return;
      const controller = new AbortController();
      controllers.current.set(key, controller);
      patch(key, { state: 'uploading', progress: 0, error: undefined, retryable: false });
      const current = () => itemsRef.current.some((i) => i.key === key);
      send(item.file, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (current() && !controller.signal.aborted)
            patch(key, { progress: Math.max(0, Math.min(100, Math.round(percent))) });
        },
      }).then(
        (result) => {
          controllers.current.delete(key);
          if (controller.signal.aborted || !current()) return;
          patch(key, { state: 'done', progress: 100, uploadId: result.id });
          announce(tRef.current.uploaded(item.file.name));
        },
        (err: unknown) => {
          controllers.current.delete(key);
          if (controller.signal.aborted || !current()) return;
          patch(key, { state: 'error', error: tRef.current.failed, retryable: true });
          announce(`${item.file.name}: ${lowerFirst(tRef.current.failed)}.`);
          onUploadErrorRef.current?.(item.file, err);
        },
      );
    },
    [patch, announce],
  );

  const addFiles = (incoming: File[]) => {
    if (disabled || incoming.length === 0) return;
    let list = itemsRef.current;
    let files = incoming;
    const parts: string[] = [];
    if (!multiple) {
      // Seleção única: a nova substitui a anterior.
      for (const i of list) controllers.current.get(i.key)?.abort();
      list = [];
      files = incoming.slice(0, 1);
      if (incoming.length > 1) parts.push(t.onlyOne);
    }
    const max = multiple ? maxFiles : 1;
    const added: Item[] = [];
    const messages: string[] = [];
    let skipped = 0;
    for (const file of files) {
      if ([...list, ...added].some((i) => sameFile(i.file, file))) {
        messages.push(t.duplicate(file.name));
        continue;
      }
      let error: string | undefined;
      if (!matchesAccept(file, accept)) error = t.notAllowed;
      else if (maxSize != null && file.size > maxSize) error = t.tooLarge(formatFileSize(maxSize));
      if (error) {
        counter.current += 1;
        added.push({ key: `f${counter.current}`, file, state: 'error', progress: 0, error });
        messages.push(`${file.name}: ${lowerFirst(error)}.`);
        continue;
      }
      if (max != null && [...list, ...added].filter(occupies).length >= max) {
        skipped += 1;
        continue;
      }
      counter.current += 1;
      added.push({ key: `f${counter.current}`, file, state: 'ready', progress: 0 });
    }
    const ok = added.filter((i) => i.state !== 'error');
    if (ok.length > 0) parts.unshift(t.added(ok.map((i) => i.file.name)));
    parts.push(...messages);
    if (skipped > 0 && max != null) parts.push(t.limit(max), t.notAdded(skipped));
    if (parts.length > 0) announce(parts.join(' '));
    if (added.length === 0 && multiple) return;
    const next = [...list, ...added];
    setItems(next);
    onValueChange?.(validFiles(next));
    if (immediate) for (const i of ok) startUpload(i.key);
  };

  // Mantém o input nativo igual à lista de válidos (modo formulário).
  useEffect(() => {
    if (!immediate) syncInput(inputRef.current, validFiles(items));
  }, [items, immediate]);

  // Envio em andamento ou com falha bloqueia o submit do formulário.
  const busy = items.some((i) => i.state === 'uploading');
  const failedUpload = items.some((i) => i.state === 'error' && i.retryable);
  const missing = immediate && attrs.required === true && !items.some((i) => i.state === 'done');
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      busy ? t.waiting : failedUpload ? t.failedValidity : missing ? t.requiredMessage : '',
    );
  }, [busy, failedUpload, missing, t.waiting, t.failedValidity, t.requiredMessage]);

  // Reset do formulário esvazia a lista.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      for (const c of controllers.current.values()) c.abort();
      controllers.current.clear();
      setItems([]);
      setStatus('');
    };
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, [setItems, setStatus]);

  // Cancela envios pendentes ao desmontar.
  useEffect(() => {
    const map = controllers.current;
    return () => {
      for (const c of map.values()) c.abort();
    };
  }, []);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === undefined) return;
    pendingFocus.current = undefined;
    (target === null ? inputRef.current : removeButtons.current.get(target))?.focus();
  });

  const remove = (item: Item) => {
    const list = itemsRef.current;
    const index = list.findIndex((i) => i.key === item.key);
    if (index < 0) return;
    controllers.current.get(item.key)?.abort();
    controllers.current.delete(item.key);
    const neighbour = list[index + 1] ?? list[index - 1];
    pendingFocus.current = neighbour ? neighbour.key : null;
    const next = list.filter((i) => i.key !== item.key);
    setItems(next);
    announce(t.removed(item.file.name));
    onValueChange?.(validFiles(next));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const picked = Array.from(input.files ?? []);
    // Modo imediato: o input não guarda arquivos; permite escolher o mesmo de novo.
    if (immediate) input.value = '';
    addFiles(picked);
  };

  const hasFiles = (event: DragEvent) => {
    const types = event.dataTransfer?.types;
    return !types || Array.from(types).includes('Files');
  };

  // Com arquivos, sempre cancela o padrão (senão o navegador abre o arquivo), mesmo desabilitado.
  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (disabled) return;
    dragDepth.current = 0;
    setDragging(false);
    addFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  const describedBy = [attrs['aria-describedby'], hint ? hintId : undefined]
    .filter(Boolean)
    .join(' ');
  const labelledBy = rest['aria-label'] ? undefined : (rest['aria-labelledby'] ?? field.labelId);

  return (
    // Eventos de arrastar só no contêiner: não interceptam o resto da página.
    <div
      className={cx('eds-upload', compact && 'eds-upload-compact', className)}
      data-dragover={dragging ? '' : undefined}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        {...rest}
        ref={mergeRefs(ref, inputRef)}
        id={id}
        className="eds-upload-input"
        type="file"
        name={immediate ? undefined : name}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        required={immediate ? undefined : attrs.required}
        aria-required={immediate && attrs.required ? true : undefined}
        aria-invalid={attrs['aria-invalid']}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy || undefined}
        onChange={handleChange}
      />
      <label className="eds-upload-dropzone" htmlFor={id}>
        <UploadGlyph />
        <span className="eds-upload-title">
          {t.dropzone} <span className="eds-upload-link">{t.link}</span>
        </span>
        {hint ? (
          <span className="eds-upload-hint" id={hintId}>
            {hint}
          </span>
        ) : null}
      </label>
      {items.length > 0 ? (
        <ul className="eds-upload-list" aria-label={t.listLabel}>
          {items.map((item) => {
            const size = formatFileSize(item.file.size);
            const fileName = item.file.name;
            return (
              <li key={item.key} className="eds-upload-item" data-state={item.state}>
                <FileGlyph className="eds-upload-item-icon" />
                <div className="eds-upload-item-body">
                  <span className="eds-upload-item-name" id={`${generated}-${item.key}`}>
                    {fileName}
                  </span>
                  <span className="eds-upload-item-meta">
                    {item.state === 'error' ? <AlertGlyph /> : null}
                    {item.state === 'done' ? <CheckGlyph /> : null}
                    {item.state === 'error'
                      ? item.error
                      : item.state === 'uploading'
                        ? `${size} · ${t.uploading(item.progress)}`
                        : item.state === 'done'
                          ? `${size} · ${t.done}`
                          : size}
                  </span>
                  {item.state === 'uploading' ? (
                    <progress
                      className="eds-upload-progress"
                      max={100}
                      value={item.progress}
                      aria-label={t.progress(fileName)}
                    />
                  ) : null}
                </div>
                {item.state === 'error' && item.retryable ? (
                  <button
                    type="button"
                    className="eds-button eds-button-ghost eds-button-sm"
                    aria-label={t.retryLabel(fileName)}
                    disabled={disabled}
                    onClick={() => {
                      // O botão some ao reenviar: o foco vai ao Remover do mesmo item.
                      pendingFocus.current = item.key;
                      startUpload(item.key);
                    }}
                  >
                    {t.retry}
                  </button>
                ) : null}
                <button
                  type="button"
                  ref={(node) => {
                    if (node) removeButtons.current.set(item.key, node);
                    else removeButtons.current.delete(item.key);
                  }}
                  className="eds-button eds-button-ghost eds-button-icon eds-button-sm"
                  aria-label={t.remove(fileName)}
                  disabled={disabled}
                  onClick={() => remove(item)}
                >
                  <CloseGlyph />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {immediate && name
        ? items.map((i) =>
            i.state === 'done' && i.uploadId !== undefined ? (
              <input key={i.key} type="hidden" name={name} value={i.uploadId} />
            ) : null,
          )
        : null}
      <span className="eds-visually-hidden" role="status">
        {status}
      </span>
    </div>
  );
});
FileUpload.displayName = 'FileUpload';
