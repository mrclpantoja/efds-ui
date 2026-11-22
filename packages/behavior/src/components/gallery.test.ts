import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { pointer } from '../test-utils/pointer';
import { initGallery } from './gallery';

const html = `
<div data-theme="green">
<ul class="eds-gallery" data-eds-gallery aria-label="Fotos da obra">
  <li><a class="eds-gallery-item" href="g1.png" data-eds-caption="Fundação"><img src="m1.png" alt="Fundação pronta" /></a></li>
  <li><a class="eds-gallery-item" href="g2.png"><img src="m2.png" alt="Estrutura" /></a></li>
  <li><a class="eds-gallery-item" href="g3.png" data-eds-caption="Acabamento"><img src="m3.png" alt="Acabamento final" /></a></li>
</ul></div>`;

const link = (n: number) =>
  document.querySelectorAll<HTMLAnchorElement>('.eds-gallery-item')[n - 1] as HTMLAnchorElement;
const dialog = () => document.querySelector('dialog.eds-lightbox') as HTMLDialogElement | null;
const q = (sel: string) => dialog()?.querySelector(sel) as HTMLElement;

describe('gallery', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = html;
    destroy = initGallery(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });

  it('clique abre o visualizador na imagem certa, escuro e no tema vigente', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    document.addEventListener('eds:gallery-open', onOpen);
    await user.click(link(2));
    const d = dialog() as HTMLDialogElement;
    expect(d.open).toBe(true);
    expect(d).toHaveAttribute('aria-label', 'Fotos da obra');
    expect(d).toHaveAttribute('data-mode', 'dark');
    expect(d).toHaveAttribute('data-theme', 'green');
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
    expect(q('.eds-lightbox-image')).toHaveAttribute('src', 'g2.png');
    expect(q('.eds-lightbox-image')).toHaveAttribute('alt', 'Estrutura');
    expect(q('.eds-lightbox-counter')).toHaveTextContent('2 de 3');
    expect(onOpen).toHaveBeenCalledTimes(1);
    document.removeEventListener('eds:gallery-open', onOpen);
  });

  it('as miniaturas avisam que abrem um diálogo', () => {
    expect(link(1)).toHaveAttribute('aria-haspopup', 'dialog');
    destroy();
    expect(link(1)).not.toHaveAttribute('aria-haspopup');
    destroy = initGallery(document);
  });

  it('com Ctrl o link segue normal', async () => {
    const user = userEvent.setup();
    await user.keyboard('{Control>}');
    await user.click(link(1));
    await user.keyboard('{/Control}');
    expect(dialog()).toBeNull();
  });

  it('setas, Home e End trocam sem voltar ao início; pontas desabilitam', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:gallery-change', onChange);
    await user.click(link(1));
    expect(q('.eds-lightbox-prev')).toBeDisabled();
    await user.keyboard('{ArrowLeft}');
    expect(q('.eds-lightbox-counter')).toHaveTextContent('1 de 3');
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
    expect(onChange).toHaveBeenCalledTimes(3);
    document.removeEventListener('eds:gallery-change', onChange);
  });

  it('anuncia contador e legenda a cada troca', async () => {
    const user = userEvent.setup();
    await user.click(link(1));
    expect(q('[role="status"]')).toHaveTextContent('1 de 3. Fundação');
    await user.click(q('.eds-lightbox-next'));
    expect(q('[role="status"]')).toHaveTextContent('2 de 3');
  });

  it('botão que fica desabilitado entrega o foco ao outro', async () => {
    const user = userEvent.setup();
    await user.click(link(2));
    await user.click(q('.eds-lightbox-prev'));
    expect(q('.eds-lightbox-prev')).toBeDisabled();
    expect(document.activeElement).toBe(q('.eds-lightbox-next'));
  });

  it('deslizar no toque troca; mouse não', async () => {
    const user = userEvent.setup();
    await user.click(link(2));
    const stage = q('.eds-lightbox-stage');
    pointer(stage, 'pointerdown', 200, 100, { pointerType: 'mouse' });
    pointer(stage, 'pointerup', 50, 100, { pointerType: 'mouse' });
    expect(q('.eds-lightbox-counter')).toHaveTextContent('2 de 3');
    pointer(stage, 'pointerdown', 200, 100, { pointerType: 'touch' });
    pointer(stage, 'pointerup', 50, 100, { pointerType: 'touch' });
    expect(q('.eds-lightbox-counter')).toHaveTextContent('3 de 3');
  });

  it('erro da imagem grande mostra o fallback no stage', async () => {
    const user = userEvent.setup();
    await user.click(link(1));
    q('.eds-lightbox-image').dispatchEvent(new Event('error'));
    expect(q('.eds-lightbox-stage')).toHaveAttribute('data-state', 'error');
    expect(q('.eds-lightbox-stage .eds-image-fallback')).toHaveTextContent('Imagem indisponível');
  });

  it('Esc fecha, foco volta à última miniatura vista e há evento', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    document.addEventListener('eds:gallery-close', onClose);
    await user.click(link(1));
    await user.keyboard('{ArrowRight}{ArrowRight}');
    await user.keyboard('{Escape}');
    await flush();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(link(3));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect((onClose.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({ index: 2 });
    document.removeEventListener('eds:gallery-close', onClose);
  });
});
