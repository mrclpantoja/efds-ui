import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('é um checkbox com role="switch"', async () => {
    render(<Switch>Modo automático</Switch>);
    const sw = screen.getByRole('switch', { name: 'Modo automático' });
    expect(sw).toHaveAttribute('type', 'checkbox');
    expect(sw).toHaveClass('eds-switch');
    expect(sw.closest('label')).toHaveClass('eds-check');
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    expect(sw).toBeChecked();
    await userEvent.keyboard(' ');
    expect(sw).not.toBeChecked();
  });

  it('repassa ref, className e props nativas', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Switch ref={ref} className="extra" defaultChecked disabled name="auto">
        Auto
      </Switch>,
    );
    const sw = screen.getByRole('switch');
    expect(ref.current).toBe(sw);
    expect(sw).toHaveClass('eds-switch', 'extra');
    expect(sw).toBeChecked();
    expect(sw).toBeDisabled();
    expect(sw).toHaveAttribute('name', 'auto');
  });
});
