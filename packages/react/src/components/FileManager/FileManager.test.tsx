import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryAdapter, type FilesAdapter } from '@efds-ui/behavior/files';
import { installDialogPolyfill, installPopoverStyle } from '../../test-utils/dom-polyfills';
import { ToastProvider } from '../Toast';
import { FileManager, type FileManagerProps } from '.';

let restore: Array<() => void> = [];
beforeEach(() => {
  restore = [installPopoverStyle(), installDialogPolyfill()];
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }));
  };
  HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }));
  };
});
afterEach(() => {
  restore.forEach((fn) => fn());
});

const rowNames = () =>
  Array.from(document.querySelectorAll('tbody tr .eds-files-label')).map((e) => e.textContent);
const rowOf = (name: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('tbody tr')).find(
    (tr) => tr.querySelector('.eds-files-label')?.textContent === name,
  )!;
const status = () =>
  document.querySelector('[role="status"]:not(.eds-files-pick-status)')!.textContent;

function setup(props: Partial<FileManagerProps> = {}, adapter?: FilesAdapter) {
  const a = adapter ?? createMemoryAdapter();
  const ref = createRef<HTMLDivElement>();
  const utils = render(
    <ToastProvider>
      <FileManager ref={ref} adapter={a} aria-label="Arquivos do contrato" {...props} />
    </ToastProvider>,
  );
  return { adapter: a, ref, ...utils };
}

async function ready() {
  await waitFor(() => expect(document.querySelector('tbody tr, .eds-empty')).toBeTruthy());
}

describe('FileManager', () => {
  it('sem api nem adapter não renderiza conteúdo nem pede nada', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<FileManager aria-label="Vazio" />);
    expect(screen.getByRole('region', { name: 'Vazio' }).children).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('com api usa o cliente HTTP e manda os cabeçalhos configurados', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const body = url.includes('/capabilities')
        ? { write: true, trash: true, versions: true, search: 'folder', directUpload: false }
        : url.includes('/tree')
          ? { path: '/', folders: [] }
          : { path: '/', items: [{ path: '/a.txt', name: 'a.txt', type: 'file', size: 3 }] };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    render(
      <FileManager api="/api/arquivos" requestInit={{ headers: { 'X-CSRF-Token': 'abc' } }} />,
    );
    await ready();
    expect(rowNames()).toEqual(['a.txt']);
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('abc');
    expect(
      String(fetchSpy.mock.calls.map((c) => c[0]).find((u) => String(u).includes('/list'))),
    ).toContain('path=%2F');
  });

  it('monta região, trilha, árvore e tabela semântica; repassa ref e className', async () => {
    const { ref } = setup({ className: 'minha' });
    await ready();
    expect(ref.current).toHaveClass('eds-files', 'minha');
    expect(screen.getByRole('region', { name: 'Arquivos do contrato' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Local' })).getByText('Arquivos'),
    ).toHaveAttribute('aria-current', 'page');
    expect(rowNames()).toEqual([
      'Arquivo morto',
      'Contratos',
      'Imagens',
      'Notas fiscais',
      'Ata da reunião.txt',
      'Leia-me.txt',
    ]);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: 'Pastas' })).toBeInTheDocument();
    await waitFor(() => expect(status()).toBe('Pasta Arquivos: 6 itens.'));
  });

  it('abrir pasta navega, avisa onPathChange e o Backspace sobe', async () => {
    const user = userEvent.setup();
    const onPathChange = vi.fn();
    setup({ onPathChange });
    await ready();
    await user.click(within(rowOf('Contratos')).getByRole('link'));
    await waitFor(() => expect(rowNames()).toContain('Contrato social.pdf'));
    expect(onPathChange).toHaveBeenCalledWith('/Contratos');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Contratos' })).toHaveFocus());
    await user.keyboard('{Backspace}');
    await waitFor(() => expect(rowNames()).toContain('Contratos'));
  });

  it('seleção por checkbox e barra de lote', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    await user.click(within(rowOf('Contratos')).getByRole('checkbox'));
    const bulk = screen.getByRole('group', { name: 'Ações da seleção' });
    expect(within(bulk).getByText('1 selecionado')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }));
    expect(within(bulk).getByText('6 selecionados')).toBeInTheDocument();
    expect(
      within(bulk)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Mover para…', 'Copiar para…', 'Excluir', 'Limpar seleção']);
    await user.click(within(bulk).getByRole('button', { name: 'Limpar seleção' }));
    expect(bulk).toHaveAttribute('hidden');
  });

  it('ordenar alterna aria-sort', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Tamanho' }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: 'Tamanho' })).toHaveAttribute(
        'aria-sort',
        'ascending',
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Tamanho' }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: 'Tamanho' })).toHaveAttribute(
        'aria-sort',
        'descending',
      ),
    );
  });

  it('grade e lista, com aria-pressed e onViewChange', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    setup({ onViewChange });
    await ready();
    await user.click(screen.getByRole('button', { name: 'Grade' }));
    await waitFor(() => expect(document.querySelector('ul.eds-files-grid')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Grade' })).toHaveAttribute('aria-pressed', 'true');
    expect(onViewChange).toHaveBeenCalledWith('grid');
    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
  });

  it('menu "⋯": renomear com conflito no próprio campo e depois com sucesso', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    setup({ onChange });
    await ready();
    await user.click(screen.getByRole('button', { name: 'Ações de Contratos' }));
    await user.click(screen.getByRole('button', { name: 'Renomear' }));
    const dialog = await screen.findByRole('dialog', { name: 'Renomear' });
    const input = within(dialog).getByLabelText('Nome');
    await user.clear(input);
    await user.type(input, 'Imagens{Enter}');
    expect(await within(dialog).findByText('Já existe um item com este nome.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await user.clear(input);
    await user.type(input, 'Acordos{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(rowNames()).toContain('Acordos'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ action: 'rename' }));
  });

  it('nova pasta cria e anuncia', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Nova pasta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova pasta' });
    await user.type(within(dialog).getByLabelText('Nome'), 'Aditivos{Enter}');
    await waitFor(() => expect(rowNames()).toContain('Aditivos'));
    expect(status()).toBe('Pasta Aditivos criada.');
  });

  it('recortar e colar por teclado move para a pasta aberta', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    within(rowOf('Leia-me.txt')).getByRole('link').focus();
    await user.keyboard('{Control>}x{/Control}');
    expect(rowOf('Leia-me.txt')).toHaveAttribute('data-cut');
    await user.click(within(rowOf('Imagens')).getByRole('link'));
    await waitFor(() => expect(rowNames()).toContain('Planta baixa.png'));
    await user.keyboard('{Control>}v{/Control}');
    await waitFor(() => expect(rowNames()).toContain('Leia-me.txt'));
    expect(status()).toBe('1 item movido para Imagens.');
    expect(screen.queryByRole('button', { name: 'Colar aqui' })).toBeNull();
  });

  it('conflito ao colar abre o diálogo e "manter os dois" duplica', async () => {
    const user = userEvent.setup();
    const { adapter } = setup();
    await ready();
    await user.click(within(rowOf('Notas fiscais')).getByRole('link'));
    await waitFor(() => expect(rowNames()).toContain('NF-0001.pdf'));
    within(rowOf('NF-0001.pdf')).getByRole('link').focus();
    await user.keyboard('{Control>}c{/Control}');
    await adapter.copy(['/Notas fiscais/NF-0001.pdf'], '/Imagens');
    await user.click(screen.getByRole('link', { name: 'Arquivos' }));
    await waitFor(() => expect(rowNames()).toContain('Imagens'));
    await user.click(within(rowOf('Imagens')).getByRole('link'));
    await waitFor(() => expect(rowNames()).toContain('NF-0001.pdf'));
    await user.click(screen.getByRole('button', { name: 'Colar aqui' }));
    const dialog = await screen.findByRole('dialog', { name: 'Já existe um item com este nome' });
    expect(
      within(dialog).getByText('"NF-0001.pdf" já existe no destino. O que fazer?'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Manter os dois' }));
    await waitFor(() => expect(rowNames()).toContain('NF-0001 (1).pdf'));
  });

  it('excluir vai para a lixeira com toast "Desfazer" que restaura', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    within(rowOf('Leia-me.txt')).getByRole('link').focus();
    await user.keyboard('{Delete}');
    await waitFor(() => expect(rowNames()).not.toContain('Leia-me.txt'));
    expect(status()).toBe('Item excluído: Leia-me.txt. Desfazer disponível.');
    await user.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(rowNames()).toContain('Leia-me.txt'));
  });

  it('lixeira: visão própria, restaurar e esvaziar com confirmação', async () => {
    const user = userEvent.setup();
    const { adapter } = setup();
    await ready();
    await adapter.remove(['/Imagens', '/Leia-me.txt']);
    await user.click(screen.getByRole('button', { name: 'Lixeira' }));
    await waitFor(() => expect(rowNames()).toEqual(['Leia-me.txt', 'Imagens']));
    expect(within(rowOf('Imagens')).queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar aos arquivos' })).toBeInTheDocument();
    await user.click(within(rowOf('Imagens')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(() => expect(rowNames()).toEqual(['Leia-me.txt']));
    await user.click(screen.getByRole('button', { name: 'Esvaziar lixeira' }));
    const dialog = await screen.findByRole('dialog', { name: 'Esvaziar a lixeira?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(rowNames()).toEqual(['Leia-me.txt']);
    await user.click(screen.getByRole('button', { name: 'Esvaziar lixeira' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Esvaziar lixeira' }),
    );
    await waitFor(() => expect(screen.getByText('A lixeira está vazia')).toBeInTheDocument());
  });

  it('"Mover para…" escolhe a pasta na árvore e move', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Ações de Leia-me.txt' }));
    await user.click(screen.getByRole('button', { name: 'Mover para…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Mover para…' });
    const confirm = within(dialog).getByRole('button', { name: 'Mover para cá' });
    expect(confirm).toBeDisabled();
    const item = await within(dialog).findByRole('treeitem', { name: 'Imagens' });
    await user.click(within(item).getByText('Imagens'));
    expect(within(dialog).getByText('Destino: Imagens')).toBeInTheDocument();
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(rowNames()).not.toContain('Leia-me.txt'));
    expect(status()).toBe('1 item movido para Imagens.');
  });

  it('arrastar um item para uma pasta move; Ctrl copia', async () => {
    setup();
    await ready();
    const store: Record<string, string> = {};
    const types: string[] = [];
    const dataTransfer = {
      types,
      effectAllowed: '',
      dropEffect: '',
      setData: (type: string, value: string) => {
        store[type] = value;
        types.push(type);
      },
      getData: (type: string) => store[type] ?? '',
      files: [],
      items: [],
    };
    fireEvent.dragStart(rowOf('Leia-me.txt'), { dataTransfer });
    expect(store['application/x-eds-files']).toBe('["/Leia-me.txt"]');
    const target = () => within(rowOf('Imagens')).getByRole('link');
    fireEvent.dragOver(target(), { dataTransfer });
    fireEvent.drop(target(), { dataTransfer });
    await waitFor(() => expect(rowNames()).not.toContain('Leia-me.txt'));
    expect(status()).toBe('1 item movido para Imagens.');
    fireEvent.dragStart(rowOf('Ata da reunião.txt'), { dataTransfer });
    const withCtrl = (type: string) =>
      fireEvent(
        target(),
        Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
          dataTransfer,
          ctrlKey: true,
        }),
      );
    withCtrl('dragover');
    withCtrl('drop');
    await waitFor(() => expect(status()).toBe('1 item copiado para Imagens.'));
  });

  it('enviar arquivos mostra a lista de envios e recarrega a pasta', async () => {
    const user = userEvent.setup();
    setup();
    await ready();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, [
      new File(['a'], 'um.txt', { type: 'text/plain' }),
      new File(['b'], 'dois.txt', { type: 'text/plain' }),
    ]);
    await waitFor(() => expect(rowNames()).toContain('dois.txt'));
    expect(document.querySelectorAll('.eds-files-upload[data-status="done"]')).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: 'um.txt' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar lista de envios' }));
    expect(document.querySelector('.eds-files-uploads')).toHaveAttribute('hidden');
  });

  it('envio acima do limite mostra o motivo sem chamar o servidor', async () => {
    const user = userEvent.setup();
    const adapter = createMemoryAdapter(undefined, { capabilities: { maxUploadBytes: 3 } });
    const spy = vi.spyOn(adapter, 'upload');
    setup({}, adapter);
    await ready();
    await user.upload(
      document.querySelector<HTMLInputElement>('input[type="file"]')!,
      new File(['0123456789'], 'grande.txt', { type: 'text/plain' }),
    );
    expect((await screen.findAllByText('Maior que o limite de 3 B.')).length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('abrir arquivo abre o visualizador; onOpen retornando false impede', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn<() => boolean | void>();
    setup({ onOpen });
    await ready();
    await user.click(within(rowOf('Contratos')).getByRole('link'));
    await waitFor(() => expect(rowNames()).toContain('Aditivo 01.pdf'));
    await user.click(within(rowOf('Aditivo 01.pdf')).getByRole('link'));
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/Contratos/Aditivo 01.pdf' }),
    );
    expect(await screen.findByRole('dialog', { name: /Aditivo 01\.pdf/ })).toBeInTheDocument();
  });

  it('versões: drawer com a lista e restauração', async () => {
    const user = userEvent.setup();
    const { adapter } = setup();
    await ready();
    await user.click(within(rowOf('Contratos')).getByRole('link'));
    await waitFor(() => expect(rowNames()).toContain('Contrato social.pdf'));
    await user.click(screen.getByRole('button', { name: 'Ações de Contrato social.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Versões' }));
    const drawer = await screen.findByRole('dialog', { name: 'Versões de Contrato social.pdf' });
    await waitFor(() => expect(within(drawer).getAllByRole('listitem')).toHaveLength(3));
    expect(within(drawer).getByText('Atual')).toBeInTheDocument();
    await user.click(within(drawer).getAllByRole('button', { name: /Restaurar esta versão/ })[1]!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Versões/ })).toBeNull());
    expect((await adapter.versions('/Contratos/Contrato social.pdf')).length).toBe(4);
  });

  it('estado vazio com envio, busca sem resultado e erro com tentar de novo', async () => {
    const user = userEvent.setup();
    setup({}, createMemoryAdapter([{ name: 'Vazia', folder: [] }]));
    await ready();
    await user.click(within(rowOf('Vazia')).getByRole('link'));
    expect(await screen.findByText('Esta pasta está vazia')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'xyz{Enter}');
    expect(await screen.findByText('Nenhum item corresponde a "xyz".')).toBeInTheDocument();
  });

  it('erro de carga mostra ErrorState e tenta de novo', async () => {
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
    setup({}, flaky);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os arquivos',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await ready();
    expect(rowNames().length).toBeGreaterThan(0);
  });

  it('somente leitura esconde a escrita e o menu só oferece leitura', async () => {
    const user = userEvent.setup();
    setup({ readOnly: true });
    await ready();
    expect(screen.queryByRole('button', { name: 'Nova pasta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enviar' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ações de Leia-me.txt' }));
    const items = Array.from(document.querySelectorAll('.eds-files-menu button')).map(
      (b) => b.textContent,
    );
    expect(items).toEqual(['Abrir', 'Baixar', 'Copiar', 'Versões']);
  });

  it('carregar mais usa o cursor', async () => {
    const user = userEvent.setup();
    setup({}, createMemoryAdapter(undefined, { pageSize: 2 }));
    await ready();
    expect(rowNames()).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    await waitFor(() => expect(rowNames()).toHaveLength(4));
  });

  it('textos trocados por texts', async () => {
    setup({ texts: { filesNewFolder: 'Criar pasta', filesEmptyTitle: 'Sem nada' } });
    await ready();
    expect(screen.getByRole('button', { name: 'Criar pasta' })).toBeInTheDocument();
  });

  it('pasta controlada por path', async () => {
    const view = setup({ path: '/Contratos' });
    await ready();
    await waitFor(() => expect(rowNames()).toContain('Contrato social.pdf'));
    view.rerender(
      <ToastProvider>
        <FileManager adapter={view.adapter} path="/Imagens" aria-label="Arquivos do contrato" />
      </ToastProvider>,
    );
    await waitFor(() => expect(rowNames()).toContain('Planta baixa.png'));
    await act(async () => undefined);
  });
});
