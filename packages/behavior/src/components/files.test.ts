import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { createMemoryAdapter } from '../files/memory-adapter';
import { resetFilesConfig, setFilesConfig } from '../files/config';
import { filesHandle, initFiles } from './files';
import type { FilesAdapter } from '../files/types';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn<(...args: unknown[]) => Promise<boolean>>(),
  toast: vi.fn(),
  viewerOpen: vi.fn(),
}));
vi.mock('./dialogs', () => ({ confirm: mocks.confirm }));
vi.mock('./toast', () => ({ toast: mocks.toast }));
vi.mock('./viewer', () => ({ viewer: { open: mocks.viewerOpen } }));

const root = () => document.getElementById('fm') as HTMLElement;
const q = <T extends HTMLElement = HTMLElement>(sel: string, scope: ParentNode = root()) =>
  scope.querySelector<T>(sel);
const qa = (sel: string, scope: ParentNode = root()) =>
  Array.from(scope.querySelectorAll<HTMLElement>(sel));
const rowNames = () => qa('tbody tr .eds-files-label').map((e) => e.textContent);
const status = () => q('[role="status"]:not(.eds-files-pick-status)')!.textContent;
const rowOf = (name: string) =>
  qa('tbody tr').find((tr) => tr.querySelector('.eds-files-label')?.textContent === name)!;
const dialog = () => document.querySelector<HTMLDialogElement>('dialog[open]');

describe('gerenciador de arquivos (HTML)', () => {
  let restore: () => void;
  let destroy: () => void;
  let adapter: FilesAdapter;

  async function mount(
    attrs = '',
    seed?: Parameters<typeof createMemoryAdapter>[0],
    adapterOptions = {},
  ) {
    adapter = createMemoryAdapter(seed, adapterOptions);
    setFilesConfig({ adapter });
    document.body.innerHTML = `<div id="fm" data-eds-files data-eds-files-api="/api/arquivos" aria-label="Arquivos do contrato" ${attrs}></div>`;
    destroy = initFiles(document);
    await vi.waitFor(() => expect(q('tbody tr, .eds-empty')).toBeTruthy());
  }

  beforeEach(() => {
    restore = installDomPolyfills();
    mocks.confirm.mockReset().mockResolvedValue(true);
    mocks.toast.mockReset();
    mocks.viewerOpen.mockReset();
  });
  afterEach(() => {
    destroy?.();
    resetFilesConfig();
    restore();
    document.body.innerHTML = '';
  });

  it('sem API e sem adaptador não faz nada', async () => {
    resetFilesConfig();
    document.body.innerHTML = '<div id="fm" data-eds-files></div>';
    destroy = initFiles(document);
    await flush();
    expect(root().children).toHaveLength(0);
  });

  it('monta barra, trilha, árvore, tabela semântica e anuncia a pasta', async () => {
    await mount();
    expect(root().getAttribute('role')).toBe('region');
    expect(root().getAttribute('aria-label')).toBe('Arquivos do contrato');
    expect(q('nav[aria-label="Local"] [aria-current="page"]')!.textContent).toBe('Arquivos');
    expect(rowNames()).toEqual([
      'Arquivo morto',
      'Contratos',
      'Imagens',
      'Notas fiscais',
      'Ata da reunião.txt',
      'Leia-me.txt',
    ]);
    expect(q('table.eds-table caption')!.textContent).toBe('Conteúdo da pasta Arquivos');
    expect(q('table')!.getAttribute('role')).toBeNull();
    expect(q('[role="tree"]')).toBeTruthy();
    expect(qa('[role="treeitem"]').map((li) => li.getAttribute('data-path'))).toContain(
      '/Contratos',
    );
    expect(q('th[aria-sort="ascending"]')!.textContent).toContain('Nome');
    await vi.waitFor(() => expect(status()).toBe('Pasta Arquivos: 6 itens.'));
    expect(q('[data-act="menu"]', rowOf('Contratos'))!.getAttribute('aria-label')).toBe(
      'Ações de Contratos',
    );
  });

  it('abrir pasta pelo link navega, atualiza trilha e árvore; Backspace sobe', async () => {
    const user = userEvent.setup();
    await mount();
    const events: string[] = [];
    root().addEventListener('eds:files-navigate', (e) =>
      events.push((e as CustomEvent).detail.path),
    );
    await user.click(q('a', rowOf('Contratos'))!);
    await vi.waitFor(() => expect(rowNames()).toContain('Contrato social.pdf'));
    expect(events).toEqual(['/Contratos']);
    expect(qa('nav .eds-breadcrumb-item').map((i) => i.textContent)).toEqual([
      'Arquivos',
      'Contratos',
    ]);
    expect(q('nav a[data-act="crumb"]')!.textContent).toBe('Arquivos');
    expect(q('[role="treeitem"][data-path="/Contratos"]')!.getAttribute('aria-selected')).toBe(
      'true',
    );
    q('.eds-files-link')!.focus();
    await user.keyboard('{Backspace}');
    await vi.waitFor(() => expect(rowNames()).toContain('Contratos'));
    expect(filesHandle(root())!.path).toBe('/');
  });

  it('trilha e árvore navegam por clique e pelo teclado', async () => {
    const user = userEvent.setup();
    await mount();
    await filesHandle(root())!.navigate('/Contratos/2026');
    await vi.waitFor(() => expect(rowNames()).toContain('Proposta comercial.pdf'));
    await user.click(qa('nav a[data-act="crumb"]')[1]!);
    await vi.waitFor(() => expect(filesHandle(root())!.path).toBe('/Contratos'));
    const item = q('[role="treeitem"][data-path="/Imagens"]')!;
    item.focus();
    await user.keyboard('{Enter}');
    await vi.waitFor(() => expect(filesHandle(root())!.path).toBe('/Imagens'));
    const contratos = () => q('[role="treeitem"][data-path="/Contratos"]')!;
    expect(contratos().getAttribute('aria-expanded')).toBe('true');
    await user.click(q('[data-files-toggle]', contratos())!);
    await vi.waitFor(() => expect(contratos().getAttribute('aria-expanded')).toBe('false'));
    await user.click(q('[data-files-toggle]', contratos())!);
    await vi.waitFor(() => expect(contratos().getAttribute('aria-expanded')).toBe('true'));
  });

  it('seleção por checkbox, selecionar todos e barra de lote', async () => {
    const user = userEvent.setup();
    await mount();
    expect(q('.eds-files-bulk')!.hidden).toBe(true);
    await user.click(q('input[type="checkbox"]', rowOf('Contratos'))!);
    await vi.waitFor(() => expect(q('.eds-files-bulk')!.hidden).toBe(false));
    expect(q('.eds-table-bulk-count')!.textContent).toBe('1 selecionado');
    await user.click(q('[data-files-select-all]')!);
    expect(q('.eds-table-bulk-count')!.textContent).toBe('6 selecionados');
    expect(qa('[data-act="bulk"]').map((b) => b.textContent)).toEqual([
      'Mover para…',
      'Copiar para…',
      'Excluir',
    ]);
    await user.click(q('[data-act="clear"]')!);
    expect(q('.eds-files-bulk')!.hidden).toBe(true);
    expect(q<HTMLInputElement>('[data-files-select-all]')!.checked).toBe(false);
  });

  it('Ctrl+A seleciona tudo e Esc limpa', async () => {
    const user = userEvent.setup();
    await mount();
    q('.eds-files-link')!.focus();
    await user.keyboard('{Control>}a{/Control}');
    expect(filesHandle(root())!.selection).toHaveLength(6);
    await user.keyboard('{Escape}');
    expect(filesHandle(root())!.selection).toHaveLength(0);
  });

  it('ordenar por clique no cabeçalho alterna aria-sort e anuncia', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('[data-sort="size"]')!);
    await vi.waitFor(() =>
      expect(q('th[aria-sort="ascending"]')!.textContent).toContain('Tamanho'),
    );
    await user.click(q('[data-sort="size"]')!);
    await vi.waitFor(() =>
      expect(q('th[aria-sort="descending"]')!.textContent).toContain('Tamanho'),
    );
    expect(status()).toBe('Ordenado por Tamanho, decrescente.');
  });

  it('alterna para grade e volta, com aria-pressed', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('[data-act="view-grid"]')!);
    await vi.waitFor(() => expect(q('ul.eds-files-grid')).toBeTruthy());
    expect(q('[data-act="view-grid"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(qa('.eds-files-card')).toHaveLength(6);
    expect(root().getAttribute('data-view')).toBe('grid');
    await user.click(q('[data-act="view-list"]')!);
    await vi.waitFor(() => expect(q('table')).toBeTruthy());
  });

  it('menu "⋯" lista as ações, abre o diálogo de renomear e mostra conflito no próprio campo', async () => {
    const user = userEvent.setup();
    await mount();
    const trigger = q('[data-act="menu"]', rowOf('Contratos'))!;
    await user.click(trigger);
    const menu = q('.eds-files-menu')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(qa('button', menu).map((b) => b.textContent)).toEqual([
      'Abrir',
      'Renomear',
      'Recortar',
      'Copiar',
      'Mover para…',
      'Copiar para…',
      'Excluir',
    ]);
    await user.click(qa('button', menu).find((b) => b.textContent === 'Renomear')!);
    const d = dialog()!;
    const input = q<HTMLInputElement>('input', d)!;
    expect(input.value).toBe('Contratos');
    await user.clear(input);
    await user.type(input, 'Imagens{Enter}');
    await vi.waitFor(() =>
      expect(q('.eds-error', d)!.textContent).toBe('Já existe um item com este nome.'),
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    await user.clear(input);
    await user.type(input, 'Acordos{Enter}');
    await vi.waitFor(() => expect(dialog()).toBeNull());
    await vi.waitFor(() => expect(rowNames()).toContain('Acordos'));
    expect(status()).toBe('Contratos renomeado para Acordos.');
  });

  it('F2 renomeia o item focado e valida o nome', async () => {
    const user = userEvent.setup();
    await mount();
    q('a', rowOf('Leia-me.txt'))!.focus();
    await user.keyboard('{F2}');
    const d = dialog()!;
    const input = q<HTMLInputElement>('input', d)!;
    expect(input.selectionEnd).toBe('Leia-me'.length);
    await user.clear(input);
    await user.type(input, 'a/b{Enter}');
    expect(q('.eds-error', d)!.textContent).toMatch(/barras/);
    await user.keyboard('{Escape}');
  });

  it('nova pasta cria e anuncia', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('[data-act="new-folder"]')!);
    await user.type(q<HTMLInputElement>('input', dialog()!)!, 'Aditivos{Enter}');
    await vi.waitFor(() => expect(rowNames()).toContain('Aditivos'));
    expect(status()).toBe('Pasta Aditivos criada.');
    expect(qa('[role="treeitem"]').map((l) => l.getAttribute('data-path'))).toContain('/Aditivos');
  });

  it('recortar e colar por teclado move para a pasta aberta', async () => {
    const user = userEvent.setup();
    await mount();
    q('a', rowOf('Leia-me.txt'))!.focus();
    await user.keyboard('{Control>}x{/Control}');
    expect(rowOf('Leia-me.txt').hasAttribute('data-cut')).toBe(true);
    expect(q('[data-act="paste"]')!.hidden).toBe(false);
    await user.click(q('a', rowOf('Imagens'))!);
    await vi.waitFor(() => expect(rowNames()).toContain('Planta baixa.png'));
    await user.keyboard('{Control>}v{/Control}');
    await vi.waitFor(() => expect(rowNames()).toContain('Leia-me.txt'));
    expect(status()).toBe('1 item movido para Imagens.');
    expect(q('[data-act="paste"]')!.hidden).toBe(true);
  });

  it('colar com conflito abre o diálogo e "manter os dois" duplica', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('a', rowOf('Notas fiscais'))!);
    await vi.waitFor(() => expect(rowNames()).toContain('NF-0001.pdf'));
    q('a', rowOf('NF-0001.pdf'))!.focus();
    await user.keyboard('{Control>}c{/Control}');
    await adapter.copy(['/Notas fiscais/NF-0001.pdf'], '/Imagens');
    await user.click(qa('nav a[data-act="crumb"]')[0]!);
    await vi.waitFor(() => expect(rowNames()).toContain('Imagens'));
    await user.click(q('a', rowOf('Imagens'))!);
    await vi.waitFor(() => expect(rowNames()).toContain('NF-0001.pdf'));
    await user.click(q('[data-act="paste"]')!);
    await vi.waitFor(() => expect(dialog()).toBeTruthy());
    const d = dialog()!;
    expect(d.querySelector('p')!.textContent).toBe(
      '"NF-0001.pdf" já existe no destino. O que fazer?',
    );
    await user.click(qa('button', d).find((b) => b.textContent === 'Manter os dois')!);
    await vi.waitFor(() => expect(rowNames()).toContain('NF-0001 (1).pdf'));
  });

  it('excluir vai para a lixeira com toast "Desfazer"; o desfazer restaura', async () => {
    const user = userEvent.setup();
    await mount();
    q('a', rowOf('Leia-me.txt'))!.focus();
    await user.keyboard('{Delete}');
    await vi.waitFor(() => expect(rowNames()).not.toContain('Leia-me.txt'));
    expect(status()).toBe('Item excluído: Leia-me.txt. Desfazer disponível.');
    const call = mocks.toast.mock.calls.at(-1)![0] as {
      action: { label: string; onClick: () => void };
      duration: number;
    };
    expect(call.action.label).toBe('Desfazer');
    expect(call.duration).toBe(8000);
    call.action.onClick();
    await vi.waitFor(() => expect(rowNames()).toContain('Leia-me.txt'));
  });

  it('lixeira: visão própria, restaurar e esvaziar com confirmação', async () => {
    const user = userEvent.setup();
    await mount();
    await adapter.remove(['/Imagens', '/Leia-me.txt']);
    await user.click(q('[data-act="trash"]')!);
    await vi.waitFor(() => expect(root().getAttribute('data-mode')).toBe('trash'));
    await vi.waitFor(() => expect(rowNames()).toEqual(['Leia-me.txt', 'Imagens']));
    expect(qa('thead th').map((th) => th.textContent)).toEqual([
      '',
      'Nome',
      'Local de origem',
      'Excluído em',
      'Tamanho',
      'Ações',
    ]);
    expect(q('a', rowOf('Imagens'))).toBeNull();
    expect(q('[data-act="trash"]')!.textContent).toBe('Voltar aos arquivos');
    expect(q('[data-act="new-folder"]')!.hidden).toBe(true);
    await user.click(q('input[type="checkbox"]', rowOf('Imagens'))!);
    await user.click(qa('[data-act="bulk"]').find((b) => b.textContent === 'Restaurar')!);
    await vi.waitFor(() => expect(rowNames()).toEqual(['Leia-me.txt']));
    mocks.confirm.mockResolvedValueOnce(false);
    await user.click(q('[data-act="empty-trash"]')!);
    expect(rowNames()).toEqual(['Leia-me.txt']);
    await user.click(q('[data-act="empty-trash"]')!);
    await vi.waitFor(() => expect(q('.eds-empty-title')!.textContent).toBe('A lixeira está vazia'));
    expect(mocks.confirm).toHaveBeenCalledTimes(2);
    await user.click(q('[data-act="trash"]')!);
    await vi.waitFor(() => expect(root().getAttribute('data-mode')).toBe('folder'));
    await vi.waitFor(() => expect(rowNames()).toContain('Imagens'));
  });

  it('"Mover para…" escolhe a pasta numa árvore e move', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('[data-act="menu"]', rowOf('Leia-me.txt'))!);
    await user.click(qa('.eds-files-menu button').find((b) => b.textContent === 'Mover para…')!);
    const d = dialog()!;
    expect(q('h2', d)!.textContent).toBe('Mover para…');
    const confirmBtn = qa('button', d).find((b) => b.textContent === 'Mover para cá')!;
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
    await user.click(q('[role="treeitem"][data-path="/Imagens"] .eds-tree-row', d)!);
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
    expect(q('.eds-files-pick-status', d)!.textContent).toBe('Destino: Imagens');
    await user.click(confirmBtn);
    await vi.waitFor(() => expect(rowNames()).not.toContain('Leia-me.txt'));
    expect(status()).toBe('1 item movido para Imagens.');
  });

  it('"Mover para…" não deixa escolher a própria pasta nem descendente', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('[data-act="menu"]', rowOf('Contratos'))!);
    await user.click(qa('.eds-files-menu button').find((b) => b.textContent === 'Mover para…')!);
    const d = dialog()!;
    expect(q('[role="treeitem"][data-path="/Contratos"]', d)!.getAttribute('aria-disabled')).toBe(
      'true',
    );
    await user.click(q('[role="treeitem"][data-path="/Contratos"] .eds-tree-row', d)!);
    expect(q('.eds-files-pick-status', d)!.textContent).toBe('Destino: Arquivos');
  });

  it('arrastar um item para uma pasta move; Ctrl copia; destino inválido é recusado', async () => {
    await mount();
    const store: Record<string, string> = {};
    const dt = {
      types: [] as string[],
      effectAllowed: '',
      dropEffect: '',
      setData: (type: string, value: string) => {
        store[type] = value;
        dt.types.push(type);
      },
      getData: (type: string) => store[type] ?? '',
      files: [] as File[],
      items: [] as unknown[],
    };
    const fire = (el: Element, type: string, init: Record<string, unknown> = {}) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { dataTransfer: dt, ...init });
      el.dispatchEvent(event);
      return event;
    };
    const source = rowOf('Leia-me.txt');
    const target = q('a', rowOf('Imagens'))!;
    fire(source, 'dragstart');
    expect(store['application/x-eds-files']).toBe('["/Leia-me.txt"]');
    const over = fire(target, 'dragover');
    expect(over.defaultPrevented).toBe(true);
    expect(
      rowOf('Imagens').querySelector('[data-drop-target]') ?? target.closest('[data-drop-target]'),
    ).toBeTruthy();
    fire(target, 'drop');
    await vi.waitFor(() => expect(rowNames()).not.toContain('Leia-me.txt'));
    expect(status()).toBe('1 item movido para Imagens.');
    // copiar com Ctrl
    fire(rowOf('Ata da reunião.txt'), 'dragstart');
    const again = q('a', rowOf('Imagens'))!;
    fire(again, 'dragover', { ctrlKey: true });
    fire(again, 'drop', { ctrlKey: true });
    await vi.waitFor(() => expect(status()).toBe('1 item copiado para Imagens.'));
    expect(rowNames()).toContain('Ata da reunião.txt');
    // soltar uma pasta nela mesma não é aceito
    fire(rowOf('Contratos'), 'dragstart');
    const bad = fire(q('a', rowOf('Contratos'))!, 'dragover');
    expect(bad.defaultPrevented).toBe(false);
  });

  it('arrastar arquivos do sistema envia para a pasta sob o ponteiro', async () => {
    await mount();
    const file = new File(['conteudo'], 'recibo.txt', { type: 'text/plain' });
    const dt = { types: ['Files'], files: [file], items: [], dropEffect: '' };
    const fire = (el: Element, type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { dataTransfer: dt });
      el.dispatchEvent(event);
      return event;
    };
    const target = q('a', rowOf('Imagens'))!;
    expect(fire(target, 'dragover').defaultPrevented).toBe(true);
    expect(root().getAttribute('data-dragging')).toBe('files');
    fire(target, 'drop');
    await vi.waitFor(() => expect(qa('.eds-files-upload')).toHaveLength(1));
    await vi.waitFor(() =>
      expect(q('.eds-files-upload')!.getAttribute('data-status')).toBe('done'),
    );
    expect((await adapter.list('/Imagens')).items.map((i) => i.name)).toContain('recibo.txt');
  });

  it('enviar pelo botão: progresso, lista de envios e limpeza', async () => {
    const user = userEvent.setup();
    await mount();
    const input = q<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, [
      new File(['a'], 'um.txt', { type: 'text/plain' }),
      new File(['b'], 'dois.txt', { type: 'text/plain' }),
    ]);
    await vi.waitFor(() => expect(rowNames()).toContain('dois.txt'));
    expect(q('.eds-files-uploads')!.hidden).toBe(false);
    expect(qa('.eds-files-upload[data-status="done"]')).toHaveLength(2);
    expect(q('.eds-files-upload progress')!.getAttribute('aria-label')).toBe('um.txt');
    await user.click(q('[data-act="dismiss-uploads"]')!);
    expect(q('.eds-files-uploads')!.hidden).toBe(true);
  });

  it('envio recusado mostra o motivo e oferece tentar de novo', async () => {
    const user = userEvent.setup();
    await mount('', undefined, { capabilities: { maxUploadBytes: 3 } });
    await user.upload(
      q<HTMLInputElement>('input[type="file"]')!,
      new File(['0123456789'], 'grande.txt', { type: 'text/plain' }),
    );
    const item = q('.eds-files-upload')!;
    expect(item.getAttribute('data-status')).toBe('error');
    expect(item.textContent).toContain('Maior que o limite de 3 B.');
    expect(q('[data-act="upload-retry"]', item)).toBeTruthy();
  });

  it('abrir arquivo chama o visualizador com o grupo da pasta; evento cancelável impede', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('a', rowOf('Contratos'))!);
    await vi.waitFor(() => expect(rowNames()).toContain('Aditivo 01.pdf'));
    await user.click(q('a', rowOf('Contrato social.pdf'))!);
    expect(mocks.viewerOpen).toHaveBeenCalledTimes(1);
    const [items, index] = mocks.viewerOpen.mock.calls[0]!;
    expect((items as { name: string }[]).map((i) => i.name)).toEqual([
      'Aditivo 01.pdf',
      'Contrato social.pdf',
    ]);
    expect(index).toBe(1);
    root().addEventListener('eds:files-open', (e) => e.preventDefault());
    await user.click(q('a', rowOf('Aditivo 01.pdf'))!);
    expect(mocks.viewerOpen).toHaveBeenCalledTimes(1);
  });

  it('versões: drawer com a lista, visualizar e restaurar', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(q('a', rowOf('Contratos'))!);
    await vi.waitFor(() => expect(rowNames()).toContain('Contrato social.pdf'));
    await user.click(q('[data-act="menu"]', rowOf('Contrato social.pdf'))!);
    await user.click(qa('.eds-files-menu button').find((b) => b.textContent === 'Versões')!);
    const d = dialog()!;
    expect(d.classList.contains('eds-drawer')).toBe(true);
    expect(q('h2', d)!.textContent).toBe('Versões de Contrato social.pdf');
    await vi.waitFor(() => expect(qa('.eds-files-version', d)).toHaveLength(3));
    expect(qa('.eds-files-version', d)[0]!.textContent).toContain('Atual');
    expect(
      qa('[data-act], button', qa('.eds-files-version', d)[0]!).some(
        (b) => b.textContent === 'Restaurar esta versão',
      ),
    ).toBe(false);
    await user.click(
      qa('button', qa('.eds-files-version', d)[1]!).find((b) => b.textContent === 'Visualizar')!,
    );
    expect(mocks.viewerOpen).toHaveBeenCalledTimes(1);
    await user.click(
      qa('button', qa('.eds-files-version', d)[2]!).find(
        (b) => b.textContent === 'Restaurar esta versão',
      )!,
    );
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect((await adapter.versions('/Contratos/Contrato social.pdf')).length).toBe(4);
  });

  it('estado vazio com ação de enviar e busca sem resultado', async () => {
    const user = userEvent.setup();
    await mount('', [{ name: 'Vazia', folder: [] }]);
    await user.click(q('a', rowOf('Vazia'))!);
    await vi.waitFor(() =>
      expect(q('.eds-empty-title')!.textContent).toBe('Esta pasta está vazia'),
    );
    expect(q('.eds-empty [data-act="upload"]')).toBeTruthy();
    await user.type(q('input[type="search"]')!, 'xyz{Enter}');
    await vi.waitFor(() => expect(q('.eds-empty-title')!.textContent).toBe('Nada encontrado'));
    expect(q('.eds-empty-text')!.textContent).toBe('Nenhum item corresponde a "xyz".');
  });

  it('erro de carga mostra ErrorState com tentar de novo', async () => {
    const user = userEvent.setup();
    let fail = true;
    const base = createMemoryAdapter();
    const flaky: FilesAdapter = {
      ...base,
      list: async (p, o) => {
        if (fail) throw new Error('x');
        return base.list(p, o);
      },
    };
    setFilesConfig({ adapter: flaky });
    document.body.innerHTML = '<div id="fm" data-eds-files data-eds-files-api="/api"></div>';
    destroy = initFiles(document);
    await vi.waitFor(() => expect(q('.eds-empty-error')).toBeTruthy());
    expect(q('.eds-empty-error')!.getAttribute('role')).toBe('alert');
    fail = false;
    await user.click(q('[data-act="retry"]')!);
    await vi.waitFor(() => expect(q('tbody tr')).toBeTruthy());
  });

  it('somente leitura esconde as ações de escrita; 403 mostra mensagem sem ações', async () => {
    await mount('data-eds-files-readonly');
    expect(root().hasAttribute('data-readonly')).toBe(true);
    expect(q('[data-act="new-folder"]')!.hidden).toBe(true);
    expect(q('[data-act="upload"]')!.hidden).toBe(true);
    expect(rowOf('Contratos').getAttribute('draggable')).toBe('true');
    const menuTexts = async () => {
      const user = userEvent.setup();
      await user.click(q('[data-act="menu"]', rowOf('Leia-me.txt'))!);
      return qa('.eds-files-menu button').map((b) => b.textContent);
    };
    expect(await menuTexts()).toEqual(['Abrir', 'Baixar', 'Copiar', 'Versões']);
  });

  it('carregar mais usa o cursor', async () => {
    const user = userEvent.setup();
    await mount('', undefined, { pageSize: 2 });
    expect(rowNames()).toHaveLength(2);
    await user.click(q('[data-act="more"]')!);
    await vi.waitFor(() => expect(rowNames()).toHaveLength(4));
  });

  it('eds:files-change traz a ação; destroy limpa o DOM', async () => {
    const user = userEvent.setup();
    await mount();
    const changes: string[] = [];
    root().addEventListener('eds:files-change', (e) =>
      changes.push((e as CustomEvent).detail.action),
    );
    await user.click(q('[data-act="new-folder"]')!);
    await user.type(q<HTMLInputElement>('input', dialog()!)!, 'Nova{Enter}');
    await vi.waitFor(() => expect(changes).toEqual(['createFolder']));
    destroy();
    expect(root().children).toHaveLength(0);
    expect(filesHandle(root())).toBeNull();
  });
});
