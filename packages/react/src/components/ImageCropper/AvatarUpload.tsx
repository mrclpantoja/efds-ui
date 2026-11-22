import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
} from 'react';
import { isImageFile, type Crop } from '@efds-ui/behavior/image';
import { useAnnouncer } from '../../internal/announcer';
import { mergeRefs } from '../../internal/refs-d';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Avatar, type AvatarSize } from '../Avatar';
import { Button } from '../Button';
import {
  ImageCropperDialog,
  defaultImageCropperDialogTexts,
  type ImageCropperDialogTexts,
} from './ImageCropperDialog';
import type { ImageCropperOutput } from './ImageCropper';

/** Textos internos do AvatarUpload (padrões em pt-BR), além dos do diálogo. */
export interface AvatarUploadTexts extends ImageCropperDialogTexts {
  /** Texto do botão. */
  change: string;
  /** Erro: o arquivo não é uma imagem. */
  notImage: string;
  /** Status depois de aplicar. */
  applied: string;
}

const defaultTexts: AvatarUploadTexts = {
  ...defaultImageCropperDialogTexts,
  change: 'Alterar foto',
  notImage: 'Escolha um arquivo de imagem.',
  applied: 'Foto ajustada.',
};

export interface AvatarUploadProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'>, ImageCropperOutput {
  /** Nome da pessoa: iniciais, nome acessível e tom do Avatar. */
  personName: string;
  /** `name` do `<input type="file">` real: o arquivo cortado vai no envio do formulário. */
  name?: string;
  /** Foto atual (URL), mostrada até haver uma nova. */
  value?: string;
  /** Uma nova foto foi aplicada: o arquivo pronto e o recorte. */
  onChange?: (file: File, crop: Crop) => void;
  size?: AvatarSize;
  disabled?: boolean;
  texts?: Partial<AvatarUploadTexts>;
}

/**
 * Avatar + "Alterar foto": escolhe a imagem, abre o diálogo de corte e guarda o arquivo pronto no
 * input real (vai junto com o formulário). Tudo roda no navegador; nada é enviado sem o autor
 * ligar o `onChange` a um envio.
 */
export const AvatarUpload = forwardRef<HTMLInputElement, AvatarUploadProps>(function AvatarUpload(
  {
    personName,
    name,
    value,
    onChange,
    size = 'lg',
    disabled,
    outputSize,
    format,
    quality,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const accepted = useRef<File | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { text: status, announce } = useAnnouncer();

  // O object URL da prévia é liberado ao trocar e ao sair.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const setInputFile = (file: File | null): boolean => {
    const input = inputRef.current;
    if (!input) return false;
    if (typeof DataTransfer === 'undefined') {
      if (!file) input.value = '';
      return false;
    }
    try {
      const transfer = new DataTransfer();
      if (file) transfer.items.add(file);
      input.files = transfer.files;
      return true;
    } catch {
      return false;
    }
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isImageFile(file)) {
      setInputFile(accepted.current);
      setError(t.notImage);
      announce(t.notImage);
      return;
    }
    setError(null);
    setPending(file);
  };

  const close = () => {
    setPending(null);
    // Cancelar mantém a foto aceita antes (ou deixa o campo vazio).
    setInputFile(accepted.current);
    buttonRef.current?.focus();
  };

  return (
    <div
      {...rest}
      className={cx('eds-stack eds-stack-row eds-stack-align-center eds-gap-3', className)}
    >
      <Avatar name={personName} src={preview ?? value} size={size} circle />
      <Button
        ref={buttonRef}
        variant="secondary"
        disabled={disabled}
        aria-describedby={error ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {t.change}
      </Button>
      <input
        ref={mergeRefs(inputRef, ref)}
        type="file"
        accept="image/*"
        name={name}
        hidden
        tabIndex={-1}
        disabled={disabled}
        onChange={onPick}
      />
      {error ? (
        <p className="eds-error" id={errorId}>
          {error}
        </p>
      ) : null}
      <span className="eds-visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
      <ImageCropperDialog
        open={pending !== null}
        file={pending}
        outputSize={outputSize}
        format={format}
        quality={quality}
        texts={texts}
        onClose={close}
        onApply={(file, blob, crop) => {
          setInputFile(file);
          accepted.current = file;
          setPreview(URL.createObjectURL(blob));
          setPending(null);
          announce(t.applied);
          buttonRef.current?.focus();
          onChange?.(file, crop);
        }}
      />
    </div>
  );
});
AvatarUpload.displayName = 'AvatarUpload';
