import { format, getMessages } from '../core/config';
import { closeIcon, emit, focusEl, uid } from '../core/dom';
import { createErrorSlot } from '../core/error-slot';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';
import { blobToFile, cropImage, loadImage, type LoadedImage } from '../image/canvas';
import { createCropperController } from '../image/cropper-controller';
import { isUpscaled, outputSize } from '../image/math';
import { baseName, isImageFile } from '../image/srcset';
import { announce } from './status-region';
import {
  ICON_DOWN,
  ICON_NEXT,
  ICON_PREV,
  ICON_RESET,
  ICON_ROTATE,
  ICON_UP,
  ICON_ZOOM_IN,
  ICON_ZOOM_OUT,
  svgIcon,
} from './image-shared';

interface CropperConfig {
  size: number;
  aspect: number;
  shape: 'circle' | 'rect';
  format: string;
  quality: number;
  preview: string;
}

function readConfig(input: HTMLInputElement): CropperConfig {
  const num = (name: string, fallback: number) => {
    const value = Number(input.getAttribute(name));
    return input.hasAttribute(name) && Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const quality = num('data-eds-cropper-quality', 0.85);
  return {
    size: Math.round(num('data-eds-cropper-size', 256)),
    aspect: num('data-eds-cropper-aspect', 1),
    shape: input.getAttribute('data-eds-cropper-shape') === 'circle' ? 'circle' : 'rect',
    format: input.getAttribute('data-eds-cropper-format') || 'image/webp',
    quality: Math.min(1, quality),
    preview: input.getAttribute('data-eds-cropper-preview') ?? '',
  };
}

/** Marcação do cortador: palco com imagem e quadro, dica e controles. */
function buildCropper(config: CropperConfig): {
  root: HTMLElement;
  stage: HTMLElement;
  img: HTMLImageElement;
  hint: HTMLElement;
} {
  const m = getMessages();
  const root = document.createElement('div');
  root.className = 'eds-cropper';
  root.setAttribute('data-shape-crop', config.shape);

  const hintId = uid('cropper-hint');
  const stage = document.createElement('div');
  stage.className = 'eds-cropper-stage';
  stage.tabIndex = 0;
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', m.cropperArea);
  stage.setAttribute('aria-describedby', hintId);
  const img = document.createElement('img');
  img.className = 'eds-cropper-image';
  img.alt = '';
  img.draggable = false;
  const frame = document.createElement('div');
  frame.className = 'eds-cropper-frame';
  frame.setAttribute('aria-hidden', 'true');
  stage.append(img, frame);

  const hint = document.createElement('p');
  hint.className = 'eds-cropper-hint';
  hint.id = hintId;
  hint.textContent = m.cropperHint;

  const controls = document.createElement('div');
  controls.className = 'eds-cropper-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', m.cropperControls);
  const button = (action: string, label: string, paths: readonly string[], small = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `eds-button eds-button-ghost eds-button-icon${small ? ' eds-button-sm' : ''}`;
    b.setAttribute('data-eds-cropper-action', action);
    b.setAttribute('aria-label', label);
    b.append(svgIcon(paths));
    return b;
  };
  const range = document.createElement('input');
  range.type = 'range';
  range.className = 'eds-cropper-zoom';
  range.setAttribute('aria-label', m.cropperZoom);
  range.min = '100';
  range.max = '500';
  range.value = '100';
  // WCAG 2.5.7: alternativa de ponteiro único ao arraste.
  const pan = document.createElement('div');
  pan.className = 'eds-cropper-pan';
  pan.setAttribute('role', 'group');
  pan.setAttribute('aria-label', m.cropperPan);
  pan.append(
    button('pan-left', m.cropperPanLeft, ICON_PREV, true),
    button('pan-up', m.cropperPanUp, ICON_UP, true),
    button('pan-down', m.cropperPanDown, ICON_DOWN, true),
    button('pan-right', m.cropperPanRight, ICON_NEXT, true),
  );
  controls.append(
    button('zoom-out', m.cropperZoomOut, ICON_ZOOM_OUT),
    range,
    button('zoom-in', m.cropperZoomIn, ICON_ZOOM_IN),
    button('rotate', m.cropperRotate, ICON_ROTATE),
    button('reset', m.cropperReset, ICON_RESET),
    pan,
  );

  root.append(stage, hint, controls);
  return { root, stage, img, hint };
}

/** `<img>` da prévia: o alvo, se for uma imagem, ou a imagem dentro dele (criada se faltar). */
function previewImage(selector: string): HTMLImageElement | null {
  if (!selector) return null;
  let target: Element | null = null;
  try {
    target = document.querySelector(selector);
  } catch {
    target = null;
  }
  if (!target) return null;
  if (target instanceof HTMLImageElement) return target;
  let img = target.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    img.alt = '';
    target.append(img);
  }
  return img;
}

/**
 * Corte de foto (`input[type=file][data-eds-cropper]`): ao escolher uma imagem abre o diálogo
 * "Ajustar foto" (arrastar, ampliar, girar), e "Aplicar" entrega um ARQUIVO PRONTO no `input`
 * (recortado, redimensionado e comprimido no navegador, nada é enviado a lugar nenhum). Depois
 * redispara o `change` (o FileUpload segue o fluxo normal) e atualiza a prévia
 * (`data-eds-cropper-preview`). Arquivo que não é imagem é recusado com erro visível.
 * Atributos: `-size` (maior lado, 256), `-aspect` (largura / altura, 1), `-shape` (`circle` ou
 * `rect`), `-format` (`image/webp`; sem suporte, JPEG), `-quality` (0 a 1, 0,85), `-preview`
 * (seletor do avatar ou da imagem). Eventos no `input`: `eds:cropper-apply`, `eds:cropper-cancel`.
 * Sem JS o `input` envia o arquivo original.
 */
export const cropperBehavior: Behavior = {
  name: 'cropper',
  selector: 'input[type="file"][data-eds-cropper]',
  bind(input) {
    if (!(input instanceof HTMLInputElement)) return;
    const ac = new AbortController();
    const { signal } = ac;
    const slot = createErrorSlot(input, () => input);
    let accepted: File | null = input.files?.[0] ?? null;
    let applying = false;
    let busy = false;
    let previewUrl: string | null = null;
    let teardown: (() => void) | null = null;

    const setFiles = (file: File | null): boolean => {
      if (typeof DataTransfer === 'undefined') return false;
      try {
        const transfer = new DataTransfer();
        if (file) transfer.items.add(file);
        input.files = transfer.files;
        return true;
      } catch {
        return false;
      }
    };

    /** Volta ao último arquivo aceito (ou limpa, se não havia). */
    const restore = () => {
      if (setFiles(accepted)) return;
      try {
        input.value = '';
      } catch {
        /* sem consequência */
      }
    };

    const updatePreview = (blob: Blob) => {
      const cfg = readConfig(input);
      const img = previewImage(cfg.preview);
      if (!img) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      img.src = previewUrl;
    };

    const open = async (file: File, origin: HTMLElement | null) => {
      const m = getMessages();
      const config = readConfig(input);
      let loaded: LoadedImage;
      try {
        loaded = await loadImage(file);
      } catch {
        restore();
        slot.show(m.cropperLoadError);
        busy = false;
        return;
      }
      if (!input.isConnected) {
        loaded.close();
        busy = false;
        return;
      }

      const out = outputSize(config.aspect, config.size);
      const displayUrl = URL.createObjectURL(file);
      const titleId = uid('cropper-title');
      const dialog = document.createElement('dialog');
      dialog.className = 'eds-modal eds-cropper-dialog';
      dialog.setAttribute('aria-labelledby', titleId);
      // Perder o ajuste por um clique no fundo seria um acidente: só os botões e Esc fecham.
      dialog.setAttribute('data-eds-backdrop', 'static');

      const header = document.createElement('header');
      header.className = 'eds-modal-header';
      const title = document.createElement('h2');
      title.className = 'eds-modal-title';
      title.id = titleId;
      title.textContent = m.cropperTitle;
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'eds-button eds-button-ghost eds-button-icon';
      closeBtn.setAttribute('aria-label', m.cropperClose);
      closeBtn.append(closeIcon());
      header.append(title, closeBtn);

      const body = document.createElement('div');
      body.className = 'eds-modal-body';
      const cropper = buildCropper(config);
      const status = document.createElement('span');
      status.className = 'eds-visually-hidden';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      body.append(cropper.root, status);
      const announcer = createAnnouncer(status);

      const footer = document.createElement('footer');
      footer.className = 'eds-modal-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'eds-button eds-button-secondary';
      cancelBtn.textContent = m.cropperCancel;
      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'eds-button eds-button-primary';
      applyBtn.textContent = m.cropperApply;
      footer.append(cancelBtn, applyBtn);
      dialog.append(header, body, footer);

      const controller = createCropperController({
        root: cropper.root,
        aspect: config.aspect,
        announce: announcer.say,
        texts: {
          zoom: (percent) => format(m.cropperZoomStatus, { percent }),
          rotated: (degrees) => format(m.cropperRotated, { degrees }),
          restored: () => m.cropperRestored,
        },
        onChange: () => {
          const crop = controller.getCrop();
          const small = crop ? isUpscaled(crop, out) : false;
          cropper.hint.textContent = small
            ? `${m.cropperHint} ${format(m.cropperSmall, { size: `${out.width} x ${out.height}` })}`
            : m.cropperHint;
        },
      });
      cropper.img.src = displayUrl;

      let applied = false;
      let working = false;

      const apply = async () => {
        if (working) return;
        const crop = controller.getCrop();
        if (!crop) return;
        working = true;
        applyBtn.setAttribute('aria-busy', 'true');
        try {
          const blob = await cropImage(loaded, crop, {
            width: out.width,
            height: out.height,
            format: config.format,
            quality: config.quality,
          });
          const result = blobToFile(blob, baseName(file.name));
          setFiles(result);
          accepted = result;
          applied = true;
          dialog.close('apply');
          updatePreview(blob);
          // A caixa fecha junto com a região dela: o aviso vai para a região global da página.
          announce(m.cropperApplied);
          applying = true;
          try {
            input.dispatchEvent(new Event('change', { bubbles: true }));
          } finally {
            applying = false;
          }
          emit(input, 'cropper-apply', {
            file: result,
            blob,
            crop,
            width: out.width,
            height: out.height,
          });
        } catch {
          slot.show(m.cropperFailed);
          announcer.say(m.cropperFailed);
        } finally {
          working = false;
          applyBtn.removeAttribute('aria-busy');
        }
      };

      applyBtn.addEventListener('click', () => void apply());
      cancelBtn.addEventListener('click', () => dialog.close('cancel'));
      closeBtn.addEventListener('click', () => dialog.close('cancel'));
      dialog.addEventListener(
        'close',
        () => {
          controller.destroy();
          announcer.dispose();
          loaded.close();
          URL.revokeObjectURL(displayUrl);
          dialog.remove();
          teardown = null;
          busy = false;
          if (!applied) {
            restore();
            emit(input, 'cropper-cancel', { file });
          }
          const back = origin?.isConnected ? origin : input;
          focusEl(back);
        },
        { once: true },
      );

      teardown = () => {
        if (dialog.open) dialog.close('cancel');
        else dialog.remove();
      };

      document.body.append(dialog);
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
      controller.setImage({ width: loaded.width, height: loaded.height });
      focusEl(cropper.stage);
    };

    input.addEventListener(
      'change',
      (event) => {
        // O `change` que nós mesmos disparamos (arquivo já cortado) segue para os outros ouvintes.
        if (applying) return;
        const file = input.files?.[0];
        if (!file) {
          accepted = null;
          slot.clear();
          return;
        }
        event.stopImmediatePropagation();
        if (busy) return;
        if (!isImageFile(file)) {
          restore();
          const message = getMessages().cropperNotImage;
          slot.show(message);
          announce(message);
          return;
        }
        slot.clear();
        busy = true;
        const active = document.activeElement;
        void open(file, active instanceof HTMLElement && active !== document.body ? active : null);
      },
      { signal, capture: true },
    );

    return () => {
      ac.abort();
      teardown?.();
      slot.clear();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  },
};

export function initCropper(root: ParentNode = document): () => void {
  return bindAll(root, [cropperBehavior]);
}
