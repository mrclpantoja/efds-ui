// Driver de disco local. Só usa módulos nativos do Node.
// Áreas internas dentro da raiz: ".trash/" (feita pelo serviço) e ".versions/" (feita por este driver).
import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fsp from 'node:fs/promises';
import nodePath from 'node:path';
import { FilesError, forbidden, notFound } from '../errors.js';

const VERSION_ID = /^[0-9]{13}-[0-9a-f]{4}$/;

/**
 * @param {{ root: string, maxVersions?: number }} options
 * @returns {import('./index.js').StorageDriver}
 */
export function createFsDriver({ root, maxVersions = 20 }) {
  const rootAbs = nodePath.resolve(root);
  let realRoot = null;

  async function ensureRoot() {
    if (realRoot) return realRoot;
    await fsp.mkdir(rootAbs, { recursive: true });
    realRoot = await fsp.realpath(rootAbs);
    return realRoot;
  }

  const segmentsOf = (logical) => {
    const parts = logical.split('/').filter(Boolean);
    // Defesa em profundidade: o serviço já normalizou, mas o driver nunca confia.
    if (parts.some((s) => s === '..' || s === '.' || s.includes('\0') || s.includes('\\'))) {
      throw forbidden(logical);
    }
    return parts;
  };

  /** Caminho absoluto no disco, garantindo que nada (nem por link simbólico) escapa da raiz. */
  async function abs(logical) {
    const base = await ensureRoot();
    const target = nodePath.join(base, ...segmentsOf(logical));
    let probe = target;
    for (;;) {
      let real = null;
      try {
        real = await fsp.realpath(probe);
      } catch (e) {
        if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') throw e;
      }
      if (real !== null) {
        if (real !== base && !real.startsWith(base + nodePath.sep)) throw forbidden(logical);
        return target;
      }
      const up = nodePath.dirname(probe);
      if (up === probe) throw forbidden(logical);
      probe = up;
    }
  }

  const versionDir = (logical) => abs('/.versions' + (logical === '/' ? '' : logical));

  async function exists(p) {
    try {
      await fsp.lstat(p);
      return true;
    } catch {
      return false;
    }
  }

  function toStat(st) {
    if (st.isSymbolicLink()) return null; // links simbólicos nunca são expostos
    if (st.isDirectory()) return { type: 'folder', modified: st.mtime.toISOString() };
    if (st.isFile()) return { type: 'file', size: st.size, modified: st.mtime.toISOString() };
    return null;
  }

  async function stat(logical) {
    try {
      return toStat(await fsp.lstat(await abs(logical)));
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return null;
      throw e;
    }
  }

  async function list(logical) {
    const dir = await abs(logical);
    let names;
    try {
      names = await fsp.readdir(dir);
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR') throw notFound(logical);
      throw e;
    }
    const out = [];
    for (const name of names) {
      if (name.startsWith('.')) continue; // .trash, .versions, temporários
      try {
        const s = toStat(await fsp.lstat(nodePath.join(dir, name)));
        if (s) out.push({ name, ...s });
      } catch {
        // sumiu entre o readdir e o lstat: ignora
      }
    }
    return out;
  }

  async function walk(logical, { limit = 5000 } = {}) {
    const out = [];
    const visit = async (path) => {
      for (const entry of await list(path)) {
        if (out.length >= limit) return;
        const full = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
        out.push({ path: full, ...entry });
        if (entry.type === 'folder') await visit(full);
      }
    };
    await visit(logical);
    return out;
  }

  async function mkdir(logical, { parents = false } = {}) {
    await fsp.mkdir(await abs(logical), { recursive: parents });
  }

  // ----- versões (.versions/<caminho>/<id>) -----

  async function snapshot(logical) {
    const file = await abs(logical);
    let st;
    try {
      st = await fsp.stat(file);
    } catch {
      return;
    }
    if (!st.isFile()) return;
    const dir = await versionDir(logical);
    await fsp.mkdir(dir, { recursive: true });
    const id = `${String(Date.now()).padStart(13, '0')}-${randomBytes(2).toString('hex')}`;
    const copy = nodePath.join(dir, id);
    await fsp.copyFile(file, copy);
    await fsp.utimes(copy, st.atime, st.mtime); // "modified" da versão = data do conteúdo
    const ids = (await fsp.readdir(dir)).filter((n) => VERSION_ID.test(n)).sort();
    for (const old of ids.slice(0, Math.max(0, ids.length - maxVersions))) {
      await fsp.rm(nodePath.join(dir, old), { force: true });
    }
  }

  async function moveVersions(from, to) {
    const a = await versionDir(from);
    if (!(await exists(a))) return;
    const b = await versionDir(to);
    try {
      if (!(await exists(b))) {
        await fsp.mkdir(nodePath.dirname(b), { recursive: true });
        await fsp.rename(a, b);
        return;
      }
      for (const name of await fsp.readdir(a)) {
        await fsp.rename(nodePath.join(a, name), nodePath.join(b, name));
      }
      await fsp.rm(a, { recursive: true, force: true });
    } catch {
      // Melhor esforço: falhar ao mover o histórico não deve desfazer a operação principal.
    }
  }

  // ----- escrita atômica -----

  /** Grava em arquivo temporário oculto e publica de uma vez (link = sem sobrescrever; rename = sobrescrever). */
  async function publish(logical, writeTemp, overwrite) {
    const target = await abs(logical);
    const tmp = nodePath.join(nodePath.dirname(target), `.${randomBytes(6).toString('hex')}.tmp`);
    try {
      await writeTemp(tmp);
      if (overwrite) {
        await snapshot(logical);
        await fsp.rename(tmp, target);
      } else {
        try {
          await fsp.link(tmp, target);
        } catch (e) {
          if (e.code === 'EEXIST')
            throw new FilesError('conflict', 'Já existe um item com esse nome.', { path: logical });
          throw e;
        }
        await fsp.rm(tmp, { force: true });
      }
    } catch (e) {
      await fsp.rm(tmp, { force: true });
      throw e;
    }
  }

  async function put(logical, buffer, { overwrite = false } = {}) {
    await publish(logical, (tmp) => fsp.writeFile(tmp, buffer, { flag: 'wx' }), overwrite);
    return stat(logical);
  }

  async function get(logical, { version, range } = {}) {
    let file;
    if (version && version !== 'current') {
      if (!VERSION_ID.test(version)) throw notFound(logical);
      file = nodePath.join(await versionDir(logical), version);
    } else {
      file = await abs(logical);
    }
    let st;
    try {
      st = await fsp.stat(file);
    } catch {
      throw notFound(logical);
    }
    if (!st.isFile()) throw notFound(logical);
    const stream = createReadStream(
      file,
      range ? { start: range.start, end: range.end } : undefined,
    );
    return {
      stream,
      size: st.size,
      modified: st.mtime.toISOString(),
      rangeSupported: true,
    };
  }

  async function copy(from, to, { overwrite = false } = {}) {
    const src = await abs(from);
    const st = await fsp.lstat(src);
    if (st.isDirectory()) {
      await fsp.cp(src, await abs(to), {
        recursive: true,
        errorOnExist: true,
        force: false,
        filter: async (s) =>
          !(await fsp.lstat(s)).isSymbolicLink() && !nodePath.basename(s).startsWith('.'),
      });
      return;
    }
    await publish(to, (tmp) => fsp.copyFile(src, tmp), overwrite);
  }

  async function move(from, to, { overwrite = false } = {}) {
    const src = await abs(from);
    const dst = await abs(to);
    const st = await fsp.lstat(src);
    if (overwrite && st.isFile()) await snapshot(to);
    else if (await exists(dst))
      throw new FilesError('conflict', 'Já existe um item com esse nome.', { path: to });
    await fsp.mkdir(nodePath.dirname(dst), { recursive: true });
    await fsp.rename(src, dst);
    await moveVersions(from, to);
  }

  async function remove(logical) {
    await fsp.rm(await abs(logical), { recursive: true, force: true });
    await fsp.rm(await versionDir(logical), { recursive: true, force: true });
  }

  async function versions(logical) {
    const cur = await stat(logical);
    if (!cur || cur.type !== 'file') throw notFound(logical);
    const dir = await versionDir(logical);
    let ids = [];
    try {
      ids = (await fsp.readdir(dir))
        .filter((n) => VERSION_ID.test(n))
        .sort()
        .reverse();
    } catch {
      // sem histórico ainda
    }
    const list = [{ version: 'current', modified: cur.modified, size: cur.size, current: true }];
    for (const id of ids) {
      const st = await fsp.stat(nodePath.join(dir, id));
      list.push({ version: id, modified: st.mtime.toISOString(), size: st.size });
    }
    return list;
  }

  async function restoreVersion(logical, version) {
    if (!VERSION_ID.test(version)) throw notFound(logical);
    const source = nodePath.join(await versionDir(logical), version);
    if (!(await exists(source))) throw notFound(logical);
    await publish(logical, (tmp) => fsp.copyFile(source, tmp), true);
    return stat(logical);
  }

  async function readText(logical) {
    try {
      return await fsp.readFile(await abs(logical), 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  return {
    kind: 'fs',
    supportsVersions: async () => true,
    supportsDirectUpload: () => false,
    stat,
    list,
    walk,
    mkdir,
    put,
    get,
    copy,
    move,
    remove,
    versions,
    restoreVersion,
    readText,
    presignDownload: async () => null,
    presignUpload: async () => null,
  };
}
