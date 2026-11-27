import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from './Stepper';
import { useSectionProgress } from './useSectionProgress';

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
      'done',
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
        orientation="vertical"
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

describe('Stepper: indicador de seções', () => {
  const sections = [
    { label: 'Dados', href: '#sec-dados', state: 'done' as const },
    { label: 'Valores', href: '#sec-valores' },
    { label: 'Revisão', href: '#sec-revisao' },
  ];

  it('rótulos viram links; aria-current no link da seção lida e resumo de seção', () => {
    render(<Stepper aria-label="Seções" steps={sections} current={1} />);
    const link = screen.getByRole('link', { name: 'Valores' });
    expect(link).toHaveClass('eds-stepper-link');
    expect(link).toHaveAttribute('href', '#sec-valores');
    expect(link).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('link', { name: /Dados/ })).toHaveTextContent('(concluída)');
    expect(document.querySelector('.eds-stepper-summary')).toHaveTextContent('Seção 2 de 3');
    expect(document.querySelector('li[aria-current]')).toBeNull();
  });

  it('clicar no link leva o foco ao título da seção', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Stepper aria-label="Seções" steps={sections} current={0} />
        <section id="sec-valores">
          <h2>Valores</h2>
        </section>
      </>,
    );
    await user.click(screen.getByRole('link', { name: 'Valores' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Valores' })).toHaveFocus());
  });
});

describe('useSectionProgress', () => {
  function Demo() {
    const { current, states } = useSectionProgress([
      { id: 's1', label: 'Dados' },
      { id: 's2', label: 'Contato' },
    ]);
    return (
      <>
        <p data-testid="out">{`${current}:${states.join(',')}`}</p>
        <section id="s1">
          <h2>Dados</h2>
          <input aria-label="Nome" required />
        </section>
        <section id="s2">
          <h2>Contato</h2>
          <input aria-label="Fone" />
        </section>
      </>
    );
  }

  it('conclui a seção quando o obrigatório é preenchido e anuncia uma vez', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.getByTestId('out').textContent).not.toContain('done');
    await user.type(screen.getByLabelText('Nome'), 'Maria Exemplo');
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent(/:done,/));
    await waitFor(() =>
      expect(document.querySelector('[role="status"]')).toHaveTextContent('Seção Dados concluída.'),
    );
  });
});
