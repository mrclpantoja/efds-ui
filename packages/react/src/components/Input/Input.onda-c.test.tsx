import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatCpf, formatCurrency, formatDate, maskCpf, formatRelative } from '../../index';
import { Input } from './Input';

describe('Input: máscaras hora, competência e processo', () => {
  it('hora mascara hh:mm e não valida por padrão', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Hora" mask="hora" />);
    const input = screen.getByLabelText('Hora') as HTMLInputElement;
    await user.type(input, '2599');
    expect(input).toHaveValue('25:99');
    expect(input.validity.valid).toBe(true);
  });

  it('maskValidate deixa o campo inválido fora da faixa e válido ao corrigir', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Hora" mask="hora" maskValidate />);
    const input = screen.getByLabelText('Hora') as HTMLInputElement;
    await user.type(input, '2599');
    expect(input.validity.valid).toBe(false);
    expect(input.validationMessage).toContain('Hora inválida');
    await user.clear(input);
    await user.type(input, '2359');
    expect(input).toHaveValue('23:59');
    expect(input.validity.valid).toBe(true);
  });

  it('competência com mensagem própria', async () => {
    const user = userEvent.setup();
    render(
      <Input
        aria-label="Competência"
        mask="competencia"
        maskValidate
        maskInvalidMessage="Mês errado"
      />,
    );
    const input = screen.getByLabelText('Competência') as HTMLInputElement;
    await user.type(input, '132026');
    expect(input).toHaveValue('13/2026');
    expect(input.validationMessage).toBe('Mês errado');
  });

  it('processo CNJ tem 25 caracteres', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Processo" mask="processo" />);
    const input = screen.getByLabelText('Processo') as HTMLInputElement;
    await user.type(input, '00012342020248210001');
    expect(input).toHaveValue('0001234-20.2024.8.21.0001');
    expect(input).toHaveAttribute('maxlength', '25');
  });
});

describe('formatadores reexportados', () => {
  it('são as mesmas funções do @efds-ui/behavior/format', () => {
    expect(formatCpf('12345678900')).toBe('123.456.789-00');
    expect(maskCpf('12345678900')).toBe('***.456.789-**');
    expect(formatCurrency(1280.5).replace(new RegExp(String.fromCharCode(160), 'g'), ' ')).toBe(
      'R$ 1.280,50',
    );
    expect(formatDate('2026-03-15')).toBe('15/03/2026');
    expect(formatRelative(new Date(Date.now() - 5 * 60_000))).toBe('há 5 minutos');
  });
});
