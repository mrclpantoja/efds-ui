import { createRef, useState, type ComponentProps } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { installPopoverStyle } from '../../test-utils/dom-polyfills';
import { Field } from '../Field';
import { DatePicker } from './DatePicker';

beforeAll(() => {
  installPopoverStyle();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(props: Partial<ComponentProps<typeof DatePicker>> = {}) {
  const user = userEvent.setup();
  const utils = render(<DatePicker aria-label="Vencimento" {...props} />);
  const input = screen.getByRole('textbox', { name: 'Vencimento' }) as HTMLInputElement;
  const toggle = screen.getByRole('button', { name: /^Escolher data/ });
  return { user, input, toggle, ...utils };
}

const focusedDate = () => document.activeElement?.getAttribute('data-date');
const dialog = () => screen.getByRole('dialog', { name: 'Escolher data', hidden: true });

const INVALID = 'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).';

describe('DatePicker: markup e API', () => {
  it('emite o markup do contrato, ref no input, className e tamanho', () => {
    const ref = createRef<HTMLInputElement>();
    const { input, toggle, container } = setup({
      ref,
      className: 'extra',
      size: 'lg',
      name: 'vencimento',
      defaultValue: '2026-03-15',
    });
    expect(ref.current).toBe(input);
    expect(container.querySelector('.eds-datepicker')).toBeInTheDocument();
    expect(input).toHaveClass('eds-input', 'eds-input-lg', 'eds-datepicker-input', 'extra');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('maxlength', '10');
    expect(input).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveValue('15/03/2026');
    expect(toggle).toHaveClass('eds-datepicker-toggle');
    expect(toggle).toHaveAttribute('aria-haspopup', 'dialog');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const cal = dialog();
    expect(cal).toHaveClass('eds-calendar');
    expect(cal).toHaveAttribute('popover', 'manual');
    expect(toggle).toHaveAttribute('aria-controls', cal.id);
    expect(container.querySelector('input[type="hidden"][name="vencimento"]')).toHaveValue(
      '2026-03-15',
    );
    expect(container.querySelector('[role="status"]')).toBeEmptyDOMElement();
  });

  it('textos substituíveis', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Vencimento"
        texts={{ toggle: 'Pick date', dialog: 'Calendar', today: 'Today', close: 'Close' }}
        defaultValue="2026-03-15"
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Pick date/ }));
    expect(screen.getByRole('dialog', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('desabilitado: campo e botão desabilitados', () => {
    const { input, toggle } = setup({ disabled: true });
    expect(input).toBeDisabled();
    expect(toggle).toBeDisabled();
  });

  it('integra com Field: rótulo, obrigatório e erro', () => {
    render(
      <Field label="Vencimento" required error="Informe a data" controlId="venc">
        <DatePicker />
      </Field>,
    );
    const input = screen.getByLabelText(/Vencimento/);
    expect(input).toHaveAttribute('id', 'venc');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe a data');
  });
});

describe('DatePicker: abrir e fechar', () => {
  it('o botão abre, marca aria-expanded e põe o foco no dia escolhido', async () => {
    const { user, toggle } = setup({ defaultValue: '2026-03-15' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'março de 2026' })).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(focusedDate()).toBe('2026-03-15');
    const cell = document.activeElement as HTMLElement;
    expect(cell).toHaveAttribute('tabindex', '0');
    expect(cell).toHaveAttribute('aria-selected', 'true');
    expect(
      within(dialog())
        .getAllByRole('gridcell')
        .filter((c) => c.getAttribute('tabindex') === '0'),
    ).toHaveLength(1);
  });

  it('sem valor, o foco vai para hoje, que leva aria-current="date"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 18, 10, 0, 0));
    const user = userEvent.setup();
    render(<DatePicker aria-label="Vencimento" />);
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    expect(focusedDate()).toBe('2026-03-18');
    expect(document.activeElement).toHaveAttribute('aria-current', 'date');
  });

  it('sem valor, hoje fora de min/max: abre no dia mais próximo permitido', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 18));
    const user = userEvent.setup();
    render(<DatePicker aria-label="Vencimento" min="2026-04-10" max="2026-06-30" />);
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    expect(focusedDate()).toBe('2026-04-10');
  });

  it('Alt+↓ no campo abre o calendário', async () => {
    const { user, input } = setup({ defaultValue: '2026-03-15' });
    input.focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(screen.getByRole('button', { name: /^Escolher data/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(focusedDate()).toBe('2026-03-15');
  });

  it('Esc fecha sem mudar o valor, devolve o foco ao botão e não propaga', async () => {
    const outer = vi.fn();
    const user = userEvent.setup();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={outer}>
        <DatePicker aria-label="Vencimento" defaultValue="2026-03-15" />
      </div>,
    );
    const toggle = screen.getByRole('button', { name: /^Escolher data/ });
    await user.click(toggle);
    await user.keyboard('{ArrowRight}{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(screen.getByRole('textbox')).toHaveValue('15/03/2026');
    expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
  });

  it('Esc com o calendário fechado não é interceptado', async () => {
    const outer = vi.fn();
    const user = userEvent.setup();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={outer}>
        <DatePicker aria-label="Vencimento" />
      </div>,
    );
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{Escape}');
    expect(outer).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
  });

  it('clicar fora fecha', async () => {
    const { user, toggle } = setup({ defaultValue: '2026-03-15' });
    await user.click(toggle);
    await user.click(document.body);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicar de novo no botão fecha', async () => {
    const { user, toggle } = setup({ defaultValue: '2026-03-15' });
    await user.click(toggle);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('Tab circula dentro do diálogo (nav, selects, grade, rodapé)', async () => {
    const { user, toggle } = setup({ defaultValue: '2026-03-15' });
    await user.click(toggle);
    const cal = within(dialog());
    const order = [
      cal.getByRole('button', { name: 'Mês anterior' }),
      cal.getByRole('button', { name: 'Próximo mês' }),
      cal.getByRole('combobox', { name: 'Mês' }),
      cal.getByRole('combobox', { name: 'Ano' }),
      cal.getByRole('gridcell', { name: /^15 de março/ }),
      cal.getByRole('button', { name: 'Hoje' }),
      cal.getByRole('button', { name: 'Fechar' }),
    ];
    // do dia: Hoje, Fechar, e volta ao início
    await user.tab();
    expect(order[5]).toHaveFocus();
    await user.tab();
    expect(order[6]).toHaveFocus();
    await user.tab();
    expect(order[0]).toHaveFocus();
    await user.tab({ shift: true });
    expect(order[6]).toHaveFocus();
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(order[4]).toHaveFocus();
  });
});

describe('DatePicker: grade e teclado', () => {
  async function open(
    defaultValue = '2026-03-15',
    props: Partial<ComponentProps<typeof DatePicker>> = {},
  ) {
    const ctx = setup({ defaultValue, ...props });
    await ctx.user.click(ctx.toggle);
    return ctx;
  }

  it('nome acessível do dia: número visível primeiro, data completa e dia da semana', async () => {
    await open();
    expect(
      screen.getByRole('gridcell', { name: '15 de março de 2026, domingo' }),
    ).toHaveTextContent('15');
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('abbr', 'domingo');
  });

  it('só um dia na sequência de Tab (roving) e dias fora do mês são células vazias', async () => {
    await open();
    const cells = within(dialog()).getAllByRole('gridcell');
    expect(cells).toHaveLength(31);
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
  });

  it('←/→ movem um dia e atravessam o mês', async () => {
    const { user } = await open('2026-03-01');
    await user.keyboard('{ArrowLeft}');
    expect(focusedDate()).toBe('2026-02-28');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('fevereiro de 2026');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(focusedDate()).toBe('2026-03-02');
  });

  it('↑/↓ movem uma semana', async () => {
    const { user } = await open();
    await user.keyboard('{ArrowDown}');
    expect(focusedDate()).toBe('2026-03-22');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(focusedDate()).toBe('2026-03-08');
  });

  it('Home/End vão ao início (domingo) e ao fim (sábado) da semana', async () => {
    const { user } = await open('2026-03-18'); // quarta
    await user.keyboard('{Home}');
    expect(focusedDate()).toBe('2026-03-15');
    await user.keyboard('{End}');
    expect(focusedDate()).toBe('2026-03-21');
  });

  it('PageUp/PageDown mudam o mês e ajustam ao fim do mês', async () => {
    const { user } = await open('2026-03-31');
    await user.keyboard('{PageDown}');
    expect(focusedDate()).toBe('2026-04-30');
    await user.keyboard('{PageUp}{PageUp}');
    expect(focusedDate()).toBe('2026-02-28');
  });

  it('Shift+PageUp/PageDown mudam o ano mantendo o dia (ajustado ao fim do mês)', async () => {
    const { user } = await open('2024-02-29');
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(focusedDate()).toBe('2025-02-28');
    await user.keyboard('{Shift>}{PageUp}{PageUp}{/Shift}');
    expect(focusedDate()).toBe('2023-02-28');
  });

  it('o título (live polite) acompanha o mês', async () => {
    const { user } = await open();
    const title = screen.getByRole('heading', { level: 2 });
    await user.keyboard('{PageDown}');
    expect(title).toHaveTextContent('abril de 2026');
  });

  it('botões de mês anterior e próximo mudam o título e mantêm o foco no botão', async () => {
    const { user } = await open();
    const next = screen.getByRole('button', { name: 'Próximo mês' });
    await user.click(next);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('abril de 2026');
    expect(next).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('fevereiro de 2026');
  });

  it('selects de mês e ano mudam a grade', async () => {
    const { user } = await open();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mês' }), 'julho');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('julho de 2026');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ano' }), '2027');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('julho de 2027');
    expect(screen.getByRole('gridcell', { name: /^15 de julho de 2027/ })).toBeInTheDocument();
  });

  it('Enter escolhe, fecha, devolve o foco ao botão e atualiza campo, hidden e onValueChange', async () => {
    const onValueChange = vi.fn();
    const { user, input, toggle, container } = setup({
      defaultValue: '2026-03-15',
      name: 'venc',
      onValueChange,
    });
    await user.click(toggle);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(input).toHaveValue('16/03/2026');
    expect(container.querySelector('input[name="venc"]')).toHaveValue('2026-03-16');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    const [iso, date] = onValueChange.mock.calls[0] as [string, Date];
    expect(iso).toBe('2026-03-16');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(16);
    expect(date.getHours()).toBe(0);
    await waitFor(() =>
      expect(container.querySelector('[role="status"]')).toHaveTextContent(
        'Data selecionada: 16 de março de 2026, segunda-feira.',
      ),
    );
  });

  it('Espaço e clique também escolhem', async () => {
    const { user, input, toggle } = setup({ defaultValue: '2026-03-15' });
    await user.click(toggle);
    await user.keyboard('{ArrowDown} ');
    expect(input).toHaveValue('22/03/2026');
    await user.click(toggle);
    await user.click(screen.getByRole('gridcell', { name: /^3 de março/ }));
    expect(input).toHaveValue('03/03/2026');
    expect(toggle).toHaveFocus();
  });

  it('Hoje escolhe a data de hoje', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 18));
    const user = userEvent.setup();
    render(<DatePicker aria-label="Vencimento" defaultValue="2025-01-10" />);
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByRole('textbox')).toHaveValue('18/03/2026');
  });

  it('Fechar fecha sem mudar', async () => {
    const { user, toggle, input } = await open();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(input).toHaveValue('15/03/2026');
  });

  it('posiciona o popup por --_calendar-x/-y (e nada além disso)', async () => {
    await open();
    const cal = dialog();
    expect(cal.style.getPropertyValue('--_calendar-x')).toBe('0px');
    expect(cal.style.getPropertyValue('--_calendar-y')).toBe('0px');
  });
});

describe('DatePicker: bloqueios', () => {
  it('min/max: dias fora ficam aria-disabled, recebem foco, mas não são escolhidos', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <DatePicker
        aria-label="Vencimento"
        defaultValue="2026-03-15"
        min="2026-03-10"
        max="2026-03-20"
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    expect(screen.getByRole('gridcell', { name: /^9 de março/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('gridcell', { name: /^10 de março/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    // o foco não escapa de min/max
    await user.keyboard('{Home}{Home}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(focusedDate()).toBe('2026-03-10');
    await user.click(screen.getByRole('gridcell', { name: /^9 de março/ }));
    expect(onValueChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(container.querySelector('[role="status"]')).toHaveTextContent(
        '09/03/2026: data indisponível.',
      ),
    );
  });

  it('isDateDisabled e disableWeekends bloqueiam; dia bloqueado recebe foco mas Enter não escolhe', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Vencimento"
        defaultValue="2026-03-13"
        disableWeekends
        isDateDisabled={(d) => d.getMonth() === 2 && d.getDate() === 17}
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    expect(screen.getByRole('gridcell', { name: /^14 de março/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('gridcell', { name: /^17 de março/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.keyboard('{ArrowRight}');
    expect(focusedDate()).toBe('2026-03-14');
    await user.keyboard('{Enter}');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Escolher data/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('navegação entre meses desabilitada além de min/max', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Vencimento" defaultValue="2026-03-15" min="2026-03-01" />);
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    const prev = screen.getByRole('button', { name: 'Mês anterior' });
    expect(prev).toHaveAttribute('aria-disabled', 'true');
    await user.click(prev);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('março de 2026');
  });
});

describe('DatePicker: campo de texto', () => {
  it('máscara dd/mm/aaaa com barras automáticas, só dígitos', async () => {
    const { user, input } = setup();
    await user.type(input, '1a5032026');
    expect(input).toHaveValue('15/03/2026');
    await user.clear(input);
    await user.type(input, '1503');
    expect(input).toHaveValue('15/03');
  });

  it('data completa e válida atualiza o hidden e dispara onValueChange com Date local', async () => {
    const onValueChange = vi.fn();
    const { user, input, container } = setup({ name: 'v', onValueChange });
    await user.type(input, '15032026');
    expect(container.querySelector('input[name="v"]')).toHaveValue('2026-03-15');
    expect(onValueChange).toHaveBeenLastCalledWith('2026-03-15', expect.any(Date));
    const date = onValueChange.mock.lastCall?.[1] as Date;
    expect(date.getDate()).toBe(15);
    await user.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(null, null);
    expect(container.querySelector('input[name="v"]')).toHaveValue('');
  });

  it('aceita colar dd/mm/aaaa e aaaa-mm-dd', async () => {
    const { user, input } = setup();
    input.focus();
    await user.paste('15/03/2026');
    expect(input).toHaveValue('15/03/2026');
    await user.clear(input);
    await user.paste('2026-03-16');
    expect(input).toHaveValue('16/03/2026');
  });

  it('colar data com espaços em volta não é cortada pelo maxlength', async () => {
    const onValueChange = vi.fn();
    const { user, input } = setup({ onValueChange });
    input.focus();
    await user.paste('  15/03/2026  ');
    expect(input).toHaveValue('15/03/2026');
    expect(onValueChange).toHaveBeenLastCalledWith('2026-03-15', expect.any(Date));
    await user.clear(input);
    await user.paste(' 2026-03-16 ');
    expect(input).toHaveValue('16/03/2026');
  });

  it('data inexistente: erro só depois do blur; mensagem nativa; hidden vazio', async () => {
    const { user, input, container } = setup({ name: 'v' });
    await user.type(input, '31022026');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input.validationMessage).toBe(INVALID);
    await user.tab();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('input[name="v"]')).toHaveValue('');
    await waitFor(() =>
      expect(container.querySelector('[role="status"]')).toHaveTextContent('Data inválida'),
    );
    await user.clear(input);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input.validationMessage).toBe('');
  });

  it('incompleta também é inválida', async () => {
    const { user, input } = setup();
    await user.type(input, '1503');
    await user.tab();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('fora de min/max: mensagem com os limites', async () => {
    const { user, input } = setup({ min: '2026-01-01', max: '2026-12-31' });
    await user.type(input, '15032027');
    await user.tab();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.validationMessage).toBe('Escolha uma data entre 01/01/2026 e 31/12/2026.');
  });

  it('data bloqueada: "{data}: data indisponível."', async () => {
    const { user, input } = setup({ disableWeekends: true });
    await user.type(input, '14032026'); // sábado
    await user.tab();
    expect(input.validationMessage).toBe('14/03/2026: data indisponível.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('mensagens substituíveis por texts', async () => {
    const { user, input } = setup({ texts: { invalid: 'Invalid date.' } });
    await user.type(input, '99');
    await user.tab();
    expect(input.validationMessage).toBe('Invalid date.');
  });

  it('required fica no campo de texto', () => {
    const { input } = setup({ required: true });
    expect(input).toBeRequired();
  });
});

describe('DatePicker: controlado', () => {
  it('value ISO controla campo e calendário; mudança externa atualiza o texto', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [v, setV] = useState<string | null>('2026-03-15');
      return (
        <>
          <DatePicker aria-label="Vencimento" value={v} onValueChange={(iso) => setV(iso)} />
          <button type="button" onClick={() => setV('2027-01-02')}>
            definir
          </button>
          <button type="button" onClick={() => setV(null)}>
            limpar
          </button>
        </>
      );
    }
    render(<Harness />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('15/03/2026');
    await user.click(screen.getByRole('button', { name: 'definir' }));
    expect(input).toHaveValue('02/01/2027');
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    expect(focusedDate()).toBe('2027-01-02');
    await user.keyboard('{ArrowRight}{Enter}');
    expect(input).toHaveValue('03/01/2027');
    await user.click(screen.getByRole('button', { name: 'limpar' }));
    expect(input).toHaveValue('');
  });

  it('não controlado respeita defaultValue e muda sozinho', async () => {
    const { user, input, toggle } = setup({ defaultValue: '2026-03-15' });
    await user.click(toggle);
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('15/03/2026');
    await user.click(toggle);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(input).toHaveValue('16/03/2026');
  });
});

describe('DatePicker: auditoria UX', () => {
  it('erro próprio visível (.eds-error) associado por aria-describedby, após o blur', async () => {
    const { user, input, container } = setup({ 'aria-describedby': 'ajuda' });
    await user.type(input, '31022026');
    expect(container.querySelector('.eds-error')).toBeNull();
    await user.tab();
    const error = container.querySelector('.eds-error') as HTMLElement;
    expect(error).toHaveTextContent(INVALID);
    expect(error.previousElementSibling).toHaveClass('eds-datepicker');
    expect(input.getAttribute('aria-describedby')).toBe(`ajuda ${error.id}`);
  });

  it('erro do Field prevalece: não duplica a mensagem', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Field label="Vencimento" error="Campo com problema">
        <DatePicker />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    await user.type(input, '99');
    await user.tab();
    expect(container.querySelectorAll('.eds-error')).toHaveLength(1);
    expect(input).toHaveAccessibleDescription('Campo com problema');
  });

  it('máscara preserva o cursor ao editar no meio', async () => {
    const { user, input } = setup();
    // 7 dígitos: o campo ainda não atingiu o maxlength (10) e aceita a inserção no meio.
    await user.type(input, '1003202');
    await user.type(input, '5', { initialSelectionStart: 1, initialSelectionEnd: 1 });
    expect(input).toHaveValue('15/00/3202');
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
  });

  it('aria-modal no diálogo', () => {
    setup();
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-modal', 'true');
  });

  it('nome do botão traz o valor atual e é configurável', () => {
    const { toggle, rerender } = setup({ defaultValue: '2026-03-15' });
    expect(toggle).toHaveAccessibleName('Escolher data. Atual: 15/03/2026');
    rerender(
      <DatePicker
        aria-label="Vencimento"
        defaultValue="2026-03-15"
        texts={{ toggleWithValue: (v) => `Alterar (${v})` }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Alterar (15/03/2026)' })).toBeInTheDocument();
  });

  it('sem valor, o botão tem o nome simples', () => {
    const { toggle } = setup();
    expect(toggle).toHaveAccessibleName('Escolher data');
  });

  it('ano de 2 dígitos: a mensagem pede 4 dígitos', async () => {
    const { user, input } = setup();
    await user.type(input, '150326');
    await user.tab();
    expect(input.validationMessage).toContain('ano em 4 dígitos');
  });

  it('id explícito diferente do Field mantém o nome pelo rótulo', () => {
    render(
      <Field label="Vencimento" controlId="a">
        <DatePicker id="b" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Vencimento' });
    expect(input).toHaveAttribute('id', 'b');
  });

  it('mensagem de bloqueio inclui a data', async () => {
    const { user, input } = setup({ disableWeekends: true });
    await user.type(input, '15032026');
    await user.tab();
    expect(input.validationMessage).toBe('15/03/2026: data indisponível.');
  });
});
