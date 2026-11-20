import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLocale, resetMessages, setLocale, setMessages } from '../core/config';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initAgenda } from './agenda';

const events = JSON.stringify([
  { id: 'e1', title: 'Reunião de equipe', date: '2026-11-10', time: '09:00', href: '#/r1' },
  { id: 'e2', title: 'Entrega do relatório', date: '2026-11-10', time: '14:00' },
  { id: 'e3', title: 'Revisão', date: '2026-11-10', time: '16:00' },
  { id: 'e4', title: 'Treinamento', date: '2026-11-10' },
  { id: 'e5', title: 'Congresso', date: '2026-11-18', end: '2026-11-20', tone: 'info' },
  { id: 'e6', title: 'Fechamento', date: '2026-12-02' },
]);

const html = (attrs = 'data-eds-agenda-month="2026-11"') =>
  `<div class="eds-agenda" data-eds-agenda ${attrs}><script type="application/json" data-eds-agenda-events>${events}</script></div>`;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const title = () => $('.eds-agenda-title').textContent;
const cell = (iso: string) => $(`td[data-date="${iso}"]`);

let restore: () => void;
let destroy: () => void;

beforeEach(() => {
  restore = installDomPolyfills();
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 12, 10, 0, 0) });
});
afterEach(() => {
  destroy?.();
  restore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetLocale();
  resetMessages();
  document.body.innerHTML = '';
});

const setup = (attrs?: string) => {
  document.body.innerHTML = html(attrs);
  destroy = initAgenda(document);
};

describe('agenda mensal', () => {
  it('monta a tabela do mês: cabeçalhos de coluna, semanas completas e título em aria-live', () => {
    setup();
    expect(title()).toBe('Novembro de 2026');
    expect($('.eds-agenda-title')).toHaveAttribute('aria-live', 'polite');
    const table = $('table.eds-agenda-grid');
    expect(table.querySelector('caption')?.textContent).toBe('Agenda de novembro de 2026');
    expect(table).toHaveAccessibleName('Agenda de novembro de 2026');
    const heads = Array.from(table.querySelectorAll('thead th'));
    expect(heads).toHaveLength(7);
    expect(heads.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect(heads[0]?.querySelector('abbr')?.getAttribute('title')).toBe('domingo');
    // 1º de novembro de 2026 é domingo: 5 semanas, de 01/11 a 05/12.
    expect(table.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(cell('2026-11-01')).toBeTruthy();
    expect(cell('2026-12-05')).toHaveAttribute('data-outside');
    expect(cell('2026-11-30')).not.toHaveAttribute('data-outside');
  });

  it('marca hoje com aria-current e o texto "Hoje"; cada célula traz time e dia da semana', () => {
    setup();
    expect(cell('2026-11-12')).toHaveAttribute('aria-current', 'date');
    expect(cell('2026-11-12').querySelector('.eds-agenda-today')?.textContent).toBe('Hoje');
    expect(cell('2026-11-13')).not.toHaveAttribute('aria-current');
    expect(cell('2026-11-13').querySelector('.eds-agenda-today')).toBeNull();
    const time = cell('2026-11-13').querySelector('time.eds-agenda-date');
    expect(time?.getAttribute('datetime')).toBe('2026-11-13');
    expect(time?.textContent).toBe('13');
    expect(cell('2026-11-13').querySelector('.eds-agenda-weekday')?.textContent).toBe(
      'sexta-feira',
    );
  });

  it('eventos viram link (com href) ou botão; dia inteiro ganha texto oculto', () => {
    setup();
    const day = cell('2026-11-10');
    const link = day.querySelector<HTMLAnchorElement>('a.eds-agenda-event');
    expect(link?.getAttribute('href')).toBe('#/r1');
    expect(link?.textContent).toContain('09:00');
    expect(link?.querySelector('.eds-agenda-event-time')?.textContent).toBe('09:00');
    expect(day.querySelector('button.eds-agenda-event')).toBeTruthy();
    // Dia inteiro vem antes dos horários.
    expect(day.querySelector('.eds-agenda-event')?.textContent).toContain('Treinamento');
    expect(cell('2026-11-18').textContent).toContain('dia inteiro: Congresso');
  });

  it('evento de vários dias aparece em cada dia, continuação marcada', () => {
    setup();
    expect(cell('2026-11-18').textContent).toContain('Congresso');
    expect(cell('2026-11-19').textContent).toContain('Congresso');
    expect(cell('2026-11-19').querySelector('.eds-agenda-event')).toHaveAttribute('data-continues');
    expect(cell('2026-11-18').querySelector('.eds-agenda-event')).not.toHaveAttribute(
      'data-continues',
    );
    expect(cell('2026-11-20').textContent).toContain('Congresso');
    expect(cell('2026-11-21').textContent).not.toContain('Congresso');
  });

  it('"+N mais": limita a 3 por célula e abre o Popover com todos', async () => {
    setup();
    const day = cell('2026-11-10');
    expect(day.querySelectorAll(':scope > ul > li > .eds-agenda-event')).toHaveLength(2);
    const more = day.querySelector<HTMLButtonElement>('.eds-agenda-more') as HTMLButtonElement;
    expect(more.textContent).toBe('+2 mais');
    expect(more).toHaveAccessibleName('2 mais eventos em 10 de novembro de 2026, terça-feira');
    const pop = document.getElementById(more.getAttribute('popovertarget') ?? '') as HTMLElement;
    expect(pop).toHaveAttribute('popover');
    expect(pop).toHaveClass('eds-popover');
    expect(pop).toHaveAccessibleName('Eventos de 10 de novembro de 2026, terça-feira');
    expect(pop.querySelectorAll('.eds-agenda-event')).toHaveLength(4);
    more.click();
    await flush();
    expect(more).toHaveAttribute('aria-expanded', 'true');
  });

  it('data-eds-max-events muda o limite', () => {
    setup('data-eds-agenda-month="2026-11" data-eds-max-events="5"');
    expect(cell('2026-11-10').querySelector('.eds-agenda-more')).toBeNull();
    expect(cell('2026-11-10').querySelectorAll('.eds-agenda-event')).toHaveLength(4);
  });

  it('próximo, anterior e hoje trocam o mês, atualizam o título e emitem o evento', async () => {
    setup();
    const onChange = vi.fn();
    $('.eds-agenda').addEventListener('eds:agenda-month-change', onChange);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click($('[data-eds-agenda-next]'));
    expect(title()).toBe('Dezembro de 2026');
    expect(cell('2026-12-02').textContent).toContain('Fechamento');
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      year: 2026,
      month: 12,
      from: '2026-11-29',
      to: '2027-01-02',
    });
    await user.click($('[data-eds-agenda-prev]'));
    await user.click($('[data-eds-agenda-prev]'));
    expect(title()).toBe('Outubro de 2026');
    await user.click($('[data-eds-agenda-today]'));
    expect(title()).toBe('Novembro de 2026');
    expect($('.eds-agenda')).toHaveAttribute('data-eds-agenda-month', '2026-11');
    // Os botões têm nome acessível e o foco permanece no botão acionado.
    expect($('[data-eds-agenda-prev]')).toHaveAccessibleName('Mês anterior');
    expect($('[data-eds-agenda-next]')).toHaveAccessibleName('Próximo mês');
    expect(document.activeElement).toBe($('[data-eds-agenda-today]'));
  });

  it('teclado: Tab percorre os botões de navegação e depois os eventos', async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.tab();
    expect(document.activeElement).toBe($('[data-eds-agenda-today]'));
    await user.tab();
    expect(document.activeElement).toBe($('[data-eds-agenda-prev]'));
    await user.tab();
    expect(document.activeElement).toBe($('[data-eds-agenda-next]'));
    await user.tab();
    expect((document.activeElement as HTMLElement).textContent).toContain('Treinamento');
  });

  it('clique em evento emite eds:agenda-event-click', async () => {
    setup();
    const onClick = vi.fn();
    $('.eds-agenda').addEventListener('eds:agenda-event-click', onClick);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(cell('2026-11-10').querySelectorAll<HTMLElement>('.eds-agenda-event')[1]!);
    const detail = (onClick.mock.calls[0]?.[0] as CustomEvent).detail as Record<string, unknown>;
    expect(detail).toMatchObject({ id: 'e1', title: 'Reunião de equipe', date: '2026-11-10' });
  });

  it('semana começando na segunda e nomes pelo locale', () => {
    setLocale('en-US');
    setup('data-eds-agenda-month="2026-11" data-eds-week-start="1"');
    expect(title()).toBe('November 2026');
    expect($('thead th abbr').getAttribute('title')).toBe('Monday');
    // 1º de novembro (domingo) cai na última coluna da primeira semana, que começa em 26/10.
    expect($('tbody tr:first-child td').getAttribute('data-date')).toBe('2026-10-26');
  });

  it('textos configuráveis', () => {
    setMessages({ agendaMore: '+{count} more', dateToday: 'Today', agendaToday: 'Today!' });
    setup();
    expect($('.eds-agenda-more').textContent).toBe('+2 more');
    expect($('[data-eds-agenda-today]').textContent).toBe('Today');
    expect($('.eds-agenda-today').textContent).toBe('Today!');
  });

  it('fonte remota: busca o intervalo visível a cada mês, sem PageLoader', async () => {
    const fetchMock = vi.fn(async (...[url]: [string, RequestInit?]) =>
      url.includes('from=2026-11-01')
        ? new Response(JSON.stringify([{ title: 'Remoto', date: '2026-11-05' }]))
        : new Response('erro', { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    document.body.innerHTML =
      '<div class="eds-agenda" data-eds-agenda data-eds-agenda-month="2026-11" data-eds-source="/api?from={from}&to={to}"></div>';
    destroy = initAgenda(document);
    await flush();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api?from=2026-11-01&to=2026-12-05');
    expect((fetchMock.mock.calls[0]?.[1] as { edsLoader?: boolean }).edsLoader).toBe(false);
    expect(cell('2026-11-05').textContent).toContain('Remoto');
    expect($('.eds-agenda')).not.toHaveAttribute('aria-busy');
    $('[data-eds-agenda-next]').click();
    await flush();
    expect(cell('2026-12-02').textContent).not.toContain('Remoto');
  });

  it('JSON inválido não quebra: agenda vazia', () => {
    document.body.innerHTML =
      '<div data-eds-agenda data-eds-agenda-month="2026-11"><script type="application/json" data-eds-agenda-events>{x</script></div>';
    destroy = initAgenda(document);
    expect(document.querySelectorAll('.eds-agenda-event')).toHaveLength(0);
    expect(title()).toBe('Novembro de 2026');
  });

  it('grade escrita pelo servidor e sem dados: o JS não a reescreve, só avisa a navegação', async () => {
    document.body.innerHTML = `<section class="eds-agenda" data-eds-agenda data-eds-agenda-month="2026-11">
      <header class="eds-agenda-header"><h2 class="eds-agenda-title" aria-live="polite">Novembro de 2026</h2>
        <div class="eds-agenda-nav"><button type="button" data-eds-agenda-today>Hoje</button>
          <button type="button" aria-label="Mês anterior" data-eds-agenda-prev>&lt;</button>
          <button type="button" aria-label="Próximo mês" data-eds-agenda-next>&gt;</button></div></header>
      <table class="eds-agenda-grid"><caption class="eds-visually-hidden">Agenda</caption><thead></thead>
        <tbody><tr><td class="eds-agenda-day" id="servidor">servidor</td></tr></tbody></table></section>`;
    destroy = initAgenda(document);
    const onChange = vi.fn();
    $('.eds-agenda').addEventListener('eds:agenda-month-change', onChange);
    $('[data-eds-agenda-next]').click();
    expect(document.getElementById('servidor')?.textContent).toBe('servidor');
    expect(title()).toBe('Novembro de 2026');
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
      year: 2026,
      month: 12,
    });
  });

  it('destroy remove o que montou', () => {
    setup();
    destroy();
    expect(document.querySelector('table')).toBeNull();
    expect(document.querySelector('.eds-agenda-header')).toBeNull();
    expect(document.querySelector('.eds-agenda-empty')).toBeNull();
  });
});
