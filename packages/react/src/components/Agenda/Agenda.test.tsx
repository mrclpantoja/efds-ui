import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installPopoverStyle } from '../../test-utils/dom-polyfills';
import { LocaleProvider } from '../Locale';
import { Agenda, type AgendaEvent } from '.';

const events: AgendaEvent[] = [
  { id: 'e1', title: 'Reunião de equipe', date: '2026-11-10', time: '09:00', href: '#/r1' },
  { id: 'e2', title: 'Entrega do relatório', date: '2026-11-10', time: '14:00' },
  { id: 'e3', title: 'Revisão', date: '2026-11-10', time: '16:00' },
  { id: 'e4', title: 'Treinamento', date: '2026-11-10' },
  { id: 'e5', title: 'Congresso', date: '2026-11-18', end: '2026-11-20', tone: 'info' },
  { id: 'e6', title: 'Fechamento', date: '2026-12-02' },
];

beforeAll(() => {
  installPopoverStyle();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 12, 10, 0, 0) });
});
afterEach(() => {
  vi.useRealTimers();
});

const cell = (iso: string) => document.querySelector(`td[data-date="${iso}"]`) as HTMLElement;
const title = () => document.querySelector('.eds-agenda-title')?.textContent;

describe('Agenda', () => {
  it('grade do mês: legenda, colunas, semanas completas e título em aria-live', () => {
    render(<Agenda events={events} defaultMonth="2026-11" />);
    expect(title()).toBe('Novembro de 2026');
    expect(document.querySelector('.eds-agenda-title')).toHaveAttribute('aria-live', 'polite');
    const table = screen.getByRole('table', { name: 'Agenda de novembro de 2026' });
    const heads = within(table).getAllByRole('columnheader');
    expect(heads).toHaveLength(7);
    expect(heads.every((h) => h.getAttribute('scope') === 'col')).toBe(true);
    expect(heads[0]?.querySelector('abbr')).toHaveAttribute('title', 'domingo');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(cell('2026-12-05')).toHaveAttribute('data-outside');
    expect(cell('2026-11-30')).not.toHaveAttribute('data-outside');
  });

  it('hoje: aria-current e o texto "Hoje"', () => {
    render(<Agenda defaultMonth="2026-11" />);
    expect(cell('2026-11-12')).toHaveAttribute('aria-current', 'date');
    expect(cell('2026-11-12').querySelector('.eds-agenda-today')).toHaveTextContent('Hoje');
    expect(cell('2026-11-13')).not.toHaveAttribute('aria-current');
    expect(cell('2026-11-13').querySelector('time')).toHaveAttribute('datetime', '2026-11-13');
    expect(cell('2026-11-13').querySelector('.eds-agenda-weekday')).toHaveTextContent(
      'sexta-feira',
    );
  });

  it('eventos: link com href, botão sem; dia inteiro primeiro; vários dias com continuação', () => {
    render(<Agenda events={events} defaultMonth="2026-11" />);
    const day = cell('2026-11-10');
    // O Popover repete os eventos do dia; o primeiro link é o da célula.
    const link = within(day).getAllByRole('link', { name: /Reunião de equipe/ })[0] as HTMLElement;
    expect(link).toHaveAttribute('href', '#/r1');
    expect(link.querySelector('.eds-agenda-event-time')).toHaveTextContent('09:00');
    expect(day.querySelector('.eds-agenda-event')).toHaveTextContent('Treinamento');
    expect(cell('2026-11-18').textContent).toContain('dia inteiro: Congresso');
    expect(cell('2026-11-19').querySelector('.eds-agenda-event')).toHaveAttribute('data-continues');
    expect(cell('2026-11-18').querySelector('.eds-agenda-event')).not.toHaveAttribute(
      'data-continues',
    );
    expect(cell('2026-11-18').querySelector('.eds-agenda-event')).toHaveAttribute(
      'data-tone',
      'info',
    );
    expect(cell('2026-11-21').textContent).not.toContain('Congresso');
  });

  it('"+N mais" com Popover trazendo todos os eventos do dia', () => {
    render(<Agenda events={events} defaultMonth="2026-11" />);
    const day = cell('2026-11-10');
    const more = within(day).getByRole('button', { name: /2 mais eventos em/ });
    expect(more).toHaveTextContent('+2 mais');
    expect(more).toHaveClass('eds-agenda-more');
    const pop = day.querySelector('[popover]') as HTMLElement;
    expect(pop).toHaveClass('eds-popover');
    expect(within(pop).getAllByRole('listitem')).toHaveLength(4);
    expect(pop).toHaveAccessibleName(/Eventos de/);
  });

  it('maxEvents muda o limite', () => {
    render(<Agenda events={events} defaultMonth="2026-11" maxEvents={5} />);
    expect(cell('2026-11-10').querySelector('.eds-agenda-more')).toBeNull();
    expect(within(cell('2026-11-10')).getAllByRole('listitem')).toHaveLength(4);
  });

  it('próximo, anterior e hoje trocam o mês e avisam; foco fica no botão', async () => {
    const onMonthChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Agenda events={events} defaultMonth="2026-11" onMonthChange={onMonthChange} />);
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(title()).toBe('Dezembro de 2026');
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-12');
    expect(cell('2026-12-02').textContent).toContain('Fechamento');
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(title()).toBe('Outubro de 2026');
    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(title()).toBe('Novembro de 2026');
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveFocus();
  });

  it('controlado pelo mês', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    function Harness() {
      const [m, setM] = useState('2026-11');
      return <Agenda events={events} month={m} onMonthChange={setM} />;
    }
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(title()).toBe('Dezembro de 2026');
  });

  it('Tab percorre a navegação e depois os eventos; clique chama onEventClick', async () => {
    const onEventClick = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Agenda events={events} defaultMonth="2026-11" onEventClick={onEventClick} />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveFocus();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(document.activeElement).toHaveTextContent('Treinamento');
    await user.click(
      within(cell('2026-11-10')).getAllByRole('link', { name: /Reunião/ })[0] as HTMLElement,
    );
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
  });

  it('semana na segunda, locale e textos configuráveis; loading marca aria-busy', () => {
    render(
      <LocaleProvider locale="en-US">
        <Agenda
          events={events}
          defaultMonth="2026-11"
          weekStart={1}
          loading
          texts={{ more: (n) => `+${n} more` }}
        />
      </LocaleProvider>,
    );
    expect(title()).toBe('November 2026');
    expect(document.querySelector('thead abbr')).toHaveAttribute('title', 'Monday');
    expect(document.querySelector('tbody td')).toHaveAttribute('data-date', '2026-10-26');
    expect(document.querySelector('.eds-agenda')).toHaveAttribute('aria-busy', 'true');
    expect(cell('2026-11-10').querySelector('.eds-agenda-more')).toHaveTextContent('+2 more');
  });

  it('sem eventos mostra o aviso de mês vazio', () => {
    render(<Agenda defaultMonth="2026-11" />);
    expect(document.querySelector('.eds-agenda-empty')).toHaveTextContent(
      'Nenhum evento neste mês.',
    );
  });
});
