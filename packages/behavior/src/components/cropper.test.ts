import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flush,
  installDataTransferPolyfill,
  installDomPolyfills,
  pickFiles,
} from '../test-utils/dom-polyfills';
import { initCropper } from './cropper';
import { initUpload } from './upload';

const mocks = vi.hoisted(() => ({
  crop: vi.fn(),
  load: vi.fn(),
}));

vi.mock('../image/canvas', async (original) => {
  const actual = await original<typeof import('../image/canvas')>();
  return { ...actual, loadImage: mocks.load, cropImage: mocks.crop };
});

const html = `
<form>
  <div class="eds-upload" data-eds-upload>
    <input id="foto" type="file" accept="image/*" data-eds-cropper data-eds-cropper-size="256"
      data-eds-cropper-aspect="1" data-eds-cropper-shape="circle"
      data-eds-cropper-format="image/webp" data-eds-cropper-preview="#avatar" />
    <ul class="eds-upload-list"></ul>
    <span class="eds-visually-hidden" role="status"></span>
  </div>
  <span class="eds-avatar" id="avatar">AE</span>
</form>`;

const input = () => document.getElementById('foto') as HTMLInputElement;
const dialog = () =>
  document.querySelector('dialog.eds-cropper-dialog') as HTMLDialogElement | null;
const btn = (name: string) =>
  Array.from(dialog()?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent === name,
  ) as HTMLButtonElement;
const photo = (name = 'minha.foto.png', type = 'image/png') =>
  new File(['x'], name, { type, lastModified: 5 });

describe('cropper (HTML)', () => {
  let restoreDom: () => void;
  let restoreDt: () => void;
  let destroy: () => void;
  let urls = 0;

  beforeEach(() => {
    restoreDom = installDomPolyfills();
    restoreDt = installDataTransferPolyfill();
    urls = 0;
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
    URL.createObjectURL = vi.fn(() => `blob:fake-${(urls += 1)}`);
    URL.revokeObjectURL = vi.fn();
    mocks.load.mockResolvedValue({
      source: {},
      width: 400,
      height: 200,
      sourceWidth: 400,
      sourceHeight: 200,
      close: vi.fn(),
    });
    mocks.crop.mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
    document.body.innerHTML = html;
    destroy = initCropper(document);
  });
  afterEach(() => {
    destroy();
    restoreDom();
    restoreDt();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  const choose = async (file = photo()) => {
    pickFiles(input(), [file]);
    await flush();
  };

  it('recusa arquivo que não é imagem, com erro ligado ao campo', async () => {
    const onChange = vi.fn();
    document.addEventListener('change', onChange);
    await choose(photo('a.pdf', 'application/pdf'));
    expect(dialog()).toBeNull();
    const error = document.querySelector('p.eds-error') as HTMLElement;
    expect(error).toHaveTextContent('Escolha um arquivo de imagem.');
    expect(input().getAttribute('aria-describedby')).toContain(error.id);
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
    document.removeEventListener('change', onChange);
  });

  it('abre o diálogo Ajustar foto com o cortador e foca a área de corte', async () => {
    await choose();
    const d = dialog() as HTMLDialogElement;
    expect(d.open).toBe(true);
    expect(d.querySelector('.eds-modal-title')).toHaveTextContent('Ajustar foto');
    const stage = d.querySelector('.eds-cropper-stage') as HTMLElement;
    expect(stage).toHaveAttribute('role', 'group');
    expect(stage).toHaveAttribute('aria-label', 'Área de corte');
    expect(d.querySelector('.eds-cropper')).toHaveAttribute('data-shape-crop', 'circle');
    expect(stage.getAttribute('aria-describedby')).toBe(d.querySelector('.eds-cropper-hint')?.id);
    expect(d.querySelector('.eds-cropper-frame')).toHaveAttribute('aria-hidden', 'true');
    expect(document.activeElement).toBe(stage);
    expect(stage.style.getPropertyValue('--_cropper-aspect')).toBe('1');
    expect(d.querySelectorAll('[data-eds-cropper-action]')).toHaveLength(8);
    const pan = d.querySelector('.eds-cropper-pan') as HTMLElement;
    expect(pan).toHaveAttribute('role', 'group');
    expect(pan).toHaveAttribute('aria-label', 'Mover imagem');
    expect(
      Array.from(pan.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'Mover para a esquerda',
      'Mover para cima',
      'Mover para baixo',
      'Mover para a direita',
    ]);
  });

  it('Aplicar entrega um arquivo pronto, atualiza a prévia e o FileUpload segue o fluxo', async () => {
    destroy();
    // o FileUpload entra depois do cropper: o change do cortador vem antes
    const stopCropper = initCropper(document);
    const stopUpload = initUpload(document);
    destroy = () => {
      stopCropper();
      stopUpload();
    };
    const onApply = vi.fn();
    input().addEventListener('eds:cropper-apply', onApply);
    await choose();
    // enquanto o diálogo está aberto o FileUpload não viu nada
    expect(document.querySelectorAll('.eds-upload-item')).toHaveLength(0);

    await userEvent.setup().click(btn('Aplicar'));
    await flush();

    expect(mocks.crop).toHaveBeenCalledTimes(1);
    const [, crop, out] = mocks.crop.mock.calls[0] as [
      unknown,
      { rotation: number },
      Record<string, unknown>,
    ];
    expect(crop.rotation).toBe(0);
    expect(out).toMatchObject({ width: 256, height: 256, format: 'image/webp', quality: 0.85 });
    const files = Array.from(input().files as unknown as File[]);
    expect(files.map((f) => [f.name, f.type])).toEqual([['minha.foto.webp', 'image/webp']]);
    expect(dialog()).toBeNull();
    expect(document.querySelector('.eds-upload-item-name')).toHaveTextContent('minha.foto.webp');
    expect(document.querySelector('#avatar img')).toHaveAttribute(
      'src',
      expect.stringMatching(/^blob:/),
    );
    expect(onApply).toHaveBeenCalledTimes(1);
    const detail = (onApply.mock.calls[0]?.[0] as CustomEvent).detail as Record<string, unknown>;
    expect(detail).toMatchObject({ width: 256, height: 256 });
    expect((detail.file as File).name).toBe('minha.foto.webp');
    expect(detail.crop).toMatchObject({ rotation: 0 });
  });

  it('Cancelar limpa o campo e emite o evento', async () => {
    const onCancel = vi.fn();
    input().addEventListener('eds:cropper-cancel', onCancel);
    await choose();
    await userEvent.setup().click(btn('Cancelar'));
    await flush();
    expect(dialog()).toBeNull();
    expect(Array.from((input().files ?? []) as unknown as File[])).toHaveLength(0);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mocks.crop).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input());
  });

  it('Esc cancela e mantém o arquivo aceito antes', async () => {
    await choose();
    await userEvent.setup().click(btn('Aplicar'));
    await flush();
    const first = Array.from(input().files as unknown as File[])[0];
    await choose(photo('outra.png'));
    await userEvent.setup().keyboard('{Escape}');
    await flush();
    expect(dialog()).toBeNull();
    expect(Array.from(input().files as unknown as File[])[0]).toBe(first);
  });

  it('imagem ilegível mostra erro e não abre o diálogo', async () => {
    mocks.load.mockRejectedValueOnce(new Error('x'));
    await choose();
    expect(dialog()).toBeNull();
    expect(document.querySelector('p.eds-error')).toHaveTextContent('Não foi possível abrir');
  });

  it('a dica avisa, sem bloquear, quando a imagem é menor que a saída', async () => {
    await choose();
    const hint = dialog()?.querySelector('.eds-cropper-hint') as HTMLElement;
    // 400x200 com quadro de 100 px cobre 200 px de imagem: abaixo dos 256 de saída
    expect(hint.textContent).toContain('pouca nitidez');
  });
});
