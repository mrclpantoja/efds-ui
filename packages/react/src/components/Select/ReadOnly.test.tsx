import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from '../Combobox';
import { DateRangePicker } from '../DateRangePicker';
import { MultiSelect } from '../MultiSelect';
import { Select } from './Select';

const options = [
  { value: 'poa', label: 'Porto Alegre' },
  { value: 'pel', label: 'Pelotas' },
];

describe('somente leitura (readOnly)', () => {
  it('Select: aria-readonly, não muda com o teclado, segue focável e enviado', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <form data-testid="form">
        <Select
          aria-label="Cidade"
          name="cidade"
          readOnly
          defaultValue="poa"
          onChange={onValueChange}
        >
          <option value="poa">Porto Alegre</option>
          <option value="pel">Pelotas</option>
        </Select>
      </form>,
    );
    const select = screen.getByRole('combobox', { name: 'Cidade' }) as HTMLSelectElement;
    expect(select).toHaveAttribute('aria-readonly', 'true');
    expect(select).not.toBeDisabled();
    await user.tab();
    expect(select).toHaveFocus();
    await user.keyboard('{ArrowDown}P');
    expect(select.value).toBe('poa');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('cidade')).toBe('poa');
  });

  it('Select editável não tem aria-readonly', () => {
    render(
      <Select aria-label="Cidade">
        <option>A</option>
      </Select>,
    );
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-readonly');
  });

  it('Combobox: lista não abre, valor não muda, campo focável', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        aria-label="Cidade"
        options={options}
        defaultValue="poa"
        readOnly
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Cidade' });
    expect(input).toHaveAttribute('aria-readonly', 'true');
    expect(input).toHaveValue('Porto Alegre');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}{Escape}');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('Porto Alegre');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('MultiSelect: lista não abre, etiquetas não saem, campo focável', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <MultiSelect
        aria-label="Cidades"
        options={options}
        defaultValue={['poa']}
        readOnly
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Cidades' });
    expect(input).toHaveAttribute('aria-readonly', 'true');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}{Backspace}');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remover Porto Alegre' })).toBeDisabled();
  });

  it('DateRangePicker: campos readonly, botão do calendário desabilitado', () => {
    render(
      <DateRangePicker
        aria-label="Período"
        readOnly
        defaultValue={{ start: '2026-03-10', end: '2026-03-12' }}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Data inicial' })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Data final' })).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: /^Escolher período/ })).toBeDisabled();
  });
});
