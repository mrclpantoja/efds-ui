import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { ButtonGroup } from './ButtonGroup';

describe('ButtonGroup', () => {
  it('é um grupo nomeado com a classe do core', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ButtonGroup ref={ref} aria-label="Período" className="extra">
        <Button>Dia</Button>
        <Button>Semana</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group', { name: 'Período' });
    expect(ref.current).toBe(group);
    expect(group).toHaveClass('eds-button-group', 'extra');
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('aceita aria-labelledby e exige um dos dois no tipo', () => {
    render(
      <>
        <span id="t">Edição</span>
        <ButtonGroup aria-labelledby="t">
          <Button>Anterior</Button>
        </ButtonGroup>
      </>,
    );
    expect(screen.getByRole('group', { name: 'Edição' })).toBeInTheDocument();
    // @ts-expect-error sem nome acessível não compila
    render(<ButtonGroup>x</ButtonGroup>);
  });
});
