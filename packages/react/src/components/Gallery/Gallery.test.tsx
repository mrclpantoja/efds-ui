import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { Gallery, type GalleryItem } from '.';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => restore());

const items: GalleryItem[] = [
  {
    src: 'g1.png',
    thumb: 'm1.png',
    alt: 'Fundação pronta',
    caption: 'Fundação',
    width: 200,
    height: 150,
  },
  { src: 'g2.png', thumb: 'm2.png', alt: 'Estrutura' },
  { src: 'g3.png', thumb: 'm3.png', alt: 'Acabamento final', caption: 'Acabamento' },
];

const dialog = () => document.querySelector('dialog.eds-lightbox') as HTMLDialogElement | null;

describe('Gallery', () => {
  it('sem abrir: lista de links para a imagem grande', () => {
    render(<Gallery label="Fotos da obra" items={items} ratio="4x3" />);
    const list = screen.getByRole('list', { name: 'Fotos da obra' });
    expect(list).toHaveClass('eds-gallery', 'eds-gallery-4x3');
    const link = screen.getByRole('link', { name: 'Fundação pronta' });
    expect(link).toHaveAttribute('href', 'g1.png');
    expect(link).toHaveClass('eds-gallery-item');
    expect(link).toHaveAttribute('data-eds-caption', 'Fundação');
    expect(link.querySelector('img')).toHaveAttribute('width', '200');
    expect(link).toHaveAttribute('aria-haspopup', 'dialog');
    expect(dialog()).toBeNull();
  });

  it('clique abre o visualizador escuro, no tema vigente, com a ordem do core', async () => {
    const onIndexChange = vi.fn();
    render(
      <div data-theme="orange">
        <Gallery label="Fotos da obra" items={items} onIndexChange={onIndexChange} />
      </div>,
    );
    await userEvent.setup().click(screen.getByRole('link', { name: 'Estrutura' }));
    const d = dialog() as HTMLDialogElement;
    expect(d.open).toBe(true);
    expect(d).toHaveAttribute('aria-label', 'Fotos da obra');
    expect(d).toHaveAttribute('data-mode', 'dark');
    expect(d).toHaveAttribute('data-theme', 'orange');
    expect(
      Array.from(d.children)
        .slice(0, 5)
        .map((c) => c.className.split(' ')[0]),
    ).toEqual([
      'eds-lightbox-prev',
      'eds-lightbox-next',
      'eds-lightbox-header',
      'eds-lightbox-stage',
      'eds-lightbox-caption',
    ]);
    expect(d.querySelector('.eds-lightbox-image')).toHaveAttribute('alt', 'Estrutura');
    expect(d.querySelector('.eds-lightbox-counter')).toHaveTextContent('2 de 3');
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('setas, Home/End, pontas desabilitadas e anúncio', async () => {
    const user = userEvent.setup();
    render(<Gallery label="Fotos" items={items} />);
    await user.click(screen.getByRole('link', { name: 'Fundação pronta' }));
    const d = dialog() as HTMLDialogElement;
    const q = (s: string) => d.querySelector(s) as HTMLElement;
    expect(q('.eds-lightbox-prev')).toBeDisabled();
    expect(q('[role="status"]')).toHaveTextContent('1 de 3. Fundação');
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-lightbox-image')).toHaveAttribute('src', 'g2.png');
    expect(q('.eds-lightbox-caption')).toHaveProperty('hidden', true);
    await user.keyboard('{End}');
    expect(q('.eds-lightbox-next')).toBeDisabled();
    expect(q('.eds-lightbox-caption')).toHaveTextContent('Acabamento');
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-lightbox-counter')).toHaveTextContent('3 de 3');
    await user.keyboard('{Home}');
    expect(q('.eds-lightbox-counter')).toHaveTextContent('1 de 3');
  });

  it('erro da imagem grande mostra o fallback', async () => {
    render(<Gallery label="Fotos" items={items} />);
    await userEvent.setup().click(screen.getByRole('link', { name: 'Fundação pronta' }));
    const img = dialog()?.querySelector('.eds-lightbox-image') as HTMLElement;
    act(() => {
      img.dispatchEvent(new Event('error'));
    });
    const stage = dialog()?.querySelector('.eds-lightbox-stage') as HTMLElement;
    expect(stage).toHaveAttribute('data-state', 'error');
    expect(stage.querySelector('.eds-image-fallback')).toHaveTextContent('Imagem indisponível');
  });

  it('Esc fecha e o foco volta à miniatura da última imagem vista', async () => {
    const user = userEvent.setup();
    render(<Gallery label="Fotos" items={items} />);
    await user.click(screen.getByRole('link', { name: 'Fundação pronta' }));
    await user.keyboard('{ArrowRight}{ArrowRight}');
    await user.keyboard('{Escape}');
    expect(dialog()).toBeNull();
    expect(screen.getByRole('link', { name: 'Acabamento final' })).toHaveFocus();
  });

  it('textos trocáveis', async () => {
    render(
      <Gallery
        label="Photos"
        items={items}
        texts={{ prev: 'Previous', next: 'Next', close: 'Close', counter: (c, t) => `${c}/${t}` }}
      />,
    );
    await userEvent.setup().click(screen.getByRole('link', { name: 'Estrutura' }));
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(dialog()?.querySelector('.eds-lightbox-counter')).toHaveTextContent('2/3');
  });
});

describe('Gallery: índice controlado', () => {
  it('index abre o visualizador na imagem pedida; null fecha; onIndexChange(null) ao fechar', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    const { rerender } = render(
      <Gallery label="Fotos da obra" items={items} index={null} onIndexChange={onIndexChange} />,
    );
    expect(dialog()).toBeNull();
    rerender(
      <Gallery label="Fotos da obra" items={items} index={1} onIndexChange={onIndexChange} />,
    );
    expect(dialog()).not.toBeNull();
    expect(dialog()?.textContent).toContain('2 de 3');
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onIndexChange).toHaveBeenLastCalledWith(null);
    // controlado: quem manda é a prop
    expect(dialog()).not.toBeNull();
    rerender(
      <Gallery label="Fotos da obra" items={items} index={null} onIndexChange={onIndexChange} />,
    );
    expect(dialog()).toBeNull();
  });

  it('defaultIndex abre ao montar', () => {
    render(<Gallery label="Fotos da obra" items={items} defaultIndex={2} />);
    expect(dialog()?.textContent).toContain('3 de 3');
  });
});
