import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress';

describe('Progress', () => {
  it('barra determinada: rótulo ligado, valor em texto e classes do core', () => {
    const ref = createRef<HTMLProgressElement>();
    const { container } = render(
      <Progress ref={ref} label="Importando planilha" value={45} tone="success" size="sm" />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Importando planilha' });
    expect(bar).toBe(ref.current);
    expect(bar).toHaveClass('eds-progress', 'eds-progress-sm');
    expect(bar).toHaveAttribute('value', '45');
    expect(bar).toHaveAttribute('max', '100');
    expect(bar).toHaveClass('eds-progress-success');
    expect(container.querySelector('.eds-progress-value')).toHaveTextContent('45%');
    expect(container.querySelector('.eds-progress-field')).not.toBeNull();
  });

  it('respeita max e limita o valor entre 0 e max', () => {
    const { container } = render(<Progress label="Etapas" value={7} max={4} />);
    expect(container.querySelector('.eds-progress-value')).toHaveTextContent('100%');
  });

  it('indeterminada: sem value, sem porcentagem', () => {
    const { container } = render(<Progress label="Processando" />);
    const bar = screen.getByRole('progressbar', { name: 'Processando' });
    expect(bar).not.toHaveAttribute('value');
    expect(container.querySelector('.eds-progress-value')).toBeNull();
  });

  it('valueText troca ou oculta o texto do valor', () => {
    const { container, rerender } = render(
      <Progress label="Cota" value={92} valueText="92% usado" />,
    );
    expect(container.querySelector('.eds-progress-value')).toHaveTextContent('92% usado');
    rerender(<Progress label="Cota" value={92} valueText={false} />);
    expect(container.querySelector('.eds-progress-value')).toBeNull();
  });

  it('sem rótulo visível exige aria-label e renderiza só a barra', () => {
    const { container } = render(<Progress aria-label="Carregando" value={10} />);
    expect(screen.getByRole('progressbar', { name: 'Carregando' })).toBeInTheDocument();
    expect(container.querySelector('.eds-progress-field')).toBeNull();
  });
});
