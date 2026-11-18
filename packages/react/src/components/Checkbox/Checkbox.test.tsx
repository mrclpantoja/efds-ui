import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';
import { Fieldset } from '../Fieldset/Fieldset';

describe('Checkbox', () => {
  it('envolve o input em label.eds-check e liga o rótulo', async () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange}>E-mail</Checkbox>);
    const box = screen.getByRole('checkbox', { name: 'E-mail' });
    expect(box).toHaveClass('eds-checkbox');
    expect(box.closest('label')).toHaveClass('eds-check');
    await userEvent.click(screen.getByText('E-mail'));
    expect(box).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('repassa ref ao input, className e props nativas', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Checkbox ref={ref} className="extra" name="n" defaultChecked disabled>
        Item
      </Checkbox>,
    );
    const box = screen.getByRole('checkbox');
    expect(ref.current).toBe(box);
    expect(box).toHaveClass('eds-checkbox', 'extra');
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('name', 'n');
  });

  it('indeterminate é propriedade DOM e acompanha a prop', () => {
    const { rerender } = render(<Checkbox indeterminate>Todas</Checkbox>);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    rerender(<Checkbox indeterminate={false}>Todas</Checkbox>);
    expect(box.indeterminate).toBe(false);
  });

  it('indeterminate controlado pelo consumidor no onChange', async () => {
    function Demo() {
      const [mixed, setMixed] = useState(true);
      return (
        <Checkbox indeterminate={mixed} onChange={() => setMixed(false)}>
          Todas
        </Checkbox>
      );
    }
    render(<Demo />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    await userEvent.click(box);
    expect(box.indeterminate).toBe(false);
    expect(box).toBeChecked();
  });

  it('invalid vira aria-invalid; erro do Fieldset descreve o controle', () => {
    render(
      <Fieldset legend="Termos" error="É preciso aceitar.">
        <Checkbox>Li e aceito</Checkbox>
      </Fieldset>,
    );
    const box = screen.getByRole('checkbox', { name: 'Li e aceito' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('É preciso aceitar.');
  });

  it('required é real', () => {
    render(<Checkbox required>Aceito</Checkbox>);
    expect(screen.getByRole('checkbox')).toBeRequired();
  });

  it('sem children renderiza só o input (sem label), com nome acessível obrigatório', async () => {
    const onChange = vi.fn();
    const { container } = render(<Checkbox aria-label="Selecionar linha" onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Selecionar linha' });
    expect(box).toHaveClass('eds-checkbox');
    expect(container.querySelector('label')).toBeNull();
    expect(box.parentElement).toBe(container);
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('exige rótulo, aria-label ou aria-labelledby (tipo)', () => {
    // @ts-expect-error: nem children nem nome acessível
    const bare = <Checkbox />;
    expect(bare).toBeTruthy();
  });
});
