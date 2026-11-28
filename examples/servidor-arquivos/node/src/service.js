// Regras do contrato (seção 4 de docs/architecture/arquivos.md) sobre qualquer driver de armazenamento.
// Aqui ficam: autorização por pasta/operação, conflitos, lixeira, versões, limites e auditoria.
import { randomUUID } from 'node:crypto';
import { can, canAnywhere } from './auth.js';
import { badRequest, conflict, FilesError, forbidden, notFound } from './errors.js';
import {
  assertContentMatches,
  assertExtensionAllowed,
  inlineContentType,
  mimeFor,
} from './mime.js';
import {
  baseName,
  isInside,
  joinPath,
  normalizePath,
  parentOf,
  sanitizeName,
  splitExt,
  validateName,
} from './paths.js';

const TRASH = '/.trash';
const TRASH_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONFLICTS = new Set(['fail', 'replace', 'rename']);
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * @param {{ driver: any, config: import('./config.js').Config, audit: Function }} deps
 */
export function createFilesService({ driver, config, audit }) {
  const trashOn = config.trashRetentionDays > 0;

  // ---------- utilitários ----------

  function need(user, ability, path) {
    if (!can(user, ability, path)) throw forbidden(path);
  }

  const pathOf = (raw) => normalizePath(raw);

  function conflictMode(raw) {
    const mode = raw ?? 'fail';
    if (!CONFLICTS.has(mode)) throw badRequest('Valor inválido para "conflict".');
    return mode;
  }

  const stripPaths = (paths) => {
    if (!Array.isArray(paths) || paths.length === 0 || paths.length > 500) {
      throw badRequest('Informe de 1 a 500 caminhos.');
    }
    const unique = [...new Set(paths.map(pathOf))];
    // remove itens que já estão dentro de outra pasta da própria lista
    return unique.filter((p) => !unique.some((q) => q !== p && isInside(p, q)));
  };

  function entry(user, path, st, extra = {}) {
    const name = baseName(path) || '';
    const e = {
      path,
      name,
      type: st.type,
      modified: st.modified,
      permissions: { write: can(user, 'write', path), delete: can(user, 'delete', path) },
      ...extra,
    };
    if (st.type === 'file') {
      e.size = st.size;
      e.mime = mimeFor(name);
    }
    return e;
  }

  async function mustStat(path) {
    const st = await driver.stat(path);
    if (!st) throw notFound(path);
    return st;
  }

  async function mustBeFolder(path) {
    const st = await mustStat(path);
    if (st.type !== 'folder') throw conflict('O destino não é uma pasta.', path);
    return st;
  }

  /**
   * Decide o destino de um item segundo `conflict`. `taken` guarda destinos já planejados no mesmo lote.
   * @returns {Promise<{ path: string, overwrite: boolean }>}
   */
  async function resolveDestination(folder, name, type, mode, taken = new Set()) {
    const dest = joinPath(folder, name);
    const existing = taken.has(dest) ? { type } : await driver.stat(dest);
    if (!existing) {
      taken.add(dest);
      return { path: dest, overwrite: false };
    }
    if (mode === 'fail') throw conflict('Já existe um item com esse nome.', dest);
    if (mode === 'replace') {
      if (existing.type !== 'file' || type !== 'file' || taken.has(dest)) {
        throw conflict('Só é possível substituir arquivo por arquivo.', dest);
      }
      taken.add(dest);
      return { path: dest, overwrite: true };
    }
    let candidate;
    for (let i = 1; i <= 1000; i++) {
      const [stem, ext] = type === 'file' ? splitExt(name) : [name, ''];
      candidate = joinPath(folder, `${stem} (${i})${ext}`);
      if (!taken.has(candidate) && !(await driver.stat(candidate))) break;
      candidate = null;
    }
    if (!candidate) throw conflict('Não foi possível gerar um nome livre.', dest);
    taken.add(candidate);
    return { path: candidate, overwrite: false };
  }

  async function ensureFolders(path) {
    // Cria pastas ausentes de um caminho (usado na restauração da lixeira).
    const parts = path.split('/').filter(Boolean);
    let cur = '/';
    for (const part of parts) {
      cur = joinPath(cur, part);
      if (!(await driver.stat(cur))) await driver.mkdir(cur);
    }
  }

  async function run(user, action, paths, fn) {
    try {
      const result = await fn();
      audit({ user, action, paths });
      return result;
    } catch (e) {
      audit({
        user,
        action,
        paths,
        outcome: 'error',
        code: e instanceof FilesError ? e.code : 'internal',
      });
      throw e;
    }
  }

  // ---------- leitura ----------

  async function capabilities(user) {
    const versions = await driver.supportsVersions();
    return {
      write: canAnywhere(user, 'write'),
      trash: trashOn,
      versions,
      search: 'recursive',
      directUpload: config.directUpload && driver.supportsDirectUpload(),
      maxUploadBytes: config.maxUploadBytes,
      ...(config.accept.length ? { accept: config.accept } : {}),
    };
  }

  async function list(user, q) {
    const path = pathOf(q.path ?? '/');
    need(user, 'list', path);
    const folder = await mustStat(path);
    if (folder.type !== 'folder') throw conflict('O caminho não é uma pasta.', path);
    const term = fold(String(q.q ?? '').trim());
    const recursive = q.recursive === '1' || q.recursive === 'true';

    let found;
    if (recursive && term) {
      found = (await driver.walk(path, { limit: 5000 })).filter((e) => fold(e.name).includes(term));
    } else {
      found = (await driver.list(path)).map((e) => ({ ...e, path: joinPath(path, e.name) }));
      if (term) found = found.filter((e) => fold(e.name).includes(term));
    }
    // Só mostra o que o usuário pode ler ou atravessar.
    found = found.filter((e) => can(user, e.type === 'folder' ? 'list' : 'read', e.path));

    const sort = String(q.sort ?? 'name');
    const desc = sort.startsWith('-');
    const field = sort.replace(/^-/, '');
    if (!['name', 'modified', 'size', 'type'].includes(field))
      throw badRequest('Ordenação inválida.');
    const collator = new Intl.Collator(config.locale, { numeric: true, sensitivity: 'base' });
    found.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1; // pastas primeiro
      let r;
      if (field === 'modified') r = (a.modified ?? '').localeCompare(b.modified ?? '');
      else if (field === 'size') r = (a.size ?? 0) - (b.size ?? 0);
      else if (field === 'type') r = mimeFor(a.name).localeCompare(mimeFor(b.name));
      else r = collator.compare(a.name, b.name);
      return (desc ? -r : r) || collator.compare(a.name, b.name);
    });

    const limit = Math.min(Math.max(Number.parseInt(q.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = decodeCursor(q.cursor);
    const page = found.slice(offset, offset + limit);
    const result = { path, items: page.map((e) => entry(user, e.path, e)) };
    if (offset + limit < found.length) result.nextCursor = encodeCursor(offset + limit);
    return result;
  }

  async function tree(user, q) {
    const path = pathOf(q.path ?? '/');
    need(user, 'list', path);
    await mustBeFolder(path);
    const folders = (await driver.list(path))
      .filter((e) => e.type === 'folder')
      .map((e) => ({ ...e, path: joinPath(path, e.name) }))
      .filter((e) => can(user, 'list', e.path))
      .sort((a, b) => a.name.localeCompare(b.name, config.locale))
      .map((e) => entry(user, e.path, e));
    return { path, folders };
  }

  // ---------- criação e envio ----------

  async function createFolder(user, body) {
    const parent = pathOf(body?.path ?? '/');
    const name = validateName(body?.name);
    need(user, 'write', parent);
    return run(user, 'folder.create', [joinPath(parent, name)], async () => {
      await mustBeFolder(parent);
      const path = joinPath(parent, name);
      if (await driver.stat(path)) throw conflict('Já existe um item com esse nome.', path);
      await driver.mkdir(path);
      return entry(user, path, await mustStat(path));
    });
  }

  function checkSize(size) {
    if (size > config.maxUploadBytes) {
      throw new FilesError(
        'too_large',
        `O arquivo excede o limite de ${Math.floor(config.maxUploadBytes / 1048576)} MB.`,
      );
    }
  }

  async function upload(user, { path: rawPath, conflict: rawMode, filename, data }) {
    const folder = pathOf(rawPath ?? '/');
    const mode = conflictMode(rawMode);
    need(user, 'write', folder);
    const name = sanitizeName(filename); // o servidor sanea o nome, nunca confia no do cliente
    return run(user, 'file.upload', [joinPath(folder, name)], async () => {
      checkSize(data.length);
      assertExtensionAllowed(name, config.accept);
      assertContentMatches(name, data); // por conteúdo, não só por extensão
      await mustBeFolder(folder);
      const dest = await resolveDestination(folder, name, 'file', mode);
      await driver.put(dest.path, data, {
        contentType: mimeFor(baseName(dest.path)),
        overwrite: dest.overwrite,
      });
      return entry(user, dest.path, await mustStat(dest.path));
    });
  }

  async function uploadUrl(user, body) {
    if (!config.directUpload || !driver.supportsDirectUpload()) {
      throw new FilesError('unsupported', 'Upload direto não está habilitado.');
    }
    const folder = pathOf(body?.path ?? '/');
    const name = validateName(body?.name);
    const size = Number(body?.size);
    if (!Number.isFinite(size) || size < 0) throw badRequest('Tamanho inválido.');
    need(user, 'write', folder);
    const dest = joinPath(folder, name);
    return run(user, 'file.upload-url', [dest], async () => {
      checkSize(size);
      assertExtensionAllowed(name, config.accept);
      await mustBeFolder(folder);
      if (await driver.stat(dest)) throw conflict('Já existe um item com esse nome.', dest);
      const contentType = mimeFor(name); // nunca o tipo declarado pelo cliente
      const signed = await driver.presignUpload(dest, {
        expires: config.signedUrlTtl,
        contentType,
      });
      return {
        ...signed,
        entry: entry(user, dest, { type: 'file', size, modified: new Date().toISOString() }),
      };
    });
  }

  // ---------- download ----------

  /**
   * Prepara uma resposta de download. O servidor HTTP aplica os cabeçalhos da seção 4.4.
   * @returns {Promise<{ name: string, contentType: string, inline: boolean, redirectUrl?: string, size?: number,
   *   open?: (range?: { start: number, end: number }) => Promise<any> }>}
   */
  async function download(user, q) {
    const path = pathOf(q.path);
    need(user, 'read', path);
    const version = q.version ? String(q.version) : undefined;
    if (version && !(await driver.supportsVersions()))
      throw new FilesError('unsupported', 'Versões não estão habilitadas.');
    const st = await mustStat(path);
    if (st.type !== 'file') throw conflict('O caminho não é um arquivo.', path);
    const name = baseName(path);
    const wantsInline = q.inline === '1' || q.inline === 'true';
    const inlineType = wantsInline ? inlineContentType(name) : null;
    const inline = inlineType !== null;
    const contentType = inline ? inlineType : mimeFor(name);
    audit({ user, action: inline ? 'file.view' : 'file.download', paths: [path] });

    if (!inline && config.redirectDownloads) {
      // Só "attachment" vai por redirecionamento: o S3 não aplica nosso CSP nem nosso nosniff.
      const redirectUrl = await driver.presignDownload(path, {
        expires: config.signedUrlTtl,
        version,
        disposition: contentDisposition('attachment', name),
        contentType,
      });
      if (redirectUrl) return { name, contentType, inline, redirectUrl };
    }
    return {
      name,
      contentType,
      inline,
      size: version ? undefined : st.size,
      open: (range) => driver.get(path, { version, range }),
    };
  }

  // ---------- renomear, mover, copiar ----------

  async function rename(user, body) {
    const path = pathOf(body?.path);
    if (path === '/') throw badRequest('A raiz não pode ser renomeada.');
    const name = validateName(body?.name);
    const mode = conflictMode(body?.conflict);
    need(user, 'write', path);
    need(user, 'write', parentOf(path));
    return run(user, 'rename', [path], async () => {
      const st = await mustStat(path);
      const folder = parentOf(path);
      if (name === baseName(path)) return entry(user, path, st);
      const dest = await resolveDestination(folder, name, st.type, mode);
      await driver.move(path, dest.path, { overwrite: dest.overwrite });
      return entry(user, dest.path, await mustStat(dest.path));
    });
  }

  async function transfer(user, body, op) {
    const sources = stripPaths(body?.paths);
    const target = pathOf(body?.target);
    const mode = conflictMode(body?.conflict);
    need(user, 'write', target);
    for (const p of sources) need(user, op === 'move' ? 'delete' : 'read', p);
    return run(user, op, sources, async () => {
      await mustBeFolder(target);
      const stats = new Map();
      for (const p of sources) {
        const st = await mustStat(p);
        stats.set(p, st);
        if (st.type === 'folder' && isInside(target, p)) {
          throw conflict('Não é possível colocar uma pasta dentro dela mesma.', p);
        }
      }
      // 1ª passada: planeja tudo (um conflito "fail" recusa o lote inteiro antes de mexer em qualquer coisa).
      const taken = new Set();
      const plan = [];
      const skipped = [];
      for (const p of sources) {
        if (op === 'move' && parentOf(p) === target) {
          skipped.push(p); // já está na pasta de destino
          continue;
        }
        const st = stats.get(p);
        plan.push({
          from: p,
          ...(await resolveDestination(target, baseName(p), st.type, mode, taken)),
        });
      }
      // 2ª passada: executa.
      const items = [];
      for (const { from, path, overwrite } of plan) {
        if (op === 'move') await driver.move(from, path, { overwrite });
        else await driver.copy(from, path, { overwrite });
        items.push(entry(user, path, await mustStat(path)));
      }
      return { items, skipped };
    });
  }

  // ---------- exclusão e lixeira ----------

  async function remove(user, body) {
    const paths = stripPaths(body?.paths);
    const permanent = body?.permanent === true;
    for (const p of paths) {
      if (p === '/') throw badRequest('A raiz não pode ser excluída.');
      need(user, 'delete', p);
    }
    if (!permanent && !trashOn) {
      throw new FilesError(
        'unsupported',
        'A lixeira está desligada: use exclusão definitiva (permanent).',
      );
    }
    return run(user, permanent ? 'delete.permanent' : 'delete.trash', paths, async () => {
      const stats = new Map();
      for (const p of paths) stats.set(p, await mustStat(p));
      for (const p of paths) {
        if (permanent) {
          await driver.remove(p);
          continue;
        }
        const id = randomUUID();
        const st = stats.get(p);
        await driver.mkdir(`${TRASH}/${id}`, { parents: true });
        await driver.move(p, `${TRASH}/${id}/${baseName(p)}`);
        const meta = {
          trashId: id,
          originalPath: p,
          name: baseName(p),
          type: st.type,
          size: st.size,
          modified: st.modified,
          deletedAt: new Date().toISOString(),
          deletedBy: user.id,
        };
        await driver.put(`${TRASH}/${id}.json`, Buffer.from(JSON.stringify(meta)), {
          overwrite: false,
        });
      }
      return { deleted: paths };
    });
  }

  async function readTrashMeta() {
    if (!(await driver.stat(TRASH))) return [];
    const out = [];
    for (const f of await driver.list(TRASH)) {
      if (f.type !== 'file' || !f.name.endsWith('.json')) continue;
      try {
        const text = await driver.readText(`${TRASH}/${f.name}`);
        if (text) out.push(JSON.parse(text));
      } catch {
        // metadado corrompido: ignora (não derruba a listagem)
      }
    }
    return out;
  }

  async function purgeItem(meta) {
    await driver.remove(`${TRASH}/${meta.trashId}`);
    await driver.remove(`${TRASH}/${meta.trashId}.json`);
  }

  /** Apaga da lixeira o que passou do prazo de retenção. Chame também por agendamento. */
  async function purgeExpired(now = Date.now()) {
    if (!trashOn) return 0;
    const limit = config.trashRetentionDays * 86400000;
    let count = 0;
    for (const meta of await readTrashMeta()) {
      if (now - Date.parse(meta.deletedAt) > limit) {
        await purgeItem(meta);
        count++;
      }
    }
    return count;
  }

  const toTrashEntry = (user, m) => ({
    ...entry(user, m.originalPath, { type: m.type, size: m.size, modified: m.modified }),
    trashId: m.trashId,
    originalPath: m.originalPath,
    deletedAt: m.deletedAt,
  });

  async function trashList(user, q) {
    if (!trashOn) throw new FilesError('unsupported', 'A lixeira está desligada.');
    await purgeExpired();
    const metas = (await readTrashMeta())
      .filter((m) => can(user, 'read', m.originalPath))
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    const limit = Math.min(Math.max(Number.parseInt(q.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = decodeCursor(q.cursor);
    const result = { items: metas.slice(offset, offset + limit).map((m) => toTrashEntry(user, m)) };
    if (offset + limit < metas.length) result.nextCursor = encodeCursor(offset + limit);
    return result;
  }

  async function loadTrash(ids) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => !TRASH_ID.test(id))) {
      throw badRequest('Identificadores da lixeira inválidos.');
    }
    const metas = [];
    for (const id of new Set(ids)) {
      const text = await driver.readText(`${TRASH}/${id}.json`);
      if (!text) throw notFound();
      metas.push(JSON.parse(text));
    }
    return metas;
  }

  async function trashRestore(user, body) {
    if (!trashOn) throw new FilesError('unsupported', 'A lixeira está desligada.');
    const mode = conflictMode(body?.conflict);
    const metas = await loadTrash(body?.ids);
    for (const m of metas) need(user, 'write', parentOf(m.originalPath));
    return run(
      user,
      'trash.restore',
      metas.map((m) => m.originalPath),
      async () => {
        const items = [];
        for (const m of metas) {
          const folder = parentOf(m.originalPath);
          await ensureFolders(folder);
          const dest = await resolveDestination(folder, m.name, m.type, mode);
          await driver.move(`${TRASH}/${m.trashId}/${m.name}`, dest.path, {
            overwrite: dest.overwrite,
          });
          await purgeItem(m); // pasta vazia da lixeira e metadado
          items.push(entry(user, dest.path, await mustStat(dest.path)));
        }
        return { items };
      },
    );
  }

  async function trashDelete(user, body, { all = false } = {}) {
    if (!trashOn) throw new FilesError('unsupported', 'A lixeira está desligada.');
    const metas = all ? await readTrashMeta() : await loadTrash(body?.ids);
    const allowed = metas.filter((m) => can(user, 'delete', m.originalPath));
    if (!all && allowed.length !== metas.length) throw forbidden();
    return run(
      user,
      all ? 'trash.empty' : 'trash.delete',
      allowed.map((m) => m.originalPath),
      async () => {
        for (const m of allowed) await purgeItem(m);
        return { deleted: allowed.map((m) => m.trashId) };
      },
    );
  }

  // ---------- versões ----------

  async function requireVersions() {
    if (!(await driver.supportsVersions()))
      throw new FilesError('unsupported', 'Versões não estão habilitadas.');
  }

  async function versions(user, q) {
    const path = pathOf(q.path);
    need(user, 'read', path);
    await requireVersions();
    return { versions: await driver.versions(path) };
  }

  async function restoreVersion(user, body) {
    const path = pathOf(body?.path);
    need(user, 'write', path);
    await requireVersions();
    if (typeof body?.version !== 'string' || body.version === '')
      throw badRequest('Versão inválida.');
    return run(user, 'version.restore', [path], async () => {
      await driver.restoreVersion(path, body.version);
      return entry(user, path, await mustStat(path));
    });
  }

  return {
    capabilities,
    list,
    tree,
    createFolder,
    upload,
    uploadUrl,
    download,
    rename,
    move: (user, body) => transfer(user, body, 'move'),
    copy: (user, body) => transfer(user, body, 'copy'),
    remove,
    trashList,
    trashRestore,
    trashDelete: (user, body) => trashDelete(user, body),
    trashEmpty: (user, body) => trashDelete(user, body, { all: true }),
    purgeExpired,
    versions,
    restoreVersion,
  };
}

export function contentDisposition(type, name) {
  const fallback = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\%]/g, '_');
  const star = encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
  return `${type}; filename="${fallback}"; filename*=UTF-8''${star}`;
}

const encodeCursor = (offset) => Buffer.from(String(offset)).toString('base64url');
function decodeCursor(cursor) {
  if (!cursor) return 0;
  const n = Number.parseInt(Buffer.from(String(cursor), 'base64url').toString(), 10);
  if (!Number.isInteger(n) || n < 0) throw badRequest('Cursor inválido.');
  return n;
}
