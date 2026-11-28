import { describe, expect, it } from 'vitest';
import { createMemoryAdapter } from './memory-adapter';
import { FilesError } from './types';

const adapter = () => createMemoryAdapter(undefined, { pageSize: 3 });
const file = (name: string, size = 10, type = 'text/plain') =>
  new File([new Uint8Array(size)], name, { type });

describe('adaptador em memória', () => {
  it('lista com cursor, ordenação e busca recursiva', async () => {
    const a = adapter();
    const first = await a.list('/', { sort: 'name' });
    expect(first.items.map((i) => i.name)).toEqual(['Arquivo morto', 'Contratos', 'Imagens']);
    expect(first.nextCursor).toBeDefined();
    const second = await a.list('/', { sort: 'name', cursor: first.nextCursor });
    expect(second.items.map((i) => i.name)).toEqual([
      'Notas fiscais',
      'Ata da reunião.txt',
      'Leia-me.txt',
    ]);
    expect(second.nextCursor).toBeUndefined();
    const found = await a.list('/', { q: 'proposta', recursive: true });
    expect(found.items.map((i) => i.path)).toEqual(['/Contratos/2026/Proposta comercial.pdf']);
    const flat = await a.list('/', { q: 'proposta' });
    expect(flat.items).toHaveLength(0);
  });

  it('pasta inexistente é not_found; nome inválido é recusado', async () => {
    const a = adapter();
    await expect(a.list('/nada')).rejects.toMatchObject({ code: 'not_found' });
    await expect(a.createFolder('/', 'a/b')).rejects.toMatchObject({ code: 'invalid_name' });
  });

  it('conflito de nome: fail, replace e rename', async () => {
    const a = adapter();
    await a.createFolder('/', 'Novo');
    await expect(a.createFolder('/', 'novo')).rejects.toMatchObject({ code: 'conflict' });
    await a.upload(file('x.txt'), '/Novo');
    await expect(a.upload(file('x.txt', 20), '/Novo')).rejects.toBeInstanceOf(FilesError);
    const renamed = await a.upload(file('x.txt', 20), '/Novo', { conflict: 'rename' });
    expect(renamed.name).toBe('x (1).txt');
    const replaced = await a.upload(file('x.txt', 30), '/Novo', { conflict: 'replace' });
    expect(replaced.size).toBe(30);
    const versions = await a.versions('/Novo/x.txt');
    expect(versions).toHaveLength(2);
    expect(versions[0]!.current).toBe(true);
  });

  it('mover e copiar: atômico, sem mover para dentro de si e com o skipped do mesmo pai', async () => {
    const a = adapter();
    const moved = await a.move(['/Notas fiscais/NF-0001.pdf'], '/Arquivo morto');
    expect(moved.items[0]!.path).toBe('/Arquivo morto/NF-0001.pdf');
    await expect(a.move(['/Contratos'], '/Contratos/2026')).rejects.toBeInstanceOf(FilesError);
    const same = await a.move(['/Arquivo morto/NF-0001.pdf'], '/Arquivo morto');
    expect(same.skipped).toEqual(['/Arquivo morto/NF-0001.pdf']);
    await a.copy(['/Contratos/Aditivo 01.pdf'], '/Arquivo morto');
    await expect(a.copy(['/Contratos/Aditivo 01.pdf'], '/Arquivo morto')).rejects.toMatchObject({
      code: 'conflict',
    });
    const dup = await a.copy(['/Contratos/Aditivo 01.pdf'], '/Arquivo morto', 'rename');
    expect(dup.items[0]!.name).toBe('Aditivo 01 (1).pdf');
  });

  it('lixeira: excluir, listar, restaurar com conflito, excluir de vez e esvaziar', async () => {
    const a = adapter();
    const gone = await a.remove(['/Contratos/Aditivo 01.pdf']);
    expect(gone).toEqual(['/Contratos/Aditivo 01.pdf']);
    const trash = await a.trash();
    expect(trash.items[0]).toMatchObject({
      originalPath: '/Contratos/Aditivo 01.pdf',
      name: 'Aditivo 01.pdf',
    });
    await a.upload(file('Aditivo 01.pdf'), '/Contratos');
    await expect(a.restore([trash.items[0]!.trashId])).rejects.toMatchObject({ code: 'conflict' });
    const restored = await a.restore([trash.items[0]!.trashId], 'rename');
    expect(restored[0]!.name).toBe('Aditivo 01 (1).pdf');
    expect((await a.trash()).items).toHaveLength(0);
    await a.remove(['/Leia-me.txt']);
    await a.remove(['/Ata da reunião.txt'], true);
    expect((await a.trash()).items).toHaveLength(1);
    await a.emptyTrash();
    expect((await a.trash()).items).toHaveLength(0);
  });

  it('exclusão de pasta leva a subárvore e a restauração a traz de volta', async () => {
    const a = adapter();
    await a.remove(['/Contratos']);
    await expect(a.list('/Contratos/2026')).rejects.toMatchObject({ code: 'not_found' });
    const [item] = (await a.trash()).items;
    await a.restore([item!.trashId]);
    const back = await a.list('/Contratos/2026');
    expect(back.items.map((i) => i.name)).toContain('Proposta comercial.pdf');
  });

  it('versões: restaurar cria uma nova versão atual', async () => {
    const a = adapter();
    const list = await a.versions('/Contratos/Contrato social.pdf');
    expect(list.length).toBe(3);
    const old = list[2]!;
    const entry = await a.restoreVersion('/Contratos/Contrato social.pdf', old.version);
    expect(entry.size).toBe(old.size);
    const after = await a.versions('/Contratos/Contrato social.pdf');
    expect(after.length).toBe(4);
    expect(after.filter((v) => v.current)).toHaveLength(1);
  });

  it('limites de envio e somente leitura', async () => {
    const small = createMemoryAdapter(undefined, {
      capabilities: { maxUploadBytes: 5, accept: ['.txt'] },
    });
    await expect(small.upload(file('a.txt', 10), '/')).rejects.toMatchObject({ code: 'too_large' });
    await expect(small.upload(file('a.png', 1, 'image/png'), '/')).rejects.toMatchObject({
      code: 'type_not_allowed',
    });
    const ro = createMemoryAdapter(undefined, { capabilities: { write: false } });
    await expect(ro.createFolder('/', 'x')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('envio cancelado devolve aborted', async () => {
    const a = createMemoryAdapter(undefined, { latency: 5 });
    const ac = new AbortController();
    const promise = a.upload(file('a.txt', 100), '/', { signal: ac.signal });
    ac.abort();
    await expect(promise).rejects.toMatchObject({ code: 'aborted' });
  });

  it('URLs de visualização e download existem para arquivos', () => {
    const a = adapter();
    expect(a.viewUrl('/Leia-me.txt')).toBeTruthy();
    expect(a.downloadUrl('/Imagens/Planta baixa.png')).toMatch(/^data:image\/svg\+xml/);
  });
});
