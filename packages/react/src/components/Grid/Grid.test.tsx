import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Grid, GridItem } from './Grid';

describe('Grid e GridItem', () => {
  it('Grid: gap, auto e subgrid', () => {
    render(<Grid gap={6} auto subgrid data-testid="g" />);
    expect(screen.getByTestId('g').className).toBe(
      'eds-grid eds-grid-auto eds-grid-subgrid eds-gap-6',
    );
  });

  it('Grid sem gap não emite classe de gap', () => {
    render(<Grid data-testid="g" />);
    expect(screen.getByTestId('g').className).toBe('eds-grid');
  });

  it('GridItem: spans por faixa', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Grid>
        <GridItem ref={ref} span={12} spanSm={6} spanMd={4} spanLg={3} data-testid="i" />
      </Grid>,
    );
    const el = screen.getByTestId('i');
    expect(ref.current).toBe(el);
    expect(el.className).toBe(
      'eds-col-span-12 eds-col-span-sm-6 eds-col-span-md-4 eds-col-span-lg-3',
    );
  });

  it('GridItem sem props não emite class vazia; as=section', () => {
    render(<GridItem as="section" data-testid="i" />);
    const el = screen.getByTestId('i');
    expect(el.tagName).toBe('SECTION');
    expect(el).not.toHaveAttribute('class');
  });
});
