import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Input } from '../Input/Input';
import { Textarea } from '../Textarea/Textarea';
import { Select } from '../Select/Select';

describe('Field', () => {
  it('liga rótulo e controle por id/htmlFor', () => {
    render(
      <Field label="Nome completo">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Nome completo');
    expect(input).toHaveClass('eds-input');
    expect(input.closest('.eds-field')).toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('descreve o controle com a ajuda', () => {
    render(
      <Field label="Nome" helper="Como consta no documento.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription('Como consta no documento.');
    expect(screen.getByText('Como consta no documento.')).toHaveClass('eds-helper');
  });

  it('com erro: aria-invalid e descrição com ajuda + erro', () => {
    render(
      <Field label="E-mail" helper="Use o e-mail corporativo." error="Informe um e-mail válido.">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'Use o e-mail corporativo. Informe um e-mail válido.',
    );
    expect(screen.getByText('Informe um e-mail válido.')).toHaveClass('eds-error');
  });

  it('texto vazio em error, helper ou success conta como ausente', () => {
    const { container } = render(
      <Field label="E-mail" error="" helper="" success="">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText('E-mail');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('data-valid');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(container.querySelector('.eds-error, .eds-helper, .eds-success')).toBeNull();
  });

  it('mescla o aria-describedby do consumidor', () => {
    render(
      <>
        <p id="externo">Dica externa</p>
        <Field label="Campo" helper="Ajuda">
          <Input aria-describedby="externo" />
        </Field>
      </>,
    );
    expect(screen.getByLabelText('Campo')).toHaveAccessibleDescription('Dica externa Ajuda');
  });

  it('required: atributo real e marca visual no rótulo', () => {
    render(
      <Field label="Nome" required>
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Nome')).toBeRequired();
    expect(screen.getByText('Nome')).toHaveAttribute('data-required');
  });

  it('sem required não marca o rótulo', () => {
    render(
      <Field label="Nome">
        <Input />
      </Field>,
    );
    expect(screen.getByText('Nome')).not.toHaveAttribute('data-required');
    expect(screen.getByLabelText('Nome')).not.toBeRequired();
  });

  it('sucesso: data-valid e mensagem; erro tem precedência', () => {
    const { rerender } = render(
      <Field label="Código" success="Código disponível.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Código')).toHaveAttribute('data-valid');
    expect(screen.getByText('Código disponível.')).toHaveClass('eds-success');
    rerender(
      <Field label="Código" success="Código disponível." error="Já existe.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Código')).not.toHaveAttribute('data-valid');
    expect(screen.queryByText('Código disponível.')).not.toBeInTheDocument();
  });

  it('funciona com Textarea e Select', () => {
    render(
      <>
        <Field label="Obs" error="Obrigatório.">
          <Textarea />
        </Field>
        <Field label="Depto" required>
          <Select>
            <option>Compras</option>
          </Select>
        </Field>
      </>,
    );
    expect(screen.getByLabelText('Obs')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Depto')).toBeRequired();
  });

  it('controlId fixa o id; className e props nativas vão para a div', () => {
    render(
      <Field label="Nome" controlId="meu-id" className="extra" data-testid="f">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText('Nome')).toHaveAttribute('id', 'meu-id');
    expect(screen.getByTestId('f')).toHaveClass('eds-field', 'extra');
  });
});
