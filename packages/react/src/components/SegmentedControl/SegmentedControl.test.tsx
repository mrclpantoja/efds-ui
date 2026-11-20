import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from '.';

const options = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês', disabled: true },
];

describe('SegmentedControl', () => {
  it('fieldset com legenda e rádios nativos', () => {
    render(
      <SegmentedControl legend="Período" options={options} defaultValue="dia" size="sm" fill />,
    );
    const group = screen.getByRole('group', { name: 'Período' });
    expect(group).toHaveClass('eds-segmented', 'eds-segmented-sm', 'eds-segmented-fill');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Dia' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Mês' })).toBeDisabled();
    const names = new Set(screen.getAllByRole('radio').map((r) => r.getAttribute('name')));
    expect(names.size).toBe(1);
  });

  it('não controlado: clique e setas trocam e avisam', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SegmentedControl
        legend="Período"
        options={options}
        defaultValue="dia"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('radio', { name: 'Semana' }));
    expect(onChange).toHaveBeenCalledWith('semana');
    expect(screen.getByRole('radio', { name: 'Semana' })).toBeChecked();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Dia' })).toBeChecked();
  });

  it('controlado', async () => {
    function Harness() {
      const [v, setV] = useState('dia');
      return <SegmentedControl legend="P" options={options} value={v} onChange={setV} />;
    }
    render(<Harness />);
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Semana' }));
    expect(screen.getByRole('radio', { name: 'Semana' })).toBeChecked();
  });

  it('legenda escondida e ícone sem texto visível', () => {
    render(
      <SegmentedControl
        legend="Visualização"
        hideLegend
        options={[{ value: 'l', label: 'Lista', icon: <svg data-testid="i" />, iconOnly: true }]}
      />,
    );
    expect(screen.getByText('Visualização')).toHaveClass('eds-visually-hidden');
    expect(screen.getByRole('radio', { name: 'Lista' })).toBeInTheDocument();
    expect(screen.getByText('Lista')).toHaveClass('eds-visually-hidden');
  });
});
