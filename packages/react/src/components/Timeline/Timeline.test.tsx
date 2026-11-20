import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Timeline } from './Timeline';

const items = [
  {
    id: '1',
    title: 'Pedido aprovado',
    time: '20/11/2026 10:30',
    dateTime: '2026-11-20T10:30',
    text: 'Aprovado após a conferência.',
    actor: 'por Maria Exemplo',
    tone: 'success' as const,
    icon: <svg data-testid="ok" />,
  },
  { id: '2', title: 'Pedido criado', time: '19/11/2026 09:12', dateTime: '2026-11-19T09:12' },
];

describe('Timeline', () => {
  it('lista ordenada com marcador decorativo, tom e hora semântica', () => {
    const ref = createRef<HTMLOListElement>();
    const { container } = render(<Timeline ref={ref} items={items} aria-label="Histórico" />);
    const list = screen.getByRole('list', { name: 'Histórico' });
    expect(list).toBe(ref.current);
    expect(list.tagName).toBe('OL');
    expect(list).toHaveClass('eds-timeline');
    const first = within(list).getAllByRole('listitem')[0]!;
    expect(first).toHaveClass('eds-timeline-item');
    expect(first).toHaveAttribute('data-tone', 'success');
    expect(first.querySelector('.eds-timeline-marker')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('ok').parentElement).toHaveClass('eds-timeline-marker');
    expect(first.querySelector('time')).toHaveAttribute('datetime', '2026-11-20T10:30');
    expect(first.querySelector('.eds-timeline-text')).toHaveTextContent('Aprovado após');
    expect(first.querySelector('.eds-timeline-actor')).toHaveTextContent('Maria Exemplo');
    // sem texto nem ator: as partes não aparecem
    expect(container.querySelectorAll('.eds-timeline-text')).toHaveLength(1);
  });

  it('compact acrescenta a variante', () => {
    render(<Timeline items={items} compact aria-label="x" />);
    expect(screen.getByRole('list', { name: 'x' })).toHaveClass('eds-timeline-compact');
  });

  it('groups: um cabeçalho por grupo e cada grupo é uma lista', () => {
    const { container } = render(
      <Timeline
        compact
        groups={[
          { title: 'Hoje, 20/11/2026', items: [items[0]!] },
          { title: 'Ontem, 19/11/2026', items: [items[1]!] },
        ]}
      />,
    );
    expect(container.firstElementChild).toHaveClass('eds-timeline-groups');
    expect(screen.getByRole('heading', { level: 3, name: 'Hoje, 20/11/2026' })).toHaveClass(
      'eds-timeline-group-title',
    );
    expect(
      container.querySelectorAll('.eds-timeline-group > ol.eds-timeline-compact'),
    ).toHaveLength(2);
  });
});
