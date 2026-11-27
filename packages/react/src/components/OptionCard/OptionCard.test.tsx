import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OptionCard, OptionCardGroup } from '.';

describe('OptionCard', () => {
  it('emite o markup do core: input filho direto do label, texto, descrição e marca', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <OptionCard
        ref={ref}
        type="checkbox"
        name="canal"
        value="email"
        title="E-mail"
        description="Avisos por e-mail."
        mark={<svg data-testid="mark" />}
      />,
    );
    const label = container.querySelector('label.eds-option-card')!;
    const input = screen.getByRole('checkbox', { name: /E-mail/ });
    expect(input.parentElement).toBe(label);
    expect(ref.current).toBe(input);
    expect(label.querySelector('.eds-option-card-title')).toHaveTextContent('E-mail');
    expect(label.querySelector('.eds-option-card-description')).toHaveTextContent('Avisos');
    expect(label.querySelector('.eds-option-card-mark')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sem descrição e sem marca, as partes não existem', () => {
    const { container } = render(<OptionCard type="radio" name="a" value="1" title="Um" />);
    expect(container.querySelector('.eds-option-card-description')).toBeNull();
    expect(container.querySelector('.eds-option-card-mark')).toBeNull();
  });

  it('invalid marca aria-invalid; desabilitado repassa disabled', () => {
    render(<OptionCard type="checkbox" value="x" title="X" invalid disabled />);
    const input = screen.getByRole('checkbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeDisabled();
  });
});

describe('OptionCardGroup', () => {
  it('fieldset com legenda e grade; rádios herdam name e seleção controlada', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Demo() {
      const [v, setV] = useState('pagar');
      return (
        <OptionCardGroup
          legend="Tipo"
          name="tipo"
          value={v}
          onValueChange={(next) => {
            setV(next);
            onValueChange(next);
          }}
        >
          <OptionCard type="radio" value="pagar" title="A pagar" />
          <OptionCard type="radio" value="receber" title="A receber" />
        </OptionCardGroup>
      );
    }
    const { container } = render(<Demo />);
    expect(screen.getByRole('group', { name: 'Tipo' })).toHaveClass('eds-fieldset');
    expect(container.querySelector('.eds-option-cards')).not.toBeNull();
    const [a, b] = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(a!.name).toBe('tipo');
    expect(a!.checked).toBe(true);
    await user.click(b!);
    expect(onValueChange).toHaveBeenCalledWith('receber');
    expect(b!.checked).toBe(true);
    // Teclado: setas movem a escolha entre os rádios do mesmo grupo.
    await user.keyboard('{ArrowUp}');
    expect(onValueChange).toHaveBeenLastCalledWith('pagar');
  });

  it('o erro do grupo descreve cada cartão', () => {
    render(
      <OptionCardGroup legend="Canais" error="Escolha ao menos um.">
        <OptionCard type="checkbox" value="a" title="A" />
      </OptionCardGroup>,
    );
    const input = screen.getByRole('checkbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Escolha ao menos um.');
  });

  it('ícone à esquerda é decorativo e fica antes do texto', () => {
    const { container } = render(
      <OptionCard type="radio" value="a" title="A pagar" icon={<svg data-testid="ico" />} />,
    );
    const icon = container.querySelector('.eds-option-card-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.nextElementSibling).toHaveClass('eds-option-card-text');
    expect(screen.getByRole('radio')).toHaveAccessibleName('A pagar');
  });
});
