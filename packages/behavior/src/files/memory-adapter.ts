import {
  baseName,
  entryKind,
  joinPath,
  nameProblem,
  normalizePath,
  parentOf,
  sortEntries,
  uniqueName,
  isInside,
  type SortState,
} from './logic';
import {
  FilesError,
  type ConflictPolicy,
  type FileEntry,
  type FileVersion,
  type FilesAdapter,
  type FilesCapabilities,
  type ListOptions,
  type MoveResult,
  type TrashEntry,
  type UploadOptions,
} from './types';
import { matchesAccept } from './logic';

/** Item do conteúdo inicial: uma pasta tem `folder`; um arquivo, `size` e `mime`. */
export interface MemoryNode {
  name: string;
  folder?: MemoryNode[];
  size?: number;
  mime?: string;
  /** ISO 8601. */
  modified?: string;
  /** Texto do arquivo (visualização e download). */
  text?: string;
  /** Quantas versões anteriores o arquivo já tem. */
  versions?: number;
}

export interface MemoryAdapterOptions {
  /** Atraso simulado em ms por chamada (padrão 0). */
  latency?: number;
  capabilities?: Partial<FilesCapabilities>;
  /** Itens por página da listagem (padrão 50). */
  pageSize?: number;
  now?: () => Date;
}

interface Stored {
  path: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mime: string;
  modified: string;
  text?: string;
  versions: FileVersion[];
}

interface Trashed {
  trashId: string;
  originalPath: string;
  deletedAt: string;
  items: Stored[];
}

const DEFAULT_CAPS: FilesCapabilities = {
  write: true,
  trash: true,
  versions: true,
  search: 'recursive',
  directUpload: false,
  maxUploadBytes: 25_000_000,
};

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  md: 'text/markdown',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Conteúdo de exemplo (fictício) para mostrar a estrutura, as versões e a lixeira. */
export function defaultMemorySeed(): MemoryNode[] {
  return [
    {
      name: 'Contratos',
      folder: [
        {
          name: 'Contrato social.pdf',
          size: 184_320,
          modified: '2026-10-21T14:05:00Z',
          versions: 2,
        },
        { name: 'Aditivo 01.pdf', size: 92_160, modified: '2026-11-03T09:30:00Z' },
        {
          name: '2026',
          folder: [
            { name: 'Proposta comercial.pdf', size: 256_000, modified: '2026-09-12T16:40:00Z' },
            {
              name: 'Planilha de custos.csv',
              size: 1_420,
              modified: '2026-09-15T11:00:00Z',
              text: 'item;quantidade;valor\nServiço de exemplo;2;1500,00\nMaterial de teste;10;320,50\n',
            },
          ],
        },
      ],
    },
    {
      name: 'Notas fiscais',
      folder: [
        { name: 'NF-0001.pdf', size: 48_000, modified: '2026-08-02T10:10:00Z' },
        { name: 'NF-0002.pdf', size: 51_200, modified: '2026-08-19T15:45:00Z' },
        { name: 'NF-0003.pdf', size: 49_700, modified: '2026-09-30T08:20:00Z' },
      ],
    },
    {
      name: 'Imagens',
      folder: [
        { name: 'Fachada da sede.png', size: 812_000, modified: '2026-07-14T13:00:00Z' },
        { name: 'Planta baixa.png', size: 1_240_000, modified: '2026-07-14T13:05:00Z' },
      ],
    },
    { name: 'Arquivo morto', folder: [] },
    {
      name: 'Ata da reunião.txt',
      size: 612,
      modified: '2026-11-10T17:30:00Z',
      text: 'Ata de reunião fictícia.\n\nPauta: revisão do contrato de exemplo.\nDecisão: aprovar o aditivo 01.\n',
    },
    {
      name: 'Leia-me.txt',
      size: 180,
      modified: '2026-06-01T09:00:00Z',
      text: 'Arquivos de exemplo do efDS.ui.\n',
    },
  ];
}

// ---- conteúdo de exemplo para visualizar e baixar -----------------------------------------

function miniPdf(title: string): string {
  const safe = title.replace(/[()\\]/g, ' ').replace(/[^\x20-\x7e]/g, '?');
  const stream = `BT /F1 20 Tf 72 760 Td (${safe}) Tj 0 -28 Td /F1 12 Tf (Documento de exemplo do efDS.ui) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

function placeholderSvg(name: string): string {
  const label = name.replace(/[<>&]/g, ' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#dde5ee"/><path d="M0 330l150-130 110 90 120-140 260 180v70H0z" fill="#b6c4d4"/><circle cx="480" cy="110" r="38" fill="#f4f7fa"/><text x="320" y="60" font-family="sans-serif" font-size="26" text-anchor="middle" fill="#3b4a5c">${label}</text></svg>`;
}

function toUrl(content: string, type: string): string {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(new Blob([content], { type }));
  }
  return `data:${type};charset=utf-8,${encodeURIComponent(content)}`;
}

/**
 * Adaptador em memória, só com dados fictícios: alimenta os testes, a documentação e demos sem
 * servidor. Respeita o contrato (conflitos, lixeira, versões, cursor) mas não guarda nada fora da
 * página.
 */
export function createMemoryAdapter(
  seed: MemoryNode[] = defaultMemorySeed(),
  options: MemoryAdapterOptions = {},
): FilesAdapter {
  const caps: FilesCapabilities = { ...DEFAULT_CAPS, ...options.capabilities };
  const pageSize = options.pageSize ?? 50;
  const now = options.now ?? (() => new Date());
  const store = new Map<string, Stored>();
  const trash: Trashed[] = [];
  const urls = new Map<string, string>();
  let counter = 0;

  const key = (path: string) => normalizePath(path).toLowerCase();
  const find = (path: string) => store.get(key(path));
  const wait = async () => {
    if (options.latency) await new Promise((r) => setTimeout(r, options.latency));
  };

  const put = (s: Stored) => {
    store.set(key(s.path), s);
  };

  const makeVersions = (size: number, modified: string, count: number): FileVersion[] => {
    const list: FileVersion[] = [{ version: 'v1', modified, size, current: true }];
    for (let i = 1; i <= count; i += 1) {
      const t = new Date(Date.parse(modified) - i * 86_400_000 * 9).toISOString();
      list.push({
        version: `v${i + 1}`,
        modified: t,
        size: Math.max(1, size - i * 4096),
        author: i % 2 ? 'Ana Exemplo' : 'Bruno Teste',
      });
    }
    return list;
  };

  const load = (nodes: MemoryNode[], parent: string) => {
    for (const n of nodes) {
      const path = joinPath(parent, n.name);
      const modified = n.modified ?? '2026-06-01T09:00:00Z';
      if (n.folder) {
        put({ path, name: n.name, type: 'folder', size: 0, mime: '', modified, versions: [] });
        load(n.folder, path);
      } else {
        const ext = n.name.split('.').pop()?.toLowerCase() ?? '';
        const size = n.size ?? n.text?.length ?? 1024;
        put({
          path,
          name: n.name,
          type: 'file',
          size,
          mime: n.mime ?? MIME_BY_EXT[ext] ?? 'application/octet-stream',
          modified,
          text: n.text,
          versions: makeVersions(size, modified, n.versions ?? 0),
        });
      }
    }
  };
  put({
    path: '/',
    name: '',
    type: 'folder',
    size: 0,
    mime: '',
    modified: '2026-01-01T00:00:00Z',
    versions: [],
  });
  load(seed, '/');

  const view = (s: Stored): FileEntry => ({
    path: s.path,
    name: s.name,
    type: s.type,
    ...(s.type === 'file' ? { size: s.size, mime: s.mime } : {}),
    modified: s.modified,
    permissions: { write: caps.write, delete: caps.write },
  });

  const children = (path: string): Stored[] => {
    const parent = normalizePath(path);
    return [...store.values()].filter((s) => s.path !== '/' && parentOf(s.path) === parent);
  };
  const subtree = (path: string): Stored[] =>
    [...store.values()]
      .filter((s) => s.path !== '/' && isInside(s.path, path))
      .sort((a, b) => a.path.length - b.path.length);

  const requireFolder = (path: string): Stored => {
    const f = find(path);
    if (!f || f.type !== 'folder') throw new FilesError('not_found', '', { path });
    return f;
  };
  const requireWrite = () => {
    if (!caps.write) throw new FilesError('forbidden');
  };
  const requireName = (name: string) => {
    if (nameProblem(name) !== null) throw new FilesError('invalid_name');
  };

  /** Resolve conflito de nome no destino: devolve o nome final ou `null` para pular. */
  const finalName = (
    target: string,
    name: string,
    conflict: ConflictPolicy,
    ignore?: string,
  ): { name: string; replace?: Stored } => {
    const existing = children(target).find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.path !== ignore,
    );
    if (!existing) return { name };
    if (conflict === 'replace' && existing.type === 'file')
      return { name: existing.name, replace: existing };
    if (conflict === 'rename') {
      return {
        name: uniqueName(
          name,
          children(target).map((c) => c.name),
        ),
      };
    }
    throw new FilesError('conflict', '', { path: joinPath(target, name) });
  };

  const rebase = (items: Stored[], from: string, to: string): Stored[] =>
    items.map((s) => ({ ...s, path: to + s.path.slice(normalizePath(from).length) }));

  const bump = (s: Stored, size: number, modified: string) => {
    s.versions = s.versions.map((v) => ({ ...v, current: false }));
    s.versions.unshift({ version: `v${s.versions.length + 1}`, modified, size, current: true });
    s.size = size;
    s.modified = modified;
  };

  const transfer = (
    paths: string[],
    target: string,
    conflict: ConflictPolicy,
    copy: boolean,
  ): MoveResult => {
    requireWrite();
    requireFolder(target);
    // Confere tudo antes de mexer: a operação é atômica.
    const plan = paths.map((p) => {
      const src = find(p);
      if (!src) throw new FilesError('not_found', '', { path: p });
      if (src.type === 'folder' && isInside(target, src.path)) {
        throw new FilesError('invalid_name', 'Destino dentro da própria pasta.', { path: p });
      }
      if (!copy && parentOf(src.path) === normalizePath(target))
        return { src, skip: true as const };
      const decided = finalName(target, src.name, conflict);
      return { src, decided, skip: false as const };
    });
    const items: FileEntry[] = [];
    const skipped: string[] = [];
    for (const step of plan) {
      if (step.skip) {
        skipped.push(step.src.path);
        continue;
      }
      const { src, decided } = step;
      const dest = joinPath(target, decided.name);
      const tree = subtree(src.path);
      if (decided.replace) {
        for (const old of subtree(decided.replace.path)) store.delete(key(old.path));
      }
      if (!copy) for (const s of tree) store.delete(key(s.path));
      const moved = rebase(tree, src.path, dest);
      moved[0]!.name = decided.name;
      for (const s of moved) put(copy ? { ...s, versions: s.versions.map((v) => ({ ...v })) } : s);
      items.push(view(moved[0]!));
    }
    return { items, skipped };
  };

  const restoreTrashed = (t: Trashed, conflict: ConflictPolicy): FileEntry => {
    const parent = parentOf(t.originalPath);
    // Recria pastas do caminho que não existam mais.
    let acc = '';
    for (const part of parent.split('/').filter(Boolean)) {
      acc += `/${part}`;
      if (!find(acc)) {
        put({
          path: acc,
          name: part,
          type: 'folder',
          size: 0,
          mime: '',
          modified: now().toISOString(),
          versions: [],
        });
      }
    }
    const decided = finalName(parent, baseName(t.originalPath), conflict);
    const dest = joinPath(parent, decided.name);
    if (decided.replace)
      for (const old of subtree(decided.replace.path)) store.delete(key(old.path));
    const items = rebase(t.items, t.originalPath, dest);
    items[0]!.name = decided.name;
    for (const s of items) put(s);
    return view(items[0]!);
  };

  const asTrashEntry = (t: Trashed): TrashEntry => ({
    ...view(t.items[0]!),
    path: t.originalPath,
    trashId: t.trashId,
    originalPath: t.originalPath,
    deletedAt: t.deletedAt,
  });

  const contentUrl = (s: Stored, version?: string): string => {
    const id = `${s.path}#${version ?? 'atual'}`;
    const cached = urls.get(id);
    if (cached) return cached;
    const kind = entryKind(s);
    let url: string;
    if (kind === 'pdf') url = toUrl(miniPdf(s.name), 'application/pdf');
    else if (kind === 'image') {
      url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg(s.name))}`;
    } else {
      url = toUrl(s.text ?? `Conteúdo fictício de ${s.name}.\n`, 'text/plain');
    }
    urls.set(id, url);
    return url;
  };

  const paged = <T>(all: T[], cursor?: string): { items: T[]; nextCursor?: string } => {
    const start = cursor ? Math.max(0, Number(cursor) || 0) : 0;
    const items = all.slice(start, start + pageSize);
    return start + pageSize < all.length
      ? { items, nextCursor: String(start + pageSize) }
      : { items };
  };

  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

  return {
    async capabilities() {
      await wait();
      return { ...caps };
    },

    async list(path, o: ListOptions = {}) {
      await wait();
      const folder = requireFolder(path);
      let all =
        o.q && o.recursive
          ? subtree(folder.path).filter((s) => s.path !== folder.path)
          : children(folder.path);
      if (o.q) all = all.filter((s) => fold(s.name).includes(fold(o.q ?? '')));
      const sortKey = (o.sort ?? 'name').replace(/^-/, '') as SortState['key'];
      const sort: SortState = { key: sortKey, dir: o.sort?.startsWith('-') ? 'desc' : 'asc' };
      const sorted = sortEntries(all.map(view), sort);
      return { path: folder.path, ...paged(sorted, o.cursor) };
    },

    async tree(path) {
      await wait();
      requireFolder(path);
      return sortEntries(
        children(path)
          .filter((s) => s.type === 'folder')
          .map(view),
        {
          key: 'name',
          dir: 'asc',
        },
      );
    },

    async createFolder(path, name) {
      await wait();
      requireWrite();
      requireFolder(path);
      requireName(name);
      const decided = finalName(path, name.trim(), 'fail');
      const s: Stored = {
        path: joinPath(path, decided.name),
        name: decided.name,
        type: 'folder',
        size: 0,
        mime: '',
        modified: now().toISOString(),
        versions: [],
      };
      put(s);
      return view(s);
    },

    async upload(file: File, path: string, o: UploadOptions = {}) {
      requireWrite();
      requireFolder(path);
      requireName(file.name);
      if (caps.maxUploadBytes !== undefined && file.size > caps.maxUploadBytes) {
        throw new FilesError('too_large');
      }
      if (!matchesAccept(file, caps.accept)) throw new FilesError('type_not_allowed');
      const steps = 4;
      for (let i = 1; i <= steps; i += 1) {
        if (o.signal?.aborted) throw new FilesError('aborted');
        await wait();
        o.onProgress?.(Math.round((file.size * i) / steps), file.size);
      }
      if (o.signal?.aborted) throw new FilesError('aborted');
      const decided = finalName(path, file.name, o.conflict ?? 'fail');
      const modified = now().toISOString();
      const text =
        file.type.startsWith('text/') && file.size <= 100_000 && typeof file.text === 'function'
          ? await file.text()
          : undefined;
      if (decided.replace) {
        bump(decided.replace, file.size, modified);
        decided.replace.text = text;
        return view(decided.replace);
      }
      const ext = decided.name.split('.').pop()?.toLowerCase() ?? '';
      const s: Stored = {
        path: joinPath(path, decided.name),
        name: decided.name,
        type: 'file',
        size: file.size,
        mime: file.type || MIME_BY_EXT[ext] || 'application/octet-stream',
        modified,
        text,
        versions: [{ version: 'v1', modified, size: file.size, current: true }],
      };
      put(s);
      return view(s);
    },

    async rename(path, name, conflict = 'fail') {
      await wait();
      requireWrite();
      requireName(name);
      const src = find(path);
      if (!src || src.path === '/') throw new FilesError('not_found', '', { path });
      const parent = parentOf(src.path);
      const decided = finalName(parent, name.trim(), conflict, src.path);
      const dest = joinPath(parent, decided.name);
      const tree = subtree(src.path);
      for (const s of tree) store.delete(key(s.path));
      const moved = rebase(tree, src.path, dest);
      moved[0]!.name = decided.name;
      for (const s of moved) put(s);
      return view(moved[0]!);
    },

    async move(paths, target, conflict = 'fail') {
      await wait();
      return transfer(paths, target, conflict, false);
    },

    async copy(paths, target, conflict = 'fail') {
      await wait();
      return transfer(paths, target, conflict, true);
    },

    async remove(paths, permanent = false) {
      await wait();
      requireWrite();
      if (!caps.trash && !permanent) throw new FilesError('unsupported');
      const deleted: string[] = [];
      for (const p of paths) {
        const src = find(p);
        if (!src || src.path === '/') throw new FilesError('not_found', '', { path: p });
        const tree = subtree(src.path);
        for (const s of tree) store.delete(key(s.path));
        if (caps.trash && !permanent) {
          counter += 1;
          trash.unshift({
            trashId: `t${counter}`,
            originalPath: src.path,
            deletedAt: now().toISOString(),
            items: tree,
          });
        }
        deleted.push(src.path);
      }
      return deleted;
    },

    async trash(cursor) {
      await wait();
      const page = paged(trash.map(asTrashEntry), cursor);
      return page;
    },

    async restore(ids, conflict = 'fail') {
      await wait();
      requireWrite();
      const targets = ids.map((id) => {
        const t = trash.find((x) => x.trashId === id);
        if (!t) throw new FilesError('not_found', '', { path: id });
        return t;
      });
      const out: FileEntry[] = [];
      for (const t of targets) {
        out.push(restoreTrashed(t, conflict));
        trash.splice(trash.indexOf(t), 1);
      }
      return out;
    },

    async emptyTrash() {
      await wait();
      requireWrite();
      const ids = trash.map((t) => t.trashId);
      trash.length = 0;
      return ids;
    },

    async deleteFromTrash(ids) {
      await wait();
      requireWrite();
      const gone: string[] = [];
      for (const id of ids) {
        const i = trash.findIndex((t) => t.trashId === id);
        if (i >= 0) {
          trash.splice(i, 1);
          gone.push(id);
        }
      }
      return gone;
    },

    async versions(path) {
      await wait();
      const s = find(path);
      if (!s || s.type !== 'file') throw new FilesError('not_found', '', { path });
      return s.versions.map((v) => ({ ...v }));
    },

    async restoreVersion(path, version) {
      await wait();
      requireWrite();
      const s = find(path);
      const v = s?.versions.find((x) => x.version === version);
      if (!s || !v) throw new FilesError('not_found', '', { path });
      bump(s, v.size, now().toISOString());
      return view(s);
    },

    downloadUrl(entry, version) {
      const s = find(typeof entry === 'string' ? entry : entry.path);
      return s ? contentUrl(s, version) : '';
    },

    viewUrl(entry, version) {
      const s = find(typeof entry === 'string' ? entry : entry.path);
      return s ? contentUrl(s, version) : '';
    },
  };
}
