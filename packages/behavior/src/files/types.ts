/**
 * Tipos do Gerenciador de arquivos (contrato em `docs/architecture/arquivos.md`, seções 4.1 a 4.3).
 * Só tipos e o erro padrão: sem DOM, sem efeito colateral.
 */

export type ConflictPolicy = 'fail' | 'replace' | 'rename';

export type FilesErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'invalid_name'
  | 'too_large'
  | 'type_not_allowed'
  | 'quota_exceeded'
  | 'unsupported'
  | 'internal'
  /** Só no cliente: sem resposta do servidor. */
  | 'network'
  /** Só no cliente: a chamada foi cancelada. */
  | 'aborted';

/** Erro de uma operação. `message` vem do servidor quando ele manda texto próprio. */
export class FilesError extends Error {
  readonly code: FilesErrorCode;
  readonly status: number;
  readonly path?: string;
  /** `true` quando `message` veio do servidor (o cliente o mostra no lugar do texto padrão). */
  readonly fromServer: boolean;

  constructor(
    code: FilesErrorCode,
    message = '',
    options: { status?: number; path?: string; fromServer?: boolean } = {},
  ) {
    super(message || code);
    this.name = 'FilesError';
    this.code = code;
    this.status = options.status ?? 0;
    this.path = options.path;
    this.fromServer = options.fromServer ?? message !== '';
  }
}

export interface FileEntry {
  path: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  /** ISO 8601. */
  modified?: string;
  mime?: string;
  thumbnailUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  id?: string;
  permissions?: { write?: boolean; delete?: boolean };
}

export interface TrashEntry extends FileEntry {
  trashId: string;
  originalPath: string;
  deletedAt: string;
}

export interface FileVersion {
  version: string;
  modified: string;
  size: number;
  author?: string;
  current?: boolean;
}

export interface FilesCapabilities {
  write: boolean;
  trash: boolean;
  versions: boolean;
  search: 'none' | 'folder' | 'recursive';
  directUpload: boolean;
  maxUploadBytes?: number;
  /** MIME (`image/*`) ou extensões (`.pdf`). */
  accept?: string[];
}

export interface ListOptions {
  cursor?: string;
  /** `name`, `size`, `modified`, `type`; com `-` na frente, decrescente. */
  sort?: string;
  q?: string;
  recursive?: boolean;
  signal?: AbortSignal;
}

export interface ListResult {
  path: string;
  items: FileEntry[];
  nextCursor?: string;
}

export interface UploadOptions {
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
  conflict?: ConflictPolicy;
}

export interface MoveResult {
  items: FileEntry[];
  skipped: string[];
}

export interface TrashListResult {
  items: TrashEntry[];
  nextCursor?: string;
}

/** Uma entrada do adaptador por linha da tabela 4.1 do contrato. */
export interface FilesAdapter {
  capabilities(): Promise<FilesCapabilities>;
  list(path: string, options?: ListOptions): Promise<ListResult>;
  /** Só as pastas filhas de `path`. */
  tree(path: string): Promise<FileEntry[]>;
  createFolder(path: string, name: string): Promise<FileEntry>;
  upload(file: File, path: string, options?: UploadOptions): Promise<FileEntry>;
  rename(path: string, name: string, conflict?: ConflictPolicy): Promise<FileEntry>;
  move(paths: string[], target: string, conflict?: ConflictPolicy): Promise<MoveResult>;
  copy(paths: string[], target: string, conflict?: ConflictPolicy): Promise<MoveResult>;
  /** Exclui; sem `permanent`, vai para a lixeira quando ela existe. Devolve os caminhos excluídos. */
  remove(paths: string[], permanent?: boolean): Promise<string[]>;
  trash(cursor?: string): Promise<TrashListResult>;
  restore(ids: string[], conflict?: ConflictPolicy): Promise<FileEntry[]>;
  /** Esvazia a lixeira inteira. */
  emptyTrash(): Promise<string[]>;
  /** Exclui da lixeira só os `ids`. */
  deleteFromTrash(ids: string[]): Promise<string[]>;
  versions(path: string): Promise<FileVersion[]>;
  restoreVersion(path: string, version: string): Promise<FileEntry>;
  /** URL de download (a do `entry` quando o servidor mandou). */
  downloadUrl(entry: FileEntry | string, version?: string): string;
  /** URL para visualizar sem baixar (`inline`). */
  viewUrl(entry: FileEntry | string, version?: string): string;
}
