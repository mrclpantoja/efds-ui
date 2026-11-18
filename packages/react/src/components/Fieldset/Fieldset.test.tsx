import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Fieldset } from './Fieldset';
import { Checkbox } from '../Checkbox/Checkbox';

describe('Fieldset', () => {
  it('grupo nomeado pela legenda, ref e className', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(
      <Fieldset ref={ref} legend="Notificações" className="extra">
        <Checkbox>E-mail</Checkbox>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Notificações' });
    expect(ref.current).toBe(group);
    expect(group).toHaveClass('eds-fieldset', 'extra');
    expect(screen.getByText('Notificações')).toHaveClass('eds-legend');
  });

  it('helper descreve o fieldset', () => {
    render(
      <Fieldset legend="Notificações" helper="Escolha como deseja ser avisado.">
        <Checkbox>E-mail</Checkbox>
      </Fieldset>,
    );
    expect(screen.getByRole('group')).toHaveAccessibleDescription(
      'Escolha como deseja ser avisado.',
    );
    expect(screen.getByText('Escolha como deseja ser avisado.')).toHaveClass('eds-helper');
  });
});
