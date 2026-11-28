import { describe, expect, it } from 'vitest';
import {
  ancestorsOf,
  baseName,
  entryKind,
  isInside,
  joinPath,
  matchesAccept,
  nameProblem,
  normalizePath,
  parentOf,
  sortEntries,
  sortParam,
  uniqueName,
} from './logic';
import type { FileEntry } from './types';

describe('caminhos lógicos', () => {
  it('normaliza e junta', () => {
    expect(normalizePath('a//b/')).toBe('/a/b');
    expect(normalizePath('')).toBe('/');
    expect(joinPath('/', 'x')).toBe('/x');
    expect(joinPath('/a', 'x.pdf')).toBe('/a/x.pdf');
  });
  it('pai, nome e ancestrais', () => {
    expect(parentOf('/a/b/c')).toBe('/a/b');
    expect(parentOf('/a')).toBe('/');
    expect(baseName('/a/b.txt')).toBe('b.txt');
    expect(ancestorsOf('/a/b')).toEqual(['/', '/a', '/a/b']);
  });
  it('isInside não confunde prefixos de nome', () => {
    expect(isInside('/a/b', '/a')).toBe(true);
    expect(isInside('/a', '/a')).toBe(true);
    expect(isInside('/ab', '/a')).toBe(false);
    expect(isInside('/x', '/')).toBe(true);
  });
});

describe('nomes', () => {
  it('recusa vazio, barras, pontos e controle', () => {
    expect(nameProblem('  ')).toBe('empty');
    expect(nameProblem('..')).toBe('dots');
    expect(nameProblem('a/b')).toBe('chars');
    expect(nameProblem('a\\b')).toBe('chars');
    expect(nameProblem('a\u0001b')).toBe('chars');
    expect(nameProblem('x'.repeat(256))).toBe('long');
    expect(nameProblem('Relatório 2026.pdf')).toBeNull();
  });
  it('uniqueName gera "nome (1).ext" sem caixa', () => {
    expect(uniqueName('a.pdf', ['b.pdf'])).toBe('a.pdf');
    expect(uniqueName('a.pdf', ['A.PDF'])).toBe('a (1).pdf');
    expect(uniqueName('a.pdf', ['a.pdf', 'a (1).pdf'])).toBe('a (2).pdf');
    expect(uniqueName('pasta', ['pasta'])).toBe('pasta (1)');
  });
});

describe('ordenação e tipos', () => {
  const items: FileEntry[] = [
    { path: '/b.txt', name: 'b.txt', type: 'file', size: 5 },
    { path: '/Zeta', name: 'Zeta', type: 'folder' },
    { path: '/a10.txt', name: 'a10.txt', type: 'file', size: 9 },
    { path: '/a2.txt', name: 'a2.txt', type: 'file', size: 1 },
    { path: '/Álamo', name: 'Álamo', type: 'folder' },
  ];
  it('pastas primeiro, ordem natural e sem acento', () => {
    const names = sortEntries(items, { key: 'name', dir: 'asc' }).map((e) => e.name);
    expect(names).toEqual(['Álamo', 'Zeta', 'a2.txt', 'a10.txt', 'b.txt']);
  });
  it('decrescente por tamanho mantém as pastas no topo', () => {
    const names = sortEntries(items, { key: 'size', dir: 'desc' }).map((e) => e.name);
    expect(names.slice(2)).toEqual(['a10.txt', 'b.txt', 'a2.txt']);
    expect(sortParam({ key: 'modified', dir: 'desc' })).toBe('-modified');
  });
  it('tipo vem do mesmo critério do visualizador', () => {
    expect(entryKind({ type: 'folder', name: 'x' })).toBe('folder');
    expect(entryKind({ type: 'file', name: 'x.pdf' })).toBe('pdf');
    expect(entryKind({ type: 'file', name: 'x.svg', mime: 'image/svg+xml' })).toBe('other');
  });
  it('matchesAccept com MIME, curinga e extensão', () => {
    expect(matchesAccept({ name: 'a.pdf', type: 'application/pdf' }, ['.pdf'])).toBe(true);
    expect(matchesAccept({ name: 'a.png', type: 'image/png' }, ['image/*'])).toBe(true);
    expect(matchesAccept({ name: 'a.exe', type: '' }, ['image/*', '.pdf'])).toBe(false);
    expect(matchesAccept({ name: 'a.exe', type: '' }, undefined)).toBe(true);
  });
});
