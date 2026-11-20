import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { installPopoverStyle } from '../../test-utils/dom-polyfills';
import { formatTime, maskTime, parseTime } from '../../internal/time-shared';
import { Field } from '../Field';
import { TimePicker } from '.';

beforeAll(() => {
  installPopoverStyle();
});

const options = () =>
  screen.queryAllByRole('option', { hidden: true }).map((o) => o.getAttribute('data-value'));

describe('funções de horário (as mesmas do behavior)', () => {
  it('parse, format e máscara', () => {
    expect(parseTime('08:30')).toBe(510);
    expect(parseTime('24:00')).toBeNull();
    expect(formatTime(510)).toBe('08:30');
    expect(maskTime('9')).toBe('09');
    expect(maskTime('143')).toBe('14:3');
    expect(maskTime('1430')).toBe('14:30');
    expect(maskTime('14:')).toBe('14:');
    expect(maskTime('2h30')).toBe('02:30');
    expect(maskTime('abc')).toBe('');
  });
});

describe('TimePicker', () => {
  it('é um combobox com lista e botão nomeados', () => {
    render(<TimePicker aria-label="Início" />);
    const input = screen.getByRole('combobox', { name: 'Início' });
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('placeholder', 'hh:mm');
    expect(screen.getByRole('listbox', { hidden: true })).toHaveAccessibleName('Horários');
    expect(screen.getByRole('button', { name: 'Escolher horário', hidden: true })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('máscara, hidden HH:MM e onChange só com horário completo e válido', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <TimePicker aria-label="Início" name="inicio" onChange={onChange} />,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, '1430');
    expect(input).toHaveValue('14:30');
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"]')?.value).toBe('14:30');
    expect(onChange).toHaveBeenLastCalledWith('14:30');
    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith('');
    await user.type(input, '143');
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"]')?.value).toBe('');
  });

  it('erro visível só depois de sair do campo, ligado por aria-describedby', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TimePicker aria-label="Início" />
        <button type="button">fora</button>
      </>,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, '2500');
    expect(document.querySelector('.eds-error')).toBeNull();
    await user.click(screen.getByText('fora'));
    const error = document.querySelector('.eds-error') as HTMLElement;
    expect(error).toHaveTextContent('Hora inválida. Use hh:mm, de 00:00 a 23:59.');
    expect(input).toBeInvalid();
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('min e max filtram a lista e rejeitam o digitado', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TimePicker aria-label="Início" step={60} min="08:00" max="12:00" />
        <button type="button">fora</button>
      </>,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(options()).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00']);
    await user.keyboard('{Escape}');
    await user.type(input, '1500');
    await user.click(screen.getByText('fora'));
    expect(document.querySelector('.eds-error')).toHaveTextContent(
      'Escolha um horário entre 08:00 e 12:00.',
    );
  });

  it('passo padrão de 30 min gera 48 horários', () => {
    render(<TimePicker aria-label="Início" />);
    expect(options()).toHaveLength(48);
    expect(options().slice(0, 3)).toEqual(['00:00', '00:30', '01:00']);
  });

  it('teclado: seta abre no próximo horário, setas movem, Enter escolhe, Esc fecha a lista', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [v, setV] = useState('');
      return <TimePicker aria-label="Início" step={15} value={v} onChange={setV} />;
    }
    render(<Harness />);
    const input = screen.getByRole('combobox');
    await user.type(input, '0910');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const active = () => document.getElementById(input.getAttribute('aria-activedescendant') ?? '');
    expect(active()).toHaveAttribute('data-value', '09:15');
    expect(active()).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveValue('09:30');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveFocus();
    expect(await screen.findByText('Horário selecionado: 09:30.')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('clique na opção escolhe sem tirar o foco; o botão leva o horário no nome', async () => {
    const user = userEvent.setup();
    render(<TimePicker aria-label="Início" step={60} />);
    const input = screen.getByRole('combobox');
    await user.click(screen.getByRole('button', { name: 'Escolher horário', hidden: true }));
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('option', { name: '13:00', hidden: true }));
    expect(input).toHaveValue('13:00');
    expect(input).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Escolher horário. Atual: 13:00', hidden: true }),
    ).toBeInTheDocument();
  });

  it('controlado: o valor de fora aparece no campo', () => {
    const { rerender } = render(<TimePicker aria-label="Início" value="07:05" />);
    expect(screen.getByRole('combobox')).toHaveValue('07:05');
    rerender(<TimePicker aria-label="Início" value="18:45" />);
    expect(screen.getByRole('combobox')).toHaveValue('18:45');
  });

  it('readonly não abre a lista; dentro do Field herda o rótulo; textos configuráveis', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TimePicker aria-label="Início" readOnly defaultValue="10:00" />);
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    unmount();
    render(
      <Field label="Horário">
        <TimePicker texts={{ list: 'Times' }} />
      </Field>,
    );
    expect(screen.getByRole('combobox', { name: 'Horário' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { hidden: true })).toHaveAccessibleName('Times');
  });
});
