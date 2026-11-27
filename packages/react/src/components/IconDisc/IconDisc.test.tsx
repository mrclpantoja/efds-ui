import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconDisc } from '.';

describe('IconDisc', () => {
  it('é decorativo, com tom, tamanho e forma por classe e atributo', () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <IconDisc ref={ref} tone="success" size="lg" round>
        <svg />
      </IconDisc>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('eds-icon-disc', 'eds-icon-disc-lg', 'eds-icon-disc-round');
    expect(el).toHaveClass('eds-icon-disc-success');
  });

  it('padrão: accent e md não geram atributo nem classe extra', () => {
    const { container } = render(
      <IconDisc>
        <svg />
      </IconDisc>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toBe('eds-icon-disc');
  });
});
