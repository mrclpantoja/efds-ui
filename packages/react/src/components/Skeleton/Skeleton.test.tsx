import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';
import { SkeletonRegion } from './SkeletonRegion';

describe('Skeleton', () => {
  it('bloco aria-hidden por padrão', () => {
    render(<Skeleton data-testid="s" />);
    const el = screen.getByTestId('s');
    expect(el).toHaveClass('eds-skeleton');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).not.toHaveClass('eds-skeleton-shimmer');
  });

  it('variantes, shimmer, className, ref', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Skeleton ref={ref} variant="circle" shimmer className="extra" data-testid="s" />);
    const el = screen.getByTestId('s');
    expect(ref.current).toBe(el);
    expect(el).toHaveClass('eds-skeleton-circle', 'eds-skeleton-shimmer', 'extra');
  });

  it('variante text', () => {
    render(<Skeleton variant="text" data-testid="s" />);
    expect(screen.getByTestId('s')).toHaveClass('eds-skeleton-text');
  });
});

describe('SkeletonRegion', () => {
  it('loading: aria-busy e texto anunciado na região status montada', () => {
    const { rerender } = render(
      <SkeletonRegion loading={false} data-testid="r">
        conteúdo
      </SkeletonRegion>,
    );
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    expect(screen.getByTestId('r')).toHaveAttribute('aria-busy', 'false');
    rerender(
      <SkeletonRegion loading label="Carregando perfil" data-testid="r">
        <Skeleton />
      </SkeletonRegion>,
    );
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Carregando perfil');
    expect(screen.getByTestId('r')).toHaveAttribute('aria-busy', 'true');
  });

  it('o status é irmão do contêiner aria-busy, nunca descendente', () => {
    render(
      <SkeletonRegion loading data-testid="r">
        x
      </SkeletonRegion>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Carregando');
    expect(status.closest('[aria-busy]')).toBeNull();
    expect(screen.getByTestId('r')).toHaveAttribute('aria-busy', 'true');
  });
});
