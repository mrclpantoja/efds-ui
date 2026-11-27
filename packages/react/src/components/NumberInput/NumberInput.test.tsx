import { createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field';
import { NumberInput } from './NumberInput';

afterEach(() => vi.useRealTimers());

const input = () => screen.getByRole('spinbutton') as HTMLInputElement;

describe('NumberInput', () => {
  it('renderiza o contrato: wrapper, botões fora do Tab, spinbutton e ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Field label="Quantidade">
        <NumberInput ref={ref} defaultValue={5} min={0} max={10} className="extra" />
      </Field>,
    );
    expect(ref.current).toBe(input());
    expect(screen.getByLabelText('Quantidade')).toBe(input());
    expect(input().closest('.eds-number')).toHaveClass('extra');
    expect(input()).toHaveClass('eds-input', 'eds-number-input');
    expect(input()).toHaveAttribute('aria-valuenow', '5');
    expect(input()).toHaveAttribute('aria-valuemin', '0');
    expect(input()).toHaveAttribute('aria-valuemax', '10');
    for (const name of ['Diminuir', 'Aumentar']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('tabindex', '-1');
    }
  });

  it('setas, PageUp/PageDown, Home/End e onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput
        aria-label="Qtd"
        defaultValue={5}
        min={0}
        max={100}
        onValueChange={onValueChange}
      />,
    );
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('6');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input()).toHaveValue('4');
    await user.keyboard('{PageUp}');
    expect(input()).toHaveValue('14');
    await user.keyboard('{End}');
    expect(input()).toHaveValue('100');
    await user.keyboard('{Home}');
    expect(input()).toHaveValue('0');
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    expect(onValueChange).toHaveBeenCalledWith(6);
  });

  it('os botões somam/subtraem e se desabilitam nos limites', async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="Qtd" defaultValue={5} min={4} max={6} />);
    await user.click(screen.getByRole('button', { name: 'Aumentar' }));
    expect(input()).toHaveValue('6');
    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Diminuir' }));
    await user.click(screen.getByRole('button', { name: 'Diminuir' }));
    expect(input()).toHaveValue('4');
    expect(screen.getByRole('button', { name: 'Diminuir' })).toBeDisabled();
  });

  it('o botão que se desabilita com o foco nele (limite) devolve o foco ao campo', () => {
    render(<NumberInput aria-label="Qtd" defaultValue={5} min={0} max={6} />);
    const more = screen.getByRole('button', { name: 'Aumentar' });
    more.focus();
    expect(document.activeElement).toBe(more);
    act(() => {
      more.click();
    });
    expect(more).toBeDisabled();
    expect(document.activeElement).toBe(input());
  });

  it('ativar o botão por teclado soma um passo', async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="Qtd" defaultValue={1} />);
    screen.getByRole('button', { name: 'Aumentar' }).focus();
    await user.keyboard('{Enter}');
    expect(input()).toHaveValue('2');
  });

  it('segurar o botão repete', () => {
    vi.useFakeTimers();
    render(<NumberInput aria-label="Qtd" defaultValue={0} max={100} />);
    const plus = screen.getByRole('button', { name: 'Aumentar' });
    act(() => {
      fireEvent.pointerDown(plus, { button: 0 });
    });
    expect(input()).toHaveValue('1');
    act(() => {
      vi.advanceTimersByTime(400 + 70 * 3);
    });
    expect(Number(input().value)).toBeGreaterThanOrEqual(4);
    fireEvent.pointerUp(plus);
    const stopped = input().value;
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(input().value).toBe(stopped);
  });

  it('fora da faixa é ajustado ao sair e anunciado', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput
        aria-label="Qtd"
        defaultValue={5}
        min={0}
        max={10}
        onValueChange={onValueChange}
      />,
    );
    await user.clear(input());
    await user.type(input(), '99');
    await user.tab();
    expect(input()).toHaveValue('10');
    expect(screen.getByRole('status')).toHaveTextContent('Valor ajustado para 10.');
    expect(onValueChange).toHaveBeenLastCalledWith(10);
  });

  it('só dígitos; vazio emite null', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="Qtd" defaultValue={5} min={0} onValueChange={onValueChange} />);
    await user.clear(input());
    await user.type(input(), '1x2');
    expect(input()).toHaveValue('12');
    await user.clear(input());
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input()).not.toHaveAttribute('aria-valuenow');
  });

  it('com casas decimais usa a máscara numero', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NumberInput
        aria-label="Valor"
        defaultValue={1.5}
        step={0.5}
        decimals={2}
        min={0}
        onValueChange={onValueChange}
      />,
    );
    expect(input()).toHaveValue('1,50');
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('2,00');
    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it('controlado, e unmask manda o valor limpo no hidden', () => {
    function Wrapper() {
      const [v, setV] = useState<number | null>(3);
      return (
        <NumberInput
          aria-label="Qtd"
          name="qtd"
          decimals={2}
          value={v}
          onValueChange={setV}
          unmask
        />
      );
    }
    render(<Wrapper />);
    expect(input()).toHaveValue('3,00');
    expect(document.querySelector<HTMLInputElement>('input[type="hidden"]')?.value).toBe('3.00');
  });

  it('readonly e disabled não mudam', async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="Qtd" defaultValue={5} readOnly />);
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    await user.click(screen.getByRole('button', { name: 'Aumentar' }));
    expect(input()).toHaveValue('5');
  });

  it('textos trocáveis e tamanho', () => {
    render(
      <NumberInput
        aria-label="Qty"
        size="lg"
        texts={{ increment: 'Increase', decrement: 'Decrease' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Increase' })).toBeInTheDocument();
    expect(input().closest('.eds-number')).toHaveClass('eds-number-lg');
  });
});
