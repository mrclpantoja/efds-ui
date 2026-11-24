import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { AvatarUpload, ImageCropper, ImageCropperDialog, type ImageCropperHandle } from '.';

const mocks = vi.hoisted(() => ({ crop: vi.fn(), load: vi.fn() }));

vi.mock('@efds-ui/behavior/image', async (original) => {
  const actual = await original<typeof import('@efds-ui/behavior/image')>();
  return { ...actual, loadImage: mocks.load, cropImage: mocks.crop };
});

let restore: () => void;
let urls = 0;

beforeEach(() => {
  restore = installDialogPolyfill();
  urls = 0;
  URL.createObjectURL = vi.fn(() => `blob:fake-${(urls += 1)}`);
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const size = this.classList.contains('eds-cropper-stage')
      ? 200
      : this.classList.contains('eds-cropper-frame')
        ? 100
        : 0;
    return {
      left: 0,
      top: 0,
      width: size,
      height: size,
      right: size,
      bottom: size,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  });
  mocks.load.mockResolvedValue({
    source: {},
    width: 400,
    height: 200,
    sourceWidth: 400,
    sourceHeight: 200,
    close: vi.fn(),
  });
  mocks.crop.mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

/** Carrega a imagem do cortador com o tamanho natural pedido. */
function loadImg(container: HTMLElement, width = 400, height = 200) {
  const img = container.querySelector('img.eds-cropper-image') as HTMLImageElement;
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: height });
  fireEvent.load(img);
  return img;
}

const stage = (c: HTMLElement) => c.querySelector('.eds-cropper-stage') as HTMLElement;

describe('ImageCropper', () => {
  it('emite o markup do core, com nomes e dica ligada à área', () => {
    const { container } = render(<ImageCropper src="a.png" shape="circle" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('eds-cropper');
    expect(root).toHaveAttribute('data-shape-crop', 'circle');
    const area = screen.getByRole('group', { name: 'Área de corte' });
    expect(area).toHaveAttribute('tabindex', '0');
    expect(area.getAttribute('aria-describedby')).toBe(root.querySelector('.eds-cropper-hint')?.id);
    expect(area.querySelector('.eds-cropper-frame')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveClass('eds-cropper-zoom');
    expect(screen.getByRole('group', { name: 'Mover imagem' })).toHaveClass('eds-cropper-pan');
    for (const name of [
      'Ampliar',
      'Reduzir',
      'Girar 90 graus',
      'Restaurar',
      'Mover para a esquerda',
      'Mover para cima',
      'Mover para baixo',
      'Mover para a direita',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('escreve só custom properties e responde ao teclado', async () => {
    const onChange = vi.fn();
    const { container } = render(<ImageCropper src="a.png" onChange={onChange} />);
    loadImg(container);
    const s = stage(container);
    expect(s.style.getPropertyValue('--_cropper-scale')).toBe('1');
    expect(s.style.getPropertyValue('--_cropper-aspect')).toBe('1');
    s.focus();
    await userEvent.setup().keyboard('{ArrowRight}r');
    expect(s.style.getPropertyValue('--_cropper-rotate')).toBe('90deg');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Girada 90 graus');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(s.style.getPropertyValue('--_cropper-rotate')).toBe('0deg');
    expect(screen.getByRole('status')).toHaveTextContent('Restaurado.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mover para a direita' }));
    expect(s.style.getPropertyValue('--_cropper-x')).toBe('8px');
  });

  it('avisa, sem bloquear, quando a imagem é menor que a saída', () => {
    const { container } = render(<ImageCropper src="a.png" outputSize={256} />);
    loadImg(container, 400, 200);
    expect(container.querySelector('.eds-cropper-hint')).toHaveTextContent('pouca nitidez');
  });

  it('enquadramento controlado é aplicado', () => {
    const { container, rerender } = render(<ImageCropper src="a.png" />);
    loadImg(container);
    rerender(<ImageCropper src="a.png" value={{ x: 20, y: 0, scale: 1, rotation: 0 }} />);
    expect(stage(container).style.getPropertyValue('--_cropper-x')).toBe('20px');
  });

  it('o ref entrega o arquivo pronto', async () => {
    const ref = createRef<ImageCropperHandle>();
    const { container } = render(<ImageCropper ref={ref} src="a.png" outputSize={128} />);
    loadImg(container);
    const file = await (ref.current as ImageCropperHandle).toFile('minha.foto.png');
    expect(file.name).toBe('minha.foto.webp');
    expect(file.type).toBe('image/webp');
    const [, crop, out] = mocks.crop.mock.calls[0] as [unknown, { rotation: number }, object];
    expect(crop.rotation).toBe(0);
    expect(out).toMatchObject({ width: 128, height: 128, format: 'image/webp', quality: 0.85 });
  });
});

describe('ImageCropperDialog', () => {
  const photo = new File(['x'], 'foto.png', { type: 'image/png' });

  it('abre "Ajustar foto" e Aplicar entrega arquivo, blob e recorte', async () => {
    const onApply = vi.fn();
    const { baseElement } = render(
      <ImageCropperDialog open file={photo} onApply={onApply} onClose={() => undefined} />,
    );
    // showModal() e o foco inicial vêm de efeitos: com a máquina carregada, chegam depois.
    expect(await screen.findByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument();
    await waitFor(() => expect(baseElement.querySelector('img.eds-cropper-image')).not.toBeNull());
    await waitFor(() => expect(baseElement.querySelector('.eds-cropper-stage')).toHaveFocus());
    loadImg(baseElement);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const [file, blob, crop] = onApply.mock.calls[0] as [File, Blob, { rotation: number }];
    expect(file.name).toBe('foto.webp');
    expect(blob.type).toBe('image/webp');
    expect(crop.rotation).toBe(0);
  });

  it('Cancelar pede o fechamento', async () => {
    const onClose = vi.fn();
    render(<ImageCropperDialog open file={photo} onApply={vi.fn()} onClose={onClose} />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AvatarUpload', () => {
  class FakeTransfer {
    list: File[] = [];
    items = { add: (f: File) => this.list.push(f) };
    get files() {
      const files = [...this.list] as File[] & { item: (i: number) => File | null };
      files.item = (i) => files[i] ?? null;
      return files;
    }
  }

  beforeEach(() => {
    vi.stubGlobal('DataTransfer', FakeTransfer);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Avatar, botão e input real com name; sem o diálogo aberto', () => {
    const { container } = render(<AvatarUpload personName="Ana Exemplo" name="foto" />);
    expect(screen.getByRole('img', { name: 'Ana Exemplo' })).toHaveClass('eds-avatar');
    expect(screen.getByRole('button', { name: 'Alterar foto' })).toBeInTheDocument();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('name', 'foto');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('recusa o que não é imagem, com erro ligado ao botão', () => {
    const { container } = render(<AvatarUpload personName="Ana Exemplo" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] },
    });
    const error = screen.getByText('Escolha um arquivo de imagem.');
    expect(error).toHaveClass('eds-error');
    expect(screen.getByRole('button', { name: 'Alterar foto' })).toHaveAttribute(
      'aria-describedby',
      error.id,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('fluxo completo: escolhe, ajusta, aplica; a prévia e o input recebem o arquivo pronto', async () => {
    const onChange = vi.fn();
    const { container, baseElement } = render(
      <AvatarUpload personName="Ana Exemplo" name="foto" onChange={onChange} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'minha.png', { type: 'image/png' })] },
    });
    expect(await screen.findByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument();
    await waitFor(() => expect(baseElement.querySelector('img.eds-cropper-image')).not.toBeNull());
    loadImg(baseElement);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const file = onChange.mock.calls[0]?.[0] as File;
    expect(file.name).toBe('minha.webp');
    expect(Array.from(input.files as unknown as File[])).toEqual([file]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(container.querySelector('.eds-avatar img')).toHaveAttribute(
      'src',
      expect.stringMatching(/^blob:/),
    );
    await act(async () => undefined);
    expect(screen.getByText('Foto ajustada.')).toBeInTheDocument();
  });
});
