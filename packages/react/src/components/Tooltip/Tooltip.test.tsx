import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('liga o gatilho ao balão por aria-describedby e emite o markup do core', () => {
    render(
      <Tooltip content="Salva o rascunho" placement="bottom">
        <Button>Salvar</Button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Salvar' });
    const tip = document.querySelector<HTMLElement>('.eds-tooltip')!;
    expect(tip).toHaveAttribute('role', 'tooltip');
    expect(tip).toHaveAttribute('popover', 'manual');
    expect(tip).toHaveTextContent('Salva o rascunho');
    expect(button).toHaveAttribute('aria-describedby', tip.id);
    expect(button).toHaveAttribute('data-eds-tooltip', 'bottom');
  });

  it('preserva um aria-describedby existente', () => {
    render(
      <Tooltip content="Dica">
        <Button aria-describedby="ajuda">Ok</Button>
      </Tooltip>,
    );
    const tip = document.querySelector<HTMLElement>('.eds-tooltip')!;
    expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', `ajuda ${tip.id}`);
  });

  it('o foco abre o balão e Esc o dispensa (o mesmo código do behavior)', () => {
    const show = vi.fn();
    render(
      <Tooltip content="Dica">
        <Button>Ok</Button>
      </Tooltip>,
    );
    const tip = document.querySelector<HTMLElement>('.eds-tooltip')!;
    tip.showPopover = show;
    tip.hidePopover = vi.fn();
    act(() => screen.getByRole('button').focus());
    act(() => {
      vi.advanceTimersByTime(5);
    });
    expect(show).toHaveBeenCalledTimes(1);
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(esc);
    });
    expect(esc.defaultPrevented).toBe(true);
  });
});
