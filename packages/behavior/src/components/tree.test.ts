import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { pointer, stubRect } from '../test-utils/pointer';
import { toast } from './toast';
import { initTree } from './tree';

const confirmMock = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<boolean>>());
vi.mock('./dialogs', () => ({ confirm: confirmMock }));

const row = (label: string) =>
  `<div class="eds-tree-row"><span class="eds-tree-toggle" aria-hidden="true"></span><span class="eds-tree-label">${label}</span></div>`;

const html = (attrs = 'data-eds-editable data-eds-name="estrutura"') => `
<div class="eds-tree" id="tree" data-eds-tree ${attrs} aria-label="Estrutura organizacional">
  <ul role="tree" aria-label="Estrutura organizacional">
    <li role="treeitem" aria-expanded="true" data-id="n1" tabindex="0">${row('Diretoria Fictícia')}
      <ul role="group">
        <li role="treeitem" aria-expanded="true" data-id="n2" tabindex="-1">${row('Sede Modelo')}
          <ul role="group">
            <li role="treeitem" data-id="n3" tabindex="-1">${row('Setor Alfa')}</li>
            <li role="treeitem" data-id="n4" tabindex="-1">${row('Setor Beta')}</li>
          </ul>
        </li>
        <li role="treeitem" data-id="n5" tabindex="-1">${row('Filial Norte')}</li>
      </ul>
    </li>
    <li role="treeitem" data-id="n6" tabindex="-1">${row('Conselho')}</li>
  </ul>
</div>`;

const $ = (id: string) => document.querySelector(`[data-id="${id}"]`) as HTMLElement;
const tree = () => document.getElementById('tree') as HTMLElement;
const status = () => tree().querySelector('[role=status]') as HTMLElement;
const labelOf = (id: string) => $(id).querySelector('.eds-tree-label')?.textContent;
const json = () =>
  JSON.parse((tree().querySelector('input[name="estrutura"]') as HTMLInputElement).value);
const outline = (list: HTMLElement | null = tree().querySelector('ul[role=tree]')): string[] =>
  Array.from(list?.children ?? [])
    .filter((c) => c.matches('li'))
    .map((c) => {
      const kids = c.querySelector(':scope > ul');
      const own = c.getAttribute('data-id') ?? '';
      return kids ? `${own}(${outline(kids as HTMLElement).join(',')})` : own;
    });
const pause = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

describe('tree', () => {
  let destroy: () => void;
  let restore: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    confirmMock.mockReset();
    document.body.innerHTML = html();
    destroy = initTree(document);
  });
  afterEach(() => {
    destroy();
    toast.dismissAll();
    document.body.innerHTML = '';
    restore();
    vi.useRealTimers();
  });

  describe('estrutura e navegação (APG)', () => {
    it('numera nível, tamanho e posição e mantém um só tabindex 0', () => {
      expect($('n3')).toHaveAttribute('aria-level', '3');
      expect($('n3')).toHaveAttribute('aria-setsize', '2');
      expect($('n4')).toHaveAttribute('aria-posinset', '2');
      expect($('n6')).toHaveAttribute('aria-level', '1');
      expect($('n3')).not.toHaveAttribute('aria-expanded');
      expect(document.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
      expect($('n1')).toHaveAttribute('aria-selected', 'false');
    });

    it('setas, Home, End, expandir e recolher', async () => {
      const user = userEvent.setup();
      $('n1').focus();
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe($('n2'));
      expect($('n2')).toHaveAttribute('tabindex', '0');
      expect($('n1')).toHaveAttribute('tabindex', '-1');
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe($('n3'));
      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe($('n2'));
      await user.keyboard('{ArrowLeft}');
      expect($('n2')).toHaveAttribute('aria-expanded', 'false');
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe($('n5'));
      await user.keyboard('{End}');
      expect(document.activeElement).toBe($('n6'));
      await user.keyboard('{Home}');
      expect(document.activeElement).toBe($('n1'));
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe($('n1'));
      $('n2').focus();
      await user.keyboard('{ArrowRight}');
      expect($('n2')).toHaveAttribute('aria-expanded', 'true');
      expect(document.activeElement).toBe($('n2'));
    });

    it('→ numa folha não faz nada e ← na raiz recolhida não sai', async () => {
      const user = userEvent.setup();
      $('n6').focus();
      await user.keyboard('{ArrowRight}{ArrowLeft}');
      expect(document.activeElement).toBe($('n6'));
    });

    it('* expande os irmãos', async () => {
      const user = userEvent.setup();
      $('n2').setAttribute('aria-expanded', 'false');
      $('n1').focus();
      await user.keyboard('{ArrowDown}');
      $('n2').setAttribute('aria-expanded', 'false');
      // irmãos de n2: n2 e n5 (n5 é folha); n1 e n6 estão na raiz
      $('n1').focus();
      await user.keyboard('*');
      expect($('n1')).toHaveAttribute('aria-expanded', 'true');
      $('n1').setAttribute('aria-expanded', 'false');
      const onToggle = vi.fn();
      tree().addEventListener('eds:tree-toggle', onToggle);
      $('n2').focus();
      await user.keyboard('*');
      expect($('n2')).toHaveAttribute('aria-expanded', 'true');
      expect(onToggle).toHaveBeenCalled();
    });

    it('digitar vai ao próximo item que começa com a letra', async () => {
      const user = userEvent.setup();
      $('n1').focus();
      await user.keyboard('s');
      expect(document.activeElement).toBe($('n2'));
      await pause(550);
      await user.keyboard('s');
      expect(document.activeElement).toBe($('n3'));
      await pause(550);
      await user.keyboard('c');
      expect(document.activeElement).toBe($('n6'));
      await pause(550);
      await user.keyboard('é');
      expect(document.activeElement).toBe($('n6'));
    });

    it('clique no rótulo seleciona e foca; no chevron alterna; Enter ativa', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const onActivate = vi.fn();
      const onToggle = vi.fn();
      tree().addEventListener('eds:tree-select', onSelect);
      tree().addEventListener('eds:tree-activate', onActivate);
      tree().addEventListener('eds:tree-toggle', onToggle);
      await user.click($('n5').querySelector('.eds-tree-label') as HTMLElement);
      expect($('n5')).toHaveAttribute('aria-selected', 'true');
      expect(document.activeElement).toBe($('n5'));
      expect(onSelect.mock.calls[0]?.[0].detail).toMatchObject({ id: 'n5', selected: ['n5'] });
      await user.click($('n6').querySelector('.eds-tree-label') as HTMLElement);
      expect($('n5')).toHaveAttribute('aria-selected', 'false');
      await user.click($('n2').querySelector('.eds-tree-toggle') as HTMLElement);
      expect($('n2')).toHaveAttribute('aria-expanded', 'false');
      expect(onToggle.mock.calls[0]?.[0].detail).toMatchObject({ id: 'n2', expanded: false });
      $('n6').focus();
      await user.keyboard('{Enter}');
      expect(onActivate.mock.calls[0]?.[0].detail).toMatchObject({ id: 'n6' });
    });

    it('seleção múltipla com Ctrl, Shift e Espaço', async () => {
      const user = userEvent.setup();
      destroy();
      document.body.innerHTML = html('data-eds-multiselect');
      destroy = initTree(document);
      expect(document.querySelector('ul[role=tree]')).toHaveAttribute(
        'aria-multiselectable',
        'true',
      );
      const label = (id: string) => $(id).querySelector('.eds-tree-label') as HTMLElement;
      await user.click(label('n1'));
      await user.keyboard('{Control>}');
      await user.click(label('n5'));
      await user.keyboard('{/Control}');
      expect($('n1')).toHaveAttribute('aria-selected', 'true');
      expect($('n5')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{Shift>}');
      await user.click(label('n6'));
      await user.keyboard('{/Shift}');
      expect($('n5')).toHaveAttribute('aria-selected', 'true');
      expect($('n6')).toHaveAttribute('aria-selected', 'true');
      expect($('n1')).toHaveAttribute('aria-selected', 'false');
      $('n3').focus();
      await user.keyboard(' ');
      await user.keyboard('{Control>} {/Control}');
      expect($('n3')).toHaveAttribute('aria-selected', 'false');
    });

    it('Enter sem edição alterna a expansão', async () => {
      const user = userEvent.setup();
      destroy();
      document.body.innerHTML = html('');
      destroy = initTree(document);
      $('n2').focus();
      await user.keyboard('{Enter}');
      expect($('n2')).toHaveAttribute('aria-expanded', 'false');
      expect(document.querySelector('.eds-tree-action')).toBeNull();
      await user.keyboard('{F2}{Delete}{Insert}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
    });
  });

  describe('renomear', () => {
    it('F2 troca o rótulo por input; Enter salva, anuncia e atualiza o JSON', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      $('n5').focus();
      await user.keyboard('{F2}');
      const input = $('n5').querySelector('input') as HTMLInputElement;
      expect(input).toHaveClass('eds-input', 'eds-input-sm');
      expect(input).toHaveAccessibleName('Renomear Filial Norte');
      expect(document.activeElement).toBe(input);
      expect($('n5')).toHaveAttribute('data-editing');
      await user.keyboard('Filial Sul{Enter}');
      expect($('n5').querySelector('input')).toBeNull();
      expect(labelOf('n5')).toBe('Filial Sul');
      expect(document.activeElement).toBe($('n5'));
      expect(status()).toHaveTextContent('Item renomeado: Filial Sul.');
      const detail = onChange.mock.calls[0]?.[0].detail;
      expect(detail).toMatchObject({ action: 'rename', id: 'n5', index: 1 });
      expect(detail.parent).toBe($('n1'));
      expect(detail.tree[0].children[1]).toEqual({ id: 'n5', label: 'Filial Sul' });
      expect(json()[0].children[1].label).toBe('Filial Sul');
    });

    it('Esc cancela; vazio mantém o nome e anuncia', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      $('n5').focus();
      await user.keyboard('{F2}Outro{Escape}');
      expect(labelOf('n5')).toBe('Filial Norte');
      expect(document.activeElement).toBe($('n5'));
      await user.keyboard('{F2}{Backspace}{Enter}');
      expect(labelOf('n5')).toBe('Filial Norte');
      expect(status()).toHaveTextContent('O nome não pode ficar vazio. Mantido: Filial Norte.');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Esc na edição não fecha um modal em volta (stopPropagation)', async () => {
      const user = userEvent.setup();
      const outer = vi.fn();
      document.addEventListener('keydown', outer);
      $('n5').focus();
      await user.keyboard('{F2}');
      outer.mockClear();
      await user.keyboard('{Escape}');
      expect(outer).not.toHaveBeenCalled();
      document.removeEventListener('keydown', outer);
    });

    it('duplo clique renomeia e sair do campo salva', async () => {
      const user = userEvent.setup();
      await user.dblClick($('n6').querySelector('.eds-tree-label') as HTMLElement);
      const input = $('n6').querySelector('input') as HTMLInputElement;
      expect(input).not.toBeNull();
      await user.clear(input);
      await user.type(input, 'Conselho Fiscal');
      await user.click(document.body);
      expect(labelOf('n6')).toBe('Conselho Fiscal');
    });

    it('beforechange cancelado desfaz a renomeação', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-beforechange', (e) => {
        expect((e as CustomEvent).detail).toMatchObject({
          action: 'rename',
          label: 'Bloqueado',
          previousLabel: 'Conselho',
        });
        e.preventDefault();
      });
      tree().addEventListener('eds:tree-change', onChange);
      $('n6').focus();
      await user.keyboard('{F2}Bloqueado{Enter}');
      expect(labelOf('n6')).toBe('Conselho');
      expect(onChange).not.toHaveBeenCalled();
      expect(json()[1].label).toBe('Conselho');
    });
  });

  describe('adicionar', () => {
    it('Insert e Ctrl+Enter acrescentam filho em edição', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      $('n5').focus();
      await user.keyboard('{Insert}');
      const input = $('n5').querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('Novo item');
      expect($('n5')).toHaveAttribute('aria-expanded', 'true');
      expect(onChange.mock.calls[0]?.[0].detail).toMatchObject({
        action: 'add',
        label: 'Novo item',
      });
      await user.keyboard('Sala 1{Enter}');
      expect($('n5').querySelector(':scope > ul > li .eds-tree-label')).toHaveTextContent('Sala 1');
      expect($('n5').querySelector(':scope > ul > li')).toHaveAttribute('aria-level', '3');
      $('n6').focus();
      await user.keyboard('{Control>}{Enter}{/Control}');
      expect($('n6').querySelector('ul[role=group] > li')).not.toBeNull();
    });

    it('Shift+Enter acrescenta irmão logo abaixo', async () => {
      const user = userEvent.setup();
      $('n3').focus();
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.keyboard('Setor Gama{Enter}');
      expect(outline()).toEqual([
        expect.stringMatching(/^n1\(n2\(n3,eds-tree-\d+,n4\),n5\)$/),
        'n6',
      ]);
      expect(status()).toHaveTextContent('Item adicionado: Setor Gama.');
    });

    it('irmão na raiz', async () => {
      const user = userEvent.setup();
      $('n6').focus();
      await user.keyboard('{Shift>}{Enter}{/Shift}{Escape}');
      expect(tree().querySelectorAll('ul[role=tree] > li')).toHaveLength(3);
    });

    it('beforechange cancelado impede a inclusão', async () => {
      const user = userEvent.setup();
      tree().addEventListener('eds:tree-beforechange', (e) => {
        expect((e as CustomEvent).detail).toMatchObject({ action: 'add', index: 0 });
        e.preventDefault();
      });
      $('n6').focus();
      await user.keyboard('{Insert}');
      expect($('n6').querySelector('ul')).toBeNull();
      expect($('n6').querySelector('input')).toBeNull();
    });
  });

  describe('excluir', () => {
    it('folha sai direto, com toast e Desfazer', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      $('n5').focus();
      await user.keyboard('{Delete}');
      expect(confirmMock).not.toHaveBeenCalled();
      expect(outline()).toEqual(['n1(n2(n3,n4))', 'n6']);
      expect(document.activeElement).toBe($('n2'));
      expect(onChange.mock.calls[0]?.[0].detail).toMatchObject({ action: 'delete', id: 'n5' });
      await pause();
      expect(document.querySelector('.eds-toast')).toHaveTextContent(
        'Item excluído: Filial Norte. Ctrl+Z desfaz.',
      );
      await user.click(document.querySelector('.eds-toast-action') as HTMLElement);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
      expect(onChange.mock.calls[1]?.[0].detail).toMatchObject({
        action: 'add',
        id: 'n5',
        index: 1,
      });
      expect(document.activeElement).toBe($('n5'));
      expect(status()).toHaveTextContent('Item restaurado: Filial Norte.');
      expect(json()[0].children).toHaveLength(2);
    });

    it('Ctrl+Z desfaz a última exclusão enquanto o toast está na tela', async () => {
      const user = userEvent.setup();
      $('n5').focus();
      await user.keyboard('{Delete}');
      expect(outline()).toEqual(['n1(n2(n3,n4))', 'n6']);
      await pause();
      await user.keyboard('{Control>}z{/Control}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
      expect(document.activeElement).toBe($('n5'));
      expect(status()).toHaveTextContent('Item restaurado: Filial Norte.');
      // Sem exclusão pendente, Ctrl+Z não faz nada.
      await user.keyboard('{Control>}z{/Control}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
    });

    it('depois de fechado o toast, Ctrl+Z não restaura', async () => {
      const user = userEvent.setup();
      $('n5').focus();
      await user.keyboard('{Delete}');
      await pause();
      await user.click(document.querySelector('.eds-toast-close') as HTMLElement);
      $('n6').focus();
      await user.keyboard('{Control>}z{/Control}');
      expect(outline()).toEqual(['n1(n2(n3,n4))', 'n6']);
    });

    it('fala neutra com subitens: "Item excluído: X e N subitens."', async () => {
      const user = userEvent.setup();
      confirmMock.mockResolvedValue(true);
      $('n2').focus();
      await user.keyboard('{Delete}');
      await pause();
      expect(document.querySelector('.eds-toast')).toHaveTextContent(
        'Item excluído: Sede Modelo e 2 subitens. Ctrl+Z desfaz.',
      );
    });

    it('com filhos confirma (EDS.confirm); recusa mantém', async () => {
      const user = userEvent.setup();
      confirmMock.mockResolvedValueOnce(false);
      $('n2').focus();
      await user.keyboard('{Delete}');
      expect(confirmMock).toHaveBeenCalledWith(
        'Excluir "Sede Modelo" e 2 subitens?',
        'Excluir',
        'danger',
        {
          okText: 'Excluir',
        },
      );
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
      expect(document.activeElement).toBe($('n2'));
      confirmMock.mockResolvedValueOnce(true);
      await user.keyboard('{Delete}');
      expect(outline()).toEqual(['n1(n5)', 'n6']);
      await pause();
      await user.click(document.querySelector('.eds-toast-action') as HTMLElement);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
    });

    it('um subitem usa o singular', async () => {
      const user = userEvent.setup();
      confirmMock.mockResolvedValue(false);
      $('n3').remove();
      await flush();
      $('n2').focus();
      await user.keyboard('{Delete}');
      expect(confirmMock.mock.calls[0]?.[0]).toBe('Excluir "Sede Modelo" e 1 subitem?');
    });

    it('beforechange cancelado mantém o item', async () => {
      const user = userEvent.setup();
      tree().addEventListener('eds:tree-beforechange', (e) => e.preventDefault());
      $('n5').focus();
      await user.keyboard('{Delete}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
    });
  });

  describe('mover por teclado', () => {
    it('Alt+↓/↑ trocam entre irmãos e anunciam', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      $('n3').focus();
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(outline()).toEqual(['n1(n2(n4,n3),n5)', 'n6']);
      expect(document.activeElement).toBe($('n3'));
      expect(status()).toHaveTextContent(
        'Setor Alfa: nível 3, posição 2 de 2, dentro de Sede Modelo.',
      );
      expect(onChange.mock.calls[0]?.[0].detail).toMatchObject({
        action: 'move',
        id: 'n3',
        index: 1,
      });
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(status()).toHaveTextContent('Não é possível mover nessa direção.');
      await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
    });

    it('Alt+→ avança nível (filho do irmão de cima) e Alt+← recua', async () => {
      const user = userEvent.setup();
      $('n5').focus();
      await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(outline()).toEqual(['n1(n2(n3,n4,n5))', 'n6']);
      expect(status()).toHaveTextContent(
        'Filial Norte: nível 3, posição 3 de 3, dentro de Sede Modelo.',
      );
      await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
      expect(status()).toHaveTextContent(
        'Filial Norte: nível 2, posição 2 de 2, dentro de Diretoria Fictícia.',
      );
      $('n1').focus();
      await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
      expect(status()).toHaveTextContent('Não é possível mover nessa direção.');
      $('n6').focus();
      await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5,n6)']);
      await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
      expect(status()).toHaveTextContent('Conselho: nível 1, posição 2 de 2.');
    });

    it('beforechange cancelado não move', async () => {
      const user = userEvent.setup();
      tree().addEventListener('eds:tree-beforechange', (e) => e.preventDefault());
      $('n3').focus();
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
    });
  });

  describe('menu ⋯', () => {
    const open = async (user: ReturnType<typeof userEvent.setup>, id: string) => {
      await user.click($(id).querySelector('.eds-tree-action') as HTMLElement);
      await flush();
    };
    const item = (name: string) =>
      Array.from(document.querySelectorAll<HTMLElement>('.eds-dropdown-item')).find(
        (b) => b.textContent === name,
      ) as HTMLElement;

    it('cria o botão de ações com nome acessível e abre o menu disclosure', async () => {
      const user = userEvent.setup();
      const action = $('n5').querySelector('.eds-tree-action') as HTMLElement;
      expect(action).toHaveAttribute('tabindex', '-1');
      expect(action).toHaveAccessibleName('Ações de Filial Norte');
      await open(user, 'n5');
      const menu = document.querySelector('.eds-dropdown') as HTMLElement;
      expect(menu).toHaveAttribute('popover', 'auto');
      expect(menu).toHaveAttribute('role', 'group');
      expect(action).toHaveAttribute('aria-expanded', 'true');
      expect(
        Array.from(menu.querySelectorAll('.eds-dropdown-item')).map((b) => b.textContent),
      ).toEqual([
        'Adicionar filho',
        'Adicionar irmão',
        'Adicionar pai',
        'Renomear',
        'Mover para cima',
        'Mover para baixo',
        'Avançar nível',
        'Recuar nível',
        'Excluir',
      ]);
      expect(item('Mover para baixo')).toHaveAttribute('aria-disabled', 'true');
      expect(item('Mover para cima')).not.toHaveAttribute('aria-disabled');
      expect(document.activeElement).toBe(menu.querySelector('.eds-dropdown-item'));
    });

    it('Shift+F10 e a tecla de Menu abrem o menu do item', async () => {
      const user = userEvent.setup();
      $('n6').focus();
      await user.keyboard('{Shift>}{F10}{/Shift}');
      await flush();
      expect(document.querySelector('.eds-dropdown')).toHaveAttribute(
        'aria-label',
        'Ações de Conselho',
      );
      expect(document.querySelectorAll('.eds-dropdown-item').length).toBeGreaterThan(0);
      await user.keyboard('{Escape}');
      await flush();
      expect(document.activeElement).toBe($('n6'));
    });

    it('Adicionar pai envolve o nó e entra em edição', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      await open(user, 'n5');
      await user.click(item('Adicionar pai'));
      await flush();
      const input = tree().querySelector('input') as HTMLInputElement;
      expect(document.activeElement).toBe(input);
      await user.keyboard('Regional{Enter}');
      expect(outline()).toEqual([
        expect.stringMatching(/^n1\(n2\(n3,n4\),eds-tree-\d+\(n5\)\)$/),
        'n6',
      ]);
      expect(onChange.mock.calls[0]?.[0].detail).toMatchObject({ action: 'wrap', index: 1 });
      expect($('n5')).toHaveAttribute('aria-level', '3');
    });

    it('as ações do menu: filho, irmão, renomear, mover, avançar, recuar e excluir', async () => {
      const user = userEvent.setup();
      await open(user, 'n6');
      await user.click(item('Mover para cima'));
      await flush();
      expect(outline()).toEqual(['n6', 'n1(n2(n3,n4),n5)']);
      await open(user, 'n6');
      await user.click(item('Avançar nível'));
      expect(outline()).toEqual(['n6', 'n1(n2(n3,n4),n5)']);
      await open(user, 'n5');
      await user.click(item('Recuar nível'));
      await flush();
      expect(outline()).toEqual(['n6', 'n1(n2(n3,n4))', 'n5']);
      await open(user, 'n5');
      await user.click(item('Renomear'));
      expect($('n5').querySelector('input')).not.toBeNull();
      await user.keyboard('{Escape}');
      await open(user, 'n5');
      await user.click(item('Excluir'));
      await flush();
      expect(outline()).toEqual(['n6', 'n1(n2(n3,n4))']);
    });

    it('item desabilitado não age', async () => {
      const user = userEvent.setup();
      await open(user, 'n1');
      const before = outline();
      await user.click(item('Recuar nível'));
      expect(outline()).toEqual(before);
    });
  });

  describe('arrastar e soltar', () => {
    beforeEach(() => {
      ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].forEach((id, i) =>
        stubRect($(id).querySelector('.eds-tree-row') as HTMLElement, {
          left: 0,
          top: i * 30,
          width: 300,
          height: 30,
        }),
      );
    });
    const grab = (id: string) => $(id).querySelector('.eds-tree-label') as HTMLElement;
    const dropAt = (id: string, y: number) => {
      pointer(grab(id), 'pointerdown', 50, $(id).querySelector('.eds-tree-row') ? 10 : 0);
      pointer(document, 'pointermove', 50, y);
      pointer(document, 'pointerup', 50, y);
    };

    it('mostra data-drop por zona e fantasma; solta antes, dentro e depois', () => {
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      pointer(grab('n6'), 'pointerdown', 50, 165);
      pointer(document, 'pointermove', 50, 124); // n5: terço de cima (120..150)
      const rowOf = (id: string) => $(id).querySelector('.eds-tree-row') as HTMLElement;
      expect(rowOf('n5')).toHaveAttribute('data-drop', 'before');
      expect($('n6')).toHaveAttribute('data-dragging');
      const ghost = document.querySelector('.eds-sortable-ghost.eds-tree-ghost');
      expect(ghost).not.toBeNull();
      expect(tree().contains(ghost)).toBe(true);
      pointer(document, 'pointermove', 50, 135);
      expect(rowOf('n5')).toHaveAttribute('data-drop', 'inside');
      expect(rowOf('n5')).not.toHaveAttribute('data-drop-invalid');
      pointer(document, 'pointermove', 50, 128 + 20);
      expect(rowOf('n5')).toHaveAttribute('data-drop', 'after');
      pointer(document, 'pointerup', 50, 148);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5,n6)']);
      expect(document.querySelector('[data-drop]')).toBeNull();
      expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
      expect($('n6')).not.toHaveAttribute('data-dragging');
      expect(onChange.mock.calls[0]?.[0].detail).toMatchObject({
        action: 'move',
        id: 'n6',
        index: 2,
      });
      expect(status()).toHaveTextContent(
        'Conselho: nível 2, posição 3 de 3, dentro de Diretoria Fictícia.',
      );
    });

    it('dentro: vira filho (no fim) e expande o destino', () => {
      pointer(grab('n6'), 'pointerdown', 50, 165);
      pointer(document, 'pointermove', 50, 135);
      pointer(document, 'pointerup', 50, 135);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5(n6))']);
      expect($('n5')).toHaveAttribute('aria-expanded', 'true');
    });

    it('antes de um item reordena entre irmãos', () => {
      pointer(grab('n5'), 'pointerdown', 50, 135);
      pointer(document, 'pointermove', 50, 62); // n3: terço de cima (60..90)
      pointer(document, 'pointerup', 50, 62);
      expect(outline()).toEqual(['n1(n2(n5,n3,n4))', 'n6']);
    });

    it('proíbe soltar em descendente: data-drop-invalid, nada muda e anuncia', () => {
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      pointer(grab('n1'), 'pointerdown', 50, 15);
      pointer(document, 'pointermove', 50, 75); // n3 (inside)
      const row = $('n3').querySelector('.eds-tree-row') as HTMLElement;
      expect(row).toHaveAttribute('data-drop', 'inside');
      expect(row).toHaveAttribute('data-drop-invalid');
      pointer(document, 'pointerup', 50, 75);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
      expect(onChange).not.toHaveBeenCalled();
      expect(status()).toHaveTextContent(
        'Não é possível soltar um item dentro dele mesmo ou de um subitem.',
      );
      expect(document.querySelector('[data-drop-invalid]')).toBeNull();
    });

    it('soltar sobre si mesmo, fora das linhas ou sem mudar nada não faz nada', () => {
      const onChange = vi.fn();
      tree().addEventListener('eds:tree-change', onChange);
      dropAt('n5', 10);
      pointer(grab('n5'), 'pointerdown', 50, 135);
      pointer(document, 'pointermove', 50, 400);
      pointer(document, 'pointerup', 50, 400);
      pointer(grab('n5'), 'pointerdown', 50, 135);
      pointer(document, 'pointermove', 50, 140);
      pointer(document, 'pointermove', 50, 142);
      pointer(document, 'pointerup', 50, 142);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('beforechange cancelado impede a mudança; Esc cancela o arrasto', () => {
      pointer(grab('n6'), 'pointerdown', 50, 165);
      pointer(document, 'pointermove', 50, 135);
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      expect(document.querySelector('[data-drop]')).toBeNull();
      expect($('n6')).not.toHaveAttribute('data-dragging');
      pointer(document, 'pointerup', 50, 135);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
      tree().addEventListener('eds:tree-beforechange', (e) => e.preventDefault());
      pointer(grab('n6'), 'pointerdown', 50, 165);
      pointer(document, 'pointermove', 50, 135);
      pointer(document, 'pointerup', 50, 135);
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);
    });

    it('parado 600 ms "dentro" de um nó recolhido, expande-o', () => {
      vi.useFakeTimers();
      $('n2').setAttribute('aria-expanded', 'false');
      pointer(grab('n6'), 'pointerdown', 50, 165);
      pointer(document, 'pointermove', 50, 45); // n2 (30..60), meio
      expect($('n2')).toHaveAttribute('aria-expanded', 'false');
      vi.advanceTimersByTime(650);
      expect($('n2')).toHaveAttribute('aria-expanded', 'true');
      pointer(document, 'pointerup', 50, 45);
    });

    it('toque na linha só arrasta depois de segurar 400 ms parado', () => {
      vi.useFakeTimers();
      pointer(grab('n6'), 'pointerdown', 50, 165, { pointerType: 'touch' });
      vi.advanceTimersByTime(200);
      pointer(document, 'pointermove', 50, 100, { pointerType: 'touch' });
      pointer(document, 'pointermove', 50, 135, { pointerType: 'touch' });
      expect($('n6')).not.toHaveAttribute('data-dragging');
      pointer(document, 'pointerup', 50, 135, { pointerType: 'touch' });
      expect(outline()).toEqual(['n1(n2(n3,n4),n5)', 'n6']);

      pointer(grab('n6'), 'pointerdown', 50, 165, { pointerType: 'touch' });
      vi.advanceTimersByTime(400);
      pointer(document, 'pointermove', 50, 135, { pointerType: 'touch' });
      expect($('n6')).toHaveAttribute('data-dragging');
      pointer(document, 'pointerup', 50, 135, { pointerType: 'touch' });
      expect(outline()).toEqual(['n1(n2(n3,n4),n5(n6))']);
    });

    it('botões e a árvore sem edição não iniciam arrasto', () => {
      pointer($('n5').querySelector('.eds-tree-action') as HTMLElement, 'pointerdown', 50, 135);
      pointer(document, 'pointermove', 50, 40);
      expect($('n5')).not.toHaveAttribute('data-dragging');
      pointer(document, 'pointerup', 50, 40);
      tree().removeAttribute('data-eds-editable');
      pointer(grab('n5'), 'pointerdown', 50, 135);
      pointer(document, 'pointermove', 50, 40);
      expect($('n5')).not.toHaveAttribute('data-dragging');
      pointer(document, 'pointerup', 50, 40);
    });
  });

  describe('fonte JSON e filhos sob demanda', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('monta a árvore de data-eds-source (com texto, nunca HTML)', async () => {
      destroy();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 'a',
            label: '<b>Raiz</b>',
            expanded: true,
            children: [{ id: 'b', label: 'Filho' }],
          },
          { id: 'c', label: 'Outra' },
        ],
      });
      vi.stubGlobal('fetch', fetchMock);
      document.body.innerHTML = `<div class="eds-tree" id="tree" data-eds-tree data-eds-editable data-eds-source="/api/arvore.json" aria-label="Estrutura"></div>`;
      destroy = initTree(document);
      expect(tree()).toHaveAttribute('aria-busy', 'true');
      await pause(20);
      expect(tree()).not.toHaveAttribute('aria-busy');
      const [url, init] = fetchMock.mock.calls[0] as [
        string,
        RequestInit & { edsLoader?: boolean },
      ];
      expect(url).toBe('/api/arvore.json');
      expect(init.edsLoader).toBe(false);
      const root = tree().querySelector('ul[role=tree]') as HTMLElement;
      expect(root).toHaveAttribute('aria-label', 'Estrutura');
      expect(root.querySelector('b')).toBeNull();
      expect($('a').querySelector('.eds-tree-label')).toHaveTextContent('<b>Raiz</b>');
      expect($('a')).toHaveAttribute('aria-expanded', 'true');
      expect($('b')).toHaveAttribute('aria-level', '2');
      expect($('c')).not.toHaveAttribute('aria-expanded');
      expect(document.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });

    it('erro na fonte anuncia', async () => {
      destroy();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => [] }));
      document.body.innerHTML = `<div class="eds-tree" id="tree" data-eds-tree data-eds-source="/x"></div>`;
      destroy = initTree(document);
      await pause(20);
      expect(status()).toHaveTextContent('Não foi possível carregar a árvore.');
    });

    it('carrega filhos ao expandir (data-eds-children-url) e mostra aria-busy', async () => {
      const user = userEvent.setup();
      destroy();
      let resolve!: (value: unknown) => void;
      const fetchMock = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
      vi.stubGlobal('fetch', fetchMock);
      document.body.innerHTML = `
        <div class="eds-tree" id="tree" data-eds-tree data-eds-children-url="/api/nos/{id}">
          <ul role="tree" aria-label="x">
            <li role="treeitem" data-id="p 1" data-eds-lazy aria-expanded="false" tabindex="0">${row('Pai')}</li>
          </ul>
        </div>`;
      destroy = initTree(document);
      const li = document.querySelector('[role=treeitem]') as HTMLElement;
      li.focus();
      await user.keyboard('{ArrowRight}');
      expect(li).toHaveAttribute('aria-busy', 'true');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/nos/p%201');
      resolve({ ok: true, json: async () => [{ id: 'f1', label: 'Filho um' }] });
      await pause(20);
      expect(li).not.toHaveAttribute('aria-busy');
      expect(li).not.toHaveAttribute('data-eds-lazy');
      expect(li).toHaveAttribute('aria-expanded', 'true');
      expect(li.querySelector('[role=group] > li')).toHaveAttribute('aria-level', '2');
    });

    it('falha ao carregar filhos recolhe e permite tentar de novo', async () => {
      const user = userEvent.setup();
      destroy();
      const fetchMock = vi.fn().mockRejectedValue(new Error('rede'));
      vi.stubGlobal('fetch', fetchMock);
      document.body.innerHTML = `
        <div class="eds-tree" id="tree" data-eds-tree data-eds-children-url="/api/nos/">
          <ul role="tree" aria-label="x">
            <li role="treeitem" data-id="p" data-eds-lazy aria-expanded="false" tabindex="0">${row('Pai')}</li>
          </ul>
        </div>`;
      destroy = initTree(document);
      const li = document.querySelector('[role=treeitem]') as HTMLElement;
      li.focus();
      await user.keyboard('{ArrowRight}');
      await pause(20);
      expect(li).toHaveAttribute('aria-expanded', 'false');
      expect(li).toHaveAttribute('data-eds-lazy');
      expect(status()).toHaveTextContent(
        'Não foi possível carregar os itens de Pai. Pressione → para tentar de novo.',
      );
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/nos/p');
      // Falha visível no nó (texto + ícone), fora do nome, ligada por aria-describedby.
      const error = li.querySelector('.eds-tree-error') as HTMLElement;
      expect(error).toHaveTextContent('Não foi possível carregar. → tenta de novo.');
      expect(error).toHaveAttribute('aria-hidden', 'true');
      expect(li).toHaveAttribute('data-error');
      expect(li).toHaveAttribute('aria-describedby', error.id);
      // Nova tentativa limpa o aviso.
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'f', label: 'Filho' }],
      });
      await user.keyboard('{ArrowRight}');
      await pause(20);
      expect(li.querySelector('.eds-tree-error')).toBeNull();
      expect(li).not.toHaveAttribute('data-error');
      expect(li).not.toHaveAttribute('aria-describedby');
      expect(li).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('formulário e ciclo de vida', () => {
    it('init, destroy e init de novo não duplica status, menu nem hidden', () => {
      destroy();
      document.body.innerHTML = html();
      destroy = initTree(document);
      destroy();
      destroy = initTree(document);
      expect(tree().querySelectorAll('[role=status]')).toHaveLength(1);
      expect(tree().querySelectorAll('input[name="estrutura"]')).toHaveLength(1);
      expect(tree().querySelectorAll('.eds-tree-actions')).toHaveLength(6);
      expect(tree().querySelectorAll('ul[role=tree]')).toHaveLength(1);
    });

    it('data-eds-name mantém um hidden com o JSON da árvore', () => {
      const input = tree().querySelector(
        'input[type=hidden][name="estrutura"]',
      ) as HTMLInputElement;
      expect(json()).toEqual([
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
            { id: 'n5', label: 'Filial Norte' },
          ],
        },
        { id: 'n6', label: 'Conselho' },
      ]);
      expect(input).toBeTruthy();
    });

    it('nós acrescentados depois (parcial do servidor) ganham atributos', async () => {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem');
      li.setAttribute('data-id', 'n7');
      li.innerHTML = row('Novo do servidor');
      tree().querySelector('ul[role=tree]')?.append(li);
      await flush();
      expect(li).toHaveAttribute('aria-posinset', '3');
      expect($('n6')).toHaveAttribute('aria-setsize', '3');
      expect(li.querySelector('.eds-tree-action')).not.toBeNull();
      expect(json()).toHaveLength(3);
    });

    it('destroy remove o que o JS criou e desliga os ouvintes', async () => {
      const user = userEvent.setup();
      await user.click($('n5').querySelector('.eds-tree-action') as HTMLElement);
      destroy();
      expect(tree().querySelector('input[type=hidden]')).toBeNull();
      expect(tree().querySelector('.eds-dropdown')).toBeNull();
      expect(tree().querySelector('[role=status]')).toBeNull();
      $('n5').focus();
      await user.keyboard('{F2}');
      expect($('n5').querySelector('input')).toBeNull();
      destroy = initTree(document);
    });
  });
});
