import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Popover } from './Popover';

describe('Popover', () => {
  it('liga gatilho e painel e nomeia o painel pelo título', () => {
    render(
      <Popover
        trigger={<Button>Detalhes</Button>}
        title="Pedido PED-0001"
        actions={<Button>Fechar</Button>}
      >
        <p>Total de R$ 1.280,50.</p>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Detalhes' });
    const pop = document.querySelector<HTMLElement>('.eds-popover')!;
    expect(pop).toHaveAttribute('popover', 'auto');
    expect(trigger).toHaveAttribute('popovertarget', pop.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const title = pop.querySelector('.eds-popover-title') as HTMLElement;
    expect(title.tagName).toBe('H2');
    expect(pop).toHaveAttribute('aria-labelledby', title.id);
    expect(pop.querySelector('.eds-popover-actions')).toHaveTextContent('Fechar');
  });

  it('sem título usa aria-label', () => {
    render(
      <Popover trigger={<Button>Ajuda</Button>} aria-label="Ajuda do campo">
        texto
      </Popover>,
    );
    const pop = document.querySelector<HTMLElement>('.eds-popover')!;
    expect(pop).toHaveAttribute('aria-label', 'Ajuda do campo');
    expect(pop).not.toHaveAttribute('aria-labelledby');
  });

  it('onOpenChange acompanha o toggle e aria-expanded é sincronizado pelo behavior', () => {
    const onOpenChange = vi.fn();
    render(
      <Popover trigger={<Button>Detalhes</Button>} title="T" onOpenChange={onOpenChange}>
        x
      </Popover>,
    );
    const pop = document.querySelector<HTMLElement>('.eds-popover')!;
    const trigger = screen.getByRole('button', { name: 'Detalhes' });
    pop.matches = ((selector: string) =>
      selector === ':popover-open') as unknown as typeof pop.matches;
    fireEvent(pop, Object.assign(new Event('toggle'), { newState: 'open' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
