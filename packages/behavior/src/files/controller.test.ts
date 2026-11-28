import { describe, expect, it, vi } from 'vitest';
import { createFilesController, type ConflictAnswer, type FilesUi } from './controller';
import { createMemoryAdapter } from './memory-adapter';
import { FilesError, type FilesAdapter } from './types';

interface Harness {
  ui: FilesUi & {
    toasts: { message: string; action?: { label: string; onClick: () => void } }[];
    said: string[];
    answers: (ConflictAnswer | null)[];
    asked: { name: string; remaining: number }[];
    confirms: boolean[];
  };
}

function setup(adapter: FilesAdapter = createMemoryAdapter(), extra = {}) {
  const toasts: Harness['ui']['toasts'] = [];
  const said: string[] = [];
  const answers: (ConflictAnswer | null)[] = [];
  const asked: { name: string; remaining: number }[] = [];
  const confirms: boolean[] = [];
  const ui: Harness['ui'] = {
    toasts,
    said,
    answers,
    asked,
    confirms,
    announce: (t) => void said.push(t),
    toast: (o) => void toasts.push(o),
    confirm: async () => confirms.shift() ?? true,
    resolveConflict: async (o) => {
      asked.push(o);
      return answers.length > 0 ? (answers.shift() ?? null) : null;
    },
  };
  const events: { name: string; detail: Record<string, unknown> }[] = [];
  const controller = createFilesController({
    adapter,
    ui,
    onEvent: (name, detail) => void events.push({ name, detail }),
    ...extra,
  });
  return { controller, ui, events, adapter };
}

const file = (name: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type: 'text/plain' });
const names = (c: ReturnType<typeof setup>['controller']) => c.getState().items.map((e) => e.name);

describe('controlador: lista e navegação', () => {
  it('carrega capacidades, a pasta e a árvore, e anuncia a pasta', async () => {
    const { controller, ui } = setup(createMemoryAdapter(undefined, { pageSize: 4 }));
    await controller.start();
    const s = controller.getState();
    expect(s.status).toBe('ready');
    expect(s.caps.trash).toBe(true);
    expect(s.tree['/']?.map((f) => f.name)).toContain('Contratos');
    expect(ui.said).toContain('Pasta Arquivos: 4 itens.');
    expect(s.nextCursor).toBeDefined();
  });

  it('"carregar mais" usa o cursor e acrescenta', async () => {
    const { controller } = setup(createMemoryAdapter(undefined, { pageSize: 4 }));
    await controller.start();
    await controller.loadMore();
    expect(controller.getState().items).toHaveLength(6);
    expect(controller.getState().nextCursor).toBeUndefined();
  });

  it('navegar abre os ancestrais da árvore, limpa a seleção e emite o evento', async () => {
    const { controller, events } = setup();
    await controller.start();
    controller.select(['/Contratos']);
    await controller.navigate('/Contratos/2026');
    expect(controller.getState().path).toBe('/Contratos/2026');
    expect(controller.getState().selection).toEqual([]);
    expect(names(controller)).toEqual(['Planilha de custos.csv', 'Proposta comercial.pdf']);
    expect(Object.keys(controller.getState().tree)).toEqual(
      expect.arrayContaining(['/', '/Contratos', '/Contratos/2026']),
    );
    expect(events.find((e) => e.name === 'navigate')?.detail).toEqual({ path: '/Contratos/2026' });
    expect(controller.crumbs().map((c) => c.label)).toEqual(['Arquivos', 'Contratos', '2026']);
  });

  it('erro 403 vira "forbidden" e outro vira "error", com retentativa', async () => {
    let fail: FilesError | null = new FilesError('forbidden');
    const base = createMemoryAdapter();
    const adapter: FilesAdapter = {
      ...base,
      list: async (p, o) => {
        if (fail) throw fail;
        return base.list(p, o);
      },
    };
    const { controller, events } = setup(adapter);
    await controller.start();
    expect(controller.getState().status).toBe('forbidden');
    fail = new FilesError('network');
    await controller.refresh();
    expect(controller.getState().status).toBe('error');
    expect(controller.errorMessage(controller.getState().error!)).toBe(
      'Sem conexão com o servidor.',
    );
    expect(events.some((e) => e.name === 'error')).toBe(true);
    fail = null;
    await controller.refresh();
    expect(controller.getState().status).toBe('ready');
  });

  it('busca e ordenação recarregam com os parâmetros', async () => {
    const { controller } = setup();
    await controller.start();
    controller.setQuery('nf', true);
    await vi.waitFor(() =>
      expect(names(controller)).toEqual(['NF-0001.pdf', 'NF-0002.pdf', 'NF-0003.pdf']),
    );
    controller.setQuery('');
    controller.setSort('size');
    await vi.waitFor(() => expect(controller.getState().sort).toEqual({ key: 'size', dir: 'asc' }));
    controller.setSort('size');
    expect(controller.getState().sort.dir).toBe('desc');
  });
});

describe('controlador: seleção, ações e permissões', () => {
  it('seleção, selecionar todos e ações por tipo', async () => {
    const { controller } = setup();
    await controller.start();
    controller.selectAll();
    expect(controller.getState().selection).toHaveLength(6);
    controller.toggle('/Contratos');
    expect(controller.getState().selection).toHaveLength(5);
    const [folder] = controller.entriesOf(['/Imagens']);
    expect(controller.actionsFor([folder!])).toEqual([
      'open',
      'rename',
      'cut',
      'copy',
      'move',
      'copyTo',
      'delete',
    ]);
    const [doc] = controller.entriesOf(['/Leia-me.txt']);
    expect(controller.actionsFor([doc!])).toContain('versions');
    expect(controller.actionsFor([doc!, folder!])).not.toContain('download');
  });

  it('somente leitura tira as ações de escrita', async () => {
    const { controller } = setup(undefined, { readOnly: true });
    await controller.start();
    const [folder] = controller.entriesOf(['/Imagens']);
    expect(controller.actionsFor([folder!])).toEqual(['open', 'copy']);
    await controller.remove([folder!]);
    expect(names(controller)).toContain('Imagens');
  });

  it('canDrop recusa pasta dentro dela mesma', async () => {
    const { controller } = setup();
    await controller.start();
    expect(controller.canDrop(['/Contratos'], '/Contratos/2026')).toBe(false);
    expect(controller.canDrop(['/Contratos'], '/Imagens')).toBe(true);
  });
});

describe('controlador: mover, copiar e conflitos', () => {
  it('mover para a pasta de destino anuncia e atualiza a lista e a árvore', async () => {
    const { controller, ui, events } = setup();
    await controller.start();
    const [doc] = controller.entriesOf(['/Leia-me.txt']);
    await controller.transfer([doc!], '/Arquivo morto', false);
    expect(names(controller)).not.toContain('Leia-me.txt');
    expect(ui.said).toContain('1 item movido para Arquivo morto.');
    expect(events.find((e) => e.name === 'change')?.detail).toMatchObject({
      action: 'move',
      target: '/Arquivo morto',
    });
    await controller.navigate('/Arquivo morto');
    expect(names(controller)).toEqual(['Leia-me.txt']);
  });

  it('conflito: pergunta, aplica "manter os dois" e vale para os demais com "aplicar a todos"', async () => {
    const { controller, ui, adapter } = setup();
    await adapter.createFolder('/', 'Destino');
    await adapter.copy(['/Notas fiscais/NF-0001.pdf', '/Notas fiscais/NF-0002.pdf'], '/Destino');
    await controller.start();
    await controller.navigate('/Notas fiscais');
    ui.answers.push({ policy: 'rename', all: true });
    await controller.transfer(
      controller.entriesOf([
        '/Notas fiscais/NF-0001.pdf',
        '/Notas fiscais/NF-0002.pdf',
        '/Notas fiscais/NF-0003.pdf',
      ]) as never,
      '/Destino',
      true,
    );
    expect(ui.asked).toEqual([{ name: 'NF-0001.pdf', remaining: 2 }]);
    const after = await adapter.list('/Destino', { sort: 'name' });
    expect(after.items.map((i) => i.name)).toEqual([
      'NF-0001 (1).pdf',
      'NF-0001.pdf',
      'NF-0002 (1).pdf',
      'NF-0002.pdf',
      'NF-0003.pdf',
    ]);
  });

  it('conflito: "pular" e cancelar interrompem o que falta', async () => {
    const { controller, ui, adapter } = setup();
    await adapter.createFolder('/', 'Destino');
    await adapter.copy(['/Notas fiscais/NF-0001.pdf'], '/Destino');
    await controller.start();
    ui.answers.push({ policy: 'skip', all: false });
    await controller.transfer(
      controller.entriesOf([]).concat((await adapter.list('/Notas fiscais')).items) as never,
      '/Destino',
      true,
    );
    expect((await adapter.list('/Destino')).items).toHaveLength(3);
    // cancelar (resposta nula)
    await adapter.createFolder('/', 'Outro');
    await adapter.copy(['/Notas fiscais/NF-0002.pdf'], '/Outro');
    await controller.transfer(
      (await adapter.list('/Notas fiscais')).items as never,
      '/Outro',
      true,
    );
    expect((await adapter.list('/Outro', { sort: 'name' })).items.map((i) => i.name)).toEqual([
      'NF-0001.pdf',
      'NF-0002.pdf',
    ]);
  });

  it('copiar para a própria pasta cria "nome (1)" sem perguntar', async () => {
    const { controller, ui } = setup();
    await controller.start();
    await controller.navigate('/Notas fiscais');
    await controller.transfer(
      controller.entriesOf(['/Notas fiscais/NF-0001.pdf']) as never,
      '/Notas fiscais',
      true,
    );
    expect(ui.asked).toHaveLength(0);
    expect(names(controller)).toContain('NF-0001 (1).pdf');
  });

  it('recusa mover pasta para dentro dela', async () => {
    const { controller, ui } = setup();
    await controller.start();
    await controller.transfer(
      controller.entriesOf(['/Contratos']) as never,
      '/Contratos/2026',
      false,
    );
    expect(ui.toasts.at(-1)?.message).toMatch(/dentro dela mesma/);
  });

  it('recortar e colar move; copiar e colar copia; colar limpa o recorte', async () => {
    const { controller, ui } = setup();
    await controller.start();
    controller.cut(controller.entriesOf(['/Leia-me.txt']) as never);
    expect(controller.getState().clipboard?.mode).toBe('cut');
    expect(ui.said.at(-1)).toMatch(/1 item recortado/);
    await controller.navigate('/Imagens');
    await controller.paste();
    expect(names(controller)).toContain('Leia-me.txt');
    expect(controller.getState().clipboard).toBeNull();
    controller.copy(controller.entriesOf(['/Imagens/Leia-me.txt']) as never);
    await controller.navigate('/Arquivo morto');
    await controller.paste();
    expect(names(controller)).toEqual(['Leia-me.txt']);
    expect(controller.getState().clipboard).not.toBeNull();
  });
});

describe('controlador: lixeira, desfazer e versões', () => {
  it('excluir com lixeira avisa com "Desfazer" e o desfazer restaura', async () => {
    const { controller, ui } = setup();
    await controller.start();
    await controller.navigate('/Notas fiscais');
    await controller.remove(controller.entriesOf(['/Notas fiscais/NF-0002.pdf']) as never);
    expect(names(controller)).toEqual(['NF-0001.pdf', 'NF-0003.pdf']);
    expect(ui.said.at(-1)).toBe('Item excluído: NF-0002.pdf. Desfazer disponível.');
    const toast = ui.toasts.at(-1)!;
    expect(toast.action?.label).toBe('Desfazer');
    toast.action!.onClick();
    await vi.waitFor(() => expect(names(controller)).toContain('NF-0002.pdf'));
  });

  it('excluir sem lixeira pede confirmação e respeita o "não"', async () => {
    const adapter = createMemoryAdapter(undefined, { capabilities: { trash: false } });
    const { controller, ui } = setup(adapter);
    await controller.start();
    ui.confirms.push(false);
    await controller.remove(controller.entriesOf(['/Imagens']) as never);
    expect(names(controller)).toContain('Imagens');
    await controller.remove(controller.entriesOf(['/Imagens']) as never);
    expect(names(controller)).not.toContain('Imagens');
    expect(ui.said.at(-1)).toMatch(/excluído definitivamente/);
  });

  it('visão da lixeira: restaurar, excluir definitivamente e esvaziar', async () => {
    const { controller, ui } = setup();
    await controller.start();
    await controller.remove(controller.entriesOf(['/Imagens']) as never);
    await controller.remove(controller.entriesOf(['/Arquivo morto']) as never);
    await controller.openTrash();
    expect(controller.getState().mode).toBe('trash');
    expect(controller.getState().items).toHaveLength(2);
    expect(controller.actionsFor(controller.getState().items)).toEqual([
      'restore',
      'deleteForever',
    ]);
    const first = controller.getState().items[0] as never;
    await controller.restore([first]);
    expect(controller.getState().items).toHaveLength(1);
    await controller.deleteForever(controller.getState().items as never);
    expect(controller.getState().items).toHaveLength(0);
    expect(ui.said.at(-1)).toMatch(/excluído definitivamente/);
    await controller.closeTrash();
    expect(controller.getState().mode).toBe('folder');
  });

  it('esvaziar a lixeira só depois do "sim"', async () => {
    const { controller, ui } = setup();
    await controller.start();
    await controller.remove(controller.entriesOf(['/Imagens']) as never);
    await controller.openTrash();
    ui.confirms.push(false);
    await controller.emptyTrash();
    expect(controller.getState().items).toHaveLength(1);
    await controller.emptyTrash();
    expect(controller.getState().items).toHaveLength(0);
  });

  it('restaurar uma versão atualiza a lista e avisa', async () => {
    const { controller, ui } = setup();
    await controller.start();
    await controller.navigate('/Contratos');
    const entry = controller.entriesOf(['/Contratos/Contrato social.pdf'])[0] as never;
    const versions = await controller.versions(entry);
    expect(versions).toHaveLength(3);
    const result = await controller.restoreVersion(entry, versions[2]!);
    expect(result.ok).toBe(true);
    expect(ui.toasts.at(-1)?.message).toMatch(/Versão de .* restaurada/);
  });
});

describe('controlador: nomes e envio', () => {
  it('criar pasta e renomear devolvem o erro de conflito para o diálogo', async () => {
    const { controller } = setup();
    await controller.start();
    const ok = await controller.createFolder('Nova');
    expect(ok.ok).toBe(true);
    const dup = await controller.createFolder('nova');
    expect(dup).toMatchObject({ ok: false, message: 'Já existe um item com este nome.' });
    const folder = controller.entriesOf(['/Imagens'])[0] as never;
    const renamed = await controller.rename(folder, 'Fotos');
    expect(renamed.ok).toBe(true);
    expect(names(controller)).toContain('Fotos');
  });

  it('envio: progresso, conclusão, recarga e anúncio', async () => {
    const { controller, ui, events } = setup();
    await controller.start();
    controller.upload([file('a.txt'), file('b.txt')]);
    expect(ui.said.at(-1)).toBe('Enviando 2 arquivos.');
    await vi.waitFor(() =>
      expect(controller.getState().uploads.every((j) => j.status === 'done')).toBe(true),
    );
    await vi.waitFor(() => expect(ui.said.at(-1)).toBe('2 arquivos enviados.'));
    await vi.waitFor(() => expect(names(controller)).toContain('a.txt'));
    expect(events.find((e) => e.name === 'change' && e.detail.action === 'upload')).toBeTruthy();
    controller.dismissUploads();
    expect(controller.getState().uploads).toHaveLength(0);
  });

  it('envio acima do limite ou de tipo não aceito nem chega ao servidor', async () => {
    const adapter = createMemoryAdapter(undefined, {
      capabilities: { maxUploadBytes: 5, accept: ['.txt'] },
    });
    const spy = vi.spyOn(adapter, 'upload');
    const { controller } = setup(adapter);
    await controller.start();
    controller.upload([file('grande.txt', 100), new File(['x'], 'a.exe')]);
    const jobs = controller.getState().uploads;
    expect(jobs.map((j) => j.status)).toEqual(['error', 'error']);
    expect(jobs[0]!.error).toMatch(/limite/);
    expect(jobs[1]!.error).toMatch(/não permitido/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('envio com conflito: pergunta uma vez e cancelar/tentar de novo funcionam', async () => {
    const { controller, ui } = setup();
    await controller.start();
    await controller.navigate('/Imagens');
    ui.answers.push({ policy: 'replace', all: false });
    controller.upload([file('Fachada da sede.png', 20)]);
    await vi.waitFor(() => expect(controller.getState().uploads[0]!.status).toBe('done'));
    expect(ui.asked).toEqual([{ name: 'Fachada da sede.png', remaining: 0 }]);
    // sem resposta (cancelado)
    controller.upload([file('Fachada da sede.png', 30)]);
    await vi.waitFor(() => expect(controller.getState().uploads[1]!.status).toBe('canceled'));
    ui.answers.push({ policy: 'rename', all: false });
    controller.retryUpload(controller.getState().uploads[1]!.id);
    await vi.waitFor(() => expect(controller.getState().uploads[1]!.status).toBe('done'));
    await vi.waitFor(() => expect(names(controller)).toContain('Fachada da sede (1).png'));
  });

  it('cancelar um envio em andamento', async () => {
    const adapter = createMemoryAdapter(undefined, { latency: 10 });
    const { controller } = setup(adapter);
    await controller.start();
    controller.upload([file('lento.txt', 100)]);
    controller.cancelUpload(controller.getState().uploads[0]!.id);
    await vi.waitFor(() => expect(controller.getState().uploads[0]!.status).toBe('canceled'));
  });
});

describe('controlador: abrir', () => {
  it('pasta navega; arquivo monta o grupo do visualizador e respeita o cancelamento', async () => {
    const calls: { items: { name: string }[]; index: number }[] = [];
    const adapter = createMemoryAdapter();
    const ui: FilesUi = {
      announce: () => undefined,
      toast: () => undefined,
      confirm: async () => true,
      resolveConflict: async () => null,
      view: (items, index) => void calls.push({ items, index }),
    };
    let allow = true;
    const controller = createFilesController({
      adapter,
      ui,
      onEvent: (name) => (name === 'open' ? allow : undefined),
    });
    await controller.start();
    controller.open(controller.entriesOf(['/Contratos'])[0]!);
    await vi.waitFor(() => expect(names(controller)).toContain('Aditivo 01.pdf'));
    controller.open(controller.entriesOf(['/Contratos/Aditivo 01.pdf'])[0]!);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.items.map((i) => i.name)).toEqual(['Aditivo 01.pdf', 'Contrato social.pdf']);
    expect(calls[0]!.index).toBe(0);
    allow = false;
    controller.open(controller.entriesOf(['/Contratos/Contrato social.pdf'])[0]!);
    expect(calls).toHaveLength(1);
  });
});
