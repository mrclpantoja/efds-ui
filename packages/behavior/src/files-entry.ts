/**
 * Entrada `@efds-ui/behavior/files`: o cliente HTTP do Gerenciador de arquivos, o adaptador em
 * memória (testes e demos, só dados fictícios) e os tipos do contrato
 * (`docs/architecture/arquivos.md`, seção 4). Sem `init`: o HTML liga o componente por
 * `data-eds-files` e o React usa `<FileManager>`; esta entrada serve a quem escreve o próprio
 * adaptador (GraphQL, tRPC) ou testa o servidor.
 */
export { createHttpAdapter } from './files/http-adapter';
export type { HttpAdapterOptions } from './files/http-adapter';
export { createMemoryAdapter, defaultMemorySeed } from './files/memory-adapter';
export type { MemoryAdapterOptions, MemoryNode } from './files/memory-adapter';
export { FilesError } from './files/types';
export type {
  ConflictPolicy,
  FileEntry,
  FileVersion,
  FilesAdapter,
  FilesCapabilities,
  FilesErrorCode,
  ListOptions,
  ListResult,
  MoveResult,
  TrashEntry,
  TrashListResult,
  UploadOptions,
} from './files/types';
export { defaultFilesTexts } from './files/texts';
export type { FilesTexts } from './files/texts';
export {
  baseName,
  entryKind,
  formatSize,
  joinPath,
  normalizePath,
  parentOf,
  uniqueName,
} from './files/logic';
export type { EntryKind } from './files/logic';
