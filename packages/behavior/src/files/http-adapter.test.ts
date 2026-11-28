import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetFilesConfig, setFilesConfig } from './config';
import { createHttpAdapter } from './http-adapter';
import { FilesError } from './types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  resetFilesConfig();
  vi.unstubAllGlobals();
});

describe('cliente HTTP', () => {
  it('lista com a query do contrato e cabeçalhos configurados', async () => {
    const fetchMock = vi.fn(async () =>
      json({ path: '/a', items: [{ path: '/a/x', name: 'x', type: 'file' }] }),
    );
    setFilesConfig({ headers: { 'X-CSRF-Token': 'abc' } });
    const api = createHttpAdapter('/api/arquivos/', {
      fetch: fetchMock as unknown as typeof fetch,
    });
    const result = await api.list('/a', {
      sort: '-modified',
      q: 'nota',
      recursive: true,
      cursor: '5',
    });
    expect(result.items).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url, 'http://x');
    expect(parsed.pathname).toBe('/api/arquivos/list');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      path: '/a',
      cursor: '5',
      sort: '-modified',
      q: 'nota',
      recursive: '1',
    });
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('abc');
    expect(init.credentials).toBe('same-origin');
  });

  it('manda corpo JSON nas operações e normaliza o caminho', async () => {
    const fetchMock = vi.fn(async () => json({ items: [], skipped: [] }));
    const api = createHttpAdapter('/api', { fetch: fetchMock as unknown as typeof fetch });
    await api.move(['/a/x.pdf'], 'b//', 'rename');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/move');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      paths: ['/a/x.pdf'],
      target: '/b',
      conflict: 'rename',
    });
  });

  it('erros: código do servidor, texto do servidor e status sem corpo', async () => {
    const responses = [
      json({ error: { code: 'conflict', message: 'Já existe.', path: '/a/x' } }, 409),
      new Response('', { status: 403 }),
      new Response('', { status: 500 }),
    ];
    const fetchMock = vi.fn(async () => responses.shift()!);
    const api = createHttpAdapter('/api', { fetch: fetchMock as unknown as typeof fetch });
    const first = await api.rename('/a/x', 'y').catch((e: FilesError) => e);
    expect(first).toMatchObject({
      code: 'conflict',
      status: 409,
      path: '/a/x',
      fromServer: true,
      message: 'Já existe.',
    });
    expect(await api.list('/').catch((e: FilesError) => e)).toMatchObject({
      code: 'forbidden',
      fromServer: false,
    });
    expect(await api.list('/').catch((e: FilesError) => e)).toMatchObject({ code: 'internal' });
  });

  it('falha de rede vira network e cancelamento vira aborted', async () => {
    const down = createHttpAdapter('/api', {
      fetch: (async () => {
        throw new TypeError('fail');
      }) as unknown as typeof fetch,
    });
    await expect(down.list('/')).rejects.toMatchObject({ code: 'network' });
    const aborted = createHttpAdapter('/api', {
      fetch: (async () => {
        throw new DOMException('x', 'AbortError');
      }) as unknown as typeof fetch,
    });
    await expect(aborted.list('/')).rejects.toMatchObject({ code: 'aborted' });
  });

  it('chama onRequest com init mutável antes de enviar', async () => {
    const fetchMock = vi.fn(async () => json({ path: '/', items: [] }));
    const api = createHttpAdapter('/api', {
      fetch: fetchMock as unknown as typeof fetch,
      onRequest: (_url, init) => {
        (init.headers as Record<string, string>)['X-Extra'] = '1';
      },
    });
    await api.list('/');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Extra']).toBe('1');
  });

  it('URLs de download e visualização; as do servidor têm prioridade', () => {
    const api = createHttpAdapter('/api');
    expect(api.downloadUrl('/a/b c.pdf')).toBe('/api/download?path=%2Fa%2Fb+c.pdf');
    expect(api.viewUrl('/a/x.pdf', 'v2')).toBe(
      '/api/download?path=%2Fa%2Fx.pdf&version=v2&inline=1',
    );
    expect(
      api.viewUrl({ path: '/a', name: 'a', type: 'file', viewUrl: 'https://cdn.exemplo/a?sig=1' }),
    ).toBe('https://cdn.exemplo/a?sig=1');
  });

  it('capabilities é pedida uma só vez', async () => {
    const fetchMock = vi.fn(async () =>
      json({ write: true, trash: true, versions: false, search: 'folder', directUpload: false }),
    );
    const api = createHttpAdapter('/api', { fetch: fetchMock as unknown as typeof fetch });
    await Promise.all([api.capabilities(), api.capabilities()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('envio por XHR com progresso, multipart e conflict na query', async () => {
    class FakeXhr {
      static last: FakeXhr;
      upload: {
        onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void;
      } = {};
      status = 0;
      responseText = '';
      withCredentials = false;
      method = '';
      url = '';
      headers: Record<string, string> = {};
      body: unknown;
      onload?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      constructor() {
        FakeXhr.last = this;
      }
      open(method: string, url: string) {
        this.method = method;
        this.url = url;
      }
      setRequestHeader(k: string, v: string) {
        this.headers[k] = v;
      }
      send(body: unknown) {
        this.body = body;
      }
      abort() {
        this.onabort?.();
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const api = createHttpAdapter('/api', {
      fetch: (async () =>
        json({
          write: true,
          trash: false,
          versions: false,
          search: 'folder',
          directUpload: false,
        })) as unknown as typeof fetch,
    });
    const progress: number[] = [];
    const promise = api.upload(new File(['abc'], 'a.txt'), '/pasta', {
      conflict: 'rename',
      onProgress: (loaded) => progress.push(loaded),
    });
    await vi.waitFor(() => expect(FakeXhr.last?.body).toBeDefined());
    const xhr = FakeXhr.last;
    expect(xhr.method).toBe('POST');
    expect(new URL(xhr.url, 'http://x').searchParams.get('conflict')).toBe('rename');
    expect(new URL(xhr.url, 'http://x').searchParams.get('path')).toBe('/pasta');
    expect(xhr.body).toBeInstanceOf(FormData);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 3 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ path: '/pasta/a.txt', name: 'a.txt', type: 'file' });
    xhr.onload?.();
    expect((await promise).path).toBe('/pasta/a.txt');
    expect(progress).toEqual([2]);
  });

  it('envio recusado pelo servidor traz o código do corpo', async () => {
    class FakeXhr {
      upload = {};
      status = 413;
      responseText = JSON.stringify({ error: { code: 'too_large', message: '' } });
      onload?: () => void;
      open() {}
      setRequestHeader() {}
      send() {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const api = createHttpAdapter('/api', {
      fetch: (async () => new Response('', { status: 404 })) as unknown as typeof fetch,
    });
    await expect(api.upload(new File(['x'], 'a.txt'), '/')).rejects.toMatchObject({
      code: 'too_large',
      status: 413,
    });
  });
});
