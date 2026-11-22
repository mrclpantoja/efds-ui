import { getMessages } from '../core/config';
import { emit } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { ICON_IMAGE, svgIcon } from './image-shared';

type ImageState = 'loading' | 'loaded' | 'error';

/**
 * Imagem com estado (`.eds-image`): põe `data-state="loading|loaded|error"` no envoltório conforme
 * a `<img>` (ou o `<img>` dentro de `<picture>`) carrega ou falha, e escreve o texto do fallback
 * ("Imagem indisponível") quando o autor deixou o `.eds-image-fallback` vazio ou o omitiu.
 *
 * É automático por classe, sem atributo extra: o custo é um par de ouvintes por imagem, nada é
 * lido nem enviado, e quem usa só `.eds-image` ganha o estado sem precisar lembrar de um
 * `data-*` (igual ao Avatar). Trata a imagem que já carregou (ou falhou) antes do script e a troca
 * de `src`/`srcset`. Eventos: `eds:image-load` e `eds:image-error` (`detail { src }`).
 */
export const imageBehavior: Behavior = {
  name: 'image',
  selector: '.eds-image',
  bind(el) {
    const img = el.querySelector('img');
    if (!img) return;
    const ac = new AbortController();
    const { signal } = ac;

    const set = (state: ImageState) => {
      if (el.getAttribute('data-state') !== state) el.setAttribute('data-state', state);
    };

    const ensureFallback = () => {
      let fallback = el.querySelector<HTMLElement>('.eds-image-fallback');
      if (!fallback) {
        fallback = document.createElement('span');
        fallback.className = 'eds-image-fallback';
        fallback.append(svgIcon(ICON_IMAGE));
        el.append(fallback);
      }
      if ((fallback.textContent ?? '').trim() === '') {
        const text = document.createElement('span');
        text.textContent = getMessages().imageUnavailable;
        fallback.append(text);
        // O <img> some no erro (visibility): o alt continua no nome do aviso, para saber qual é.
        const alt = (img.getAttribute('alt') ?? '').trim();
        if (alt !== '') {
          const which = document.createElement('span');
          which.className = 'eds-visually-hidden';
          which.textContent = `: ${alt}`;
          fallback.append(which);
        }
      }
    };

    const fail = () => {
      set('error');
      ensureFallback();
      emit(el, 'image-error', { src: img.currentSrc || img.getAttribute('src') || '' });
    };

    /** Estado atual da imagem, sem esperar evento (já carregada, já falha ou ainda a caminho). */
    const check = () => {
      const hasSource =
        (img.getAttribute('src') ?? '') !== '' || (img.getAttribute('srcset') ?? '') !== '';
      if (!img.complete || !hasSource) {
        set('loading');
        return;
      }
      if (img.naturalWidth > 0) set('loaded');
      else fail();
    };

    img.addEventListener(
      'load',
      () => {
        set('loaded');
        emit(el, 'image-load', { src: img.currentSrc || img.getAttribute('src') || '' });
      },
      { signal },
    );
    img.addEventListener('error', fail, { signal });

    // Troca de src/srcset (React, htmx, script do autor): volta a "carregando" e confere.
    const observer = new MutationObserver(() => {
      set('loading');
      if (img.complete) check();
    });
    observer.observe(el, {
      attributes: true,
      attributeFilter: ['src', 'srcset'],
      subtree: true,
    });

    check();

    return () => {
      ac.abort();
      observer.disconnect();
    };
  },
};

export function initImage(root: ParentNode = document): () => void {
  return bindAll(root, [imageBehavior]);
}
