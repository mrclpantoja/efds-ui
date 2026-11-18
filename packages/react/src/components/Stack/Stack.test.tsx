import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stack } from './Stack';

describe('Stack', () => {
  it('padrão: coluna, sem modificadores', () => {
    render(<Stack data-testid="s" />);
    expect(screen.getByTestId('s').className).toBe('eds-stack');
  });

  it('row, align, justify, wrap, gap e className', () => {
    render(
      <Stack
        direction="row"
        align="baseline"
        justify="between"
        wrap
        gap={2}
        className="x"
        data-testid="s"
      />,
    );
    expect(screen.getByTestId('s').className).toBe(
      'eds-stack eds-stack-row eds-stack-align-baseline eds-stack-justify-between eds-stack-wrap eds-gap-2 x',
    );
  });

  it('as=ul entrega a semântica de lista', () => {
    render(
      <Stack as="ul">
        <li>um</li>
        <li>dois</li>
      </Stack>,
    );
    expect(screen.getByRole('list')).toHaveClass('eds-stack');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
