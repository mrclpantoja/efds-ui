import { format, getMessages } from '../core/config';
import { closeIcon, emit, focusEl } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';
import {
  announcement,
  clampIndex,
  indexForKey,
  neighborIndexes,
  swipeDirection,
} from '../image/gallery-logic';
import { ICON_IMAGE, ICON_NEXT, ICON_PREV, svgIcon } from './image-shared';

interface Item {
  anchor: HTMLAnchorElement;
  src: string;
  alt: string;
  caption: string;
}

function readItems(root: HTMLElement): Item[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a.eds-gallery-item')).map(
    (anchor) => ({
      anchor,
      src: anchor.getAttribute('href') ?? '',
      alt: anchor.querySelector('img')?.getAttribute('alt') ?? '',
      caption: anchor.getAttribute('data-eds-caption') ?? '',
    }),
  );
}

/** Nome do visualizador: `aria-label` da galeria, ou o texto do `aria-labelledby`, ou o padrão. */
function dialogLabel(root: HTMLElement): string {
  const own = root.getAttribute('aria-label');
  if (own) return own;
  const ids = (root.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  const text = ids
    .map((id) => root.ownerDocument.getElementById(id)?.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  return text || getMessages().galleryTitle;
}

const isRtl = (el: Element) => getComputedStyle(el).direction === 'rtl';

/**
 * Galeria (`[data-eds-gallery]`): sem JS cada miniatura é um link para a imagem grande. Com JS,
 * o clique abre um visualizador (`<dialog class="eds-modal eds-lightbox">`) com contador, legenda
 * (`data-eds-caption`), setas, Home/End, Esc e deslizar no toque; as vizinhas são carregadas
 * antes; contador e legenda são anunciados a cada troca; ao fechar, o foco volta à miniatura da
 * última imagem vista. Clique com Ctrl, Cmd, Shift ou botão do meio segue o link normal.
 * Eventos (na galeria): `eds:gallery-open`, `eds:gallery-change`, `eds:gallery-close`.
 */
export const galleryBehavior: Behavior = {
  name: 'gallery',
  selector: '[data-eds-gallery]',
  bind(root) {
    const ac = new AbortController();
    const { signal } = ac;
    let stop: (() => void) | null = null;

    const open = (index: number, items: Item[]) => {
      if (stop) return;
      const m = getMessages();
      const total = items.length;
      let current = clampIndex(index, total);
      const trigger = items[current]?.anchor ?? null;

      const dialog = document.createElement('dialog');
      dialog.className = 'eds-modal eds-lightbox';
      dialog.setAttribute('aria-label', dialogLabel(root));
      // Tema em subárvore exige `data-theme` e `data-mode` juntos: escuro, no tema vigente.
      dialog.setAttribute('data-mode', 'dark');
      const theme = root.closest('[data-theme]')?.getAttribute('data-theme');
      if (theme) dialog.setAttribute('data-theme', theme);

      const header = document.createElement('div');
      header.className = 'eds-lightbox-header';
      const counter = document.createElement('p');
      counter.className = 'eds-lightbox-counter';
      // O anúncio é da região de status; o contador visível não precisa ser lido duas vezes.
      counter.setAttribute('aria-hidden', 'true');
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'eds-button eds-button-ghost eds-button-icon';
      closeBtn.setAttribute('aria-label', m.galleryClose);
      closeBtn.append(closeIcon());
      header.append(counter, closeBtn);

      const stage = document.createElement('div');
      stage.className = 'eds-lightbox-stage';
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'eds-lightbox-prev';
      prev.setAttribute('aria-label', m.galleryPrev);
      prev.append(svgIcon(ICON_PREV));
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'eds-lightbox-next';
      next.setAttribute('aria-label', m.galleryNext);
      next.append(svgIcon(ICON_NEXT));
      const img = document.createElement('img');
      img.className = 'eds-lightbox-image';
      img.alt = '';
      stage.append(img);

      const caption = document.createElement('p');
      caption.className = 'eds-lightbox-caption';

      const status = document.createElement('span');
      status.className = 'eds-visually-hidden';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      const announcer = createAnnouncer(status);

      dialog.append(prev, next, header, stage, caption, status);

      const preload = (i: number) => {
        for (const n of neighborIndexes(i, total)) {
          const src = items[n]?.src;
          if (src) new Image().src = src;
        }
      };

      const show = (i: number, notify: boolean) => {
        const item = items[i];
        if (!item) return;
        current = i;
        stage.setAttribute('data-state', 'loading');
        stage.querySelector('.eds-image-fallback')?.remove();
        img.alt = item.alt;
        img.src = item.src;
        const text = format(m.galleryCounter, { current: i + 1, total });
        counter.textContent = text;
        caption.textContent = item.caption;
        caption.hidden = item.caption === '';
        // Perde o foco ao desabilitar o botão em uso: manda para o outro lado.
        const focusedBtn = document.activeElement;
        prev.disabled = i === 0;
        next.disabled = i === total - 1;
        if (focusedBtn === prev && prev.disabled) focusEl(next.disabled ? closeBtn : next);
        else if (focusedBtn === next && next.disabled) focusEl(prev.disabled ? closeBtn : prev);
        // Sem legenda, o alt da imagem entra no anúncio (senão só se ouviria "3 de 12").
        announcer.say(announcement(text, item.caption || item.alt));
        preload(i);
        if (notify) emit(root, 'gallery-change', { index: i, total, src: item.src });
      };

      const go = (i: number) => {
        const target = clampIndex(i, total);
        if (target !== current) show(target, true);
      };

      img.addEventListener('load', () => stage.removeAttribute('data-state'));
      img.addEventListener('error', () => {
        stage.setAttribute('data-state', 'error');
        if (stage.querySelector('.eds-image-fallback')) return;
        const fallback = document.createElement('span');
        fallback.className = 'eds-image-fallback';
        const text = document.createElement('span');
        text.textContent = getMessages().imageUnavailable;
        fallback.append(svgIcon(ICON_IMAGE), text);
        stage.append(fallback);
      });

      prev.addEventListener('click', () => go(current - 1));
      next.addEventListener('click', () => go(current + 1));
      closeBtn.addEventListener('click', () => dialog.close());

      dialog.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const target = indexForKey(event.key, current, total, isRtl(dialog));
        if (target === null) return;
        event.preventDefault();
        go(target);
      });

      // Deslizar no toque (e na caneta): o mouse não arrasta, para não brigar com a imagem.
      let swipe: { x: number; y: number; id: number } | null = null;
      stage.addEventListener('pointerdown', (event) => {
        swipe =
          event.pointerType === 'mouse'
            ? null
            : { x: event.clientX, y: event.clientY, id: event.pointerId };
      });
      stage.addEventListener('pointerup', (event) => {
        const start = swipe;
        swipe = null;
        if (!start || start.id !== event.pointerId) return;
        const dir = swipeDirection(event.clientX - start.x, event.clientY - start.y);
        if (dir !== 0) go(current + (isRtl(dialog) ? -dir : dir));
      });
      stage.addEventListener('pointercancel', () => {
        swipe = null;
      });

      const finish = () => {
        announcer.dispose();
        dialog.remove();
        stop = null;
        const last = items[current]?.anchor ?? trigger;
        if (last?.isConnected) focusEl(last);
        emit(root, 'gallery-close', { index: current, total });
      };
      dialog.addEventListener('close', finish, { once: true });

      document.body.append(dialog);
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
      show(current, false);
      focusEl(closeBtn);
      emit(root, 'gallery-open', { index: current, total, trigger });
      stop = () => {
        if (dialog.open) dialog.close();
        else {
          announcer.dispose();
          dialog.remove();
        }
        stop = null;
      };
    };

    // O link abre um diálogo (só quando o JS está ligado).
    const markPopup = () => {
      for (const a of root.querySelectorAll('a.eds-gallery-item')) {
        if (!a.hasAttribute('aria-haspopup')) a.setAttribute('aria-haspopup', 'dialog');
      }
    };
    markPopup();
    const observer = new MutationObserver(markPopup);
    observer.observe(root, { childList: true, subtree: true });

    root.addEventListener(
      'click',
      (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const anchor = (event.target as Element).closest<HTMLAnchorElement>('a.eds-gallery-item');
        if (!anchor || !root.contains(anchor)) return;
        const items = readItems(root);
        const index = items.findIndex((item) => item.anchor === anchor);
        if (index < 0 || items[index]?.src === '') return;
        event.preventDefault();
        open(index, items);
      },
      { signal },
    );

    return () => {
      ac.abort();
      observer.disconnect();
      for (const a of root.querySelectorAll('a.eds-gallery-item'))
        a.removeAttribute('aria-haspopup');
      stop?.();
    };
  },
};

export function initGallery(root: ParentNode = document): () => void {
  return bindAll(root, [galleryBehavior]);
}
