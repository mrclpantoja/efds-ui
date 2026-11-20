import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from './Stepper';

const steps = [
  { label: 'Dados' },
  { label: 'Endereço' },
  { label: 'Pagamento' },
  { label: 'Revisão' },
];

describe('Stepper', () => {
  it('deriva estados de current e marca a etapa atual', () => {
    render(<Stepper aria-label="Etapas do cadastro" steps={steps} current={1} />);
    const list = screen.getByRole('list', { name: 'Etapas do cadastro' });
    expect(list).toHaveClass('eds-stepper');
    const items = Array.from(list.querySelectorAll('.eds-stepper-item'));
    expect(items.map((i) => i.getAttribute('data-state'))).toEqual([
      'complete',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[0]?.querySelector('.eds-visually-hidden')).toHaveTextContent('(concluída)');
    expect(items[1]?.querySelector('.eds-stepper-summary')).toHaveTextContent('Etapa 2 de 4');
    expect(list.querySelectorAll('.eds-stepper-summary')).toHaveLength(1);
    expect(items[0]?.querySelector('.eds-stepper-marker')).toHaveAttribute('aria-hidden', 'true');
  });

  it('state sobrescreve (erro) com texto oculto e vertical muda a classe', () => {
    render(
      <Stepper
        aria-label="Andamento"
        vertical
        current={2}
        steps={[{ label: 'A' }, { label: 'Docs', state: 'error' }, { label: 'B' }]}
      />,
    );
    expect(screen.getByRole('list')).toHaveClass('eds-stepper-vertical');
    expect(screen.getByText('Docs', { exact: false }).closest('li')).toHaveAttribute(
      'data-state',
      'error',
    );
    expect(screen.getByText('(com erro)', { exact: false })).toBeInTheDocument();
  });

  it('onStepClick transforma etapas concluídas em botões', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(<Stepper aria-label="E" steps={steps} current={2} onStepClick={onStepClick} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /Dados/ }));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('textos substituíveis', () => {
    render(
      <Stepper
        aria-label="Steps"
        steps={steps}
        current={1}
        texts={{ complete: ' (done)', summary: (c, t) => `Step ${c} of ${t}` }}
      />,
    );
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('(done)', { exact: false })).toBeInTheDocument();
  });
});
