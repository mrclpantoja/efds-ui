import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sortable, SortableGroup, type SortableChange, type SortableItemData } from '.';

const tarefas: SortableItemData[] = [
  { id: 't1', label: 'Revisar contrato' },
  { id: 't2', label: 'Enviar proposta' },
  { id: 't3', label: 'Agendar reunião' },
];

function rect(el: Element, left: number, top: number, width: number, height: number) {
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

const ids = (container: ParentNode) =>
  Array.from(container.querySelectorAll<HTMLElement>('.eds-sortable-item')).map(
    (el) => el.dataset.id,
  );
const status = () => screen.getByRole('status');
const handle = (name: string) => screen.getByRole('button', { name: `Mover ${name}` });

function Lista(props: {
  onChange?: (items: SortableItemData[]) => void;
  orientation?: 'vertical' | 'horizontal' | 'grid';
  disabled?: boolean;
  name?: string;
  handle?: boolean;
}) {
  const [items, setItems] = useState(tarefas);
  return (
    <Sortable
      label="A fazer"
      items={items}
      orientation={props.orientation}
      disabled={props.disabled}
      name={props.name}
      handle={props.handle}
      onChange={(next) => {
        setItems(next);
        props.onChange?.(next);
      }}
      renderItem={(item, { handle: grip }) => (
        <>
          {grip}
          <span>{item.label}</span>
        </>
      )}
    />
  );
}

describe('Sortable: markup', () => {
  it('emite as classes do core, lista nomeada e pegadores ligados à ajuda', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Sortable
        ref={ref}
        label="A fazer"
        items={tarefas}
        className="extra"
        renderItem={(item, { handle: grip }) => (
          <>
            {grip}
            {item.label}
          </>
        )}
      />,
    );
    const list = screen.getByRole('list', { name: 'A fazer' });
    expect(list).toHaveClass('eds-sortable', 'extra');
    expect(ref.current).toBe(list);
    expect(ids(list)).toEqual(['t1', 't2', 't3']);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    const grip = handle('Revisar contrato');
    expect(grip).toHaveClass('eds-sortable-handle');
    expect(grip).toHaveAttribute('aria-pressed', 'false');
    const help = document.getElementById(grip.getAttribute('aria-describedby')!)!;
    expect(help).toHaveAttribute('hidden');
    expect(help).toHaveTextContent('Espaço pega o item; setas movem; Espaço solta; Esc cancela.');
  });

  it('ul gera li e orientação vira atributo; name gera um hidden por item, na ordem', () => {
    const { container } = render(
      <Sortable
        as="ul"
        label="Lista"
        items={tarefas}
        orientation="horizontal"
        name="afazer[]"
        renderItem={(item) => item.label}
      />,
    );
    const ul = container.querySelector('ul.eds-sortable')!;
    expect(ul).toHaveAttribute('data-eds-orientation', 'horizontal');
    expect(ul.querySelectorAll(':scope > li.eds-sortable-item')).toHaveLength(3);
    const values = Array.from(
      ul.querySelectorAll<HTMLInputElement>('input[type=hidden][name="afazer[]"]'),
    ).map((i) => i.value);
    expect(values).toEqual(['t1', 't2', 't3']);
  });
});

describe('Sortable: teclado', () => {
  it('Espaço pega, setas movem, Espaço solta e avisa onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Lista onChange={onChange} />);
    const grip = handle('Revisar contrato');
    grip.focus();
    await user.keyboard(' ');
    expect(grip).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent(
      'Revisar contrato pego. Posição 1 de 3 em A fazer. Use as setas para mover, Espaço para soltar, Esc para cancelar.',
    );
    await user.keyboard('{ArrowDown}');
    expect(status()).toHaveTextContent('Posição 2 de 3.');
    expect(ids(document.body)).toEqual(['t2', 't1', 't3']);
    expect(onChange).not.toHaveBeenCalled();
    expect(grip).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    expect(grip).toHaveAttribute('aria-pressed', 'false');
    expect(status()).toHaveTextContent('Revisar contrato solto na posição 3 de 3 em A fazer.');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].map((i: SortableItemData) => i.id)).toEqual([
      't2',
      't3',
      't1',
    ]);
    expect(ids(document.body)).toEqual(['t2', 't3', 't1']);
  });

  it('Enter também pega e solta; no limite repete a posição sem mover', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Lista onChange={onChange} />);
    handle('Revisar contrato').focus();
    await user.keyboard('{Enter}{ArrowUp}');
    await waitFor(() => expect(status()).toHaveTextContent('Posição 1 de 3.'));
    await user.keyboard('{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Esc cancela e restaura a posição original sem chamar onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Lista onChange={onChange} />);
    const grip = handle('Revisar contrato');
    grip.focus();
    await user.keyboard(' {ArrowDown}{ArrowDown}');
    expect(ids(document.body)).toEqual(['t2', 't3', 't1']);
    await user.keyboard('{Escape}');
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
    expect(status()).toHaveTextContent('Movimento cancelado.');
    expect(onChange).not.toHaveBeenCalled();
    expect(grip).toHaveAttribute('aria-pressed', 'false');
  });

  it('Esc não vaza para quem fecha diálogos', async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- observa o vazamento do Esc
      <div onKeyDown={outer}>
        <Lista />
      </div>,
    );
    handle('Revisar contrato').focus();
    await user.keyboard(' {Escape}');
    expect(outer).toHaveBeenCalledTimes(1); // só o Espaço
  });

  it('na orientação horizontal usam-se ←/→; ↑/↓ não movem', async () => {
    const user = userEvent.setup();
    render(<Lista orientation="horizontal" />);
    handle('Revisar contrato').focus();
    await user.keyboard(' {ArrowDown}');
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
    await user.keyboard('{ArrowRight}');
    expect(ids(document.body)).toEqual(['t2', 't1', 't3']);
    await user.keyboard('{ArrowLeft}');
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
  });

  it('na grade ←/→ andam um e ↑/↓ andam uma linha (colunas pela geometria)', async () => {
    const user = userEvent.setup();
    render(<Lista orientation="grid" />);
    const list = screen.getByRole('list', { name: 'A fazer' });
    const [a, b, c] = Array.from(list.querySelectorAll<HTMLElement>('.eds-sortable-item'));
    rect(a!, 0, 0, 100, 40);
    rect(b!, 110, 0, 100, 40);
    rect(c!, 0, 50, 100, 40);
    handle('Revisar contrato').focus();
    await user.keyboard(' {ArrowRight}');
    expect(ids(document.body)).toEqual(['t2', 't1', 't3']);
    await user.keyboard('{ArrowLeft}');
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
    await user.keyboard('{ArrowDown}'); // 2 colunas: índice 0 -> 2
    expect(ids(document.body)).toEqual(['t2', 't3', 't1']);
    await user.keyboard('{ArrowUp}');
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
    await user.keyboard('{ArrowUp}'); // na ponta: repete a posição
    await waitFor(() => expect(status()).toHaveTextContent('Posição 1 de 3.'));
  });

  it('na grade o item pego, levantado pelo CSS, continua contando como da primeira linha', async () => {
    const user = userEvent.setup();
    render(<Lista orientation="grid" />);
    const list = screen.getByRole('list', { name: 'A fazer' });
    const [a, b, c] = Array.from(list.querySelectorAll<HTMLElement>('.eds-sortable-item'));
    rect(a!, 0, -4, 100, 40); // `translate` do item pego
    rect(b!, 110, 0, 100, 40);
    rect(c!, 0, 50, 100, 40);
    handle('Revisar contrato').focus();
    await user.keyboard(' {ArrowDown}'); // 2 colunas: índice 0 -> 2
    expect(ids(document.body)).toEqual(['t2', 't3', 't1']);
  });

  it('Tab com o item pego cancela e deixa o foco seguir', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Lista onChange={onChange} />);
    const grip = handle('Revisar contrato');
    grip.focus();
    await user.keyboard(' {ArrowDown}');
    expect(ids(document.body)).toEqual(['t2', 't1', 't3']);
    await user.tab();
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
    expect(status()).toHaveTextContent('Movimento cancelado.');
    expect(onChange).not.toHaveBeenCalled();
    expect(handle('Revisar contrato')).toHaveAttribute('aria-pressed', 'false');
    expect(handle('Revisar contrato')).not.toHaveFocus();
  });

  it('Home e End levam ao começo e ao fim', async () => {
    const user = userEvent.setup();
    render(<Lista />);
    handle('Enviar proposta').focus();
    await user.keyboard(' {End}');
    expect(ids(document.body)).toEqual(['t1', 't3', 't2']);
    await user.keyboard('{Home}');
    expect(ids(document.body)).toEqual(['t2', 't1', 't3']);
  });

  it('desabilitado não pega nada', async () => {
    const user = userEvent.setup();
    render(<Lista disabled />);
    const grip = handle('Revisar contrato');
    expect(grip).toHaveAttribute('aria-disabled', 'true');
    grip.focus();
    await user.keyboard(' {ArrowDown}');
    expect(grip).toHaveAttribute('aria-pressed', 'false');
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
  });

  it('sem pegador, o item é focável e recebe as instruções', async () => {
    const user = userEvent.setup();
    render(<Lista handle={false} />);
    const item = screen.getAllByRole('listitem')[0]!;
    expect(item).toHaveAttribute('tabindex', '0');
    expect(item).toHaveAttribute('aria-describedby');
    item.focus();
    await user.keyboard(' ');
    expect(item).toHaveAttribute('data-grabbed');
    expect(item).not.toHaveAttribute('aria-pressed');
    await user.keyboard('{ArrowDown} ');
    expect(item).not.toHaveAttribute('data-grabbed');
    expect(ids(document.body)).toEqual(['t2', 't1', 't3']);
  });

  it('perder o foco para fora cancela a pega', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Lista />
        <button type="button">Fora</button>
      </>,
    );
    handle('Revisar contrato').focus();
    await user.keyboard(' {ArrowDown}');
    await user.click(screen.getByRole('button', { name: 'Fora' }));
    expect(ids(document.body)).toEqual(['t1', 't2', 't3']);
    expect(status()).toHaveTextContent('Movimento cancelado.');
  });
});

function Quadro(props: {
  onChange?: (l: Record<string, SortableItemData[]>, c: SortableChange) => void;
}) {
  const [lists, setLists] = useState<Record<string, SortableItemData[]>>({
    afazer: [
      { id: 'a1', label: 'Revisar contrato' },
      { id: 'a2', label: 'Enviar proposta' },
    ],
    fazendo: [{ id: 'f1', label: 'Agendar reunião' }],
    feito: [],
  });
  const render1 = (item: SortableItemData, s: { handle: React.ReactNode }) => (
    <>
      {s.handle}
      {item.label}
    </>
  );
  return (
    <SortableGroup
      lists={lists}
      onChange={(next, change) => {
        setLists(next);
        props.onChange?.(next, change);
      }}
    >
      <Sortable id="afazer" label="A fazer" renderItem={render1} />
      <Sortable id="fazendo" label="Fazendo" renderItem={render1} />
      <Sortable id="feito" label="Feito" renderItem={render1} />
    </SortableGroup>
  );
}

describe('SortableGroup', () => {
  it('→ passa o item pego à lista vizinha, anuncia e devolve o foco ao pegador', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Quadro onChange={onChange} />);
    handle('Revisar contrato').focus();
    await user.keyboard(' {ArrowRight}');
    expect(status()).toHaveTextContent('Em Fazendo, posição 1 de 2.');
    expect(ids(screen.getByRole('list', { name: 'Fazendo' }))).toEqual(['a1', 'f1']);
    expect(handle('Revisar contrato')).toHaveFocus();
    await user.keyboard(' ');
    expect(status()).toHaveTextContent('Revisar contrato solto na posição 1 de 2 em Fazendo.');
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Record<string, SortableItemData[]>;
    expect(next.afazer!.map((i) => i.id)).toEqual(['a2']);
    expect(next.fazendo!.map((i) => i.id)).toEqual(['a1', 'f1']);
    expect(onChange.mock.calls[0]![1]).toEqual({
      id: 'a1',
      from: 'afazer',
      to: 'fazendo',
      fromIndex: 0,
      toIndex: 0,
    });
  });

  it('chega a uma lista vazia, volta com ← e para no limite', async () => {
    const user = userEvent.setup();
    render(<Quadro />);
    handle('Agendar reunião').focus();
    await user.keyboard(' {ArrowRight}');
    expect(ids(screen.getByRole('list', { name: 'Feito' }))).toEqual(['f1']);
    await user.keyboard('{ArrowRight}');
    expect(status()).toHaveTextContent('Não há outra lista nessa direção.');
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(ids(screen.getByRole('list', { name: 'A fazer' }))).toEqual(['f1', 'a1', 'a2']);
    await user.keyboard('{Escape}');
    expect(ids(screen.getByRole('list', { name: 'Fazendo' }))).toEqual(['f1']);
    expect(ids(screen.getByRole('list', { name: 'A fazer' }))).toEqual(['a1', 'a2']);
    expect(handle('Agendar reunião')).toHaveFocus();
  });

  it('as listas do grupo levam data-eds-group igual', () => {
    render(<Quadro />);
    const groups = screen
      .getAllByRole('list')
      .map((l) => l.getAttribute('data-eds-group'))
      .filter(Boolean);
    expect(groups).toHaveLength(3);
    expect(new Set(groups).size).toBe(1);
  });

  it('Sortable dentro do grupo sem id falha com mensagem clara', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <SortableGroup lists={{}}>
          <Sortable label="x" renderItem={() => null} />
        </SortableGroup>,
      ),
    ).toThrow(/id/);
    spy.mockRestore();
  });
});

function setRects(lists: HTMLElement[]) {
  lists.forEach((list, column) => {
    const left = column * 220;
    rect(list, left, 0, 200, 400);
    list.querySelectorAll<HTMLElement>('.eds-sortable-item').forEach((item, row) => {
      rect(item, left + 5, 10 + row * 50, 190, 40);
    });
  });
}

const down = (el: Element, x: number, y: number) =>
  fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: x, clientY: y });
const move = (x: number, y: number) =>
  fireEvent.pointerMove(document, { pointerId: 1, clientX: x, clientY: y });
const up = (x: number, y: number) =>
  fireEvent.pointerUp(document, { pointerId: 1, clientX: x, clientY: y });

describe('Sortable: arrasto por ponteiro', () => {
  it('só começa depois do limiar; mostra fantasma, espaço reservado e alvo; solta e ordena', async () => {
    const onChange = vi.fn();
    render(<Lista onChange={onChange} />);
    const list = screen.getByRole('list', { name: 'A fazer' });
    setRects([list]);
    const grip = handle('Revisar contrato');
    down(grip, 20, 20);
    move(21, 21); // abaixo de 4px
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
    move(40, 100);
    const ghost = document.querySelector<HTMLElement>('.eds-sortable-ghost')!;
    expect(ghost).toBeTruthy();
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(document.body).toContainElement(ghost);
    expect(list.querySelector('[data-id=t1]')).toHaveAttribute('data-dragging');
    expect(list).toHaveAttribute('data-drop-target');
    const placeholder = list.querySelector('.eds-sortable-placeholder')!;
    expect(placeholder).toBeTruthy();
    expect(Array.from(list.children).indexOf(placeholder)).toBe(2); // antes de t3
    up(40, 100);
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
    expect(list.querySelector('.eds-sortable-placeholder')).toBeNull();
    expect(list).not.toHaveAttribute('data-drop-target');
    expect(ids(list)).toEqual(['t2', 't1', 't3']);
    expect(onChange).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(status()).toHaveTextContent('Revisar contrato solto na posição 2 de 3 em A fazer.'),
    );
  });

  it('soltar onde estava não chama onChange', () => {
    const onChange = vi.fn();
    render(<Lista onChange={onChange} />);
    const list = screen.getByRole('list', { name: 'A fazer' });
    setRects([list]);
    down(handle('Enviar proposta'), 20, 70);
    move(40, 75);
    // O original some (data-dragging, pelo CSS) e o espaço reservado fica onde ele estava.
    expect(list.querySelector('[data-id=t2]')).toHaveAttribute('data-dragging');
    expect(list.querySelector('.eds-sortable-placeholder')).toBeTruthy();
    up(40, 75);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('um clique sem mover não arrasta', () => {
    render(<Lista />);
    const list = screen.getByRole('list', { name: 'A fazer' });
    setRects([list]);
    down(handle('Revisar contrato'), 20, 20);
    up(20, 20);
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
  });

  it('Esc cancela o arrasto e nada muda', async () => {
    const onChange = vi.fn();
    render(<Lista onChange={onChange} />);
    const list = screen.getByRole('list', { name: 'A fazer' });
    setRects([list]);
    down(handle('Revisar contrato'), 20, 20);
    move(40, 100);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
    expect(ids(list)).toEqual(['t1', 't2', 't3']);
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(status()).toHaveTextContent('Movimento cancelado.'));
  });

  it('entre listas do grupo: o contêiner sob o ponteiro vira alvo e recebe o item', () => {
    const onChange = vi.fn();
    render(<Quadro onChange={onChange} />);
    const lists = screen.getAllByRole('list');
    setRects(lists);
    down(handle('Revisar contrato'), 20, 20);
    move(240, 20); // sobre "Fazendo", acima do f1
    expect(lists[1]).toHaveAttribute('data-drop-target');
    expect(lists[0]).not.toHaveAttribute('data-drop-target');
    up(240, 20);
    expect(ids(lists[1]!)).toEqual(['a1', 'f1']);
    expect(ids(lists[0]!)).toEqual(['a2']);
    expect(onChange.mock.calls[0]![1]).toMatchObject({ from: 'afazer', to: 'fazendo', toIndex: 0 });
  });

  it('soltar numa lista vazia funciona', () => {
    render(<Quadro />);
    const lists = screen.getAllByRole('list');
    setRects(lists);
    down(handle('Agendar reunião'), 240, 20);
    move(450, 200);
    up(450, 200);
    expect(ids(lists[2]!)).toEqual(['f1']);
    expect(ids(lists[1]!)).toEqual([]);
  });

  it('PageUp/PageDown trocam de lista em qualquer orientação', async () => {
    const user = userEvent.setup();
    render(<Quadro />);
    handle('Revisar contrato').focus();
    await user.keyboard(' {PageDown}');
    expect(ids(screen.getByRole('list', { name: 'Fazendo' }))).toContain('a1');
    await user.keyboard('{PageUp}{PageUp}');
    expect(status()).toHaveTextContent('Não há outra lista nessa direção.');
  });

  it('toque sem pegador: segura 400 ms parado para arrastar; mexer antes rola a página', () => {
    vi.useFakeTimers();
    try {
      render(<Lista handle={false} />);
      const list = screen.getByRole('list', { name: 'A fazer' });
      setRects([list]);
      const itemEl = list.querySelector('[data-id=t1]')!;
      const touch = { pointerId: 1, pointerType: 'touch', button: 0 };
      fireEvent.pointerDown(itemEl, { ...touch, clientX: 20, clientY: 20 });
      fireEvent.pointerMove(document, { ...touch, clientX: 20, clientY: 40 });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
      fireEvent.pointerUp(document, { ...touch, clientX: 20, clientY: 40 });

      fireEvent.pointerDown(itemEl, { ...touch, clientX: 20, clientY: 20 });
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(document.querySelector('.eds-sortable-ghost')).toBeTruthy();
      expect(itemEl).toHaveAttribute('data-dragging');
      fireEvent.pointerUp(document, { ...touch, clientX: 20, clientY: 20 });
    } finally {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  it('com pegador o toque arrasta já no limiar (sem esperar)', () => {
    render(<Lista />);
    const list = screen.getByRole('list', { name: 'A fazer' });
    setRects([list]);
    const touch = { pointerId: 1, pointerType: 'touch', button: 0 };
    fireEvent.pointerDown(handle('Revisar contrato'), { ...touch, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(document, { ...touch, clientX: 40, clientY: 100 });
    expect(document.querySelector('.eds-sortable-ghost')).toBeTruthy();
    fireEvent.pointerUp(document, { ...touch, clientX: 40, clientY: 100 });
  });

  it('item desabilitado não arrasta', () => {
    render(
      <Sortable
        label="L"
        items={[{ id: 'x', label: 'Fixo', disabled: true }]}
        renderItem={(i, s) => (
          <>
            {s.handle}
            {i.label}
          </>
        )}
      />,
    );
    const list = screen.getByRole('list');
    setRects([list]);
    down(handle('Fixo'), 20, 20);
    act(() => move(40, 100));
    expect(document.querySelector('.eds-sortable-ghost')).toBeNull();
  });
});
