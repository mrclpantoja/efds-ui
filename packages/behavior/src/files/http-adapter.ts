import { codeFromStatus, normalizePath } from './logic';
import { getFilesConfig } from './config';
import {
  FilesError,
  type ConflictPolicy,
  type FileEntry,
  type FileVersion,
  type FilesAdapter,
  type FilesCapabilities,
  type FilesErrorCode,
  type ListOptions,
  type ListResult,
  type MoveResult,
  type TrashListResult,
  type UploadOptions,
} from './types';

type HeadersInput = Record<string, string> | (() => Record<string, string>);

export interface HttpAdapterOptions {
  /** Cabeçalhos extras (CSRF, token). Pode ser função, lida a cada chamada. */
  headers?: HeadersInput;
  credentials?: RequestCredentials;
  /** `fetch` alternativo (testes, interceptadores). */
  fetch?: typeof fetch;
  /**
   * Chamada antes de cada requisição, com `init` mutável (o HTML dispara `eds:files-request`).
   * Em upload com `XMLHttpRequest`, só `init.headers` é aplicado.
   */
  onRequest?: (url: string, init: RequestInit) => void;
}

const SAFE_JSON = 'application/json';

/**
 * Adaptador padrão: fala com a API HTTP do sistema (contrato, seção 4). O navegador nunca fala com
 * o S3 nem com o disco; sem `api` configurada ninguém chama este adaptador.
 */
export function createHttpAdapter(api: string, options: HttpAdapterOptions = {}): FilesAdapter {
  const base = api.replace(/\/+$/, '');
  let capsPromise: Promise<FilesCapabilities> | null = null;

  const headers = (extra: Record<string, string> = {}): Record<string, string> => {
    const globals = getFilesConfig();
    const pick = (h: HeadersInput | undefined) => (typeof h === 'function' ? h() : (h ?? {}));
    return { Accept: SAFE_JSON, ...pick(globals.headers), ...pick(options.headers), ...extra };
  };
  const credentials = (): RequestCredentials =>
    options.credentials ?? getFilesConfig().credentials ?? 'same-origin';

  const url = (resource: string, query: Record<string, string | undefined> = {}): string => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, v);
    const qs = params.toString();
    return `${base}/${resource}${qs ? `?${qs}` : ''}`;
  };

  async function toError(response: Response): Promise<FilesError> {
    let code: FilesErrorCode = codeFromStatus(response.status);
    let message = '';
    let path: string | undefined;
    try {
      const body = (await response.json()) as {
        error?: { code?: FilesErrorCode; message?: string; path?: string };
      };
      if (body.error?.code) code = body.error.code;
      message = body.error?.message ?? '';
      path = body.error?.path;
    } catch {
      /* corpo vazio ou não JSON */
    }
    return new FilesError(code, message, { status: response.status, path });
  }

  async function call<T>(
    resource: string,
    init: {
      method?: string;
      query?: Record<string, string | undefined>;
      body?: unknown;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const target = url(resource, init.query);
    const hasBody = init.body !== undefined;
    const request: RequestInit = {
      method: init.method ?? (hasBody ? 'POST' : 'GET'),
      headers: headers(hasBody ? { 'Content-Type': `${SAFE_JSON}; charset=utf-8` } : {}),
      credentials: credentials(),
      body: hasBody ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    };
    options.onRequest?.(target, request);
    let response: Response;
    try {
      response = await (options.fetch ?? fetch)(target, request);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new FilesError('aborted');
      }
      throw new FilesError('network');
    }
    if (!response.ok) throw await toError(response);
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new FilesError('internal', '', { status: response.status });
    }
  }

  const capabilities = (): Promise<FilesCapabilities> => {
    capsPromise ??= call<FilesCapabilities>('capabilities').catch((error: unknown) => {
      capsPromise = null;
      throw error;
    });
    return capsPromise;
  };

  const pathOf = (entry: FileEntry | string): string =>
    typeof entry === 'string' ? entry : entry.path;

  /** Envio com `XMLHttpRequest` (progresso). `send` monta o corpo; `target` já traz a query. */
  function sendWithProgress(
    target: string,
    method: string,
    body: XMLHttpRequestBodyInit,
    extraHeaders: Record<string, string>,
    opts: UploadOptions,
    expectJson: boolean,
    withCredentials: boolean,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, target);
      xhr.withCredentials = withCredentials;
      const init: RequestInit = { method, headers: { ...extraHeaders } };
      options.onRequest?.(target, init);
      const finalHeaders = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(finalHeaders)) xhr.setRequestHeader(k, v);
      if (opts.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) opts.onProgress?.(e.loaded, e.total);
        };
      }
      const onAbort = () => xhr.abort();
      opts.signal?.addEventListener('abort', onAbort, { once: true });
      const done = () => opts.signal?.removeEventListener('abort', onAbort);
      xhr.onload = () => {
        done();
        if (xhr.status >= 200 && xhr.status < 300) {
          if (!expectJson) return resolve(undefined);
          try {
            resolve(JSON.parse(xhr.responseText || 'null'));
          } catch {
            reject(new FilesError('internal', '', { status: xhr.status }));
          }
          return;
        }
        let code = codeFromStatus(xhr.status);
        let message = '';
        let path: string | undefined;
        try {
          const parsed = JSON.parse(xhr.responseText) as {
            error?: { code?: FilesErrorCode; message?: string; path?: string };
          };
          if (parsed.error?.code) code = parsed.error.code;
          message = parsed.error?.message ?? '';
          path = parsed.error?.path;
        } catch {
          /* sem corpo JSON */
        }
        reject(new FilesError(code, message, { status: xhr.status, path }));
      };
      xhr.onerror = () => {
        done();
        reject(new FilesError('network'));
      };
      xhr.onabort = () => {
        done();
        reject(new FilesError('aborted'));
      };
      if (opts.signal?.aborted) {
        done();
        reject(new FilesError('aborted'));
        return;
      }
      xhr.send(body);
    });
  }

  async function upload(file: File, path: string, opts: UploadOptions = {}): Promise<FileEntry> {
    const caps = await capabilities().catch(() => null);
    const conflict = opts.conflict ?? 'fail';
    if (caps?.directUpload) {
      const ticket = await call<{
        url: string;
        method?: string;
        headers?: Record<string, string>;
        fields?: Record<string, string>;
        entry: FileEntry;
      }>('upload-url', {
        body: {
          path: normalizePath(path),
          name: file.name,
          size: file.size,
          type: file.type,
          conflict,
        },
        signal: opts.signal,
      });
      let body: XMLHttpRequestBodyInit = file;
      if (ticket.fields) {
        const form = new FormData();
        for (const [k, v] of Object.entries(ticket.fields)) form.append(k, v);
        form.append('file', file);
        body = form;
      }
      await sendWithProgress(
        ticket.url,
        ticket.method ?? (ticket.fields ? 'POST' : 'PUT'),
        body,
        ticket.headers ?? {},
        opts,
        false,
        false,
      );
      return ticket.entry;
    }
    const form = new FormData();
    form.append('file', file, file.name);
    const target = url('upload', { path: normalizePath(path), conflict });
    if (typeof XMLHttpRequest === 'undefined') {
      const request: RequestInit = {
        method: 'POST',
        headers: headers(),
        credentials: credentials(),
        body: form,
        signal: opts.signal,
      };
      options.onRequest?.(target, request);
      let response: Response;
      try {
        response = await (options.fetch ?? fetch)(target, request);
      } catch {
        throw new FilesError('network');
      }
      if (!response.ok) throw await toError(response);
      return (await response.json()) as FileEntry;
    }
    const headersWithoutType = headers();
    return (await sendWithProgress(
      target,
      'POST',
      form,
      headersWithoutType,
      opts,
      true,
      credentials() === 'include',
    )) as FileEntry;
  }

  return {
    capabilities,
    async list(path: string, o: ListOptions = {}): Promise<ListResult> {
      const result = await call<ListResult>('list', {
        query: {
          path: normalizePath(path),
          cursor: o.cursor,
          sort: o.sort,
          q: o.q,
          recursive: o.recursive ? '1' : undefined,
        },
        signal: o.signal,
      });
      return { ...result, path: normalizePath(result.path ?? path), items: result.items ?? [] };
    },
    async tree(path: string): Promise<FileEntry[]> {
      const result = await call<{ folders?: FileEntry[] }>('tree', {
        query: { path: normalizePath(path) },
      });
      return result.folders ?? [];
    },
    createFolder: (path, name) =>
      call<FileEntry>('folders', { body: { path: normalizePath(path), name } }),
    upload,
    rename: (path, name, conflict?: ConflictPolicy) =>
      call<FileEntry>('rename', {
        method: 'PATCH',
        body: { path: normalizePath(path), name, conflict },
      }),
    move: (paths, target, conflict?: ConflictPolicy) =>
      call<MoveResult>('move', { body: { paths, target: normalizePath(target), conflict } }),
    copy: (paths, target, conflict?: ConflictPolicy) =>
      call<MoveResult>('copy', { body: { paths, target: normalizePath(target), conflict } }),
    async remove(paths, permanent = false) {
      const result = await call<{ deleted: string[] }>('delete', { body: { paths, permanent } });
      return result.deleted ?? [];
    },
    trash: (cursor) => call<TrashListResult>('trash', { query: { cursor } }),
    async restore(ids, conflict?: ConflictPolicy) {
      const result = await call<{ items: FileEntry[] }>('trash/restore', {
        body: { ids, conflict },
      });
      return result.items ?? [];
    },
    async emptyTrash() {
      const result = await call<{ deleted: string[] }>('trash/empty', { body: {} });
      return result.deleted ?? [];
    },
    async deleteFromTrash(ids) {
      const result = await call<{ deleted: string[] }>('trash/delete', { body: { ids } });
      return result.deleted ?? [];
    },
    async versions(path): Promise<FileVersion[]> {
      const result = await call<{ versions?: FileVersion[] }>('versions', {
        query: { path: normalizePath(path) },
      });
      return result.versions ?? [];
    },
    restoreVersion: (path, version) =>
      call<FileEntry>('versions/restore', { body: { path: normalizePath(path), version } }),
    downloadUrl(entry, version) {
      if (typeof entry !== 'string' && entry.downloadUrl && !version) return entry.downloadUrl;
      return url('download', { path: pathOf(entry), version });
    },
    viewUrl(entry, version) {
      if (typeof entry !== 'string' && entry.viewUrl && !version) return entry.viewUrl;
      return url('download', { path: pathOf(entry), version, inline: '1' });
    },
  };
}
