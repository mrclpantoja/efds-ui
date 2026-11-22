import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Figure, Image } from '.';

describe('Image', () => {
  it('monta o markup do core: proporção, ajuste, círculo e fallback', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Image ref={ref} src="a.png" alt="Fachada" ratio="16x9" fit="contain" circle className="x" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'eds-image',
      'eds-image-ratio-16x9',
      'eds-image-contain',
      'eds-image-circle',
      'x',
    );
    expect(screen.getByRole('img', { name: 'Fachada' })).toHaveAttribute('loading', 'lazy');
    expect(root.querySelector('.eds-image-fallback')).toHaveTextContent('Imagem indisponível');
  });

  it('data-state acompanha load e erro; texts troca o fallback', () => {
    const { container } = render(
      <Image src="a.png" alt="Fachada" texts={{ unavailable: 'Sem imagem' }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-state', 'loading');
    fireEvent.load(screen.getByRole('img', { name: 'Fachada' }));
    expect(root).toHaveAttribute('data-state', 'loaded');
    fireEvent.error(screen.getByRole('img', { name: 'Fachada' }));
    expect(root).toHaveAttribute('data-state', 'error');
    expect(root).toHaveTextContent('Sem imagem');
  });

  it('com sources ou widths renderiza <picture>', () => {
    const { container, rerender } = render(
      <Image src="a.jpg" alt="x" sources={[{ srcSet: 'a.avif 1x', type: 'image/avif' }]} />,
    );
    expect(container.querySelector('picture source')).toHaveAttribute('type', 'image/avif');
    rerender(
      <Image
        src=""
        alt="x"
        sizes="100vw"
        widths={[480, 960]}
        formats={['image/webp', 'image/jpeg']}
        getSrc={(w, f) => `/i/${w}.${f === 'image/webp' ? 'webp' : 'jpg'}`}
      />,
    );
    const source = container.querySelector('picture source') as HTMLElement;
    expect(source).toHaveAttribute('srcset', '/i/480.webp 480w, /i/960.webp 960w');
    const img = container.querySelector('picture img') as HTMLElement;
    expect(img).toHaveAttribute('srcset', '/i/480.jpg 480w, /i/960.jpg 960w');
    expect(img).toHaveAttribute('sizes', '100vw');
  });

  it('sem sources e widths não usa <picture>', () => {
    const { container } = render(<Image src="a.png" alt="x" loading="eager" />);
    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('loading', 'eager');
  });
});

describe('Figure', () => {
  it('o fallback de erro leva o alt no nome, para saber qual imagem falhou', () => {
    const { container } = render(<Image src="a.png" alt="Vista aérea fictícia" />);
    const fallback = container.querySelector('.eds-image-fallback');
    expect(fallback).toHaveTextContent('Imagem indisponível: Vista aérea fictícia');
  });

  it('legenda e crédito', () => {
    render(
      <Figure caption="Vista aérea" credit="Foto: Ana Exemplo">
        <Image src="a.png" alt="Vista aérea fictícia" />
      </Figure>,
    );
    const caption = screen.getByText('Vista aérea', { exact: false, selector: 'figcaption' });
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption).toHaveClass('eds-figure-caption');
    expect(screen.getByText('Foto: Ana Exemplo')).toHaveClass('eds-figure-credit');
  });

  it('sem legenda não renderiza figcaption', () => {
    const { container } = render(
      <Figure credit="x">
        <img src="a.png" alt="" />
      </Figure>,
    );
    expect(container.querySelector('figcaption')).toBeNull();
    expect(container.querySelector('figure')).toHaveClass('eds-figure');
  });
});
