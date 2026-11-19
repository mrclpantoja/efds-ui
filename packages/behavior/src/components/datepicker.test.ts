import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMessages, setMessages } from '../core/config';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initDatepicker } from './datepicker';

const single = (attrs = '', extra = '') => `
<form id="form">
  <div class="eds-field">
    <label class="eds-label" for="venc">Vencimento</label>
    <div class="eds-datepicker" data-eds-datepicker ${attrs}>
      <input id="venc" class="eds-input eds-datepicker-input" type="text" inputmode="numeric"
        placeholder="dd/mm/aaaa" autocomplete="off" ${extra} />
      <button type="button" class="eds-datepicker-toggle" id="abrir" aria-label="Escolher data"
        aria-haspopup="dialog" aria-expanded="false" aria-controls="venc-cal">c</button>
      <input type="hidden" name="vencimento" id="oculto" value="" />
      <div class="eds-calendar" id="venc-cal" role="dialog" aria-label="Escolher data" popover="manual"></div>
      <span class="eds-visually-hidden" role="status"></span>
    </div>
  </div>
  <button type="button" id="fora">fora</button>
</form>`;

const periodo = (attrs = '', extra = '') => `
<div class="eds-datepicker eds-daterange" data-eds-daterange role="group" aria-label="Período" ${attrs}>
  <input id="ini" class="eds-input eds-datepicker-input" aria-label="Data inicial" placeholder="dd/mm/aaaa" ${extra} />
  <input id="fim" class="eds-input eds-datepicker-input" aria-label="Data final" placeholder="dd/mm/aaaa" ${extra} />
  <button type="button" class="eds-datepicker-toggle" id="abrir" aria-label="Escolher período">c</button>
  <input type="hidden" name="inicio" id="h-ini" />
  <input type="hidden" name="fim" id="h-fim" />
  <div class="eds-calendar" role="dialog" aria-label="Escolher período" popover="manual"></div>
  <span class="eds-visually-hidden" role="status"></span>
</div>
<button type="button" id="fora">fora</button>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = () => $<HTMLInputElement>('venc');
const hidden = () => $<HTMLInputElement>('oculto');
const toggle = () => $<HTMLButtonElement>('abrir');
const calendar = () => document.querySelector<HTMLElement>('.eds-calendar') as HTMLElement;
const status = () => document.querySelector('[role="status"]') as HTMLElement;
const title = () => document.querySelector('.eds-calendar-title') as HTMLElement;
const day = (iso: string) =>
  document.querySelector<HTMLElement>(`[data-date="${iso}"]`) as HTMLElement;
const active = () => document.activeElement as HTMLElement;
const activeDate = () => active().getAttribute('data-date');

let restore: () => void;
let destroy: () => void;

beforeEach(() => {
  restore = installDomPolyfills();
  // Só o relógio de data: 18/03/2026 (quarta-feira).
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 2, 18, 10, 0, 0) });
});
afterEach(() => {
  destroy?.();
  vi.useRealTimers();
  resetMessages();
  restore();
  document.body.innerHTML = '';
});

const mount = (html: string) => {
  document.body.innerHTML = html;
  destroy = initDatepicker(document);
};

describe('datepicker: campo de texto', () => {
  beforeEach(() => mount(single()));

  it('máscara dd/mm/aaaa e hidden ISO ao confirmar', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:date-change', onChange);
    await user.type(input(), '15032026');
    expect(input()).toHaveValue('15/03/2026');
    await user.tab();
    expect(hidden()).toHaveValue('2026-03-15');
    expect(onChange).toHaveBeenCalledTimes(1);
    const detail = (onChange.mock.calls[0]?.[0] as CustomEvent).detail as {
      value: string;
      date: Date;
    };
    expect(detail.value).toBe('2026-03-15');
    expect(detail.date.getFullYear()).toBe(2026);
    expect(detail.date.getMonth()).toBe(2);
    expect(detail.date.getDate()).toBe(15);
    document.removeEventListener('eds:date-change', onChange);
  });

  it('ignora o que não é dígito e limita a 8', async () => {
    const user = userEvent.setup();
    await user.type(input(), '1a5/0b3/20269999');
    expect(input()).toHaveValue('15/03/2026');
  });

  it('cola dd/mm/aaaa e ISO', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.paste('2026-03-15');
    expect(input()).toHaveValue('15/03/2026');
    await user.clear(input());
    await user.paste('01/12/2026');
    expect(input()).toHaveValue('01/12/2026');
    await user.tab();
    expect(hidden()).toHaveValue('2026-12-01');
  });

  it('data inexistente: aria-invalid, mensagem e hidden vazio', async () => {
    const user = userEvent.setup();
    await user.type(input(), '31022026');
    await user.tab();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input().validationMessage).toBe(
      'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
    );
    expect(input().checkValidity()).toBe(false);
    expect(hidden()).toHaveValue('');
    // Corrigir limpa o erro.
    await user.clear(input());
    await user.type(input(), '28022026');
    expect(input().checkValidity()).toBe(true);
    await user.tab();
    expect(input()).not.toHaveAttribute('aria-invalid');
    expect(hidden()).toHaveValue('2026-02-28');
  });

  it('aceita 29/02 só em ano bissexto', async () => {
    const user = userEvent.setup();
    await user.type(input(), '29022025');
    await user.tab();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    await user.clear(input());
    await user.type(input(), '29022024');
    await user.tab();
    expect(input()).not.toHaveAttribute('aria-invalid');
    expect(hidden()).toHaveValue('2024-02-29');
  });

  it('texto parcial já deixa o campo inválido para o formulário', async () => {
    const user = userEvent.setup();
    await user.type(input(), '1503');
    expect(input().checkValidity()).toBe(false);
    expect(hidden()).toHaveValue('');
  });

  it('campo vazio é válido, e inválido se required', async () => {
    expect(input().checkValidity()).toBe(true);
    input().required = true;
    expect(input().checkValidity()).toBe(false);
  });
});

describe('datepicker: min, max e bloqueios', () => {
  it('fora de min/max', async () => {
    mount(single('data-eds-min="2026-01-01" data-eds-max="2026-12-31"'));
    const user = userEvent.setup();
    await user.type(input(), '31122027');
    await user.tab();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input().validationMessage).toBe('Escolha uma data entre 01/01/2026 e 31/12/2026.');
    expect(hidden()).toHaveValue('');
  });

  it('só min e só max têm mensagem própria', async () => {
    mount(single('data-eds-min="2026-03-01"'));
    const user = userEvent.setup();
    await user.type(input(), '01022026');
    await user.tab();
    expect(input().validationMessage).toBe('Escolha uma data a partir de 01/03/2026.');
    destroy();
    mount(single('data-eds-max="2026-03-01"'));
    await userEvent.setup().type(input(), '02032026');
    await userEvent.setup().tab();
    expect(input().validationMessage).toBe('Escolha uma data até 01/03/2026.');
  });

  it('datas bloqueadas e fins de semana: "Data indisponível."', async () => {
    mount(single('data-eds-disabled-dates="2026-04-21,2026-05-01" data-eds-disable-weekends'));
    const user = userEvent.setup();
    await user.type(input(), '21042026');
    await user.tab();
    expect(input().validationMessage).toBe('Data indisponível.');
    await user.clear(input());
    await user.type(input(), '21032026'); // sábado
    await user.tab();
    expect(input().validationMessage).toBe('Data indisponível.');
    await user.clear(input());
    await user.type(input(), '23032026'); // segunda
    await user.tab();
    expect(input().checkValidity()).toBe(true);
    expect(hidden()).toHaveValue('2026-03-23');
  });

  it('dias fora do intervalo, bloqueados e fins de semana ficam aria-disabled', async () => {
    mount(
      single(
        'data-eds-min="2026-03-05" data-eds-max="2026-03-25" data-eds-disabled-dates="2026-03-10" data-eds-disable-weekends',
      ),
    );
    await userEvent.setup().click(toggle());
    expect(day('2026-03-04')).toHaveAttribute('aria-disabled', 'true');
    expect(day('2026-03-26')).toHaveAttribute('aria-disabled', 'true');
    expect(day('2026-03-10')).toHaveAttribute('aria-disabled', 'true');
    expect(day('2026-03-07')).toHaveAttribute('aria-disabled', 'true'); // sábado
    expect(day('2026-03-11')).not.toHaveAttribute('aria-disabled');
  });
});

describe('datepicker: calendário', () => {
  beforeEach(() => mount(single()));

  it('abre pelo botão: aria-expanded, popover, foco em hoje e título', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(calendar().matches(':popover-open')).toBe(true);
    expect(title()).toHaveTextContent('março de 2026');
    expect(title()).toHaveAttribute('aria-live', 'polite');
    expect(activeDate()).toBe('2026-03-18');
    expect(active()).toHaveAttribute('tabindex', '0');
    expect(document.querySelectorAll('.eds-calendar-day[tabindex="0"]')).toHaveLength(1);
  });

  it('monta a estrutura do contrato', async () => {
    await userEvent.setup().click(toggle());
    expect(calendar().querySelector('.eds-calendar-header .eds-calendar-nav')).not.toBeNull();
    expect(calendar().querySelectorAll('.eds-calendar-nav')).toHaveLength(2);
    expect(calendar().querySelectorAll('.eds-calendar-jump select')).toHaveLength(2);
    expect(calendar().querySelector('table.eds-calendar-grid')).toHaveAttribute('role', 'grid');
    expect(calendar().querySelector('table')).toHaveAttribute(
      'aria-labelledby',
      title().getAttribute('id'),
    );
    const heads = calendar().querySelectorAll('th.eds-calendar-weekday');
    expect(heads).toHaveLength(7);
    expect(heads[0]).toHaveTextContent('D');
    expect(heads[0]).toHaveAttribute('abbr', 'domingo');
    expect(calendar().querySelectorAll('.eds-calendar-footer button')).toHaveLength(2);
    // março de 2026 começa num domingo e tem 31 dias.
    expect(calendar().querySelectorAll('.eds-calendar-day')).toHaveLength(31);
    expect(day('2026-03-01').closest('tr')?.firstElementChild).toBe(day('2026-03-01'));
  });

  it('nome acessível do dia: número primeiro, data completa; hoje com aria-current', async () => {
    await userEvent.setup().click(toggle());
    expect(day('2026-03-15')).toHaveAttribute('aria-label', '15 de março de 2026, domingo');
    expect(day('2026-03-15')).toHaveTextContent(/^15$/);
    expect(day('2026-03-18')).toHaveAttribute('aria-current', 'date');
    expect(day('2026-03-17')).not.toHaveAttribute('aria-current');
  });

  it('abre com o dia escolhido e marca aria-selected', async () => {
    destroy();
    mount(single());
    hidden().value = '2026-03-05';
    destroy();
    destroy = initDatepicker(document);
    expect(input()).toHaveValue('05/03/2026');
    await userEvent.setup().click(toggle());
    expect(activeDate()).toBe('2026-03-05');
    expect(day('2026-03-05')).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
  });

  it('setas movem o foco (roving tabindex) e atravessam o mês', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{ArrowRight}');
    expect(activeDate()).toBe('2026-03-19');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(activeDate()).toBe('2026-03-17');
    await user.keyboard('{ArrowDown}');
    expect(activeDate()).toBe('2026-03-24');
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(activeDate()).toBe('2026-03-03');
    expect(document.querySelectorAll('.eds-calendar-day[tabindex="0"]')).toHaveLength(1);
    // Passa para o mês anterior ao subir da primeira semana.
    await user.keyboard('{ArrowUp}');
    expect(activeDate()).toBe('2026-02-24');
    expect(title()).toHaveTextContent('fevereiro de 2026');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(activeDate()).toBe('2026-03-24');
    expect(title()).toHaveTextContent('março de 2026');
  });

  it('Home e End: início e fim da semana (domingo a sábado)', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{Home}');
    expect(activeDate()).toBe('2026-03-15');
    await user.keyboard('{End}');
    expect(activeDate()).toBe('2026-03-21');
  });

  it('PageUp/PageDown: mês, ajustando ao fim do mês; Shift: ano', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{ArrowRight}'.repeat(13)); // 31/03
    expect(activeDate()).toBe('2026-03-31');
    await user.keyboard('{PageDown}');
    expect(activeDate()).toBe('2026-04-30');
    await user.keyboard('{PageUp}{PageUp}');
    expect(activeDate()).toBe('2026-02-28');
    expect(title()).toHaveTextContent('fevereiro de 2026');
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(activeDate()).toBe('2027-02-28');
    await user.keyboard('{Shift>}{PageUp}{PageUp}{/Shift}');
    expect(activeDate()).toBe('2025-02-28');
  });

  it('29/02 de ano bissexto cai em 28/02 ao mudar de ano', async () => {
    destroy();
    mount(single());
    const user = userEvent.setup();
    await user.type(input(), '29022024');
    await user.click(toggle());
    expect(activeDate()).toBe('2024-02-29');
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(activeDate()).toBe('2025-02-28');
    await user.keyboard('{Shift>}{PageUp}{/Shift}');
    expect(activeDate()).toBe('2024-02-28');
    // O mês bissexto tem 29 dias; o de ano comum, 28.
    expect(calendar().querySelectorAll('.eds-calendar-day')).toHaveLength(29);
  });

  it('virada de ano pelas setas', async () => {
    destroy();
    mount(single());
    const user = userEvent.setup();
    await user.type(input(), '31122026');
    await user.click(toggle());
    await user.keyboard('{ArrowRight}');
    expect(activeDate()).toBe('2027-01-01');
    expect(title()).toHaveTextContent('janeiro de 2027');
    await user.keyboard('{ArrowLeft}');
    expect(activeDate()).toBe('2026-12-31');
  });

  it('Enter escolhe, fecha e devolve o foco ao botão', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:date-change', onChange);
    await user.click(toggle());
    await user.keyboard('{ArrowRight}{Enter}');
    expect(input()).toHaveValue('19/03/2026');
    expect(hidden()).toHaveValue('2026-03-19');
    expect(calendar().matches(':popover-open')).toBe(false);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(active()).toBe(toggle());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(status()).toHaveTextContent('Data selecionada: 19 de março de 2026, quinta-feira.');
    document.removeEventListener('eds:date-change', onChange);
  });

  it('Espaço escolhe; clique no dia escolhe', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard(' ');
    expect(hidden()).toHaveValue('2026-03-18');
    await user.click(toggle());
    await user.click(day('2026-03-02'));
    expect(hidden()).toHaveValue('2026-03-02');
    expect(calendar().matches(':popover-open')).toBe(false);
  });

  it('Esc fecha sem mudar nada e devolve o foco ao botão', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{ArrowRight}{Escape}');
    expect(calendar().matches(':popover-open')).toBe(false);
    expect(active()).toBe(toggle());
    expect(hidden()).toHaveValue('');
    expect(input()).toHaveValue('');
  });

  it('Tab circula dentro do diálogo (nos dois sentidos)', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    const ordered = [
      ...Array.from(document.querySelectorAll('.eds-calendar-nav')),
      ...Array.from(document.querySelectorAll('.eds-calendar-jump select')),
      document.querySelector('.eds-calendar-day[tabindex="0"]'),
      ...Array.from(document.querySelectorAll('.eds-calendar-footer button')),
    ];
    const visited: Element[] = [active()];
    for (let i = 0; i < ordered.length + 1; i += 1) {
      await user.tab();
      visited.push(active());
    }
    // Do dia ativo até o último botão, e de lá de volta ao primeiro (nav) sem sair do diálogo.
    expect(visited.every((item) => calendar().contains(item))).toBe(true);
    const lastIndex = visited.lastIndexOf(ordered[ordered.length - 1] as Element);
    expect(visited[lastIndex + 1]).toBe(ordered[0]);
    (ordered[0] as HTMLElement).focus();
    await user.tab({ shift: true });
    expect(active()).toBe(ordered[ordered.length - 1]);
  });

  it('Alt+ArrowDown no campo abre o calendário', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(calendar().matches(':popover-open')).toBe(true);
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(activeDate()).toBe('2026-03-18');
  });

  it('clicar fora fecha sem roubar o foco', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click($('fora'));
    expect(calendar().matches(':popover-open')).toBe(false);
    expect(active()).toBe($('fora'));
  });

  it('clicar no botão com o calendário aberto fecha', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(toggle());
    expect(calendar().matches(':popover-open')).toBe(false);
  });

  it('botão Fechar fecha e devolve o foco', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    const buttons = calendar().querySelectorAll<HTMLElement>('.eds-calendar-footer button');
    await user.click(buttons[1] as HTMLElement);
    expect(calendar().matches(':popover-open')).toBe(false);
    expect(active()).toBe(toggle());
  });

  it('Hoje escolhe a data de hoje', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(
      calendar().querySelector('.eds-calendar-footer button:first-child') as HTMLElement,
    );
    expect(hidden()).toHaveValue('2026-03-18');
  });

  it('nav e selects trocam o mês e atualizam o título', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    const [prev, next] = Array.from(
      document.querySelectorAll<HTMLElement>('.eds-calendar-nav'),
    ) as [HTMLElement, HTMLElement];
    await user.click(next);
    expect(title()).toHaveTextContent('abril de 2026');
    await user.click(prev);
    await user.click(prev);
    expect(title()).toHaveTextContent('fevereiro de 2026');
    const [month, year] = Array.from(
      document.querySelectorAll<HTMLSelectElement>('.eds-calendar-jump select'),
    ) as [HTMLSelectElement, HTMLSelectElement];
    expect(month).toHaveAttribute('aria-label', 'Mês');
    expect(year).toHaveAttribute('aria-label', 'Ano');
    await user.selectOptions(month, '11');
    expect(title()).toHaveTextContent('dezembro de 2026');
    await user.selectOptions(year, '2030');
    expect(title()).toHaveTextContent('dezembro de 2030');
    // O foco da grade acompanha o mês (um único tabindex 0).
    expect(document.querySelectorAll('.eds-calendar-day[tabindex="0"]')).toHaveLength(1);
  });

  it('dias indisponíveis recebem foco, mas não são escolhidos (e anuncia)', async () => {
    destroy();
    mount(single('data-eds-disabled-dates="2026-03-19"'));
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{ArrowRight}');
    expect(activeDate()).toBe('2026-03-19');
    await user.keyboard('{Enter}');
    expect(calendar().matches(':popover-open')).toBe(true);
    expect(hidden()).toHaveValue('');
    expect(status()).toHaveTextContent('19 de março de 2026, quinta-feira: data indisponível.');
    await user.click(day('2026-03-19'));
    expect(hidden()).toHaveValue('');
  });

  it('com min/max: foco inicial no mais próximo, setas não saem do intervalo, nav desabilitada', async () => {
    destroy();
    mount(single('data-eds-min="2026-04-10" data-eds-max="2026-05-20"'));
    const user = userEvent.setup();
    await user.click(toggle());
    expect(activeDate()).toBe('2026-04-10');
    await user.keyboard('{ArrowLeft}');
    expect(activeDate()).toBe('2026-04-10');
    await user.keyboard('{PageDown}{PageDown}{PageDown}');
    expect(activeDate()).toBe('2026-05-20');
    expect(title()).toHaveTextContent('maio de 2026');
    const [prev, next] = Array.from(
      document.querySelectorAll<HTMLElement>('.eds-calendar-nav'),
    ) as [HTMLElement, HTMLElement];
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(prev).not.toHaveAttribute('aria-disabled');
    await user.click(next);
    expect(title()).toHaveTextContent('maio de 2026');
    const years = Array.from(
      document.querySelectorAll<HTMLOptionElement>('.eds-calendar-jump select:last-child option'),
    ).map((o) => o.value);
    expect(years).toEqual(['2026']);
  });

  it('Esc dentro de um <dialog> modal fecha só o calendário', async () => {
    destroy();
    document.body.innerHTML = `<dialog id="dlg">${single()}</dialog>`;
    destroy = initDatepicker(document);
    const dialog = $<HTMLDialogElement>('dlg');
    dialog.showModal();
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{Escape}');
    expect(calendar().matches(':popover-open')).toBe(false);
    expect(dialog.open).toBe(true);
    expect(active()).toBe(toggle());
    // Sem o calendário aberto, o Esc segue para o modal.
    await user.keyboard('{Escape}');
    expect(dialog.open).toBe(false);
  });

  it('posiciona com --_calendar-x/-y e sobe quando falta espaço embaixo', async () => {
    const rect = (top: number, bottom: number, height = 0) =>
      ({ top, bottom, left: 40, right: 240, width: 200, height, x: 40, y: top }) as DOMRect;
    const root = document.querySelector('[data-eds-datepicker]') as HTMLElement;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(100, 140));
    vi.spyOn(calendar(), 'getBoundingClientRect').mockReturnValue(rect(0, 0, 320));
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    const user = userEvent.setup();
    await user.click(toggle());
    expect(calendar().style.getPropertyValue('--_calendar-x')).toBe('40px');
    expect(calendar().style.getPropertyValue('--_calendar-y')).toBe('140px');
    expect(calendar()).not.toHaveAttribute('data-placement');
    await user.keyboard('{Escape}');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(600, 640));
    await user.click(toggle());
    expect(calendar().style.getPropertyValue('--_calendar-y')).toBe('600px');
    expect(calendar()).toHaveAttribute('data-placement', 'top');
  });

  it('digitar com o calendário aberto leva a grade ao mês digitado', async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(input());
    await user.type(input(), '10112026');
    expect(title()).toHaveTextContent('novembro de 2026');
  });

  it('textos configuráveis', async () => {
    setMessages({ dateLocale: 'en-US', datePrevMonth: 'Previous month', dateToday: 'Today' });
    await userEvent.setup().click(toggle());
    expect(title()).toHaveTextContent('March 2026');
    expect(document.querySelector('.eds-calendar-nav')).toHaveAttribute(
      'aria-label',
      'Previous month',
    );
    expect(calendar().querySelector('.eds-calendar-footer button')).toHaveTextContent('Today');
  });
});

describe('datepicker: ciclo de vida', () => {
  it('desabilitar o campo desabilita o botão; destroy limpa a validade', async () => {
    mount(single());
    input().disabled = true;
    await flush();
    expect(toggle()).toBeDisabled();
    input().disabled = false;
    await flush();
    expect(toggle()).not.toBeDisabled();
    await userEvent.setup().type(input(), '99');
    expect(input().checkValidity()).toBe(false);
    destroy();
    expect(input().checkValidity()).toBe(true);
  });

  it('um único init liga cada picker uma vez', async () => {
    mount(single());
    const second = initDatepicker(document);
    await userEvent.setup().click(toggle());
    expect(calendar().querySelectorAll('table')).toHaveLength(1);
    second();
  });
});

describe('daterange: período', () => {
  const ini = () => $<HTMLInputElement>('ini');
  const fim = () => $<HTMLInputElement>('fim');
  const hIni = () => $<HTMLInputElement>('h-ini');
  const hFim = () => $<HTMLInputElement>('h-fim');

  it('1º clique = início, 2º = fim; fecha, hidden ISO, evento e status', async () => {
    mount(periodo());
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:daterange-change', onChange);
    await user.click(toggle());
    await user.click(day('2026-03-03'));
    expect(calendar().matches(':popover-open')).toBe(true);
    expect(status()).toHaveTextContent('Início: 03/03/2026. Escolha a data final.');
    expect(day('2026-03-03')).toHaveAttribute('aria-selected', 'true');
    await user.click(day('2026-03-15'));
    expect(calendar().matches(':popover-open')).toBe(false);
    expect(ini()).toHaveValue('03/03/2026');
    expect(fim()).toHaveValue('15/03/2026');
    expect(hIni()).toHaveValue('2026-03-03');
    expect(hFim()).toHaveValue('2026-03-15');
    expect(status()).toHaveTextContent('Período: 03/03/2026 a 15/03/2026.');
    expect(active()).toBe(toggle());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      start: '2026-03-03',
      end: '2026-03-15',
    });
    document.removeEventListener('eds:daterange-change', onChange);
  });

  it('fim antes do início vira o novo início', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-10'));
    await user.click(day('2026-03-04'));
    expect(calendar().matches(':popover-open')).toBe(true);
    expect(status()).toHaveTextContent('Início: 04/03/2026. Escolha a data final.');
    expect(day('2026-03-10')).not.toHaveAttribute('aria-selected');
    await user.click(day('2026-03-06'));
    expect(hIni()).toHaveValue('2026-03-04');
    expect(hFim()).toHaveValue('2026-03-06');
  });

  it('mesmo dia vale como período de um dia', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-10'));
    expect(day('2026-03-10')).toHaveAttribute('data-range', 'single');
    await user.click(day('2026-03-10'));
    expect(hIni()).toHaveValue('2026-03-10');
    expect(hFim()).toHaveValue('2026-03-10');
  });

  it('teclado: Enter marca início e fim; prévia e faixa por data-range', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{ArrowLeft}{ArrowLeft}{Enter}'); // 16/03
    expect(activeDate()).toBe('2026-03-16');
    expect(calendar().matches(':popover-open')).toBe(true);
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(day('2026-03-16')).toHaveAttribute('data-range', 'start');
    expect(day('2026-03-17')).toHaveAttribute('data-range-preview');
    expect(day('2026-03-19')).toHaveAttribute('data-range-preview');
    expect(day('2026-03-20')).not.toHaveAttribute('data-range-preview');
    await user.keyboard('{Enter}');
    expect(hIni()).toHaveValue('2026-03-16');
    expect(hFim()).toHaveValue('2026-03-19');
    // Reabrindo: início, meio e fim marcados.
    await user.click(toggle());
    expect(day('2026-03-16')).toHaveAttribute('data-range', 'start');
    expect(day('2026-03-17')).toHaveAttribute('data-range', 'middle');
    expect(day('2026-03-18')).toHaveAttribute('data-range', 'middle');
    expect(day('2026-03-19')).toHaveAttribute('data-range', 'end');
    for (const iso of ['2026-03-16', '2026-03-17', '2026-03-19']) {
      expect(day(iso)).toHaveAttribute('aria-selected', 'true');
    }
    expect(day('2026-03-20')).not.toHaveAttribute('aria-selected');
    expect(day('2026-03-17')).not.toHaveAttribute('data-range-preview');
    expect(activeDate()).toBe('2026-03-16');
  });

  it('o período pode atravessar meses (um mês por vez)', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-30'));
    await user.keyboard('{PageDown}');
    expect(title()).toHaveTextContent('abril de 2026');
    await user.keyboard('{Enter}');
    expect(hIni()).toHaveValue('2026-03-30');
    expect(hFim()).toHaveValue('2026-04-30');
  });

  it('Esc com o início já escolhido descarta e mantém o período anterior', async () => {
    mount(periodo());
    ini().value = '01/03/2026';
    fim().value = '05/03/2026';
    destroy();
    destroy = initDatepicker(document);
    expect(hFim()).toHaveValue('2026-03-05');
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-20'));
    await user.keyboard('{Escape}');
    expect(hIni()).toHaveValue('2026-03-01');
    expect(hFim()).toHaveValue('2026-03-05');
    // Reaberto, volta a pedir o início.
    await user.click(toggle());
    await user.click(day('2026-03-22'));
    expect(status()).toHaveTextContent('Início: 22/03/2026. Escolha a data final.');
  });

  it('bloqueadas não são início nem fim, mas podem ficar no meio', async () => {
    mount(periodo('data-eds-disabled-dates="2026-03-10"'));
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-10'));
    expect(status()).toHaveTextContent('data indisponível');
    expect(hIni()).toHaveValue('');
    await user.click(day('2026-03-09'));
    await user.click(day('2026-03-10'));
    expect(calendar().matches(':popover-open')).toBe(true);
    await user.click(day('2026-03-12'));
    expect(hIni()).toHaveValue('2026-03-09');
    expect(hFim()).toHaveValue('2026-03-12');
    expect(ini().checkValidity()).toBe(true);
    expect(fim().checkValidity()).toBe(true);
  });

  it('data-eds-max-days: dias além do limite ficam indisponíveis e avisam', async () => {
    mount(periodo('data-eds-max-days="5"'));
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-10'));
    expect(day('2026-03-14')).not.toHaveAttribute('aria-disabled');
    expect(day('2026-03-15')).toHaveAttribute('aria-disabled', 'true');
    expect(day('2026-03-05')).not.toHaveAttribute('aria-disabled');
    await user.click(day('2026-03-15'));
    expect(status()).toHaveTextContent('O período pode ter no máximo 5 dias.');
    expect(calendar().matches(':popover-open')).toBe(true);
    await user.click(day('2026-03-14'));
    expect(hFim()).toHaveValue('2026-03-14');
  });

  it('máscara e validação dos campos de texto', async () => {
    mount(periodo('data-eds-max-days="3"'));
    const user = userEvent.setup();
    await user.type(ini(), '10032026');
    await user.type(fim(), '05032026');
    await user.tab();
    expect(ini()).toHaveValue('10/03/2026');
    expect(fim()).toHaveAttribute('aria-invalid', 'true');
    expect(fim().validationMessage).toBe('A data final deve ser igual ou posterior à inicial.');
    expect(hFim()).toHaveValue('');
    await user.clear(fim());
    await user.type(fim(), '20032026');
    await user.tab();
    expect(fim().validationMessage).toBe('O período pode ter no máximo 3 dias.');
    await user.clear(fim());
    await user.type(fim(), '12032026');
    await user.tab();
    expect(fim()).not.toHaveAttribute('aria-invalid');
    expect(hIni()).toHaveValue('2026-03-10');
    expect(hFim()).toHaveValue('2026-03-12');
  });

  it('período incompleto pede o outro campo (se não for required)', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.type(ini(), '10032026');
    await user.tab();
    expect(fim().validationMessage).toBe('Informe também a data final.');
    expect(hIni()).toHaveValue('2026-03-10');
    await user.type(fim(), '11032026');
    await user.tab();
    expect(fim().checkValidity()).toBe(true);
  });

  it('min/max e bloqueios valem para os campos de texto', async () => {
    mount(periodo('data-eds-min="2026-03-01" data-eds-max="2026-03-31"'));
    const user = userEvent.setup();
    await user.type(ini(), '01022026');
    await user.tab();
    expect(ini().validationMessage).toBe('Escolha uma data entre 01/03/2026 e 31/03/2026.');
  });

  it('Alt+↓ abre; abrir pelo campo final mostra o mês do fim', async () => {
    mount(periodo());
    const user = userEvent.setup();
    ini().value = '01/03/2026';
    fim().value = '10/05/2026';
    destroy();
    destroy = initDatepicker(document);
    fim().focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(calendar().matches(':popover-open')).toBe(true);
    expect(title()).toHaveTextContent('maio de 2026');
    expect(activeDate()).toBe('2026-05-10');
  });
});

describe('datepicker: auditoria UX', () => {
  const ini = () => $<HTMLInputElement>('ini');
  const fim = () => $<HTMLInputElement>('fim');

  it('1. erro visível (p.eds-error) associado por aria-describedby, anunciado e removido ao corrigir', async () => {
    mount(single('', 'aria-describedby="venc-h"'));
    const user = userEvent.setup();
    await user.type(input(), '31022026');
    await user.tab();
    const error = document.getElementById('venc-err') as HTMLElement;
    expect(error).toHaveClass('eds-error');
    expect(error).toHaveTextContent(
      'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
    );
    expect(error.previousElementSibling).toBe(document.querySelector('.eds-datepicker'));
    expect(input()).toHaveAttribute('aria-describedby', 'venc-h venc-err');
    expect(status()).toHaveTextContent(
      'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
    );
    // Mesmo erro de novo (blur repetido): um só elemento.
    input().focus();
    await user.tab();
    expect(document.querySelectorAll('.eds-error')).toHaveLength(1);
    await user.clear(input());
    await user.type(input(), '28022026');
    await user.tab();
    expect(document.getElementById('venc-err')).toBeNull();
    expect(input()).toHaveAttribute('aria-describedby', 'venc-h');
    expect(input()).not.toHaveAttribute('aria-invalid');
  });

  it('1. período: o erro vai ao campo afetado', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.type(ini(), '10032026');
    await user.type(fim(), '05032026');
    await user.tab();
    const error = document.getElementById('fim-err') as HTMLElement;
    expect(error).toHaveTextContent('A data final deve ser igual ou posterior à inicial.');
    expect(fim()).toHaveAttribute('aria-describedby', 'fim-err');
    expect(ini()).not.toHaveAttribute('aria-describedby');
    destroy();
    expect(document.getElementById('fim-err')).toBeNull();
  });

  it('2. anos: hoje -100/+50, ou min/max; inclui o ano da visão se estiver fora', async () => {
    mount(single());
    const user = userEvent.setup();
    await user.click(toggle());
    const years = () =>
      Array.from(
        document.querySelectorAll<HTMLOptionElement>('.eds-calendar-jump select:last-child option'),
      ).map((o) => Number(o.value));
    expect(years()[0]).toBe(1926);
    expect(years()[years().length - 1]).toBe(2076);
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    const first = document.querySelector('.eds-calendar-jump select:last-child option');
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(document.querySelector('.eds-calendar-jump select:last-child option')).toBe(first);
    destroy();
    mount(single());
    hidden().value = '1900-05-05';
    destroy();
    destroy = initDatepicker(document);
    await user.click(toggle());
    expect(years()[0]).toBe(1900);
    expect(years().filter((y) => y === 1900)).toHaveLength(1);
  });

  it('3. período: início e fim com sufixo no nome acessível', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-10'));
    expect(day('2026-03-10')).toHaveAttribute(
      'aria-label',
      '10 de março de 2026, terça-feira, início do período',
    );
    await user.click(day('2026-03-12'));
    await user.click(toggle());
    expect(day('2026-03-10').getAttribute('aria-label')).toMatch(/, início do período$/);
    expect(day('2026-03-12').getAttribute('aria-label')).toMatch(/, fim do período$/);
    expect(day('2026-03-11').getAttribute('aria-label')).toBe('11 de março de 2026, quarta-feira');
  });

  it('5. Hoje indisponível: anuncia e leva o foco ao dia de hoje', async () => {
    mount(single('data-eds-disabled-dates="2026-03-18"'));
    const user = userEvent.setup();
    await user.click(toggle());
    await user.keyboard('{ArrowRight}');
    await user.click(
      calendar().querySelector('.eds-calendar-footer button:first-child') as HTMLElement,
    );
    expect(status()).toHaveTextContent('18 de março de 2026, quarta-feira: data indisponível.');
    expect(activeDate()).toBe('2026-03-18');
    expect(hidden()).toHaveValue('');
    expect(calendar().matches(':popover-open')).toBe(true);
  });

  it('6. aria-modal no diálogo do calendário', () => {
    mount(single());
    expect(calendar()).toHaveAttribute('aria-modal', 'true');
  });

  it('7. nome do botão traz o valor atual (neutro, configurável)', async () => {
    mount(single());
    expect(toggle()).toHaveAttribute('aria-label', 'Escolher data');
    const user = userEvent.setup();
    await user.type(input(), '15032026');
    await user.tab();
    expect(toggle()).toHaveAttribute('aria-label', 'Escolher data. Atual: 15/03/2026');
    await user.clear(input());
    await user.tab();
    expect(toggle()).toHaveAttribute('aria-label', 'Escolher data');
    expect(calendar()).toHaveAttribute('aria-label', 'Escolher data');
    destroy();
    setMessages({ dateCurrent: '{label} ({value})' });
    mount(single());
    hidden().value = '2026-03-15';
    destroy();
    destroy = initDatepicker(document);
    expect(toggle()).toHaveAttribute('aria-label', 'Escolher data (15/03/2026)');
  });

  it('7. período: "Atual: início a fim"', async () => {
    mount(periodo());
    const user = userEvent.setup();
    await user.click(toggle());
    await user.click(day('2026-03-03'));
    await user.click(day('2026-03-15'));
    expect(toggle()).toHaveAttribute(
      'aria-label',
      'Escolher período. Atual: 03/03/2026 a 15/03/2026',
    );
  });

  it('8. ano de 2 dígitos tem mensagem própria', async () => {
    mount(single());
    const user = userEvent.setup();
    await user.type(input(), '150326');
    await user.tab();
    expect(input().validationMessage).toBe(
      'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
    );
    expect(document.getElementById('venc-err')).toHaveTextContent('ano em 4 dígitos');
  });

  it('9. readOnly desabilita o botão do calendário', async () => {
    mount(single('', 'readonly'));
    expect(toggle()).toBeDisabled();
    input().readOnly = false;
    await flush();
    expect(toggle()).not.toBeDisabled();
    input().readOnly = true;
    await flush();
    expect(toggle()).toBeDisabled();
  });
});
