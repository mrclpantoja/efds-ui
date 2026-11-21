import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { edgeSpeed } from '../core/drag';
import { flush } from '../test-utils/dom-polyfills';
import { pointer, stubRect } from '../test-utils/pointer';
import { initSortable } from './sortable';

const item = (id: string, label: string) => `
  <div class="eds-sortable-item" data-id="${id}">
    <button type="button" class="eds-sortable-handle" aria-label="Mover ${label}">::</button>
    <span>${label}</span>
  </div>`;

const html = `
<div class="eds-sortable" id="a" data-eds-sortable data-eds-group="quadro" aria-label="A fazer" data-eds-name="afazer[]">
  ${item('t1', 'Revisar contrato')}${item('t2', 'Enviar proposta')}${item('t3', 'Ligar para cliente')}
</div>
<div class="eds-sortable" id="b" data-eds-sortable data-eds-group="quadro" aria-label="Fazendo" data-eds-name="fazendo[]">
  ${item('t4', 'Montar relatório')}${item('t5', 'Agendar reunião')}
</div>`;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const ids = (c: HTMLElement) =>
  Array.from(c.children)
    .filter((e) => e.classList.contains('eds-sortable-item'))
    .map((e) => e.getAttribute('data-id'));
const hidden = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).map((i) => i.value);
const handle = (id: string) =>
  document.querySelector(`[data-id="${id}"] .eds-sortable-handle`) as HTMLElement;
const statusOf = (c: HTMLElement) => c.nextElementSibling as HTMLElement;

/** Geometria: lista A em x 0..200, itens de 40 px; lista B em x 300..500. */
function layout() {
  stubRect($('a'), { left: 0, top: 0, width: 200, height: 120 });
  stubRect($('b'), { left: 300, top: 0, width: 200, height: 80 });
  ['t1', 't2', 't3'].forEach((id, i) =>
    stubRect(handle(id).closest('.eds-sortable-item') as HTMLElement, {
      left: 0,
      top: i * 40,
      width: 200,
      height: 40,
    }),
  );
  ['t4', 't5'].forEach((id, i) =>
    stubRect(handle(id).closest('.eds-sortable-item') as HTMLElement, {
      left: 300,
      top: i * 40,
      width: 200,
      height: 40,
    }),
  );
}

describe('sortable: teclado', () => {
  let destroy: () => void;
  beforeEach(() => {
    document.body.innerHTML = html;
    destroy = initSortable(document);
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  it('liga instruções, hidden por item e papel de lista', () => {
    expect(handle('t1').getAttribute('aria-describedby')).toBeTruthy();
    expect(
      document.getElementById(handle('t1').getAttribute('aria-describedby') ?? ''),
    ).toHaveTextContent('Espaço pega o item');
    expect(hidden($('a'))).toEqual(['t1', 't2', 't3']);
    expect(document.querySelector('#a input')).toHaveAttribute('name', 'afazer[]');
    expect($('a')).toHaveAttribute('role', 'list');
    expect(handle('t1').closest('.eds-sortable-item')).toHaveAttribute('role', 'listitem');
  });

  it('pega, move, anuncia e solta com eds:sortable-change', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    $('b').addEventListener('eds:sortable-change', onSort);
    $('a').addEventListener('eds:sortable-change', onSort);
    handle('t1').focus();
    await user.keyboard(' ');
    expect(handle('t1')).toHaveAttribute('aria-pressed', 'true');
    expect(statusOf($('a'))).toHaveTextContent(
      'Revisar contrato pego. Posição 1 de 3 em A fazer. Use as setas para mover, Espaço para soltar, Esc para cancelar.',
    );
    await user.keyboard('{ArrowDown}');
    expect(ids($('a'))).toEqual(['t2', 't1', 't3']);
    expect(statusOf($('a'))).toHaveTextContent('Posição 2 de 3.');
    expect(document.activeElement).toBe(handle('t1'));
    await user.keyboard('{ArrowDown}');
    expect(ids($('a'))).toEqual(['t2', 't3', 't1']);
    await user.keyboard('{ArrowDown}');
    await new Promise((r) => setTimeout(r, 100)); // mesma mensagem: o anunciador a relê
    expect(statusOf($('a'))).toHaveTextContent('Posição 3 de 3.');
    expect(onSort).not.toHaveBeenCalled();
    await user.keyboard(' ');
    expect(handle('t1')).toHaveAttribute('aria-pressed', 'false');
    expect(statusOf($('a'))).toHaveTextContent(
      'Revisar contrato solto na posição 3 de 3 em A fazer.',
    );
    expect(onSort).toHaveBeenCalledTimes(1);
    const detail = onSort.mock.calls[0]?.[0].detail;
    expect(detail).toMatchObject({ id: 't1', fromIndex: 0, toIndex: 2, order: ['t2', 't3', 't1'] });
    expect(detail.from).toBe($('a'));
    expect(detail.to).toBe($('a'));
    expect(hidden($('a'))).toEqual(['t2', 't3', 't1']);
  });

  it('Esc cancela e devolve o item', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    document.addEventListener('eds:sortable-change', onSort);
    handle('t2').focus();
    await user.keyboard(' {ArrowUp}');
    expect(ids($('a'))).toEqual(['t2', 't1', 't3']);
    await user.keyboard('{Escape}');
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    expect(statusOf($('a'))).toHaveTextContent('Movimento cancelado.');
    expect(handle('t2')).toHaveAttribute('aria-pressed', 'false');
    expect(document.activeElement).toBe(handle('t2'));
    expect(onSort).not.toHaveBeenCalled();
    document.removeEventListener('eds:sortable-change', onSort);
  });

  it('com grupo, ←/→ passa ao contêiner vizinho e anuncia', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    $('b').addEventListener('eds:sortable-change', onSort);
    handle('t2').focus();
    await user.keyboard(' {ArrowRight}');
    expect(ids($('a'))).toEqual(['t1', 't3']);
    expect(ids($('b'))).toEqual(['t4', 't2', 't5']);
    expect(statusOf($('a'))).toHaveTextContent('Em Fazendo, posição 2 de 3.');
    expect(document.activeElement).toBe(handle('t2'));
    // sem contêiner à direita
    await user.keyboard('{ArrowRight}');
    expect(statusOf($('a'))).toHaveTextContent('Não há outra lista nessa direção.');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    await user.keyboard('{ArrowRight}');
    await user.keyboard(' ');
    expect(onSort).toHaveBeenCalledTimes(1);
    const detail = onSort.mock.calls[0]?.[0].detail;
    expect(detail).toMatchObject({ id: 't2', fromIndex: 1, toIndex: 1, order: ['t4', 't2', 't5'] });
    expect(detail.from).toBe($('a'));
    expect(detail.to).toBe($('b'));
    expect(hidden($('a'))).toEqual(['t1', 't3']);
    expect(hidden($('b'))).toEqual(['t4', 't2', 't5']);
  });

  it('na ponta a seta não move e repete "Posição N de M."', async () => {
    const user = userEvent.setup();
    handle('t1').focus();
    await user.keyboard(' {ArrowUp}');
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    expect(statusOf($('a'))).toHaveTextContent('Posição 1 de 3.');
    await user.keyboard('{ArrowUp}');
    await new Promise((r) => setTimeout(r, 100));
    expect(statusOf($('a'))).toHaveTextContent('Posição 1 de 3.');
  });

  it('na grade as setas não trocam de lista; PageDown troca', async () => {
    const user = userEvent.setup();
    $('a').setAttribute('data-eds-orientation', 'grid');
    handle('t1').focus();
    await user.keyboard(' {ArrowRight}{ArrowLeft}');
    expect(ids($('b'))).toEqual(['t4', 't5']);
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    await user.keyboard('{PageDown}');
    expect(ids($('b'))).toContain('t1');
  });

  it('sem grupo só reordena no próprio contêiner', async () => {
    const user = userEvent.setup();
    $('a').removeAttribute('data-eds-group');
    handle('t1').focus();
    await user.keyboard(' {ArrowRight}');
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    expect(statusOf($('a'))).toHaveTextContent('Não há outra lista nessa direção.');
  });

  it('orientação horizontal usa ←/→ e ↑/↓ troca de lista', async () => {
    const user = userEvent.setup();
    $('a').setAttribute('data-eds-orientation', 'horizontal');
    $('b').setAttribute('data-eds-orientation', 'horizontal');
    handle('t1').focus();
    await user.keyboard(' {ArrowRight}');
    expect(ids($('a'))).toEqual(['t2', 't1', 't3']);
    await user.keyboard('{ArrowDown}');
    expect(ids($('b'))).toContain('t1');
    await user.keyboard('{ArrowUp}');
    expect(ids($('a'))).toContain('t1');
  });

  it('grade: ↑/↓ andam uma linha; Home/End vão às pontas', async () => {
    const user = userEvent.setup();
    const c = $('a');
    c.setAttribute('data-eds-orientation', 'grid');
    c.append(
      ...[0, 1].map((i) => {
        const el = document.createElement('div');
        el.className = 'eds-sortable-item';
        el.dataset.id = `g${i}`;
        el.innerHTML =
          '<button type="button" class="eds-sortable-handle" aria-label="x">::</button>g';
        return el;
      }),
    );
    await flush();
    // 5 itens em 2 colunas: t1 t2 / t3 g0 / g1
    const els = Array.from(c.querySelectorAll<HTMLElement>('.eds-sortable-item'));
    els.forEach((el, i) =>
      stubRect(el, { left: (i % 2) * 100, top: Math.floor(i / 2) * 40, width: 100, height: 40 }),
    );
    handle('t1').focus();
    await user.keyboard(' {ArrowDown}');
    expect(ids(c)).toEqual(['t2', 't3', 't1', 'g0', 'g1']);
    await user.keyboard('{End}');
    expect(ids(c).at(-1)).toBe('t1');
    await user.keyboard('{Home}');
    expect(ids(c)[0]).toBe('t1');
    await user.keyboard('{ArrowRight}');
    expect(ids(c).indexOf('t1')).toBe(1);
  });

  it('Tab com o item pego cancela e deixa o foco seguir', async () => {
    const user = userEvent.setup();
    const c = $('a');
    const before = ids(c);
    handle('t1').focus();
    await user.keyboard(' {ArrowDown}');
    expect(ids(c)).not.toEqual(before);
    await user.tab();
    expect(ids(c)).toEqual(before);
    expect(handle('t1')).toHaveAttribute('aria-pressed', 'false');
    expect(handle('t1')).not.toHaveFocus();
  });

  it('grade: o item pego, levantado pelo CSS, continua contando como da primeira linha', async () => {
    const user = userEvent.setup();
    const c = $('a');
    c.setAttribute('data-eds-orientation', 'grid');
    // 3 itens em 2 colunas: t1 t2 / t3, com o t1 deslocado 4px para cima (`translate`)
    const els = Array.from(c.querySelectorAll<HTMLElement>('.eds-sortable-item'));
    els.forEach((el, i) =>
      stubRect(el, {
        left: (i % 2) * 100,
        top: Math.floor(i / 2) * 40 - (i === 0 ? 4 : 0),
        width: 100,
        height: 40,
      }),
    );
    handle('t1').focus();
    await user.keyboard(' {ArrowDown}');
    expect(ids(c)).toEqual(['t2', 't3', 't1']);
  });

  it('item sem handle recebe tabindex e funciona; foco em controle interno não pega', async () => {
    const user = userEvent.setup();
    document.body.innerHTML = `
      <ul data-eds-sortable aria-label="Lista">
        <li class="eds-sortable-item" data-id="x1">Um <input aria-label="campo"></li>
        <li class="eds-sortable-item" data-id="x2">Dois</li>
      </ul>`;
    destroy();
    destroy = initSortable(document);
    const li = document.querySelector<HTMLElement>('[data-id="x1"]') as HTMLElement;
    expect(li).toHaveAttribute('tabindex', '0');
    expect(li).not.toHaveAttribute('role');
    const input = li.querySelector('input') as HTMLInputElement;
    input.focus();
    await user.keyboard(' ');
    expect(li).not.toHaveAttribute('data-grabbed');
    li.focus();
    await user.keyboard(' {ArrowDown}');
    expect(li).toHaveAttribute('data-grabbed');
    expect(li).not.toHaveAttribute('aria-pressed');
    expect(Array.from(document.querySelectorAll('li')).map((e) => e.dataset.id)).toEqual([
      'x2',
      'x1',
    ]);
    await user.keyboard(' ');
    expect(li).not.toHaveAttribute('data-grabbed');
  });

  it('data-eds-disabled desliga o teclado', async () => {
    const user = userEvent.setup();
    $('a').setAttribute('data-eds-disabled', '');
    handle('t1').focus();
    await user.keyboard(' {ArrowDown}');
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    expect(handle('t1')).toHaveAttribute('aria-disabled', 'true');
  });

  it('perder o foco cancela o movimento', async () => {
    const user = userEvent.setup();
    handle('t1').focus();
    await user.keyboard(' {ArrowDown}');
    expect(ids($('a'))).toEqual(['t2', 't1', 't3']);
    handle('t4').focus();
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    expect(handle('t1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('item acrescentado depois ganha hidden e instruções', async () => {
    const el = document.createElement('div');
    el.className = 'eds-sortable-item';
    el.dataset.id = 't9';
    el.innerHTML =
      '<button type="button" class="eds-sortable-handle" aria-label="Mover novo">::</button>novo';
    $('a').append(el);
    await flush();
    expect(hidden($('a'))).toEqual(['t1', 't2', 't3', 't9']);
    expect(handle('t9')).toHaveAttribute('aria-describedby');
  });

  it('destroy remove o que o JS criou', () => {
    destroy();
    expect(document.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    expect(document.querySelectorAll('[role=status]')).toHaveLength(0);
    expect($('a')).not.toHaveAttribute('role');
    destroy = initSortable(document);
  });
});

describe('sortable: mouse e toque', () => {
  let destroy: () => void;
  beforeEach(() => {
    document.body.innerHTML = html;
    destroy = initSortable(document);
    layout();
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('só vira arrasto depois do limiar de 4 px (clique não arrasta)', () => {
    const onClick = vi.fn();
    handle('t1').addEventListener('click', onClick);
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 12, 11);
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
    pointer(document, 'pointerup', 12, 11);
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
  });

  it('arrasta com fantasma, placeholder e data-drop-target; solta e emite eds:sortable-change', () => {
    const onSort = vi.fn();
    document.addEventListener('eds:sortable-change', onSort);
    const source = handle('t1').closest('.eds-sortable-item') as HTMLElement;
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 30);
    expect(source).toHaveAttribute('data-dragging');
    const ghost = document.querySelector<HTMLElement>('.eds-sortable-ghost');
    expect(ghost).not.toBeNull();
    expect(ghost?.style.transform).toContain('translate(');
    expect(ghost?.style.inlineSize).toBe('200px');
    expect(ghost?.querySelector('[id]')).toBeNull();
    const placeholder = document.querySelector<HTMLElement>('.eds-sortable-placeholder');
    expect(placeholder?.style.blockSize).toBe('40px');
    expect($('a')).toHaveAttribute('data-drop-target');
    // entre t2 (meio 60) e t3 (meio 100)
    pointer(document, 'pointermove', 10, 70);
    expect(placeholder?.previousElementSibling).toBe(document.querySelector('[data-id="t2"]'));
    pointer(document, 'pointerup', 10, 70);
    expect(ids($('a'))).toEqual(['t2', 't1', 't3']);
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
    expect(source).not.toHaveAttribute('data-dragging');
    expect(source.hasAttribute('style')).toBe(false);
    expect($('a')).not.toHaveAttribute('data-drop-target');
    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onSort.mock.calls[0]?.[0].detail).toMatchObject({
      id: 't1',
      fromIndex: 0,
      toIndex: 1,
      order: ['t2', 't1', 't3'],
    });
    expect(hidden($('a'))).toEqual(['t2', 't1', 't3']);
    expect(statusOf($('a'))).toHaveTextContent(
      'Revisar contrato solto na posição 2 de 3 em A fazer.',
    );
    document.removeEventListener('eds:sortable-change', onSort);
  });

  it('o click depois do arrasto é engolido', async () => {
    const onClick = vi.fn();
    handle('t1').addEventListener('click', onClick);
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 90);
    pointer(document, 'pointerup', 10, 90);
    handle('t1').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(onClick).not.toHaveBeenCalled();
    await flush();
    handle('t1').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('entre contêineres do mesmo grupo', () => {
    const onSort = vi.fn();
    $('b').addEventListener('eds:sortable-change', onSort);
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 350, 50);
    expect($('b')).toHaveAttribute('data-drop-target');
    expect($('a')).not.toHaveAttribute('data-drop-target');
    // t4 meio 20; t5 meio 60: y=50 -> antes de t5
    pointer(document, 'pointerup', 350, 50);
    expect(ids($('a'))).toEqual(['t2', 't3']);
    expect(ids($('b'))).toEqual(['t4', 't1', 't5']);
    const detail = onSort.mock.calls[0]?.[0].detail;
    expect(detail).toMatchObject({ id: 't1', fromIndex: 0, toIndex: 1 });
    expect(detail.from).toBe($('a'));
    expect(detail.to).toBe($('b'));
    expect(hidden($('a'))).toEqual(['t2', 't3']);
    expect(hidden($('b'))).toEqual(['t4', 't1', 't5']);
  });

  it('sem grupo não sai do contêiner', () => {
    $('a').removeAttribute('data-eds-group');
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 350, 50);
    pointer(document, 'pointerup', 350, 50);
    expect(ids($('b'))).toEqual(['t4', 't5']);
    expect(ids($('a'))).toContain('t1');
  });

  it('Esc durante o arrasto cancela sem mudar nada', () => {
    const onSort = vi.fn();
    document.addEventListener('eds:sortable-change', onSort);
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 100);
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(true);
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
    pointer(document, 'pointerup', 10, 100);
    expect(onSort).not.toHaveBeenCalled();
    document.removeEventListener('eds:sortable-change', onSort);
  });

  it('pointercancel (toque) cancela', () => {
    pointer(handle('t1'), 'pointerdown', 10, 10, { pointerType: 'touch' });
    pointer(document, 'pointermove', 10, 100, { pointerType: 'touch' });
    pointer(document, 'pointercancel', 10, 100, { pointerType: 'touch' });
    expect(ids($('a'))).toEqual(['t1', 't2', 't3']);
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
  });

  it('outro ponteiro e botão que não é o principal são ignorados', () => {
    pointer(handle('t1'), 'pointerdown', 10, 10, { button: 2 });
    pointer(document, 'pointermove', 10, 100);
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 100, { pointerId: 2 });
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
    pointer(document, 'pointerup', 10, 100);
  });

  it('com handle, só ele arrasta; disabled não arrasta', () => {
    const text = document.querySelector('[data-id="t1"] span') as HTMLElement;
    pointer(text, 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 100);
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
    $('a').setAttribute('data-eds-disabled', '');
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 100);
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
  });

  it('sem handle, o item inteiro arrasta, menos de dentro de um controle', () => {
    document.body.innerHTML = `
      <ul id="l" data-eds-sortable aria-label="Lista">
        <li class="eds-sortable-item" data-id="x1"><button type="button">Abrir</button><span>Um</span></li>
        <li class="eds-sortable-item" data-id="x2">Dois</li>
      </ul>`;
    destroy();
    destroy = initSortable(document);
    const [x1, x2] = Array.from(document.querySelectorAll<HTMLElement>('li'));
    stubRect($('l'), { left: 0, top: 0, width: 200, height: 80 });
    stubRect(x1 as HTMLElement, { left: 0, top: 0, width: 200, height: 40 });
    stubRect(x2 as HTMLElement, { left: 0, top: 40, width: 200, height: 40 });
    pointer(x1?.querySelector('button') as HTMLElement, 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 70);
    expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
    pointer(document, 'pointerup', 10, 70);
    pointer(x1?.querySelector('span') as HTMLElement, 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 70);
    const ph = document.querySelector('.eds-sortable-placeholder');
    expect(ph?.tagName).toBe('LI');
    pointer(document, 'pointerup', 10, 70);
    expect(Array.from(document.querySelectorAll('li')).map((e) => e.dataset.id)).toEqual([
      'x2',
      'x1',
    ]);
  });

  it('rola o contêiner perto da borda enquanto arrasta', () => {
    vi.useFakeTimers();
    $('a').style.overflow = 'auto';
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 115);
    vi.advanceTimersByTime(100);
    expect($('a').scrollTop).toBeGreaterThan(0);
    const before = $('a').scrollTop;
    pointer(document, 'pointermove', 10, 60);
    vi.advanceTimersByTime(100);
    expect($('a').scrollTop).toBe(before);
    pointer(document, 'pointerup', 10, 60);
  });

  it('durante o arrasto o original não recebe style inline e o handle não ganha touch-action', () => {
    const source = handle('t1').closest('.eds-sortable-item') as HTMLElement;
    pointer(handle('t1'), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 10, 30);
    expect(source).toHaveAttribute('data-dragging');
    expect(source.hasAttribute('style')).toBe(false);
    expect(handle('t1').hasAttribute('style')).toBe(false);
    pointer(document, 'pointerup', 10, 30);
  });

  it('toque com handle arrasta no limiar de 4 px, sem esperar', () => {
    pointer(handle('t1'), 'pointerdown', 10, 10, { pointerType: 'touch' });
    pointer(document, 'pointermove', 10, 30, { pointerType: 'touch' });
    expect(document.querySelector('.eds-sortable-placeholder')).not.toBeNull();
    pointer(document, 'pointerup', 10, 30, { pointerType: 'touch' });
  });

  describe('toque sem handle: segurar 400 ms', () => {
    const x = (id: string) => document.querySelector('[data-id="' + id + '"]') as HTMLElement;
    const order = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.eds-sortable-item')).map(
        (e) => e.dataset.id,
      );
    beforeEach(() => {
      vi.useFakeTimers();
      document.body.innerHTML = `
        <div id="l" data-eds-sortable aria-label="Lista">
          <div class="eds-sortable-item" data-id="x1">Um</div>
          <div class="eds-sortable-item" data-id="x2">Dois</div>
        </div>`;
      destroy();
      destroy = initSortable(document);
      stubRect($('l'), { left: 0, top: 0, width: 200, height: 80 });
      stubRect(x('x1'), { left: 0, top: 0, width: 200, height: 40 });
      stubRect(x('x2'), { left: 0, top: 40, width: 200, height: 40 });
    });

    it('mexer antes de 400 ms é rolagem: nada de arrasto', () => {
      pointer(x('x1'), 'pointerdown', 10, 10, { pointerType: 'touch' });
      vi.advanceTimersByTime(200);
      pointer(document, 'pointermove', 10, 60, { pointerType: 'touch' });
      vi.advanceTimersByTime(400);
      pointer(document, 'pointermove', 10, 70, { pointerType: 'touch' });
      expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
      pointer(document, 'pointerup', 10, 70, { pointerType: 'touch' });
      expect(order()).toEqual(['x1', 'x2']);
    });

    it('segurar 400 ms parado e então mover arrasta (e impede a rolagem)', () => {
      pointer(x('x1'), 'pointerdown', 10, 10, { pointerType: 'touch' });
      vi.advanceTimersByTime(300);
      pointer(document, 'pointermove', 11, 12, { pointerType: 'touch' });
      expect(document.querySelector('.eds-sortable-placeholder')).toBeNull();
      vi.advanceTimersByTime(100);
      const touchmove = new Event('touchmove', { bubbles: true, cancelable: true });
      document.dispatchEvent(touchmove);
      expect(touchmove.defaultPrevented).toBe(true);
      pointer(document, 'pointermove', 10, 70, { pointerType: 'touch' });
      expect(document.querySelector('.eds-sortable-placeholder')).not.toBeNull();
      pointer(document, 'pointerup', 10, 70, { pointerType: 'touch' });
      expect(order()).toEqual(['x2', 'x1']);
    });

    it('mouse sem handle continua no limiar de 4 px', () => {
      pointer(x('x1'), 'pointerdown', 10, 10);
      pointer(document, 'pointermove', 10, 30);
      expect(document.querySelector('.eds-sortable-placeholder')).not.toBeNull();
      pointer(document, 'pointerup', 10, 30);
    });
  });

  it('edgeSpeed: zero no miolo, cresce junto da borda e respeita o máximo', () => {
    expect(edgeSpeed(50, 0, 100, 20, 10)).toBe(0);
    expect(edgeSpeed(0, 0, 100, 20, 10)).toBe(-10);
    expect(edgeSpeed(90, 0, 100, 20, 10)).toBe(5);
    expect(edgeSpeed(500, 0, 100, 20, 10)).toBe(10);
    expect(edgeSpeed(5, 0, 0, 20, 10)).toBe(0);
  });
});

describe('sortable: ciclo bind → destroy → bind', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('o aria-describedby sempre aponta para uma instrução que existe', () => {
    document.body.innerHTML = html;
    const first = initSortable(document);
    first();
    const second = initSortable(document);
    for (const id of ['t1', 't2', 't4']) {
      const ref = handle(id).getAttribute('aria-describedby') ?? '';
      expect(document.getElementById(ref)).not.toBeNull();
    }
    second();
  });

  it('destroy remove o que o JS pôs (aria-describedby, tabindex, role, aria-disabled)', () => {
    document.body.innerHTML = `
      <div id="c" class="eds-sortable" data-eds-sortable aria-label="Lista">
        <div class="eds-sortable-item" data-id="x">Um</div>
        <div class="eds-sortable-item" data-id="y" tabindex="-1" aria-describedby="meu-id">Dois</div>
        <div class="eds-sortable-item" data-id="z">
          <button type="button" class="eds-sortable-handle" aria-label="Mover Três">::</button>
        </div>
      </div>`;
    const stop = initSortable(document);
    const items = Array.from(document.querySelectorAll<HTMLElement>('.eds-sortable-item'));
    expect(items[0]).toHaveAttribute('tabindex', '0');
    expect(items[0]).toHaveAttribute('role', 'listitem');
    stop();
    expect(items[0]).not.toHaveAttribute('tabindex');
    expect(items[0]).not.toHaveAttribute('role');
    expect(items[0]).not.toHaveAttribute('aria-describedby');
    // O que já era do autor fica.
    expect(items[1]).toHaveAttribute('tabindex', '-1');
    expect(items[1]).toHaveAttribute('aria-describedby', 'meu-id');
    const grip = items[2]?.querySelector('.eds-sortable-handle') as HTMLElement;
    expect(grip).not.toHaveAttribute('aria-describedby');
    expect(document.getElementById('c')).not.toHaveAttribute('role');
  });
});
