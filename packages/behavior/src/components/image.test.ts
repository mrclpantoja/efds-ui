import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from '../test-utils/dom-polyfills';
import { initImage } from './image';

const html = `
<div class="eds-image eds-image-ratio-16x9" id="a" data-state="loading">
  <img src="a.png" alt="Fachada fictícia" />
  <span class="eds-image-fallback"></span>
</div>`;

const wrap = () => document.getElementById('a') as HTMLElement;
const img = () => wrap().querySelector('img') as HTMLImageElement;

function setComplete(el: HTMLImageElement, complete: boolean, naturalWidth: number) {
  Object.defineProperty(el, 'complete', { configurable: true, get: () => complete });
  Object.defineProperty(el, 'naturalWidth', { configurable: true, get: () => naturalWidth });
}

describe('image', () => {
  let destroy: () => void;
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  const start = (prepare?: (el: HTMLImageElement) => void) => {
    document.body.innerHTML = html;
    if (prepare) prepare(img());
    destroy = initImage(document);
  };

  it('carregando até o load; depois loaded, com evento', () => {
    start((el) => setComplete(el, false, 0));
    expect(wrap()).toHaveAttribute('data-state', 'loading');
    const onLoad = vi.fn();
    document.addEventListener('eds:image-load', onLoad);
    img().dispatchEvent(new Event('load'));
    expect(wrap()).toHaveAttribute('data-state', 'loaded');
    expect(onLoad).toHaveBeenCalledTimes(1);
    document.removeEventListener('eds:image-load', onLoad);
  });

  it('trata a imagem que já carregou antes do script', () => {
    start((el) => setComplete(el, true, 640));
    expect(wrap()).toHaveAttribute('data-state', 'loaded');
  });

  it('erro: estado, texto do fallback e evento', () => {
    start((el) => setComplete(el, false, 0));
    const onError = vi.fn();
    document.addEventListener('eds:image-error', onError);
    img().dispatchEvent(new Event('error'));
    expect(wrap()).toHaveAttribute('data-state', 'error');
    expect(wrap().querySelector('.eds-image-fallback')).toHaveTextContent('Imagem indisponível');
    expect(onError).toHaveBeenCalledTimes(1);
    document.removeEventListener('eds:image-error', onError);
  });

  it('imagem que já falhou antes do script vira erro e cria o fallback ausente', () => {
    document.body.innerHTML = '<div class="eds-image" id="a"><img src="x.png" alt="" /></div>';
    setComplete(img(), true, 0);
    destroy = initImage(document);
    expect(wrap()).toHaveAttribute('data-state', 'error');
    expect(wrap().querySelector('.eds-image-fallback span')).toHaveTextContent(
      'Imagem indisponível',
    );
  });

  it('troca de src volta a carregando', async () => {
    start((el) => setComplete(el, true, 640));
    expect(wrap()).toHaveAttribute('data-state', 'loaded');
    setComplete(img(), false, 0);
    img().setAttribute('src', 'b.png');
    await flush();
    expect(wrap()).toHaveAttribute('data-state', 'loading');
  });
});
