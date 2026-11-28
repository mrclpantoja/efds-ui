import { formatFileSize, kindOf } from '../core/file-kind';
import type { FileEntry, FilesErrorCode } from './types';

/**
 * Funções puras do Gerenciador de arquivos: caminhos lógicos, nomes, ordenação, formatação.
 * Sem DOM e sem rede; o HTML e o React usam as mesmas.
 */

// ---- caminhos ------------------------------------------------------------------------------

/** Normaliza para `/a/b` (começa com `/`, sem `/` no fim, sem repetição). */
export function normalizePath(path: string | undefined | null): string {
  const parts = String(path ?? '')
    .split('/')
    .filter((p) => p !== '' && p !== '.');
  return `/${parts.join('/')}`;
}

export function joinPath(parent: string, name: string): string {
  const base = normalizePath(parent);
  return base === '/' ? `/${name}` : `${base}/${name}`;
}

export function parentOf(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  parts.pop();
  return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

export function baseName(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

/** `/`, `/a`, `/a/b` para `/a/b`. */
export function ancestorsOf(path: string): string[] {
  const parts = normalizePath(path).split('/').filter(Boolean);
  const out = ['/'];
  let acc = '';
  for (const p of parts) {
    acc += `/${p}`;
    out.push(acc);
  }
  return out;
}

/** `path` é `ancestor` ou está dentro dele. */
export function isInside(path: string, ancestor: string): boolean {
  const a = normalizePath(ancestor);
  const p = normalizePath(path);
  return a === '/' || p === a || p.startsWith(`${a}/`);
}

// ---- nomes ---------------------------------------------------------------------------------

const hasControlChars = (text: string): boolean =>
  Array.from(text).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

/** Motivo da recusa de um nome ou `null` se for válido (o servidor confere de novo). */
export function nameProblem(name: string): 'empty' | 'chars' | 'dots' | 'long' | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'empty';
  if (trimmed.startsWith('.')) return 'dots';
  if (/[/\\]/.test(trimmed)) return 'chars';
  if (hasControlChars(trimmed)) return 'chars';
  if (trimmed.length > 255) return 'long';
  return null;
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** "nome (1).ext" livre entre os `taken` (comparação sem caixa). */
export function uniqueName(name: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (n) => n.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 1; i < 10000; i += 1) {
    const candidate = `${stem} (${i})${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${stem} (${Date.now()})${ext}`;
}

// ---- tipo e ícone --------------------------------------------------------------------------

export type EntryKind = 'folder' | 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'other';

/** Tipo para o ícone e para a coluna "Tipo" (a regra do visualizador; SVG e HTML caem em "other"). */
export function entryKind(entry: Pick<FileEntry, 'type' | 'mime' | 'name'>): EntryKind {
  if (entry.type === 'folder') return 'folder';
  return kindOf(entry.mime, entry.name);
}

// ---- ordenação e formatação ----------------------------------------------------------------

export type SortKey = 'name' | 'size' | 'modified' | 'type';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

/** Valor do parâmetro `sort` da API: `name`, `-modified`. */
export function sortParam(sort: SortState): string {
  return `${sort.dir === 'desc' ? '-' : ''}${sort.key}`;
}

/** Pastas primeiro, depois a chave pedida (estável; nomes em ordem natural, sem acento nem caixa). */
export function sortEntries<T extends FileEntry>(
  items: readonly T[],
  sort: SortState,
  locale = 'pt-BR',
): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  const sign = sort.dir === 'desc' ? -1 : 1;
  const value = (e: T): number | string => {
    if (sort.key === 'size') return e.size ?? 0;
    if (sort.key === 'modified') return e.modified ? Date.parse(e.modified) || 0 : 0;
    if (sort.key === 'type') return entryKind(e);
    return e.name;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.type !== b.item.type) return a.item.type === 'folder' ? -1 : 1;
      const va = value(a.item);
      const vb = value(b.item);
      const c =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : collator.compare(String(va), String(vb));
      return c !== 0 ? c * sign : a.index - b.index;
    })
    .map((x) => x.item);
}

/** "1,5 MB" (a mesma formatação do visualizador). */
export const formatSize = formatFileSize;

export function formatDateTime(iso: string | undefined, locale = 'pt-BR'): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(t);
}

// ---- aceitação de arquivos -----------------------------------------------------------------

/** `accept` no formato do input: MIME, `tipo/*` e extensões com ponto. Lista vazia aceita tudo. */
export function matchesAccept(
  file: { name: string; type?: string },
  accept: readonly string[] | undefined,
): boolean {
  if (!accept || accept.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type ?? '').toLowerCase();
  return accept.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r === '') return false;
    if (r.startsWith('.')) return name.endsWith(r);
    if (r.endsWith('/*')) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
}

// ---- erros ---------------------------------------------------------------------------------

/** Código a partir do status HTTP quando o servidor não mandou `error.code`. */
export function codeFromStatus(status: number): FilesErrorCode {
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 413) return 'too_large';
  if (status === 415) return 'type_not_allowed';
  if (status === 422 || status === 400) return 'invalid_name';
  if (status === 507) return 'quota_exceeded';
  if (status === 501) return 'unsupported';
  return 'internal';
}
