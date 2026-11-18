import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
  it('junta as classes com espaço', () => {
    expect(cx('eds-button', 'eds-button-primary')).toBe('eds-button eds-button-primary');
  });

  it('ignora valores falsy', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('retorna string vazia sem classes', () => {
    expect(cx()).toBe('');
  });

  it('aplica o resultado como className de um elemento', () => {
    const compact = true;
    render(<button className={cx('eds-button', compact && 'eds-button-sm')}>Salvar</button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass(
      'eds-button',
      'eds-button-sm',
    );
  });
});
