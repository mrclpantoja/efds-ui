import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorSummary } from '../ErrorSummary';
import { Field } from '../Field';
import { Input } from '../Input';
import { useFormValidation, type UseFormValidationOptions } from './useFormValidation';

// Dados fictícios: documentos gerados por algoritmo, de ninguém.
const CPF_OK = '529.982.247-25';
const CPF_RUIM = '529.982.247-24';

function Cadastro({
  summary = true,
  ...options
}: UseFormValidationOptions & { summary?: boolean }) {
  const { formProps, errorOf, summaryProps } = useFormValidation(options);
  return (
    <form {...formProps} aria-label="Cadastro">
      {summary && <ErrorSummary {...summaryProps} />}
      <Field label="Nome" required error={errorOf('nome')}>
        <Input name="nome" />
      </Field>
      <Field label="CPF" error={errorOf('cpf')}>
        <Input name="cpf" validate="cpf" />
      </Field>
      <button type="submit">Enviar</button>
      <button type="submit" formNoValidate>
        Rascunho
      </button>
    </form>
  );
}

const summary = () => document.querySelector<HTMLElement>('.eds-error-summary')!;

describe('useFormValidation + ErrorSummary', () => {
  it('Input validate vira a validade nativa do campo', async () => {
    const user = userEvent.setup();
    render(<Cadastro />);
    const cpf = screen.getByLabelText('CPF');
    await user.type(cpf, '123');
    expect((cpf as HTMLInputElement).validity.customError).toBe(true);
    expect((cpf as HTMLInputElement).validationMessage).toBe('Informe um CPF válido.');
    await user.clear(cpf);
    expect((cpf as HTMLInputElement).validity.valid).toBe(true);
  });

  it('não mostra erro enquanto digita pela primeira vez; mostra ao sair do campo', async () => {
    const user = userEvent.setup();
    render(<Cadastro />);
    const cpf = screen.getByLabelText('CPF');
    await user.type(cpf, '529');
    expect(cpf).not.toHaveAttribute('aria-invalid');
    await user.tab();
    expect(cpf).toHaveAttribute('aria-invalid', 'true');
    expect(cpf).toHaveAccessibleDescription('Informe um CPF válido.');
  });

  it('depois do primeiro erro acompanha a digitação e some ao ficar válido', async () => {
    const user = userEvent.setup();
    render(<Cadastro />);
    const cpf = screen.getByLabelText('CPF');
    await user.type(cpf, '529');
    await user.tab();
    await user.click(cpf);
    await user.type(cpf, '.982.247-25');
    expect(cpf).not.toHaveAttribute('aria-invalid');
    expect(document.querySelector('p.eds-error')).toBeNull();
  });

  it('envio recusado: resumo com contagem e links, foco no resumo e onSubmit não é chamado', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();
    render(<Cadastro onSubmit={onSubmit} onInvalid={onInvalid} />);
    await user.type(screen.getByLabelText('CPF'), CPF_RUIM);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(summary()).not.toHaveAttribute('hidden');
    expect(summary()).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Corrija 2 campos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nome: preencha este campo.' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^#/),
    );
    expect(screen.getByRole('link', { name: 'CPF: informe um CPF válido.' })).toBeInTheDocument();
    expect(screen.getByLabelText('CPF')).toHaveAttribute('aria-invalid', 'true');
  });

  it('o link leva o foco ao campo', async () => {
    const user = userEvent.setup();
    render(<Cadastro />);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.click(screen.getByRole('link', { name: /^Nome:/ }));
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('corrigir atualiza o resumo e, ao zerar, esconde e anuncia', async () => {
    const user = userEvent.setup();
    render(<Cadastro />);
    await user.type(screen.getByLabelText('CPF'), CPF_RUIM);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.type(screen.getByLabelText('Nome'), 'Maria Teste');
    expect(screen.getByRole('heading', { name: 'Corrija 1 campo' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('CPF'));
    await user.type(screen.getByLabelText('CPF'), CPF_OK);
    expect(summary()).toHaveAttribute('hidden');
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Todos os erros foram corrigidos.');
  });

  it('tudo válido chama onSubmit; formNoValidate envia sem validar', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(<Cadastro onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Rascunho' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.type(screen.getByLabelText('Nome'), 'Maria Teste');
    await user.type(screen.getByLabelText('CPF'), CPF_OK);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(summary()).toHaveAttribute('hidden');
  });

  it('sem ErrorSummary, o foco vai ao primeiro campo inválido', async () => {
    const user = userEvent.setup();
    render(<Cadastro summary={false} />);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('texts troca as mensagens das restrições nativas', async () => {
    const user = userEvent.setup();
    render(<Cadastro texts={{ validateRequired: 'Required.' }} />);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByRole('link', { name: 'Nome: required.' })).toBeInTheDocument();
  });

  it('validate() programático', async () => {
    let result: boolean | undefined;
    function Manual() {
      const { formProps, errorOf, validate } = useFormValidation();
      const [, setN] = useState(0);
      return (
        <form {...formProps}>
          <Field label="Nome" required error={errorOf('nome')}>
            <Input name="nome" />
          </Field>
          <button
            type="button"
            onClick={() => {
              result = validate();
              setN((n) => n + 1);
            }}
          >
            Conferir
          </button>
        </form>
      );
    }
    const user = userEvent.setup();
    render(<Manual />);
    await user.click(screen.getByRole('button', { name: 'Conferir' }));
    expect(result).toBe(false);
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ErrorSummary sozinho', () => {
  it('oculto sem erros, singular e plural, ref e className', () => {
    const { rerender } = render(<ErrorSummary errors={[]} className="x" />);
    expect(summary()).toHaveAttribute('hidden');
    expect(summary()).toHaveClass('eds-error-summary', 'x');
    expect(summary()).toHaveAttribute('tabindex', '-1');
    rerender(
      <ErrorSummary errors={[{ id: 'a', label: 'CPF', message: 'Informe um CPF válido.' }]} />,
    );
    expect(summary()).not.toHaveAttribute('hidden');
    expect(screen.getByRole('heading', { level: 2, name: 'Corrija 1 campo' })).toHaveClass(
      'eds-error-summary-title',
    );
    expect(summary()).toHaveAccessibleName('Corrija 1 campo');
    expect(summary()).toHaveFocus();
  });

  it('title, headingLevel e texts', () => {
    render(
      <ErrorSummary
        errors={[
          { id: 'a', message: 'Erro A.' },
          { id: 'b', message: 'Erro B.' },
        ]}
        headingLevel={3}
        texts={{ titleMany: 'Fix {count} fields' }}
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Fix 2 fields' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Erro A.' })).toBeInTheDocument();
  });
});
