import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from '../Checkbox';
import { Modal } from '../Modal';
import { Radio } from '../Radio';
import { Switch } from '../Switch';
import { Textarea } from '../Textarea';
import { Badge } from './Badge';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';

describe('size sm | md | lg', () => {
  it('Textarea, Checkbox, Radio, Switch e Badge emitem .eds-<comp>-sm|-lg; md é o padrão sem classe', () => {
    render(
      <>
        <Textarea aria-label="t-sm" size="sm" />
        <Textarea aria-label="t-md" />
        <Checkbox aria-label="c-lg" size="lg" />
        <Checkbox aria-label="c-md" />
        <Radio value="a" size="sm" name="r">
          r-sm
        </Radio>
        <Switch size="lg">s-lg</Switch>
        <Badge size="sm">b-sm</Badge>
        <Badge>b-md</Badge>
      </>,
    );
    expect(screen.getByLabelText('t-sm')).toHaveClass('eds-textarea', 'eds-textarea-sm');
    expect(screen.getByLabelText('t-md').className).toBe('eds-textarea');
    expect(screen.getByLabelText('c-lg')).toHaveClass('eds-checkbox', 'eds-checkbox-lg');
    expect(screen.getByLabelText('c-md').className).toBe('eds-checkbox');
    expect(screen.getByLabelText('r-sm')).toHaveClass('eds-radio', 'eds-radio-sm');
    expect(screen.getByRole('switch', { name: 's-lg' })).toHaveClass('eds-switch', 'eds-switch-lg');
    expect(screen.getByText('b-sm')).toHaveClass('eds-badge', 'eds-badge-sm');
    expect(screen.getByText('b-md')).not.toHaveClass('eds-badge-md');
  });

  it('Modal size="full" emite .eds-modal-full', () => {
    const restore = installDialogPolyfill();
    render(
      <Modal open onClose={() => {}} title="Tela cheia" size="full">
        x
      </Modal>,
    );
    expect(document.querySelector('dialog')).toHaveClass('eds-modal', 'eds-modal-full');
    restore();
  });
});
