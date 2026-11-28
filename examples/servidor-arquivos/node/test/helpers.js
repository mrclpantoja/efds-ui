import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAudit } from '../src/audit.js';
import { createTokenAuthenticator } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { createFsDriver } from '../src/drivers/fs.js';
import { createFilesServer } from '../src/server.js';
import { createFilesService } from '../src/service.js';

export const ADMIN = 'token-admin-de-teste';
export const LEITOR = 'token-leitor-de-teste';
export const RESTRITO = 'token-restrito-de-teste';

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

export async function startServer(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'efds-files-'));
  const config = {
    ...loadConfig({
      FILES_TOKENS: JSON.stringify({
        [ADMIN]: { user: 'admin', acl: { '/': 'rwd' } },
        [LEITOR]: { user: 'leitor', acl: { '/': 'r' } },
        [RESTRITO]: { user: 'ana', acl: { '/contratos': 'rwd', '/usuarios/{user}': 'rwd' } },
      }),
      MAX_UPLOAD_BYTES: '65536',
      TRASH_RETENTION_DAYS: '30',
    }),
    root,
    ...overrides,
  };
  const auditLog = [];
  const driver = createFsDriver({ root, maxVersions: config.maxVersions });
  const service = createFilesService({
    driver,
    config,
    audit: createAudit((l) => auditLog.push(JSON.parse(l))),
  });
  const server = createFilesServer({
    service,
    authenticate: createTokenAuthenticator(config.tokens),
    config,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}${config.basePath}`;

  function api(token = ADMIN) {
    const headers = (extra = {}) => ({ authorization: `Bearer ${token}`, ...extra });
    const json = (method, path, body) =>
      fetch(base + path, {
        method,
        headers: headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(body),
      });
    return {
      get: (path, extra) => fetch(base + path, { headers: headers(extra) }),
      post: (path, body) => json('POST', path, body),
      patch: (path, body) => json('PATCH', path, body),
      upload: (folder, name, data, { conflict, type } = {}) => {
        const form = new FormData();
        form.append('file', new Blob([data], { type: type ?? 'application/octet-stream' }), name);
        const q = new URLSearchParams({ path: folder, ...(conflict ? { conflict } : {}) });
        return fetch(`${base}/upload?${q}`, { method: 'POST', headers: headers(), body: form });
      },
    };
  }

  return {
    base,
    root,
    api,
    auditLog,
    service,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await rm(root, { recursive: true, force: true });
    },
  };
}

export const q = (params) => '?' + new URLSearchParams(params);
