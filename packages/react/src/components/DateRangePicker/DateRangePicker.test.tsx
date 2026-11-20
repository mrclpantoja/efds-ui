import { createRef, useState, type ComponentProps } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { installPopoverStyle } from '../../test-utils/dom-polyfills';
import { Field } from '../Field';
import { DateRangePicker, type DateRangeValue } from './DateRangePicker';

beforeAll(() => {
  installPopoverStyle();
});

function setup(props: Partial<ComponentProps<typeof DateRangePicker>> = {}) {
  const user = userEvent.setup();
  const utils = render(<DateRangePicker aria-label="Período" {...props} />);
  const start = screen.getByRole('textbox', { name: 'Data inicial' }) as HTMLInputElement;
  const end = screen.getByRole('textbox', { name: 'Data final' }) as HTMLInputElement;
  const toggle = screen.getByRole('button', { name: /^Escolher período/ });
  const status = utils.container.querySelector('[role="status"]') as HTMLElement;
  return { user, start, end, toggle, status, ...utils };
}

const focusedDate = () => document.activeElement?.getAttribute('data-date');
const day = (n: number) => screen.getByRole('gridcell', { name: new RegExp(`^${n} de março`) });

const INVALID = 'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).';

describe('DateRangePicker: markup e API', () => {
  it('emite o markup do contrato', () => {
    const ref = createRef<HTMLDivElement>();
    const { container, start, end, toggle } = setup({
      ref,
      className: 'extra',
      nameStart: 'inicio',
      nameEnd: 'fim',
      defaultValue: { start: '2026-03-03', end: '2026-03-15' },
    });
    const group = screen.getByRole('group', { name: 'Período' });
    expect(ref.current).toBe(group);
    expect(group).toHaveClass('eds-datepicker', 'eds-daterange', 'extra');
    expect(start).toHaveClass('eds-input', 'eds-datepicker-input');
    expect(start).toHaveAttribute('maxlength', '10');
    expect(end).toHaveAttribute('maxlength', '10');
    expect(start).toHaveValue('03/03/2026');
    expect(end).toHaveValue('15/03/2026');
    expect(container.querySelector('.eds-daterange-sep')).toHaveAttribute('aria-hidden', 'true');
    expect(toggle).toHaveAttribute('aria-haspopup', 'dialog');
    expect(toggle.previousElementSibling).toBe(end);
    expect(container.querySelector('input[name="inicio"]')).toHaveValue('2026-03-03');
    expect(container.querySelector('input[name="fim"]')).toHaveValue('2026-03-15');
    expect(container.querySelector('.eds-calendar')).toHaveAttribute('popover', 'manual');
  });

  it('dentro de Field o rótulo nomeia o grupo', () => {
    render(
      <Field label="Período" required>
        <DateRangePicker />
      </Field>,
    );
    expect(screen.getByRole('group', { name: 'Período' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Data inicial' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Data final' })).toBeRequired();
  });

  it('textos substituíveis', () => {
    render(
      <DateRangePicker
        aria-label="Range"
        texts={{ startLabel: 'From', endLabel: 'To', separator: 'to', toggle: 'Pick range' }}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'From' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'To' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick range' })).toBeInTheDocument();
    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('desabilitado desabilita campos e botão', () => {
    const { start, end, toggle } = setup({ disabled: true });
    expect(start).toBeDisabled();
    expect(end).toBeDisabled();
    expect(toggle).toBeDisabled();
  });
});

describe('DateRangePicker: escolha de período', () => {
  it('1º Enter = início, 2º = fim; fecha, atualiza campos, hidden e onChange', async () => {
    const onChange = vi.fn();
    const { user, start, end, toggle, status, container } = setup({
      defaultValue: { start: '2026-03-01', end: null },
      nameStart: 'i',
      nameEnd: 'f',
      onChange,
    });
    await user.click(toggle);
    expect(focusedDate()).toBe('2026-03-01');
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}'); // 03/03
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(status).toHaveTextContent('Início: 03/03/2026. Escolha a data final.'),
    );
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}'); // 17/03
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(start).toHaveValue('03/03/2026');
    expect(end).toHaveValue('17/03/2026');
    expect(onChange).toHaveBeenCalledWith({ start: '2026-03-03', end: '2026-03-17' });
    expect(container.querySelector('input[name="i"]')).toHaveValue('2026-03-03');
    expect(container.querySelector('input[name="f"]')).toHaveValue('2026-03-17');
    await waitFor(() => expect(status).toHaveTextContent('Período: 03/03/2026 a 17/03/2026.'));
  });

  it('segundo dia anterior ao início vira o novo início', async () => {
    const { user, toggle, end, status } = setup({
      defaultValue: { start: '2026-03-10', end: null },
    });
    await user.click(toggle);
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowLeft}{ArrowLeft}{Enter}'); // 08/03 < 10/03
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(status).toHaveTextContent('Início: 08/03/2026. Escolha a data final.'),
    );
    await user.keyboard('{ArrowRight}{Enter}');
    expect(end).toHaveValue('09/03/2026');
  });

  it('marca o período: aria-selected em todos, data-range start/middle/end, preview sem aria-selected', async () => {
    const { user, toggle } = setup({ defaultValue: { start: '2026-03-03', end: '2026-03-06' } });
    await user.click(toggle);
    expect(day(3)).toHaveAttribute('data-range', 'start');
    expect(day(4)).toHaveAttribute('data-range', 'middle');
    expect(day(5)).toHaveAttribute('data-range', 'middle');
    expect(day(6)).toHaveAttribute('data-range', 'end');
    for (const n of [3, 4, 5, 6]) expect(day(n)).toHaveAttribute('aria-selected', 'true');
    expect(day(7)).not.toHaveAttribute('aria-selected');
    expect(day(3)).toHaveAccessibleName(/início do período/);
    expect(day(6)).toHaveAccessibleName(/fim do período/);

    // com o início escolhido, o foco mostra a prévia (sem aria-selected)
    await user.keyboard('{Enter}'); // foco no dia 3 (início do período)
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(day(3)).toHaveAttribute('data-range', 'single');
    expect(day(4)).toHaveAttribute('data-range-preview');
    expect(day(5)).toHaveAttribute('data-range-preview');
    expect(day(4)).not.toHaveAttribute('aria-selected');
    expect(day(6)).not.toHaveAttribute('data-range-preview');
  });

  it('início = fim vira "single"', async () => {
    const { user, toggle } = setup({ defaultValue: { start: '2026-03-05', end: '2026-03-05' } });
    await user.click(toggle);
    expect(day(5)).toHaveAttribute('data-range', 'single');
  });

  it('maxDays: dias além do limite ficam indisponíveis depois do início', async () => {
    const { user, toggle, end, status } = setup({
      maxDays: 5,
      defaultValue: { start: '2026-03-01', end: null },
    });
    await user.click(toggle);
    await user.keyboard('{Enter}');
    expect(day(5)).not.toHaveAttribute('aria-disabled');
    expect(day(6)).toHaveAttribute('aria-disabled', 'true');
    await user.click(day(6));
    await waitFor(() => expect(status).toHaveTextContent('06/03/2026: data indisponível.'));
    expect(end).toHaveValue('');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('bloqueadas não podem ser início/fim, mas ficam no meio', async () => {
    const { user, toggle, start, end } = setup({
      defaultValue: { start: '2026-03-12', end: null },
      isDateDisabled: (d) => d.getMonth() === 2 && d.getDate() === 14,
    });
    await user.click(toggle);
    expect(focusedDate()).toBe('2026-03-12');
    await user.keyboard('{Enter}{ArrowRight}{ArrowRight}{Enter}'); // 14: bloqueado
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowRight}{Enter}'); // 15
    expect(start).toHaveValue('12/03/2026');
    expect(end).toHaveValue('15/03/2026');
  });

  it('Esc e Tab circulam como no DatePicker; Esc devolve o foco ao botão', async () => {
    const { user, toggle } = setup();
    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('reabrir descarta o início pendente', async () => {
    const { user, toggle, start } = setup({ defaultValue: { start: '2026-03-01', end: null } });
    await user.click(toggle);
    await user.keyboard('{ArrowRight}{Enter}{Escape}');
    expect(start).toHaveValue('01/03/2026');
    await user.click(toggle);
    expect(within(screen.getByRole('dialog')).getAllByRole('gridcell')[0]).toBeDefined();
    expect(day(1)).toHaveAttribute('data-range', 'single');
    expect(day(2)).not.toHaveAttribute('aria-selected');
  });
});

describe('DateRangePicker: campos de texto', () => {
  it('máscara e valor nos dois campos', async () => {
    const onChange = vi.fn();
    const { user, start, end } = setup({ onChange });
    await user.type(start, '03032026');
    await user.type(end, '15032026');
    expect(start).toHaveValue('03/03/2026');
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-03-03', end: '2026-03-15' });
  });

  it('final antes da inicial: mensagem no campo final', async () => {
    const { user, start, end } = setup({
      defaultValue: { start: '2026-03-10', end: null },
    });
    await user.type(end, '05032026');
    await user.tab();
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(end.validationMessage).toBe('A data final deve ser igual ou posterior à inicial.');
    expect(start).not.toHaveAttribute('aria-invalid');
  });

  it('maxDays: período maior que o máximo é inválido no campo final', async () => {
    const { user, end } = setup({
      defaultValue: { start: '2026-03-01', end: null },
      maxDays: 7,
    });
    await user.type(end, '20032026');
    await user.tab();
    expect(end.validationMessage).toBe('O período pode ter no máximo 7 dias.');
  });

  it('min/max e data inválida no início', async () => {
    const { user, start } = setup({ min: '2026-01-01', max: '2026-12-31' });
    await user.type(start, '01012025');
    await user.tab();
    expect(start.validationMessage).toBe('Escolha uma data entre 01/01/2026 e 31/12/2026.');
    await user.clear(start);
    await user.type(start, '3102');
    await user.tab();
    expect(start.validationMessage).toBe(INVALID);
  });

  it('data final inválida deixa o hidden vazio', async () => {
    const { user, end, container } = setup({
      defaultValue: { start: '2026-03-10', end: null },
      nameEnd: 'fim',
    });
    await user.type(end, '05032026');
    expect(container.querySelector('input[name="fim"]')).toHaveValue('');
  });
});

describe('DateRangePicker: controlado', () => {
  it('value controla campos e reflete mudanças externas', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [v, setV] = useState<DateRangeValue>({ start: '2026-03-03', end: '2026-03-05' });
      return (
        <>
          <DateRangePicker aria-label="Período" value={v} onChange={setV} />
          <button type="button" onClick={() => setV({ start: null, end: null })}>
            limpar
          </button>
        </>
      );
    }
    render(<Harness />);
    const start = screen.getByRole('textbox', { name: 'Data inicial' });
    const end = screen.getByRole('textbox', { name: 'Data final' });
    await user.click(screen.getByRole('button', { name: /^Escolher período/ }));
    await user.keyboard('{ArrowRight}{Enter}{ArrowRight}{Enter}'); // 4 -> 5? início 04, fim 05
    expect(start).toHaveValue('04/03/2026');
    expect(end).toHaveValue('05/03/2026');
    await user.click(screen.getByRole('button', { name: 'limpar' }));
    expect(start).toHaveValue('');
    expect(end).toHaveValue('');
  });
});

describe('DateRangePicker: auditoria UX', () => {
  it('período incompleto: erro no campo que falta, só depois de sair do grupo', async () => {
    const { user, start, end, container } = setup();
    await user.type(start, '03032026');
    await user.tab(); // campo final: ainda dentro do grupo
    expect(end).not.toHaveAttribute('aria-invalid');
    expect(end.validationMessage).toBe('Informe também a data final.');
    await user.tab(); // botão
    await user.tab(); // sai do grupo
    expect(end).toHaveAttribute('aria-invalid', 'true');
    const error = container.querySelector('.eds-error') as HTMLElement;
    expect(error).toHaveTextContent('Informe também a data final.');
    expect(end.getAttribute('aria-describedby')).toContain(error.id);
    expect(start).not.toHaveAttribute('aria-invalid');
  });

  it('só o fim: pede a data inicial', async () => {
    const { user, start, end } = setup();
    await user.type(end, '03032026');
    await user.tab();
    await user.tab();
    expect(start.validationMessage).toBe('Informe também a data inicial.');
    expect(start).toHaveAttribute('aria-invalid', 'true');
  });

  it('Alt+↓ no campo final abre no mês da data final; no inicial, no da inicial', async () => {
    const { user, start, end } = setup({
      defaultValue: { start: '2026-03-03', end: '2026-05-20' },
    });
    end.focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(focusedDate()).toBe('2026-05-20');
    await user.keyboard('{Escape}');
    start.focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(focusedDate()).toBe('2026-03-03');
  });

  it('prévia limitada a maxDays', async () => {
    const { user, toggle } = setup({
      maxDays: 3,
      defaultValue: { start: '2026-03-01', end: null },
    });
    await user.click(toggle);
    await user.keyboard('{Enter}{ArrowDown}'); // início 01, foco 08
    expect(day(2)).toHaveAttribute('data-range-preview');
    expect(day(3)).toHaveAttribute('data-range-preview');
    expect(day(4)).not.toHaveAttribute('data-range-preview');
    expect(day(4)).toHaveAttribute('aria-disabled', 'true');
  });

  it('entre ponteiro e foco vale o último a mudar', async () => {
    const { user, toggle } = setup({ defaultValue: { start: '2026-03-01', end: null } });
    await user.click(toggle);
    await user.keyboard('{Enter}{ArrowRight}{ArrowRight}'); // foco em 03
    expect(day(3)).toHaveAttribute('data-range-preview');
    await user.hover(day(6));
    expect(day(6)).toHaveAttribute('data-range-preview');
    await user.keyboard('{ArrowRight}'); // foco em 04
    expect(day(6)).not.toHaveAttribute('data-range-preview');
    expect(day(4)).toHaveAttribute('data-range-preview');
  });

  it('nome do botão com período, aria-modal e mensagem de maxDays', async () => {
    const { user, toggle, end } = setup({
      maxDays: 7,
      defaultValue: { start: '2026-03-03', end: '2026-03-05' },
    });
    expect(toggle).toHaveAccessibleName('Escolher período. Atual: 03/03/2026 a 05/03/2026');
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-modal', 'true');
    await user.clear(end);
    await user.type(end, '20032026');
    expect(end.validationMessage).toBe('O período pode ter no máximo 7 dias.');
  });

  it('erro do Field prevalece (sem mensagem duplicada)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Field label="Período" error="Corrija o período">
        <DateRangePicker />
      </Field>,
    );
    await user.type(screen.getByRole('textbox', { name: 'Data inicial' }), '99');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(container.querySelectorAll('.eds-error')).toHaveLength(1);
  });
});
