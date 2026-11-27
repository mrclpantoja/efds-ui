import { forwardRef, useEffect, useRef, useState } from 'react';
import { mergeRefs } from '../../internal/refs-d';
import { baseName, blobToFile, type Crop } from '@efds-ui/behavior/image';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { Modal } from '../Modal';
import {
  ImageCropper,
  defaultImageCropperTexts,
  type ImageCropperHandle,
  type ImageCropperOutput,
  type ImageCropperShape,
  type ImageCropperTexts,
} from './ImageCropper';

/** Textos do diálogo de corte (padrões em pt-BR), além dos do cortador. */
export interface ImageCropperDialogTexts extends ImageCropperTexts {
  title: string;
  apply: string;
  cancel: string;
  close: string;
  /** Erro ao gerar o arquivo. */
  failed: string;
  /** Erro ao abrir a imagem. */
  loadError: string;
}

export const defaultImageCropperDialogTexts: ImageCropperDialogTexts = {
  ...defaultImageCropperTexts,
  title: 'Ajustar foto',
  apply: 'Aplicar',
  cancel: 'Cancelar',
  close: 'Fechar',
  failed: 'Não foi possível ajustar a imagem. Tente de novo.',
  loadError: 'Não foi possível abrir a imagem. Tente outro arquivo.',
};

export interface ImageCropperDialogProps extends ImageCropperOutput {
  open: boolean;
  /** Arquivo de imagem escolhido. */
  file: File | null;
  /** "Aplicar": o arquivo pronto, o `Blob` e o recorte usado. O pai deve fechar (`open=false`). */
  onApply: (file: File, blob: Blob, crop: Crop) => void;
  /** Cancelar, Esc ou Fechar. */
  onClose: () => void;
  aspect?: number;
  shape?: ImageCropperShape;
  texts?: Partial<ImageCropperDialogTexts>;
}

/**
 * Modal "Ajustar foto" com o cortador, "Cancelar" e "Aplicar". O corte roda só no navegador: o
 * arquivo entregue em `onApply` não é enviado a lugar nenhum pelo componente.
 */
export const ImageCropperDialog = forwardRef<HTMLDialogElement, ImageCropperDialogProps>(
  function ImageCropperDialog(
    {
      open,
      file,
      onApply,
      onClose,
      aspect = 1,
      shape = 'rect',
      outputSize,
      format,
      quality,
      texts,
    },
    ref,
  ) {
    const t = mergeTexts(defaultImageCropperDialogTexts, texts);
    const cropper = useRef<ImageCropperHandle>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [url, setUrl] = useState<{ file: File; href: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<{ file: File | null; message: string } | null>(null);

    // O object URL nasce e morre com o par arquivo/abertura. O estado é escrito num microtask
    // (callback), não no corpo do efeito, e o cortador se ajusta sozinho quando o diálogo
    // aparece (o controlador observa o tamanho do palco).
    useEffect(() => {
      if (!file || !open) return;
      const href = URL.createObjectURL(file);
      let alive = true;
      queueMicrotask(() => {
        if (alive) setUrl({ file, href });
      });
      return () => {
        alive = false;
        URL.revokeObjectURL(href);
        queueMicrotask(() => setUrl((current) => (current?.href === href ? null : current)));
      };
    }, [file, open]);

    const src = file && open && url?.file === file ? url.href : null;
    // Foco inicial na área de corte (as setas já valem), como no HTML.
    useEffect(() => {
      if (src) dialogRef.current?.querySelector<HTMLElement>('.eds-cropper-stage')?.focus();
    }, [src]);

    const message = error && error.file === file ? error.message : null;

    const apply = async () => {
      const handle = cropper.current;
      if (!handle || busy || !file) return;
      setBusy(true);
      setError(null);
      try {
        const crop = handle.getCrop();
        const blob = await handle.toBlob();
        if (crop) onApply(blobToFile(blob, baseName(file.name)), blob, crop);
      } catch {
        setError({ file, message: t.failed });
      } finally {
        setBusy(false);
      }
    };

    return (
      <Modal
        ref={mergeRefs(ref, dialogRef)}
        open={open}
        onClose={onClose}
        title={t.title}
        closeOnBackdrop={false}
        texts={{ close: t.close }}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button variant="primary" loading={busy} onClick={() => void apply()}>
              {t.apply}
            </Button>
          </>
        }
      >
        {src ? (
          <ImageCropper
            ref={cropper}
            src={src}
            aspect={aspect}
            shape={shape}
            outputSize={outputSize}
            format={format}
            quality={quality}
            texts={texts}
            onError={() => setError({ file, message: t.loadError })}
          />
        ) : null}
        {message ? (
          <p className="eds-error" role="alert">
            {message}
          </p>
        ) : null}
      </Modal>
    );
  },
);
ImageCropperDialog.displayName = 'ImageCropperDialog';
