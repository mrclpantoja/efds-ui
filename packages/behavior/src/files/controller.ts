import {
  ancestorsOf,
  baseName,
  formatSize,
  isInside,
  matchesAccept,
  normalizePath,
  parentOf,
  sortEntries,
  sortParam,
  type SortKey,
  type SortState,
} from './logic';
import { defaultFilesTexts, fill, plural, type FilesTexts } from './texts';
import {
  FilesError,
  type ConflictPolicy,
  type FileEntry,
  type FileVersion,
  type FilesAdapter,
  type FilesCapabilities,
  type FilesErrorCode,
  type TrashEntry,
} from './types';

/**
 * Controlador do Gerenciador de arquivos: estado da pasta, seleção, ordenação, área de
 * transferência, conflitos de nome, fila de envio, lixeira e versões. Não toca em DOM: o HTML
 * (`components/files.ts`) e o React (`FileManager`) só desenham o estado e chamam as ações.
 */

export type FilesMode = 'folder' | 'trash';
export type FilesView = 'list' | 'grid';
export type FilesStatus = 'loading' | 'ready' | 'error' | 'forbidden';
export type FilesAction =
  | 'open'
  | 'download'
  | 'rename'
  | 'cut'
  | 'copy'
  | 'move'
  | 'copyTo'
  | 'versions'
  | 'delete'
  | 'restore'
  | 'deleteForever';

export type AnyEntry = FileEntry | TrashEntry;

export interface UploadJob {
  id: string;
  name: string;
  size: number;
  /** Pasta de destino. */
  target: string;
  status: 'queued' | 'uploading' | 'done' | 'error' | 'canceled';
  loaded: number;
  error?: string;
}

export interface FilesState {
  path: string;
  mode: FilesMode;
  view: FilesView;
  status: FilesStatus;
  error: FilesError | null;
  items: AnyEntry[];
  nextCursor?: string;
  loadingMore: boolean;
  sort: SortState;
  query: string;
  recursive: boolean;
  selection: string[];
  clipboard: { mode: 'cut' | 'copy'; paths: string[]; entries: FileEntry[] } | null;
  caps: FilesCapabilities;
  capsLoaded: boolean;
  /** Pastas filhas já carregadas, por caminho do pai. */
  tree: Record<string, FileEntry[]>;
  treeLoading: string[];
  uploads: UploadJob[];
  readOnly: boolean;
}

export interface ConflictAnswer {
  policy: 'replace' | 'rename' | 'skip';
  all: boolean;
}

/** O que só a interface sabe fazer: perguntar, avisar e abrir o visualizador. */
export interface FilesUi {
  confirm(options: {
    title: string;
    text: string;
    confirmLabel: string;
    tone: 'danger' | 'info';
  }): Promise<boolean>;
  /** `null` cancela o que falta. */
  resolveConflict(options: { name: string; remaining: number }): Promise<ConflictAnswer | null>;
  toast(options: {
    tone: 'info' | 'success' | 'warning' | 'danger';
    message: string;
    action?: { label: string; onClick: () => void };
    duration?: number;
  }): void;
  announce(text: string): void;
  /** Abre o visualizador; sem ele o gerenciador abre `src` em nova aba. */
  view?(items: ViewerEntry[], index: number): void;
}

/** Forma de `ViewerItem` do visualizador (contrato 2.3) que o gerenciador entrega. */
export interface ViewerEntry {
  src: string;
  name: string;
  type?: string;
  downloadUrl?: string;
  size?: number;
  meta?: Record<string, unknown>;
}

export type FilesEventName = 'navigate' | 'select' | 'open' | 'change' | 'error';

export interface FilesControllerOptions {
  adapter: FilesAdapter;
  ui: FilesUi;
  texts?: () => FilesTexts;
  path?: string;
  view?: FilesView;
  readOnly?: boolean;
  rootLabel?: string;
  locale?: () => string;
  /** Devolve `false` quando um ouvinte cancelou (só `open` é cancelável). */
  onEvent?: (name: FilesEventName, detail: Record<string, unknown>) => boolean | void;
}

export type OpResult<T = FileEntry> =
  { ok: true; value: T } | { ok: false; error: FilesError; message: string };

export interface FilesController {
  getState(): FilesState;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  destroy(): void;
  // Navegação e lista
  navigate(path: string): Promise<void>;
  refresh(): Promise<void>;
  loadMore(): Promise<void>;
  setView(view: FilesView): void;
  setSort(key: SortKey): void;
  setQuery(query: string, recursive?: boolean): void;
  openTrash(): Promise<void>;
  closeTrash(): Promise<void>;
  // Árvore
  ensureTree(path: string): Promise<void>;
  // Seleção
  select(keys: string[]): void;
  toggle(key: string): void;
  selectAll(): void;
  clearSelection(): void;
  // Operações
  open(entry: AnyEntry): void;
  createFolder(name: string): Promise<OpResult>;
  rename(entry: FileEntry, name: string): Promise<OpResult>;
  remove(entries: FileEntry[]): Promise<void>;
  transfer(entries: FileEntry[], target: string, copy: boolean): Promise<void>;
  cut(entries: FileEntry[]): void;
  copy(entries: FileEntry[]): void;
  paste(): Promise<void>;
  upload(files: File[], target?: string): void;
  cancelUpload(id: string): void;
  retryUpload(id: string): void;
  dismissUploads(): void;
  restore(entries: TrashEntry[]): Promise<void>;
  deleteForever(entries: TrashEntry[]): Promise<void>;
  emptyTrash(): Promise<void>;
  versions(entry: FileEntry): Promise<FileVersion[]>;
  restoreVersion(entry: FileEntry, version: FileVersion): Promise<OpResult>;
  // Consultas
  can(action: FilesAction, entries: AnyEntry[]): boolean;
  actionsFor(entries: AnyEntry[]): FilesAction[];
  entriesOf(keys: string[]): AnyEntry[];
  keyOf(entry: AnyEntry): string;
  viewUrl(entry: FileEntry, version?: string): string;
  downloadUrl(entry: FileEntry, version?: string): string;
  /** Pode soltar `paths` em `target` (não solta pasta dentro dela mesma). */
  canDrop(paths: string[], target: string): boolean;
  errorMessage(error: FilesError): string;
  crumbs(): { path: string; label: string }[];
  rootLabel: string;
}

const DEFAULT_CAPS: FilesCapabilities = {
  write: true,
  trash: false,
  versions: false,
  search: 'folder',
  directUpload: false,
};

const ERROR_KEYS: Record<FilesErrorCode, keyof FilesTexts> = {
  not_found: 'filesErrNotFound',
  forbidden: 'filesErrForbidden',
  conflict: 'filesErrConflict',
  invalid_name: 'filesErrInvalidName',
  too_large: 'filesErrTooLarge',
  type_not_allowed: 'filesErrTypeNotAllowed',
  quota_exceeded: 'filesErrQuota',
  unsupported: 'filesErrUnsupported',
  internal: 'filesErrInternal',
  network: 'filesErrNetwork',
  aborted: 'filesErrAborted',
};

const MAX_PARALLEL_UPLOADS = 2;
const UNDO_MS = 8000;

function asFilesError(error: unknown): FilesError {
  if (error instanceof FilesError) return error;
  return new FilesError('internal');
}

export function createFilesController(options: FilesControllerOptions): FilesController {
  const { adapter, ui } = options;
  const texts = (): FilesTexts => options.texts?.() ?? defaultFilesTexts;
  const locale = (): string => options.locale?.() ?? 'pt-BR';
  const rootLabel = options.rootLabel ?? texts().filesRootLabel;
  const listeners = new Set<() => void>();
  const emit = (name: FilesEventName, detail: Record<string, unknown>): boolean =>
    options.onEvent?.(name, detail) !== false;

  let state: FilesState = {
    path: normalizePath(options.path ?? '/'),
    mode: 'folder',
    view: options.view ?? 'list',
    status: 'loading',
    error: null,
    items: [],
    loadingMore: false,
    sort: { key: 'name', dir: 'asc' },
    query: '',
    recursive: false,
    selection: [],
    clipboard: null,
    caps: { ...DEFAULT_CAPS, write: !options.readOnly },
    capsLoaded: false,
    tree: {},
    treeLoading: [],
    uploads: [],
    readOnly: options.readOnly ?? false,
  };

  const set = (patch: Partial<FilesState>) => {
    state = { ...state, ...patch };
    for (const l of [...listeners]) l();
  };

  let destroyed = false;
  let seq = 0;
  let abort: AbortController | null = null;
  const say = (text: string) => ui.announce(text);
  const keyOf = (e: AnyEntry): string => ('trashId' in e ? e.trashId : e.path);
  const canWrite = () => state.caps.write && !state.readOnly;

  const errorMessage = (error: FilesError): string =>
    error.fromServer && error.message ? error.message : texts()[ERROR_KEYS[error.code]];

  const fail = (action: string, error: unknown): FilesError => {
    const err = asFilesError(error);
    if (err.code === 'aborted') return err;
    ui.toast({ tone: 'danger', message: errorMessage(err) });
    emit('error', { action, status: err.status, error: err });
    return err;
  };

  const entriesOf = (keys: string[]): AnyEntry[] => {
    const wanted = new Set(keys);
    return state.items.filter((e) => wanted.has(keyOf(e)));
  };

  // ---- carregamento --------------------------------------------------------------------------

  async function load(more = false, announce = false): Promise<void> {
    const mine = ++seq;
    abort?.abort();
    abort = new AbortController();
    const { signal } = abort;
    if (!more && state.status !== 'ready') set({ status: 'loading', error: null });
    if (more) set({ loadingMore: true });
    try {
      let items: AnyEntry[];
      let nextCursor: string | undefined;
      if (state.mode === 'trash') {
        const r = await adapter.trash(more ? state.nextCursor : undefined);
        items = r.items;
        nextCursor = r.nextCursor;
      } else {
        const r = await adapter.list(state.path, {
          cursor: more ? state.nextCursor : undefined,
          sort: sortParam(state.sort),
          q: state.query || undefined,
          recursive: state.recursive && state.query !== '',
          signal,
        });
        items = r.items;
        nextCursor = r.nextCursor;
      }
      if (mine !== seq || destroyed) return;
      const all = more ? [...state.items, ...items] : items;
      const present = new Set(all.map(keyOf));
      set({
        status: 'ready',
        error: null,
        items: all,
        nextCursor,
        loadingMore: false,
        selection: state.selection.filter((k) => present.has(k)),
      });
      if (announce) announceFolder();
    } catch (error) {
      if (mine !== seq || destroyed) return;
      const err = asFilesError(error);
      if (err.code === 'aborted') return;
      set({
        status: err.code === 'forbidden' ? 'forbidden' : 'error',
        error: err,
        loadingMore: false,
        ...(more ? {} : { items: [], nextCursor: undefined, selection: [] }),
      });
      emit('error', { action: 'list', status: err.status, error: err });
    }
  }

  function announceFolder() {
    const t = texts();
    const n = state.items.length;
    if (state.mode === 'trash') {
      say(n === 0 ? t.filesTrashStatusEmpty : plural(t, 'filesTrashStatus', n));
    } else if (state.query) {
      say(n === 0 ? t.filesSearchStatusNone : plural(t, 'filesSearchStatus', n));
    } else {
      const name = state.path === '/' ? rootLabel : baseName(state.path);
      say(
        n === 0
          ? fill(t.filesFolderStatusEmpty, { name })
          : plural(t, 'filesFolderStatus', n, { name }),
      );
    }
  }

  async function ensureTree(path: string): Promise<void> {
    const p = normalizePath(path);
    if (state.tree[p] || state.treeLoading.includes(p)) return;
    set({ treeLoading: [...state.treeLoading, p] });
    try {
      const folders = await adapter.tree(p);
      if (destroyed) return;
      set({
        tree: { ...state.tree, [p]: folders },
        treeLoading: state.treeLoading.filter((x) => x !== p),
      });
    } catch {
      if (destroyed) return;
      set({
        tree: { ...state.tree, [p]: [] },
        treeLoading: state.treeLoading.filter((x) => x !== p),
      });
    }
  }

  /** Recarrega as pastas já carregadas da árvore (depois de criar, mover, renomear, excluir). */
  async function refreshTree(paths?: string[]): Promise<void> {
    const targets = (paths ?? Object.keys(state.tree)).map(normalizePath);
    const loaded = targets.filter((p) => p in state.tree);
    const results = await Promise.all(
      loaded.map(async (p) => [p, await adapter.tree(p).catch(() => null)] as const),
    );
    if (destroyed) return;
    const next = { ...state.tree };
    for (const [p, folders] of results) {
      if (folders) next[p] = folders;
      else delete next[p];
    }
    // Remove ramos que não existem mais.
    for (const key of Object.keys(next)) {
      const parent = parentOf(key);
      if (key !== '/' && next[parent] && !next[parent].some((f) => f.path === key))
        delete next[key];
    }
    set({ tree: next });
  }

  async function ensureAncestors(path: string): Promise<void> {
    await Promise.all(ancestorsOf(path).map((p) => ensureTree(p)));
  }

  // ---- conflitos ----------------------------------------------------------------------------

  interface ConflictRun {
    done: FileEntry[];
    skipped: number;
    failed: FilesError | null;
    canceled: boolean;
  }

  /**
   * Executa `exec` item a item (um por requisição), perguntando o que fazer a cada conflito de
   * nome. "Aplicar a todos" manda o que falta de uma vez. `initial` troca a política de partida.
   */
  async function withConflicts(
    keys: string[],
    nameOf: (key: string) => string,
    exec: (keys: string[], policy: ConflictPolicy) => Promise<FileEntry[]>,
    initial: (key: string) => ConflictPolicy = () => 'fail',
  ): Promise<ConflictRun> {
    const run: ConflictRun = { done: [], skipped: 0, failed: null, canceled: false };
    let sticky: 'replace' | 'rename' | 'skip' | null = null;
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]!;
      const start: ConflictPolicy = sticky && sticky !== 'skip' ? sticky : initial(key);
      try {
        run.done.push(...(await exec([key], start)));
      } catch (error) {
        const err = asFilesError(error);
        if (err.code !== 'conflict') {
          run.failed = err;
          break;
        }
        if (sticky === 'skip') {
          run.skipped += 1;
          continue;
        }
        const answer = await ui.resolveConflict({
          name: nameOf(key),
          remaining: keys.length - i - 1,
        });
        if (!answer) {
          run.canceled = true;
          break;
        }
        if (answer.policy === 'skip') {
          run.skipped += 1;
          if (answer.all) sticky = 'skip';
          continue;
        }
        try {
          run.done.push(...(await exec([key], answer.policy)));
        } catch (retry) {
          run.failed = asFilesError(retry);
          break;
        }
        if (answer.all) {
          sticky = answer.policy;
          const rest = keys.slice(i + 1);
          if (rest.length > 0) {
            try {
              run.done.push(...(await exec(rest, answer.policy)));
            } catch (batch) {
              run.failed = asFilesError(batch);
            }
          }
          break;
        }
      }
    }
    return run;
  }

  // ---- ações ---------------------------------------------------------------------------------

  const targetName = (path: string) => (path === '/' ? rootLabel : baseName(path));

  async function transfer(entries: FileEntry[], target: string, copy: boolean): Promise<void> {
    if (!canWrite() || entries.length === 0) return;
    const to = normalizePath(target);
    const t = texts();
    const paths = entries.map((e) => e.path);
    if (
      paths.some((p) => entries.find((e) => e.path === p)?.type === 'folder' && isInside(to, p))
    ) {
      ui.toast({ tone: 'warning', message: t.filesInvalidTarget });
      return;
    }
    let ignored = 0;
    const run = await withConflicts(
      paths,
      baseName,
      async (keys, policy) => {
        const r = copy
          ? await adapter.copy(keys, to, policy)
          : await adapter.move(keys, to, policy);
        ignored += r.skipped.length;
        return r.items;
      },
      // Copiar para a própria pasta cria "nome (1)" em vez de perguntar.
      (p) => (copy && parentOf(p) === to ? 'rename' : 'fail'),
    );
    if (run.failed) fail(copy ? 'copy' : 'move', run.failed);
    const count = run.done.length;
    if (count > 0) {
      const message = plural(t, copy ? 'filesCopied' : 'filesMoved', count, {
        target: targetName(to),
      });
      const extra =
        run.skipped + ignored > 0
          ? ` ${fill(t.filesSkipped, { count: run.skipped + ignored })}`
          : '';
      say(`${message}${extra}`);
      ui.toast({ tone: 'success', message: `${message}${extra}` });
      emit('change', { action: copy ? 'copy' : 'move', items: run.done, target: to });
    } else if (run.skipped + ignored > 0 && !run.failed) {
      say(fill(t.filesSkipped, { count: run.skipped + ignored }));
    }
    if (state.clipboard && !copy) set({ clipboard: null });
    set({ selection: [] });
    await Promise.all([load(), refreshTree([parentOf(paths[0]!), to, ...paths.map(parentOf)])]);
  }

  async function remove(entries: FileEntry[]): Promise<void> {
    if (!canWrite() || entries.length === 0) return;
    const t = texts();
    const paths = entries.map((e) => e.path);
    const useTrash = state.caps.trash;
    if (!useTrash) {
      const one = entries.length === 1;
      const ok = await ui.confirm({
        tone: 'danger',
        title: t.filesConfirmDeleteTitle,
        text: one
          ? fill(t.filesConfirmDeleteOne, { name: entries[0]!.name })
          : fill(t.filesConfirmDeleteMany, { count: entries.length }),
        confirmLabel: t.filesDelete,
      });
      if (!ok) return;
    }
    try {
      const deleted = await adapter.remove(paths, !useTrash);
      set({ selection: [] });
      if (useTrash) {
        const message =
          entries.length === 1
            ? fill(t.filesDeletedOne, { name: entries[0]!.name })
            : fill(t.filesDeletedMany, { count: entries.length });
        say(message);
        ui.toast({
          tone: 'info',
          message,
          duration: UNDO_MS,
          action: { label: t.filesUndo, onClick: () => void undoDelete(deleted) },
        });
      } else {
        const message =
          entries.length === 1
            ? fill(t.filesDeletedForeverOne, { name: entries[0]!.name })
            : plural(t, 'filesDeletedForever', entries.length);
        say(message);
        ui.toast({ tone: 'success', message });
      }
      emit('change', { action: 'delete', items: entries });
    } catch (error) {
      fail('delete', error);
    }
    await Promise.all([load(), refreshTree()]);
  }

  /** Acha os itens recém-excluídos na lixeira (pelo local de origem) e os restaura. */
  async function undoDelete(paths: string[]): Promise<void> {
    try {
      const wanted = new Set(paths.map((p) => normalizePath(p)));
      const found: TrashEntry[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 5; page += 1) {
        const r = await adapter.trash(cursor);
        for (const item of r.items)
          if (wanted.has(normalizePath(item.originalPath))) found.push(item);
        if (!r.nextCursor || found.length >= wanted.size) break;
        cursor = r.nextCursor;
      }
      if (found.length === 0) return;
      await restoreItems(found, 'undo');
    } catch (error) {
      fail('restore', error);
    }
  }

  async function restoreItems(entries: TrashEntry[], action = 'restore'): Promise<void> {
    const t = texts();
    const byId = new Map(entries.map((e) => [e.trashId, e]));
    const run = await withConflicts(
      entries.map((e) => e.trashId),
      (id) => byId.get(id)?.name ?? '',
      (ids, policy) => adapter.restore(ids, policy),
    );
    if (run.failed) fail('restore', run.failed);
    if (run.done.length > 0) {
      const message = plural(t, 'filesRestored', run.done.length);
      say(message);
      ui.toast({ tone: 'success', message });
      emit('change', { action, items: run.done });
    }
    set({ selection: [] });
    await Promise.all([load(), refreshTree()]);
  }

  // ---- envio ---------------------------------------------------------------------------------

  const files = new Map<string, File>();
  const controllers = new Map<string, AbortController>();
  const batches = new Map<
    string,
    { sticky: 'replace' | 'rename' | 'skip' | null; ids: string[] }
  >();
  const batchOf = new Map<string, string>();
  let uploadCounter = 0;
  let conflictLock: Promise<ConflictAnswer | null> = Promise.resolve(null);
  let running = 0;

  const patchJob = (id: string, patch: Partial<UploadJob>) => {
    set({ uploads: state.uploads.map((j) => (j.id === id ? { ...j, ...patch } : j)) });
  };

  function upload(list: File[], target = state.path): void {
    if (!canWrite() || list.length === 0) return;
    const t = texts();
    const to = normalizePath(target);
    const batchId = `b${(uploadCounter += 1)}`;
    const batch = { sticky: null as 'replace' | 'rename' | 'skip' | null, ids: [] as string[] };
    batches.set(batchId, batch);
    const jobs: UploadJob[] = [];
    let rejected = 0;
    for (const file of list) {
      const id = `u${(uploadCounter += 1)}`;
      let error: string | undefined;
      if (state.caps.maxUploadBytes !== undefined && file.size > state.caps.maxUploadBytes) {
        error = fill(t.filesUploadTooLarge, {
          size: formatSize(state.caps.maxUploadBytes, locale()),
        });
      } else if (!matchesAccept(file, state.caps.accept)) {
        error = t.filesUploadTypeNotAllowed;
      }
      if (error) rejected += 1;
      files.set(id, file);
      batchOf.set(id, batchId);
      batch.ids.push(id);
      jobs.push({
        id,
        name: file.name,
        size: file.size,
        target: to,
        status: error ? 'error' : 'queued',
        loaded: 0,
        error,
      });
    }
    set({ uploads: [...state.uploads, ...jobs] });
    const accepted = jobs.length - rejected;
    if (accepted > 0) say(plural(t, 'filesUploading', accepted));
    else if (rejected > 0) say(jobs[0]?.error ?? '');
    pump();
  }

  function pump(): void {
    while (running < MAX_PARALLEL_UPLOADS) {
      const next = state.uploads.find((j) => j.status === 'queued');
      if (!next) break;
      running += 1;
      patchJob(next.id, { status: 'uploading', loaded: 0, error: undefined });
      void runJob(next.id).finally(() => {
        running -= 1;
        pump();
      });
    }
  }

  async function runJob(id: string): Promise<void> {
    const file = files.get(id);
    const job = state.uploads.find((j) => j.id === id);
    const batch = batches.get(batchOf.get(id) ?? '');
    if (!file || !job || !batch) return;
    const ac = new AbortController();
    controllers.set(id, ac);
    const send = (policy: ConflictPolicy) =>
      adapter.upload(file, job.target, {
        conflict: policy,
        signal: ac.signal,
        onProgress: (loaded) => patchJob(id, { loaded }),
      });
    try {
      let entry: FileEntry | null = null;
      try {
        entry = await send(batch.sticky && batch.sticky !== 'skip' ? batch.sticky : 'fail');
      } catch (error) {
        const err = asFilesError(error);
        if (err.code !== 'conflict') throw err;
        if (batch.sticky === 'skip') {
          patchJob(id, { status: 'canceled' });
          return finishBatch(batch);
        }
        // Uma pergunta por vez, mesmo com envios em paralelo.
        const asked: Promise<ConflictAnswer | null> = conflictLock.then(
          async (): Promise<ConflictAnswer | null> => {
            if (batch.sticky) return { policy: batch.sticky, all: true };
            const waiting = batch.ids.filter((x) => {
              const s = state.uploads.find((j) => j.id === x)?.status;
              return s === 'queued' || s === 'uploading';
            }).length;
            return ui.resolveConflict({ name: file.name, remaining: Math.max(0, waiting - 1) });
          },
        );
        conflictLock = asked.catch(() => null);
        const answer = await asked;
        if (!answer) {
          patchJob(id, { status: 'canceled' });
          return finishBatch(batch);
        }
        if (answer.all) batch.sticky = answer.policy;
        if (answer.policy === 'skip') {
          patchJob(id, { status: 'canceled' });
          return finishBatch(batch);
        }
        entry = await send(answer.policy);
      }
      patchJob(id, { status: 'done', loaded: file.size });
      void entry;
    } catch (error) {
      const err = asFilesError(error);
      if (err.code === 'aborted') patchJob(id, { status: 'canceled' });
      else {
        patchJob(id, { status: 'error', error: errorMessage(err) });
        emit('error', { action: 'upload', status: err.status, error: err });
      }
    } finally {
      controllers.delete(id);
    }
    finishBatch(batch);
  }

  /** Quando o lote acaba: resumo, evento e recarga da pasta. */
  function finishBatch(batch: { ids: string[] }): void {
    const jobs = state.uploads.filter((j) => batch.ids.includes(j.id));
    if (jobs.some((j) => j.status === 'queued' || j.status === 'uploading')) return;
    const done = jobs.filter((j) => j.status === 'done');
    const failed = jobs.filter((j) => j.status === 'error').length;
    const t = texts();
    if (done.length > 0) {
      say(plural(t, 'filesUploaded', done.length));
      emit('change', {
        action: 'upload',
        items: done.map((j) => ({ name: j.name, target: j.target })),
      });
      if (done.some((j) => j.target === state.path) && state.mode === 'folder') void load();
      void refreshTree();
    }
    if (failed > 0) say(plural(t, 'filesUploadFailed', failed));
    for (const id of batch.ids) batchOf.delete(id);
  }

  // ---- retorno do controlador ---------------------------------------------------------------

  const controller: FilesController = {
    rootLabel,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async start() {
      const capsPromise = adapter
        .capabilities()
        .then((caps) => ({ ...DEFAULT_CAPS, ...caps }))
        .catch(() => null);
      const caps = await capsPromise;
      if (destroyed) return;
      if (caps) set({ caps, capsLoaded: true });
      else set({ capsLoaded: true });
      await Promise.all([load(false, true), ensureAncestors(state.path)]);
    },

    destroy() {
      destroyed = true;
      abort?.abort();
      for (const ac of controllers.values()) ac.abort();
      listeners.clear();
    },

    async navigate(path) {
      const to = normalizePath(path);
      set({
        path: to,
        mode: 'folder',
        query: '',
        recursive: false,
        selection: [],
        status: 'loading',
        error: null,
        items: [],
        nextCursor: undefined,
      });
      emit('navigate', { path: to });
      await Promise.all([load(false, true), ensureAncestors(to)]);
    },

    async refresh() {
      await Promise.all([load(), refreshTree()]);
    },

    async loadMore() {
      if (!state.nextCursor || state.loadingMore) return;
      await load(true);
    },

    setView: (view) => set({ view }),

    setSort(key) {
      const dir = state.sort.key === key && state.sort.dir === 'asc' ? 'desc' : 'asc';
      const sort: SortState = { key, dir };
      set({ sort });
      const t = texts();
      const col = {
        name: t.filesColName,
        size: t.filesColSize,
        modified: t.filesColModified,
        type: t.filesColType,
      }[key];
      say(
        fill(t.filesSortedBy, {
          column: col,
          direction: dir === 'asc' ? t.filesSortAscending : t.filesSortDescending,
        }),
      );
      if (state.mode === 'trash') {
        set({ items: sortEntries(state.items, sort, locale()) });
      } else void load();
    },

    setQuery(query, recursive) {
      const next = query.trim();
      const rec = recursive ?? state.recursive;
      if (next === state.query && rec === state.recursive) return;
      set({ query: next, recursive: rec });
      void load(false, true);
    },

    async openTrash() {
      set({
        mode: 'trash',
        query: '',
        selection: [],
        status: 'loading',
        error: null,
        items: [],
        nextCursor: undefined,
      });
      await load(false, true);
    },

    async closeTrash() {
      await controller.navigate(state.path);
    },

    ensureTree,

    select(keys) {
      set({ selection: keys });
      emit('select', { items: entriesOf(keys) });
    },
    toggle(key) {
      const on = state.selection.includes(key);
      controller.select(on ? state.selection.filter((k) => k !== key) : [...state.selection, key]);
    },
    selectAll() {
      controller.select(state.items.map(keyOf));
    },
    clearSelection() {
      if (state.selection.length > 0) controller.select([]);
    },

    open(entry) {
      if (entry.type === 'folder') {
        if ('trashId' in entry) return;
        void controller.navigate(entry.path);
        return;
      }
      if ('trashId' in entry) return;
      if (!emit('open', { item: entry })) return;
      const files = state.items.filter((e): e is FileEntry => e.type === 'file');
      const index = Math.max(
        0,
        files.findIndex((e) => e.path === entry.path),
      );
      const items: ViewerEntry[] = files.map((e) => ({
        src: controller.viewUrl(e),
        name: e.name,
        type: e.mime,
        downloadUrl: controller.downloadUrl(e),
        size: e.size,
        meta: { entry: e },
      }));
      if (ui.view) ui.view(items, index);
    },

    async createFolder(name) {
      const clean = name.trim();
      try {
        const entry = await adapter.createFolder(state.path, clean);
        say(fill(texts().filesFolderCreated, { name: entry.name }));
        emit('change', { action: 'createFolder', items: [entry] });
        await Promise.all([load(), refreshTree([state.path])]);
        return { ok: true, value: entry };
      } catch (error) {
        const err = asFilesError(error);
        emit('error', { action: 'createFolder', status: err.status, error: err });
        return { ok: false, error: err, message: errorMessage(err) };
      }
    },

    async rename(entry, name) {
      const clean = name.trim();
      try {
        const renamed = await adapter.rename(entry.path, clean);
        say(fill(texts().filesRenamed, { old: entry.name, name: renamed.name }));
        emit('change', { action: 'rename', items: [renamed] });
        await Promise.all([load(), refreshTree([parentOf(entry.path)])]);
        return { ok: true, value: renamed };
      } catch (error) {
        const err = asFilesError(error);
        emit('error', { action: 'rename', status: err.status, error: err });
        return { ok: false, error: err, message: errorMessage(err) };
      }
    },

    remove,
    transfer,

    cut(entries) {
      if (!canWrite() || entries.length === 0) return;
      set({ clipboard: { mode: 'cut', paths: entries.map((e) => e.path), entries } });
      say(plural(texts(), 'filesCut', entries.length));
    },
    copy(entries) {
      if (entries.length === 0) return;
      set({ clipboard: { mode: 'copy', paths: entries.map((e) => e.path), entries } });
      say(plural(texts(), 'filesClipboardCopied', entries.length));
    },
    async paste() {
      const clip = state.clipboard;
      if (!clip || state.mode !== 'folder' || !canWrite()) return;
      await transfer(clip.entries, state.path, clip.mode === 'copy');
    },

    upload,
    cancelUpload(id) {
      controllers.get(id)?.abort();
      const job = state.uploads.find((j) => j.id === id);
      if (job?.status === 'queued') {
        patchJob(id, { status: 'canceled' });
        const batch = batches.get(batchOf.get(id) ?? '');
        if (batch) finishBatch(batch);
      }
    },
    retryUpload(id) {
      const job = state.uploads.find((j) => j.id === id);
      const file = files.get(id);
      if (!job || !file || (job.status !== 'error' && job.status !== 'canceled')) return;
      // Um lote novo de um arquivo (a política de conflito anterior não vale).
      const batchId = `b${(uploadCounter += 1)}`;
      batches.set(batchId, { sticky: null, ids: [id] });
      batchOf.set(id, batchId);
      patchJob(id, { status: 'queued', loaded: 0, error: undefined });
      pump();
    },
    dismissUploads() {
      const active = state.uploads.filter((j) => j.status === 'queued' || j.status === 'uploading');
      for (const j of state.uploads) {
        if (!active.includes(j)) files.delete(j.id);
      }
      set({ uploads: active });
    },

    async restore(entries) {
      if (!canWrite()) return;
      await restoreItems(entries);
    },

    async deleteForever(entries) {
      if (!canWrite() || entries.length === 0) return;
      const t = texts();
      const ok = await ui.confirm({
        tone: 'danger',
        title: t.filesConfirmDeleteTitle,
        text:
          entries.length === 1
            ? fill(t.filesConfirmDeleteOne, { name: entries[0]!.name })
            : fill(t.filesConfirmDeleteMany, { count: entries.length }),
        confirmLabel: t.filesDeleteForever,
      });
      if (!ok) return;
      try {
        await adapter.deleteFromTrash(entries.map((e) => e.trashId));
        const message =
          entries.length === 1
            ? fill(t.filesDeletedForeverOne, { name: entries[0]!.name })
            : plural(t, 'filesDeletedForever', entries.length);
        say(message);
        emit('change', { action: 'deleteForever', items: entries });
      } catch (error) {
        fail('deleteForever', error);
      }
      set({ selection: [] });
      await load();
    },

    async emptyTrash() {
      if (!canWrite()) return;
      const t = texts();
      const ok = await ui.confirm({
        tone: 'danger',
        title: t.filesConfirmEmptyTitle,
        text: t.filesConfirmEmptyText,
        confirmLabel: t.filesEmptyTrash,
      });
      if (!ok) return;
      try {
        await adapter.emptyTrash();
        say(t.filesTrashEmptied);
        emit('change', { action: 'emptyTrash', items: [] });
      } catch (error) {
        fail('emptyTrash', error);
      }
      set({ selection: [] });
      await load();
    },

    versions: (entry) => adapter.versions(entry.path),

    async restoreVersion(entry, version) {
      try {
        const restored = await adapter.restoreVersion(entry.path, version.version);
        const when = new Intl.DateTimeFormat(locale(), {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(Date.parse(version.modified));
        const message = fill(texts().filesVersionRestored, { date: when });
        say(message);
        ui.toast({ tone: 'success', message });
        emit('change', { action: 'restoreVersion', items: [restored] });
        await load();
        return { ok: true, value: restored };
      } catch (error) {
        const err = asFilesError(error);
        emit('error', { action: 'restoreVersion', status: err.status, error: err });
        return { ok: false, error: err, message: errorMessage(err) };
      }
    },

    can(action, entries) {
      return controller.actionsFor(entries).includes(action);
    },

    actionsFor(entries) {
      if (entries.length === 0) return [];
      const trashMode = state.mode === 'trash';
      const writable = canWrite() && entries.every((e) => e.permissions?.write !== false);
      const deletable = canWrite() && entries.every((e) => e.permissions?.delete !== false);
      const single = entries.length === 1;
      const allFiles = entries.every((e) => e.type === 'file');
      const out: FilesAction[] = [];
      if (trashMode) {
        if (canWrite()) out.push('restore', 'deleteForever');
        return out;
      }
      if (single) out.push('open');
      if (allFiles) out.push('download');
      if (writable && single) out.push('rename');
      if (writable) out.push('cut');
      out.push('copy');
      if (writable) out.push('move');
      if (writable) out.push('copyTo');
      if (single && allFiles && state.caps.versions) out.push('versions');
      if (deletable) out.push('delete');
      return out;
    },

    entriesOf,
    keyOf,

    viewUrl: (entry, version) => adapter.viewUrl(entry, version),
    downloadUrl: (entry, version) => adapter.downloadUrl(entry, version),

    canDrop(paths, target) {
      const to = normalizePath(target);
      if (!canWrite()) return false;
      return paths.every((p) => {
        const known = state.items.find((e) => e.path === p);
        const isFolder = known ? known.type === 'folder' : true;
        if (isFolder && isInside(to, p)) return false;
        return true;
      });
    },

    errorMessage,

    crumbs() {
      return ancestorsOf(state.path).map((p) => ({
        path: p,
        label: p === '/' ? rootLabel : baseName(p),
      }));
    },
  };

  return controller;
}
