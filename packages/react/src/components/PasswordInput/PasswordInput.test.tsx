import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field';
import { PasswordInput } from './PasswordInput';

afterEach(() => vi.useRealTimers());

describe('PasswordInput', () => {
  it('renderiza o grupo, repassa ref e className e liga ao Field', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Field label="Senha" helper="Mínimo de 8 caracteres.">
        <PasswordInput ref={ref} className="extra" autoComplete="new-password" />
      </Field>,
    );
    const input = screen.getByLabelText('Senha');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveClass('eds-input', 'extra');
    expect(input.closest('.eds-input-group')).not.toBeNull();
    expect(input).toHaveAccessibleDescription('Mínimo de 8 caracteres.');
  });

  it('o botão alterna o tipo e aria-pressed, com nome fixo, e mantém o foco', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);
    const input = screen.getByLabelText('Senha');
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(toggle).toHaveClass('eds-input-group-button');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('o toggle por teclado mantém o foco no botão', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
    toggle.focus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveFocus();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
  });

  it('strength: nível, texto visível e ligação por aria-describedby', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" strength />);
    const input = screen.getByLabelText('Senha');
    const meter = document.querySelector('.eds-password-strength')!;
    expect(meter).toHaveAttribute('data-level', '0');
    expect(meter).toHaveTextContent('Força: não avaliada');
    expect(input.getAttribute('aria-describedby')).toContain(meter.id);
    await user.type(input, 'abc');
    expect(meter).toHaveAttribute('data-level', '1');
    expect(meter).toHaveTextContent('Força: fraca');
    await user.clear(input);
    await user.type(input, 'Cavalo-Azul-77!');
    expect(meter).toHaveAttribute('data-level', '4');
    expect(meter).toHaveTextContent('Força: forte');
  });

  it('onStrengthChange só quando o nível muda', async () => {
    const user = userEvent.setup();
    const onStrengthChange = vi.fn();
    render(<PasswordInput aria-label="Senha" strength onStrengthChange={onStrengthChange} />);
    await user.type(screen.getByLabelText('Senha'), 'ab');
    expect(onStrengthChange).toHaveBeenCalledTimes(1);
    expect(onStrengthChange).toHaveBeenCalledWith(1);
  });

  it('rules: cada regra mostra atendida ou pendente em texto', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" rules />);
    const items = () => Array.from(document.querySelectorAll('.eds-password-rules li'));
    expect(items()).toHaveLength(4);
    expect(items()[0]).toHaveAttribute('data-met', 'false');
    expect(items()[0]).toHaveTextContent('Pendente: Ao menos 8 caracteres');
    await user.type(screen.getByLabelText('Senha'), 'Cavalo-Azul-77!');
    expect(items().map((li) => li.getAttribute('data-met'))).toEqual([
      'true',
      'true',
      'true',
      'true',
    ]);
    expect(items()[1]).toHaveTextContent('Atendida: Letras maiúsculas e minúsculas');
  });

  it('rules personalizadas e textos trocáveis', () => {
    render(
      <PasswordInput
        aria-label="Password"
        defaultValue="abc"
        strength
        rules={[{ id: 'lower', label: 'Lowercase' }]}
        texts={{
          show: 'Show password',
          level1: 'weak',
          strength: (l) => `Strength: ${l}`,
          ruleMet: 'Met: ',
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(document.querySelector('.eds-password-strength')).toHaveTextContent('Strength: weak');
    expect(document.querySelector('.eds-password-rules li')).toHaveTextContent('Met: Lowercase');
  });

  it('anuncia a força só por pausa ou ao sair, não por tecla', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PasswordInput aria-label="Senha" strength />);
    const region = () =>
      document.querySelector<HTMLElement>('.eds-password-strength + [role="status"]')!;
    await user.type(screen.getByLabelText('Senha'), 'Cavalo-Azul-77!');
    expect(region()).toHaveTextContent('');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(region()).toHaveTextContent('Força da senha: forte.');
  });

  it('controlado: usa o value de fora', () => {
    const { rerender } = render(
      <PasswordInput aria-label="Senha" strength value="ab" onChange={() => undefined} />,
    );
    expect(document.querySelector('.eds-password-strength')).toHaveAttribute('data-level', '1');
    rerender(
      <PasswordInput
        aria-label="Senha"
        strength
        value="Cavalo-Azul-77!"
        onChange={() => undefined}
      />,
    );
    expect(document.querySelector('.eds-password-strength')).toHaveAttribute('data-level', '4');
  });
});
