import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Wizard } from './Wizard';

const steps = [
  {
    title: 'Dados',
    content: (
      <>
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" required />
      </>
    ),
  },
  {
    title: 'Endereço',
    content: (
      <>
        <label htmlFor="rua">Rua</label>
        <input id="rua" name="rua" required />
      </>
    ),
  },
  { title: 'Confirmação', content: <p>Revise.</p> },
];

const items = () => Array.from(document.querySelectorAll<HTMLElement>('.eds-stepper-item'));

describe('Wizard', () => {
  it('mostra só o painel atual, com o stepper e os botões', () => {
    render(<Wizard aria-label="Etapas do cadastro" steps={steps} />);
    expect(screen.getByRole('list', { name: 'Etapas do cadastro' })).toHaveClass('eds-stepper');
    expect(screen.getByLabelText('Nome')).toBeVisible();
    expect(
      document.getElementById(screen.getByLabelText('Rua').id)?.closest('section'),
    ).toHaveAttribute('hidden');
    expect(screen.getByRole('button', { name: 'Avançar' })).toBeInTheDocument();
    expect(items()[0]).toHaveAttribute('aria-current', 'step');
  });

  it('não avança com campo inválido', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(<Wizard aria-label="E" steps={steps} onStepChange={onStepChange} />);
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    expect(onStepChange).not.toHaveBeenCalled();
    expect(items()[0]).toHaveAttribute('data-state', 'current');
  });

  it('campo inválido ganha erro visível, aria-invalid e foco; some ao ficar válido', async () => {
    const user = userEvent.setup();
    render(<Wizard aria-label="E" steps={steps} />);
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    const nome = screen.getByLabelText('Nome');
    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(nome).toHaveFocus();
    const err = document.getElementById(nome.getAttribute('aria-describedby') ?? '');
    expect(err).toHaveClass('eds-error');
    expect(err?.textContent).not.toBe('');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    expect(document.querySelectorAll('.eds-error')).toHaveLength(1);
    await user.type(nome, 'M');
    expect(nome).not.toHaveAttribute('aria-invalid');
    expect(document.querySelector('.eds-error')).toBeNull();
  });

  it('usa data-eds-error como mensagem', async () => {
    const user = userEvent.setup();
    render(
      <Wizard
        aria-label="E"
        steps={[
          {
            title: 'Dados',
            content: <input aria-label="Nome" required data-eds-error="Informe o nome." />,
          },
          { title: 'Fim', content: <p>ok</p> },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    expect(document.querySelector('.eds-error')).toHaveTextContent('Informe o nome.');
  });

  it('avança, foca o título, anuncia e marca a anterior como concluída', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(<Wizard aria-label="E" steps={steps} onStepChange={onStepChange} />);
    await user.type(screen.getByLabelText('Nome'), 'Maria Exemplo');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    expect(onStepChange).toHaveBeenCalledWith(1, 0);
    expect(screen.getByRole('heading', { name: 'Endereço' })).toHaveFocus();
    expect(
      screen.getAllByRole('status').some((s) => s.textContent === 'Etapa 2 de 3: Endereço.'),
    ).toBe(true);
    expect(items()[0]).toHaveAttribute('data-state', 'complete');
    expect(items()[1]).toHaveAttribute('data-state', 'current');
    expect(items()[1]?.querySelector('.eds-stepper-summary')).toHaveTextContent('Etapa 2 de 3');
  });

  it('Voltar e a etapa concluída voltam, preservando os valores', async () => {
    const user = userEvent.setup();
    render(<Wizard aria-label="E" steps={steps} />);
    await user.type(screen.getByLabelText('Nome'), 'Maria');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    await user.click(screen.getByRole('button', { name: /Dados/ }));
    expect(items()[0]).toHaveAttribute('data-state', 'current');
  });

  it('Enter avança; onBeforeStepChange pode cancelar', async () => {
    const user = userEvent.setup();
    const before = vi.fn(() => false);
    render(<Wizard aria-label="E" steps={steps} onBeforeStepChange={before} />);
    await user.type(screen.getByLabelText('Nome'), 'Maria{Enter}');
    expect(before).toHaveBeenCalledWith(0, 1);
    expect(items()[0]).toHaveAttribute('data-state', 'current');
  });

  it('validate extra impede o avanço', async () => {
    const user = userEvent.setup();
    const validate = vi.fn(() => false);
    render(<Wizard aria-label="E" steps={steps} validate={validate} />);
    await user.type(screen.getByLabelText('Nome'), 'Maria');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    expect(validate).toHaveBeenCalled();
    expect(items()[0]).toHaveAttribute('data-state', 'current');
  });

  it('na última etapa Concluir valida tudo e chama onComplete com os dados', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Wizard aria-label="E" steps={steps} onComplete={onComplete} />);
    await user.type(screen.getByLabelText('Nome'), 'Maria');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    await user.type(screen.getByLabelText('Rua'), 'Rua das Flores');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    expect(screen.queryByRole('button', { name: 'Avançar' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const data = onComplete.mock.calls[0]?.[0] as FormData;
    expect(data.get('nome')).toBe('Maria');
    expect(data.get('rua')).toBe('Rua das Flores');
  });

  it('o envio final leva ao painel anterior que ficou inválido', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Wizard aria-label="E" steps={steps} onComplete={onComplete} />);
    await user.type(screen.getByLabelText('Nome'), 'Maria');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    await user.type(screen.getByLabelText('Rua'), 'Rua');
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    fireEvent.change(screen.getByLabelText('Nome', { selector: 'input' }), {
      target: { value: '' },
    });
    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(items()[0]).toHaveAttribute('data-state', 'current');
  });

  it('textos substituíveis', () => {
    render(<Wizard aria-label="E" steps={steps} texts={{ next: 'Next', back: 'Back' }} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
});
