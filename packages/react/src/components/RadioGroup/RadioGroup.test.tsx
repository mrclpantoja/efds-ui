import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup } from './RadioGroup';
import { Radio } from '../Radio/Radio';

describe('RadioGroup', () => {
  it('é um grupo nomeado pela legenda; rádios compartilham name', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(
      <RadioGroup ref={ref} legend="Prazo" className="extra">
        <Radio value="p">Padrão</Radio>
        <Radio value="e">Expresso</Radio>
      </RadioGroup>,
    );
    const group = screen.getByRole('group', { name: 'Prazo' });
    expect(ref.current).toBe(group);
    expect(group).toHaveClass('eds-fieldset', 'extra');
    const [a, b] = screen.getAllByRole('radio');
    expect(a).toHaveAttribute('name');
    expect(a?.getAttribute('name')).toBe(b?.getAttribute('name'));
  });

  it('não controlado: defaultValue, seleção e onValueChange', async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup legend="Prazo" defaultValue="p" onValueChange={onValueChange}>
        <Radio value="p">Padrão</Radio>
        <Radio value="e">Expresso</Radio>
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'Padrão' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Expresso' }));
    expect(screen.getByRole('radio', { name: 'Expresso' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Padrão' })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith('e');
  });

  it('controlado: o valor vem do consumidor', async () => {
    function Demo() {
      const [v, setV] = useState('p');
      return (
        <RadioGroup legend="Prazo" value={v} onValueChange={setV}>
          <Radio value="p">Padrão</Radio>
          <Radio value="e">Expresso</Radio>
        </RadioGroup>
      );
    }
    render(<Demo />);
    await userEvent.click(screen.getByRole('radio', { name: 'Expresso' }));
    expect(screen.getByRole('radio', { name: 'Expresso' })).toBeChecked();
  });

  it('setas movem a seleção', async () => {
    render(
      <RadioGroup legend="Prazo" defaultValue="p">
        <Radio value="p">Padrão</Radio>
        <Radio value="e">Expresso</Radio>
      </RadioGroup>,
    );
    screen.getByRole('radio', { name: 'Padrão' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Expresso' })).toBeChecked();
  });

  it('required: marca a legenda e cada rádio', () => {
    render(
      <RadioGroup legend="Prazo" required>
        <Radio value="p">Padrão</Radio>
        <Radio value="e">Expresso</Radio>
      </RadioGroup>,
    );
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeRequired());
    expect(screen.getByText('Prazo')).toHaveAttribute('data-required');
  });

  it('helper descreve o grupo; error descreve cada rádio com aria-invalid', () => {
    render(
      <RadioGroup legend="Prazo" helper="Escolha um." error="Obrigatório.">
        <Radio value="p">Padrão</Radio>
      </RadioGroup>,
    );
    expect(screen.getByRole('group', { name: 'Prazo' })).toHaveAccessibleDescription('Escolha um.');
    const radio = screen.getByRole('radio');
    expect(radio).toHaveAttribute('aria-invalid', 'true');
    expect(radio).toHaveAccessibleDescription('Obrigatório.');
  });

  it('disabled no grupo desabilita os rádios', () => {
    render(
      <RadioGroup legend="Prazo" disabled>
        <Radio value="p">Padrão</Radio>
      </RadioGroup>,
    );
    expect(screen.getByRole('radio')).toBeDisabled();
  });
});
