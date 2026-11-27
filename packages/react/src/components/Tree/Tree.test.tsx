import { createRef, useState, type Ref } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { installDialogPolyfill, installPopoverStyle } from '../../test-utils/dom-polyfills';
import { DialogProvider } from '../Dialog';
import { ToastProvider } from '../Toast';
import { Tree, type TreeChange, type TreeNodeData, type TreeProps } from '.';

const base = (): TreeNodeData[] => [
  {
    id: 'n1',
    label: 'Diretoria Fictícia',
    children: [
      {
        id: 'n2',
        label: 'Sede Modelo',
        children: [
          { id: 'n3', label: 'Setor Alfa' },
          { id: 'n4', label: 'Setor Beta' },
        ],
      },
      { id: 'n5', label: 'Filial Teste' },
    ],
  },
  { id: 'n6', label: 'Almoxarifado' },
];

let restore: Array<() => void> = [];
beforeEach(() => {
  restore = [installPopoverStyle(), installDialogPolyfill()];
  // jsdom não tem a Popover API: abre/fecha disparando o `toggle` que o Dropdown escuta.
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }));
  };
  HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }));
  };
});
afterEach(() => {
  restore.forEach((fn) => fn());
  Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
  Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
});

type Harness = Partial<TreeProps> & { onChanged?: (items: TreeNodeData[], c: TreeChange) => void };

function Harness({ onChanged, treeRef, ...props }: Harness & { treeRef?: Ref<HTMLDivElement> }) {
  const [items, setItems] = useState(props.items ?? base());
  return (
    <Tree
      label="Estrutura"
      defaultExpanded="all"
      {...props}
      ref={treeRef}
      items={items}
      onChange={(next, change) => {
        setItems(next);
        onChanged?.(next, change);
      }}
    />
  );
}

const item = (name: string) => screen.getByRole('treeitem', { name });
const status = () => screen.getByRole('status');
const labels = () =>
  Array.from(document.querySelectorAll('.eds-tree-label')).map((l) => l.textContent);
const levels = () =>
  Array.from(document.querySelectorAll('[role=treeitem]')).map(
    (l) => `${l.getAttribute('aria-label')}@${l.getAttribute('aria-level')}`,
  );

describe('Tree: markup e ARIA', () => {
  it('emite a estrutura APG com níveis, tamanhos, posições e roving tabindex', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Harness treeRef={ref} className="extra" />);
    const tree = screen.getByRole('tree', { name: 'Estrutura' });
    expect(tree.closest('.eds-tree')).toBe(ref.current);
    expect(ref.current).toHaveClass('eds-tree', 'extra');
    const sede = item('Sede Modelo');
    expect(sede).toHaveAttribute('aria-level', '2');
    expect(sede).toHaveAttribute('aria-setsize', '2');
    expect(sede).toHaveAttribute('aria-posinset', '1');
    expect(sede).toHaveAttribute('aria-expanded', 'true');
    expect(item('Setor Alfa')).not.toHaveAttribute('aria-expanded');
    expect(within(sede).getByRole('group')).toBeInTheDocument();
    const stops = screen.getAllByRole('treeitem').filter((i) => i.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(item('Diretoria Fictícia'));
    expect(item('Almoxarifado')).toHaveAttribute('aria-selected', 'false');
    expect(document.querySelector('.eds-tree-actions')).toBeNull(); // sem edição
  });

  it('nós recolhidos não renderizam filhos', () => {
    render(<Harness defaultExpanded={[]} />);
    expect(labels()).toEqual(['Diretoria Fictícia', 'Almoxarifado']);
    expect(item('Diretoria Fictícia')).toHaveAttribute('aria-expanded', 'false');
  });

  it('name mantém um hidden com o JSON da árvore', () => {
    render(<Harness name="estrutura" />);
    const hidden = document.querySelector<HTMLInputElement>('input[name=estrutura]')!;
    const json = JSON.parse(hidden.value) as TreeNodeData[];
    expect(json[0]!.children![0]!.children!.map((c) => c.id)).toEqual(['n3', 'n4']);
  });
});

describe('Tree: navegação por teclado (APG)', () => {
  it('setas, Home/End, expandir e recolher', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    item('Diretoria Fictícia').focus();
    await user.keyboard('{ArrowDown}');
    expect(item('Sede Modelo')).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(item('Filial Teste')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(item('Setor Beta')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item('Sede Modelo')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item('Sede Modelo')).toHaveAttribute('aria-expanded', 'false');
    expect(labels()).not.toContain('Setor Alfa');
    await user.keyboard('{ArrowRight}');
    expect(item('Sede Modelo')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowRight}');
    expect(item('Setor Alfa')).toHaveFocus();
    await user.keyboard('{End}');
    expect(item('Almoxarifado')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('Diretoria Fictícia')).toHaveFocus();
    expect(item('Diretoria Fictícia').tabIndex).toBe(0);
    expect(item('Almoxarifado').tabIndex).toBe(-1);
  });

  it('← em folha vai ao pai; * expande os irmãos', async () => {
    const user = userEvent.setup();
    render(<Harness defaultExpanded={[]} />);
    item('Diretoria Fictícia').focus();
    await user.keyboard('*');
    expect(item('Diretoria Fictícia')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(item('Filial Teste')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item('Diretoria Fictícia')).toHaveFocus();
  });

  it('digitar vai ao próximo item que começa com a letra (sem acento nem caixa)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    item('Diretoria Fictícia').focus();
    await user.keyboard('a');
    expect(item('Almoxarifado')).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 550));
    await user.keyboard('{Home}');
    await user.keyboard('s');
    expect(item('Sede Modelo')).toHaveFocus();
  });

  it('Enter ativa; sem edição também alterna a expansão', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Harness onActivate={onActivate} />);
    item('Sede Modelo').focus();
    await user.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: 'n2' }));
    expect(item('Sede Modelo')).toHaveAttribute('aria-expanded', 'false');
  });

  it('Espaço seleciona (única); clique troca; multiselect usa Ctrl e Shift', async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const { unmount } = render(<Harness onSelectedChange={onSelectedChange} />);
    item('Sede Modelo').focus();
    await user.keyboard(' ');
    expect(item('Sede Modelo')).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByText('Almoxarifado'));
    expect(item('Sede Modelo')).toHaveAttribute('aria-selected', 'false');
    expect(item('Almoxarifado')).toHaveAttribute('aria-selected', 'true');
    expect(item('Almoxarifado')).toHaveFocus();
    expect(onSelectedChange).toHaveBeenLastCalledWith(['n6']);
    unmount();

    render(<Harness multiselect />);
    expect(screen.getByRole('tree')).toHaveAttribute('aria-multiselectable', 'true');
    await user.click(screen.getByText('Sede Modelo'));
    await user.keyboard('{Control>}');
    await user.click(screen.getByText('Almoxarifado'));
    await user.keyboard('{/Control}');
    expect(item('Sede Modelo')).toHaveAttribute('aria-selected', 'true');
    expect(item('Almoxarifado')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Shift>}');
    await user.click(screen.getByText('Filial Teste'));
    await user.keyboard('{/Shift}');
    expect(item('Filial Teste')).toHaveAttribute('aria-selected', 'true');
    expect(item('Almoxarifado')).toHaveAttribute('aria-selected', 'true');
    expect(item('Sede Modelo')).toHaveAttribute('aria-selected', 'false');
  });

  it('clicar no chevron alterna sem selecionar', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = item('Sede Modelo').querySelector('.eds-tree-toggle')!;
    await user.click(toggle);
    expect(item('Sede Modelo')).toHaveAttribute('aria-expanded', 'false');
    expect(item('Sede Modelo')).toHaveAttribute('aria-selected', 'false');
  });
});

describe('Tree: edição', () => {
  it('F2 renomeia: Enter salva, devolve o foco e avisa onChange', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    item('Almoxarifado').focus();
    await user.keyboard('{F2}');
    const input = screen.getByRole('textbox', { name: 'Renomear Almoxarifado' });
    expect(input).toHaveClass('eds-input', 'eds-input-sm');
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, 'Depósito{Enter}');
    expect(labels()).toContain('Depósito');
    expect(item('Depósito')).toHaveFocus();
    expect(onChanged).toHaveBeenCalledTimes(1);
    const change = onChanged.mock.calls[0]![1] as TreeChange;
    expect(change).toMatchObject({ action: 'rename', parent: null, index: 1 });
    expect(change.node.label).toBe('Depósito');
    await waitFor(() => expect(status()).toHaveTextContent('Item renomeado: Depósito.'));
  });

  it('duplo clique renomeia; Esc cancela; blur salva', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    await user.dblClick(screen.getByText('Almoxarifado'));
    await user.type(screen.getByRole('textbox'), 'XYZ{Escape}');
    expect(labels()).toContain('Almoxarifado');
    expect(onChanged).not.toHaveBeenCalled();
    expect(item('Almoxarifado')).toHaveFocus();

    await user.dblClick(screen.getByText('Almoxarifado'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Estoque');
    await user.tab();
    expect(labels()).toContain('Estoque');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('nome vazio não salva, mantém o anterior e avisa', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    item('Almoxarifado').focus();
    await user.keyboard('{F2}');
    await user.clear(screen.getByRole('textbox'));
    await user.keyboard('{Enter}');
    expect(labels()).toContain('Almoxarifado');
    expect(onChanged).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(status()).toHaveTextContent('O nome não pode ficar vazio. Mantido: Almoxarifado.'),
    );
  });

  it('sem editable não há renomear nem ações', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    item('Almoxarifado').focus();
    await user.keyboard('{F2}{Delete}{Insert}');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(labels()).toContain('Almoxarifado');
  });

  it('Insert e Ctrl+Enter adicionam filho já em edição; Shift+Enter, irmão abaixo', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    item('Filial Teste').focus();
    await user.keyboard('{Insert}');
    expect(screen.getByRole('textbox', { name: 'Renomear Novo item' })).toHaveFocus();
    expect(onChanged.mock.calls[0]![1]).toMatchObject({
      action: 'add',
      index: 0,
      parent: { id: 'n5' },
    });
    await user.keyboard('Posto A{Enter}');
    expect(levels()).toContain('Posto A@3');
    expect(item('Filial Teste')).toHaveAttribute('aria-expanded', 'true');

    item('Almoxarifado').focus();
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.keyboard('Garagem{Enter}');
    expect(labels().slice(-2)).toEqual(['Almoxarifado', 'Garagem']);
    expect(levels()).toContain('Garagem@1');

    item('Almoxarifado').focus();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByRole('textbox', { name: 'Renomear Novo item' })).toBeInTheDocument();
  });

  it('Delete exclui folha direto e leva o foco ao vizinho', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    item('Setor Beta').focus();
    await user.keyboard('{Delete}');
    await waitFor(() => expect(labels()).not.toContain('Setor Beta'));
    expect(onChanged.mock.calls[0]![1]).toMatchObject({ action: 'delete', index: 1 });
    expect(item('Filial Teste')).toHaveFocus();
    await waitFor(() =>
      expect(status()).toHaveTextContent('Item excluído: Setor Beta. Ctrl+Z desfaz.'),
    );
  });

  it('Delete com filhos confirma (window.confirm sem DialogProvider)', async () => {
    const user = userEvent.setup();
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    render(<Harness editable />);
    item('Sede Modelo').focus();
    await user.keyboard('{Delete}');
    expect(confirm).toHaveBeenCalledWith('Excluir "Sede Modelo" e 2 subitens?');
    await waitFor(() => expect(item('Sede Modelo')).toHaveFocus());
    expect(labels()).toContain('Sede Modelo');
    await user.keyboard('{Delete}');
    await waitFor(() => expect(labels()).not.toContain('Sede Modelo'));
    expect(labels()).not.toContain('Setor Alfa');
    confirm.mockRestore();
  });

  it('com DialogProvider a exclusão usa o diálogo estilizado', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm');
    render(
      <DialogProvider>
        <Harness editable />
      </DialogProvider>,
    );
    item('Sede Modelo').focus();
    await user.keyboard('{Delete}');
    const dialog = await waitFor(() => {
      const d = document.querySelector<HTMLElement>('dialog.eds-alert-dialog');
      expect(d).toBeTruthy();
      return d!;
    });
    expect(dialog).toHaveTextContent('Excluir "Sede Modelo" e 2 subitens?');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(labels()).not.toContain('Sede Modelo'));
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('onBeforeChange cancela a mudança', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} onBeforeChange={() => false} />);
    item('Setor Beta').focus();
    await user.keyboard('{Delete}');
    expect(labels()).toContain('Setor Beta');
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('não controlado: defaultItems', async () => {
    const user = userEvent.setup();
    render(<Tree label="T" editable defaultItems={[{ id: 'a', label: 'Raiz' }]} />);
    item('Raiz').focus();
    await user.keyboard('{Insert}Filho{Enter}');
    expect(labels()).toEqual(['Raiz', 'Filho']);
  });
});

describe('Tree: mover por teclado', () => {
  it('Alt+↑/↓ move entre irmãos e anuncia a posição', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    item('Setor Beta').focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(labels().slice(2, 4)).toEqual(['Setor Beta', 'Setor Alfa']);
    expect(onChanged.mock.calls[0]![1]).toMatchObject({ action: 'move', index: 0 });
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Setor Beta: nível 3, posição 1 de 2, dentro de Sede Modelo.',
      ),
    );
    expect(item('Setor Beta')).toHaveFocus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(labels().slice(2, 4)).toEqual(['Setor Alfa', 'Setor Beta']);
  });

  it('Alt+→ avança o nível e Alt+← recua', async () => {
    const user = userEvent.setup();
    render(<Harness editable />);
    item('Filial Teste').focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(levels()).toContain('Filial Teste@3');
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Filial Teste: nível 3, posição 3 de 3, dentro de Sede Modelo.',
      ),
    );
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(levels()).toContain('Filial Teste@2');
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(levels()).toContain('Filial Teste@1');
    expect(labels().indexOf('Filial Teste')).toBe(labels().indexOf('Diretoria Fictícia') + 4);
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}'); // já na raiz: nada
    expect(levels()).toContain('Filial Teste@1');
  });
});

describe('Tree: menu de ações', () => {
  it('sem anchor positioning, posiciona o menu junto ao gatilho', async () => {
    vi.stubGlobal('CSS', { supports: () => false });
    onTestFinished(() => void vi.unstubAllGlobals());
    const user = userEvent.setup();
    render(<Harness editable />);
    item('Almoxarifado').focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    const first = await screen.findByRole('button', { name: 'Adicionar filho' });
    const menu = first.closest('.eds-dropdown') as HTMLElement;
    await waitFor(() => expect(menu.style.getPropertyValue('--_dropdown-x')).not.toBe(''));
    expect(menu.style.getPropertyValue('--_dropdown-y')).not.toBe('');
    expect(menu).toHaveAttribute('data-placement');
  });

  it('Shift+F10 abre o menu, o foco vai ao primeiro item e "Adicionar pai" envolve o nó', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    const action = screen.getByRole('button', { name: 'Ações de Almoxarifado' });
    expect(action).toHaveClass('eds-tree-action');
    expect(action).toHaveAttribute('tabindex', '-1');
    item('Almoxarifado').focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    const first = await screen.findByRole('button', { name: 'Adicionar filho' });
    await waitFor(() => expect(first).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Mover para baixo' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Recuar nível' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Adicionar pai' }));
    const input = await screen.findByRole('textbox', { name: 'Renomear Novo item' });
    expect(onChanged.mock.calls[0]![1]).toMatchObject({ action: 'wrap', parent: null, index: 1 });
    expect(input).toHaveFocus();
    await user.keyboard('Bloco X{Enter}');
    expect(levels()).toContain('Bloco X@1');
    expect(levels()).toContain('Almoxarifado@2');
  });

  it('o botão ⋯ aberto por clique também funciona; Excluir passa pela confirmação', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Harness editable />);
    fireEvent(
      document.querySelector('.eds-dropdown')!,
      Object.assign(new Event('toggle'), { newState: 'open' }),
    );
    expect(await screen.findAllByRole('button', { name: 'Excluir' })).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(labels()).not.toContain('Diretoria Fictícia'));
    confirm.mockRestore();
  });
});

function setRows() {
  Array.from(document.querySelectorAll<HTMLElement>('.eds-tree-row')).forEach((row, i) => {
    const top = i * 30;
    row.getBoundingClientRect = () =>
      ({ top, bottom: top + 30, left: 0, right: 300, width: 300, height: 30 }) as DOMRect;
  });
}
const rowTop = (label: string) =>
  Array.from(document.querySelectorAll('.eds-tree-label')).findIndex(
    (l) => l.textContent === label,
  ) * 30;
const down = (label: string) =>
  fireEvent.pointerDown(screen.getByText(label), {
    pointerId: 1,
    button: 0,
    clientX: 20,
    clientY: rowTop(label) + 15,
  });
const move = (y: number) =>
  fireEvent.pointerMove(document, { pointerId: 1, clientX: 20, clientY: y });
const up = (y: number) => fireEvent.pointerUp(document, { pointerId: 1, clientX: 20, clientY: y });

describe('Tree: arrastar e soltar', () => {
  it('terço do meio: dentro; mostra data-drop-target e move para o fim dos filhos', () => {
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    setRows();
    down('Almoxarifado');
    move(rowTop('Filial Teste') + 15);
    const row = item('Filial Teste').querySelector('.eds-tree-row')!;
    expect(row).toHaveAttribute('data-drop-target', 'inside');
    expect(item('Almoxarifado')).toHaveAttribute('data-dragging');
    expect(document.querySelector('.eds-sortable-ghost')).toBeTruthy();
    up(rowTop('Filial Teste') + 15);
    expect(row).not.toHaveAttribute('data-drop-target');
    expect(levels()).toContain('Almoxarifado@3');
    expect(onChanged.mock.calls[0]![1]).toMatchObject({
      action: 'move',
      parent: { id: 'n5' },
      index: 0,
    });
  });

  it('terço de cima: antes; terço de baixo: depois', () => {
    render(<Harness editable />);
    setRows();
    down('Almoxarifado');
    move(rowTop('Sede Modelo') + 3);
    expect(item('Sede Modelo').querySelector('.eds-tree-row')).toHaveAttribute(
      'data-drop-target',
      'before',
    );
    up(rowTop('Sede Modelo') + 3);
    expect(labels().slice(0, 3)).toEqual(['Diretoria Fictícia', 'Almoxarifado', 'Sede Modelo']);
    expect(levels()).toContain('Almoxarifado@2');

    setRows();
    down('Setor Beta');
    move(rowTop('Almoxarifado') + 27);
    expect(item('Almoxarifado').querySelector('.eds-tree-row')).toHaveAttribute(
      'data-drop-target',
      'after',
    );
    up(rowTop('Almoxarifado') + 27);
    expect(levels()).toContain('Setor Beta@2');
  });

  it('é proibido soltar dentro de um descendente: data-drop-invalid e nada muda', async () => {
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    setRows();
    down('Diretoria Fictícia');
    move(rowTop('Setor Alfa') + 15);
    const row = item('Setor Alfa').querySelector('.eds-tree-row')!;
    expect(row).toHaveAttribute('data-drop-invalid');
    expect(row).not.toHaveAttribute('data-drop-target');
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Não é possível soltar um item dentro dele mesmo ou de um subitem.',
      ),
    );
    up(rowTop('Setor Alfa') + 15);
    expect(onChanged).not.toHaveBeenCalled();
    expect(row).not.toHaveAttribute('data-drop-invalid');
    expect(levels()).toContain('Setor Alfa@3');
  });

  it('também é inválido soltar antes/depois de um descendente e sobre si mesmo', () => {
    const onChanged = vi.fn();
    render(<Harness editable onChanged={onChanged} />);
    setRows();
    down('Sede Modelo');
    move(rowTop('Setor Beta') + 3);
    expect(item('Setor Beta').querySelector('.eds-tree-row')).toHaveAttribute('data-drop-invalid');
    move(rowTop('Sede Modelo') + 15);
    expect(item('Sede Modelo').querySelector('.eds-tree-row')).toHaveAttribute('data-drop-invalid');
    up(rowTop('Sede Modelo') + 15);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('Esc cancela; clique sem mover não arrasta; sem editable não arrasta', () => {
    const onChanged = vi.fn();
    const { unmount } = render(<Harness editable onChanged={onChanged} />);
    setRows();
    down('Almoxarifado');
    move(rowTop('Filial Teste') + 15);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
    down('Almoxarifado');
    up(rowTop('Almoxarifado') + 15);
    expect(onChanged).not.toHaveBeenCalled();
    unmount();

    render(<Harness />);
    setRows();
    down('Almoxarifado');
    move(rowTop('Filial Teste') + 15);
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
  });

  it('parado sobre um nó recolhido (dentro) por 600 ms expande', () => {
    vi.useFakeTimers();
    try {
      render(<Harness editable defaultExpanded={[]} />);
      setRows();
      down('Almoxarifado');
      move(rowTop('Diretoria Fictícia') + 15);
      expect(item('Diretoria Fictícia')).toHaveAttribute('aria-expanded', 'false');
      act(() => {
        vi.advanceTimersByTime(650);
      });
      expect(item('Diretoria Fictícia')).toHaveAttribute('aria-expanded', 'true');
      up(rowTop('Diretoria Fictícia') + 15);
    } finally {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });
});

describe('Tree: alinhamento com o behavior', () => {
  it('anuncia nível e posição ao adicionar; "não é possível mover" nas pontas', async () => {
    const user = userEvent.setup();
    render(<Harness editable />);
    item('Almoxarifado').focus();
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await waitFor(() =>
      expect(status()).toHaveTextContent('Item adicionado: Novo item. Nível 1, posição 3 de 3.'),
    );
    await user.keyboard('{Escape}');
    item('Diretoria Fictícia').focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    await waitFor(() => expect(status()).toHaveTextContent('Não é possível mover nessa direção.'));
  });

  it('multiselect: Shift+setas estendem a seleção e Ctrl+Espaço alterna', async () => {
    const user = userEvent.setup();
    render(<Harness multiselect />);
    item('Sede Modelo').focus();
    await user.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}');
    expect(item('Sede Modelo')).toHaveAttribute('aria-selected', 'true');
    expect(item('Setor Alfa')).toHaveAttribute('aria-selected', 'true');
    expect(item('Setor Beta')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(item('Setor Beta')).toHaveAttribute('aria-selected', 'false');
    await user.keyboard('{Control>} {/Control}');
    expect(item('Setor Alfa')).toHaveAttribute('aria-selected', 'false');
    expect(item('Sede Modelo')).toHaveAttribute('aria-selected', 'true');
  });

  it('Delete mostra toast "Desfazer" (8 s) e restaura na mesma posição', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(
      <ToastProvider>
        <Harness editable onChanged={onChanged} />
      </ToastProvider>,
    );
    item('Setor Alfa').focus();
    await user.keyboard('{Delete}');
    await waitFor(() => expect(labels()).not.toContain('Setor Alfa'));
    const undo = await screen.findByRole('button', { name: 'Desfazer' });
    expect(undo).toHaveClass('eds-button', 'eds-button-ghost', 'eds-button-sm', 'eds-toast-action');
    await user.click(undo);
    await waitFor(() => expect(labels()).toContain('Setor Alfa'));
    expect(labels().slice(2, 4)).toEqual(['Setor Alfa', 'Setor Beta']);
    expect(onChanged).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'add', index: 0 }),
    );
    expect(item('Setor Alfa')).toHaveFocus();
    await waitFor(() => expect(status()).toHaveTextContent('Item restaurado: Setor Alfa.'));
  });
});

describe('Tree: Ctrl+Z e falas neutras', () => {
  it('Ctrl+Z desfaz a última exclusão enquanto o toast está na tela; depois não faz nada', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness editable />
      </ToastProvider>,
    );
    item('Setor Alfa').focus();
    await user.keyboard('{Delete}');
    await waitFor(() => expect(labels()).not.toContain('Setor Alfa'));
    await screen.findByRole('button', { name: 'Desfazer' });
    await user.keyboard('{Control>}z{/Control}');
    await waitFor(() => expect(labels()).toContain('Setor Alfa'));
    expect(item('Setor Alfa')).toHaveFocus();
    await waitFor(() => expect(status()).toHaveTextContent('Item restaurado: Setor Alfa.'));
    await user.keyboard('{Delete}');
    await waitFor(() => expect(labels()).not.toContain('Setor Alfa'));
    await user.click(await screen.findByRole('button', { name: 'Fechar notificação' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull());
    await user.keyboard('{Control>}z{/Control}');
    expect(labels()).not.toContain('Setor Alfa');
  });

  it('item novo: o 1º nome fala "Item adicionado: X."', async () => {
    const user = userEvent.setup();
    render(<Harness editable />);
    item('Almoxarifado').focus();
    await user.keyboard('{Insert}');
    await user.keyboard('Sala 1{Enter}');
    await waitFor(() => expect(status()).toHaveTextContent('Item adicionado: Sala 1.'));
  });
});

describe('Tree: filhos sob demanda', () => {
  const lazy = (): TreeNodeData[] => [
    { id: 'r', label: 'Regional Piloto', hasChildren: true },
    { id: 'o', label: 'Outra' },
  ];

  it('expandir carrega, marca aria-busy e mostra os filhos', async () => {
    const user = userEvent.setup();
    let resolve!: (v: TreeNodeData[]) => void;
    const loadChildren = vi.fn(
      () =>
        new Promise<TreeNodeData[]>((r) => {
          resolve = r;
        }),
    );
    render(<Harness items={lazy()} loadChildren={loadChildren} defaultExpanded={[]} />);
    const regional = item('Regional Piloto');
    expect(regional).toHaveAttribute('aria-expanded', 'false');
    regional.focus();
    await user.keyboard('{ArrowRight}');
    expect(regional).toHaveAttribute('aria-busy', 'true');
    expect(loadChildren).toHaveBeenCalledWith(expect.objectContaining({ id: 'r' }));
    await waitFor(() => expect(status()).toHaveTextContent('Carregando…'));
    resolve([{ id: 'r1', label: 'Posto Um' }]);
    await waitFor(() => expect(item('Posto Um')).toHaveAttribute('aria-level', '2'));
    expect(regional).not.toHaveAttribute('aria-busy');
    expect(regional).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowRight}');
    expect(item('Posto Um')).toHaveFocus();
    expect(loadChildren).toHaveBeenCalledTimes(1);
  });

  it('falha anuncia o erro, não expande e a próxima expansão tenta de novo', async () => {
    const user = userEvent.setup();
    const loadChildren = vi
      .fn<(n: TreeNodeData) => Promise<TreeNodeData[]>>()
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce([{ id: 'r1', label: 'Posto Um' }]);
    render(<Harness items={lazy()} loadChildren={loadChildren} defaultExpanded={[]} />);
    await user.click(item('Regional Piloto').querySelector('.eds-tree-toggle')!);
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Não foi possível carregar os itens de Regional Piloto. Pressione → para tentar de novo.',
      ),
    );
    // Falha visível no nó (texto e ícone), fora do nome, ligada por aria-describedby.
    const regional = item('Regional Piloto');
    const error = regional.querySelector('.eds-tree-error') as HTMLElement;
    expect(error).toHaveTextContent('Não foi possível carregar. → tenta de novo.');
    expect(error).toHaveAttribute('aria-hidden', 'true');
    expect(regional).toHaveAttribute('data-error');
    expect(regional).toHaveAttribute('aria-describedby', error.id);
    expect(item('Regional Piloto')).toHaveAttribute('aria-expanded', 'false');
    expect(item('Regional Piloto')).not.toHaveAttribute('aria-busy');
    await user.click(item('Regional Piloto').querySelector('.eds-tree-toggle')!);
    await waitFor(() => expect(labels()).toContain('Posto Um'));
    expect(loadChildren).toHaveBeenCalledTimes(2);
    expect(item('Regional Piloto').querySelector('.eds-tree-error')).toBeNull();
    expect(item('Regional Piloto')).not.toHaveAttribute('data-error');
  });

  it('nó que carrega vazio vira folha sem erro', async () => {
    const user = userEvent.setup();
    render(
      <Harness items={lazy()} loadChildren={() => Promise.resolve([])} defaultExpanded={[]} />,
    );
    await user.click(item('Regional Piloto').querySelector('.eds-tree-toggle')!);
    await waitFor(() => expect(item('Regional Piloto')).not.toHaveAttribute('aria-busy'));
    expect(screen.queryByRole('group')).toBeNull();
  });
});

describe('Tree: toque nas linhas', () => {
  it('segura 400 ms parado para arrastar; mexer antes não arrasta', () => {
    vi.useFakeTimers();
    try {
      render(<Harness editable />);
      setRows();
      const touch = { pointerId: 1, pointerType: 'touch', button: 0 };
      const label = screen.getByText('Almoxarifado');
      const y = rowTop('Almoxarifado') + 15;
      fireEvent.pointerDown(label, { ...touch, clientX: 20, clientY: y });
      fireEvent.pointerMove(document, { ...touch, clientX: 20, clientY: y - 40 });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
      fireEvent.pointerUp(document, { ...touch, clientX: 20, clientY: 0 });

      fireEvent.pointerDown(label, { ...touch, clientX: 20, clientY: y });
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(document.querySelector('.eds-sortable-ghost')).toHaveClass('eds-tree-ghost');
      fireEvent.pointerUp(document, { ...touch, clientX: 20, clientY: y });
    } finally {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });
});
