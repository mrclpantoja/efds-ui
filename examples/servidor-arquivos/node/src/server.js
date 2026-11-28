// Camada HTTP mínima (node:http). Traduz o contrato 4.1 em chamadas ao serviço.
import { createServer } from 'node:http';
import { Readable, Transform, pipeline } from 'node:stream';
import { FilesError, badRequest } from './errors.js';
import { contentDisposition } from './service.js';

const JSON_LIMIT = 1024 * 1024;
const MULTIPART_OVERHEAD = 1024 * 1024;

/** Cabeçalhos de segurança de TODA resposta (4.4). */
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    ...BASE_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

async function readJson(req) {
  const type = req.headers['content-type'] ?? '';
  if (!/^application\/json\b/i.test(type)) throw badRequest('Envie o corpo como application/json.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > JSON_LIMIT) throw new FilesError('too_large', 'Corpo da requisição grande demais.');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('forma');
    return body;
  } catch {
    throw badRequest('JSON inválido.');
  }
}

/** Lê multipart/form-data com o parser nativo (undici) e limite de bytes. O arquivo fica em memória. */
async function readUpload(req, maxBytes) {
  const type = req.headers['content-type'] ?? '';
  if (!/^multipart\/form-data;/i.test(type))
    throw badRequest('Envie multipart/form-data com o campo "file".');
  const max = maxBytes + MULTIPART_OVERHEAD;
  const tooLarge = () =>
    new FilesError(
      'too_large',
      `O arquivo excede o limite de ${Math.floor(maxBytes / 1048576)} MB.`,
    );
  if (Number(req.headers['content-length']) > max) throw tooLarge();

  let seen = 0;
  let limitError = null;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      seen += chunk.length;
      if (seen > max) {
        limitError = tooLarge();
        cb(limitError);
      } else cb(null, chunk);
    },
  });
  pipeline(req, limiter, () => {});
  const request = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': type },
    body: Readable.toWeb(limiter),
    duplex: 'half',
  });
  let form;
  try {
    form = await request.formData();
  } catch {
    throw limitError ?? badRequest('Corpo multipart inválido.');
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw badRequest('Campo "file" ausente.');
  return { filename: file.name, data: Buffer.from(await file.arrayBuffer()) };
}

/** "bytes=a-b" | "bytes=a-" | "bytes=-n". Devolve {start,end}, null (ignorar) ou 'invalid' (416). */
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!m || (m[1] === '' && m[2] === '') || !Number.isFinite(size) || size <= 0) return null;
  let start;
  let end;
  if (m[1] === '') {
    start = Math.max(size - Number(m[2]), 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start > end || start >= size ? 'invalid' : { start, end };
}

async function sendDownload(req, res, d) {
  if (d.redirectUrl) {
    res.writeHead(302, { ...BASE_HEADERS, Location: d.redirectUrl });
    res.end();
    return;
  }
  let range = parseRange(req.headers.range, d.size);
  if (range === 'invalid') {
    res.writeHead(416, { ...BASE_HEADERS, 'Content-Range': `bytes */${d.size}` });
    res.end();
    return;
  }
  const obj = await d.open(range ?? undefined);
  if (range && !obj.rangeSupported) range = null;
  const headers = {
    ...BASE_HEADERS,
    'Content-Type': d.contentType,
    'Content-Disposition': contentDisposition(d.inline ? 'inline' : 'attachment', d.name),
    // Nunca executa nada do arquivo no navegador: nem como documento, nem como moldura de outro site.
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'",
    'Accept-Ranges': 'bytes',
  };
  if (obj.modified) headers['Last-Modified'] = new Date(obj.modified).toUTCString();
  if (range) {
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${obj.size ?? d.size}`;
    headers['Content-Length'] = range.end - range.start + 1;
  } else if (obj.size !== undefined) {
    headers['Content-Length'] = obj.size;
  }
  res.writeHead(range ? 206 : 200, headers);
  pipeline(obj.stream, res, () => res.destroy());
}

/**
 * @param {{ service: ReturnType<import('./service.js').createFilesService>,
 *           authenticate: (req: import('node:http').IncomingMessage) => any,
 *           config: import('./config.js').Config }} deps
 */
export function createFilesServer({ service, authenticate, config }) {
  /** @type {Record<string, { status?: number, run: (ctx: any) => Promise<any> }>} */
  const routes = {
    'GET /capabilities': { run: (c) => service.capabilities(c.user) },
    'GET /list': { run: (c) => service.list(c.user, c.query) },
    'GET /tree': { run: (c) => service.tree(c.user, c.query) },
    'POST /folders': {
      status: 201,
      run: async (c) => service.createFolder(c.user, await readJson(c.req)),
    },
    'POST /upload': {
      status: 201,
      run: async (c) =>
        service.upload(c.user, {
          path: c.query.path,
          conflict: c.query.conflict,
          ...(await readUpload(c.req, config.maxUploadBytes)),
        }),
    },
    'POST /upload-url': { run: async (c) => service.uploadUrl(c.user, await readJson(c.req)) },
    'PATCH /rename': { run: async (c) => service.rename(c.user, await readJson(c.req)) },
    'POST /move': { run: async (c) => service.move(c.user, await readJson(c.req)) },
    'POST /copy': { run: async (c) => service.copy(c.user, await readJson(c.req)) },
    'POST /delete': { run: async (c) => service.remove(c.user, await readJson(c.req)) },
    'GET /trash': { run: (c) => service.trashList(c.user, c.query) },
    'POST /trash/restore': {
      run: async (c) => service.trashRestore(c.user, await readJson(c.req)),
    },
    'POST /trash/empty': { run: async (c) => service.trashEmpty(c.user, await readJson(c.req)) },
    'POST /trash/delete': { run: async (c) => service.trashDelete(c.user, await readJson(c.req)) },
    'GET /versions': { run: (c) => service.versions(c.user, c.query) },
    'POST /versions/restore': {
      run: async (c) => service.restoreVersion(c.user, await readJson(c.req)),
    },
  };

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname !== config.basePath && !url.pathname.startsWith(config.basePath + '/')) {
        throw new FilesError('not_found', 'Rota não encontrada.');
      }
      const user = authenticate(req); // autentica antes de qualquer outra coisa (inclusive 404)
      const rest = url.pathname.slice(config.basePath.length) || '/';
      const query = Object.fromEntries(url.searchParams);
      const ctx = { req, user, query };

      if (req.method === 'GET' && rest === '/download') {
        await sendDownload(req, res, await service.download(user, query));
        return;
      }
      const route = routes[`${req.method} ${rest}`];
      if (!route) throw new FilesError('not_found', 'Rota não encontrada.');
      sendJson(res, route.status ?? 200, await route.run(ctx));
    } catch (e) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (e instanceof FilesError) {
        if (e.code === 'too_large') res.setHeader('Connection', 'close');
        sendJson(res, e.status, e.toJSON());
      } else {
        console.error('Erro inesperado:', e?.name, e?.message); // sem conteúdo de arquivo nem caminhos de usuário
        sendJson(res, 500, { error: { code: 'internal', message: 'Erro interno do servidor.' } });
      }
    }
  });
  return server;
}
