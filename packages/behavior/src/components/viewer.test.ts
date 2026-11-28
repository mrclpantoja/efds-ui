import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, resetViewerConfig } from '../setup';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { pointer } from '../test-utils/pointer';
import { initViewer, viewer, type ViewerItem } from './viewer';

const html = `
<div data-theme="green">
  <a id="a1" href="/f/contrato.pdf" data-eds-viewer data-eds-viewer-group="anexos"
     data-eds-viewer-type="application/pdf" data-eds-viewer-download="/f/contrato.pdf?dl=1"
     data-eds-viewer-name="Contrato social.pdf" data-eds-viewer-size="2048">Contrato social.pdf</a>
  <a id="a2" href="/f/foto.png" data-eds-viewer data-eds-viewer-group="anexos">Fachada</a>
  <a id="a3" href="/f/planilha.xlsx" data-eds-viewer data-eds-viewer-group="anexos"
     data-eds-viewer-type="application/vnd.ms-excel">Planilha</a>
  <a id="solo" href="/f/nota.txt" data-eds-viewer>Nota</a>
  <button id="btn" type="button" data-eds-viewer data-eds-viewer-src="/f/video.mp4"
     data-eds-viewer-name="Vídeo" data-eds-viewer-poster="/f/p.png">Ver vídeo</button>
</div>`;

const dialog = () => document.querySelector('dialog.eds-viewer') as HTMLDialogElement | null;
const q = <T extends HTMLElement = HTMLElement>(sel: string) => dialog()?.querySelector(sel) as T;
const tool = (name: string) => q(`[data-eds-viewer-tool="${name}"]`);
const el = (id: string) => document.getElementById(id) as HTMLElement;
const status = () => q('[role="status"]').textContent;

const items: ViewerItem[] = [
  { src: '/f/a.pdf', name: 'A.pdf', type: 'application/pdf' },
  { src: '/f/b.png', name: 'B.png', type: 'image/png' },
  { src: '/f/c.zip', name: 'C.zip', type: 'application/zip', size: 1536 },
];

describe('viewer', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = html;
    destroy = initViewer(document);
  });
  afterEach(async () => {
    vi.useRealTimers();
    viewer.close();
    await flush();
    destroy();
    restore();
    resetViewerConfig();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('o gatilho abre o diálogo escuro no tema vigente, no item certo, com foco no Fechar', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    document.addEventListener('eds:viewer-open', onOpen);
    await user.click(el('a2'));
    const d = dialog() as HTMLDialogElement;
    expect(d.open).toBe(true);
    expect(d).toHaveAttribute('data-mode', 'dark');
    expect(d).toHaveAttribute('data-theme', 'green');
    expect(d.getAttribute('aria-labelledby')).toBe(q('.eds-viewer-title').id);
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada');
    expect(q('.eds-viewer-position')).toHaveTextContent('2 de 3');
    expect(q('.eds-viewer-image')).toHaveAttribute('src', '/f/foto.png');
    expect(q('.eds-viewer-image')).toHaveAttribute('alt', 'Fachada');
    expect(document.activeElement).toBe(q('.eds-viewer-close'));
    expect(el('a2')).toHaveAttribute('aria-haspopup', 'dialog');
    expect(onOpen).toHaveBeenCalledTimes(1);
    const detail = (onOpen.mock.calls[0]?.[0] as CustomEvent).detail;
    expect(detail.index).toBe(1);
    expect(detail.items).toHaveLength(3);
    expect(detail.trigger).toBe(el('a2'));
    document.removeEventListener('eds:viewer-open', onOpen);
  });

  it('sem grupo o item fica sozinho; botão usa data-eds-viewer-src; clique com Ctrl segue o link', async () => {
    const user = userEvent.setup();
    await user.keyboard('{Control>}');
    await user.click(el('solo'));
    await user.keyboard('{/Control}');
    expect(dialog()).toBeNull();

    await user.click(el('solo'));
    expect(q('.eds-viewer-position').hidden).toBe(true);
    expect(q('.eds-viewer-prev').hidden).toBe(true);
    expect(q('.eds-viewer-footer').hidden).toBe(true);
    viewer.close();
    await flush();

    await user.click(el('btn'));
    expect(q('video')).toHaveAttribute('src', '/f/video.mp4');
    expect(q('video')).toHaveAttribute('poster', '/f/p.png');
    expect(q('video')).toHaveAttribute('aria-label', 'Vídeo');
  });

  it('PDF vira iframe com title, só fica pronto no load e o download usa a URL própria', async () => {
    const user = userEvent.setup();
    await user.click(el('a1'));
    const frame = q<HTMLIFrameElement>('iframe.eds-viewer-frame');
    expect(frame).toHaveAttribute('title', 'Contrato social.pdf');
    expect(frame).not.toHaveAttribute('sandbox');
    expect(q('.eds-viewer-stage')).toHaveAttribute('data-state', 'loading');
    frame.dispatchEvent(new Event('load'));
    expect(q('.eds-viewer-stage')).toHaveAttribute('data-state', 'ready');
    expect(tool('download')).toHaveAttribute('href', '/f/contrato.pdf?dl=1');
    expect(tool('download')).toHaveAttribute('download', 'Contrato social.pdf');
    expect(tool('open')).toHaveAttribute('target', '_blank');
    expect(tool('open')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(tool('zoom-in').hidden).toBe(true);
  });

  it('PDF em toque (pdf: auto) mostra "Sem pré-visualização"; embed força o leitor', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
    viewer.open([{ src: '/f/a.pdf', name: 'A.pdf', type: 'application/pdf', size: 2048 }]);
    expect(q('.eds-viewer-stage')).toHaveAttribute('data-state', 'unsupported');
    expect(q('.eds-empty-title')).toHaveTextContent('Sem pré-visualização');
    expect(q('.eds-empty-detail')).toHaveTextContent('A.pdf · 2 KB');
    expect(q('iframe')).toBeNull();
    viewer.close();
    await flush();

    viewer.open([{ src: '/f/a.pdf', name: 'A.pdf', type: 'application/pdf' }], 0, { pdf: 'embed' });
    expect(q('iframe')).not.toBeNull();
  });

  it('tipo sem pré-visualização oferece Baixar e Abrir em nova aba, e as opções os escondem', async () => {
    viewer.open([items[2] as ViewerItem]);
    const stage = q('.eds-viewer-stage');
    expect(stage).toHaveAttribute('data-state', 'unsupported');
    expect(stage.querySelectorAll('.eds-empty-actions a')).toHaveLength(2);
    expect(status()).toContain('C.zip: sem pré-visualização.');
    viewer.close();
    await flush();

    configure({ viewer: { download: false } });
    viewer.open([items[2] as ViewerItem], 0, { openInNewTab: false });
    expect(q('.eds-viewer-stage').querySelector('.eds-empty-actions')).toBeNull();
    expect(tool('download').hidden).toBe(true);
    expect(tool('open').hidden).toBe(true);
  });

  it('setas, Home, End e PageUp/PageDown trocam sem laço; anuncia e emite eds:viewer-change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:viewer-change', onChange);
    await user.click(el('a1'));
    expect(q<HTMLButtonElement>('.eds-viewer-prev').disabled).toBe(true);
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada');
    expect(status()).toContain('Arquivo 2 de 3: Fachada.');
    await user.keyboard('{End}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Planilha');
    expect(q<HTMLButtonElement>('.eds-viewer-next').disabled).toBe(true);
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Planilha');
    await user.keyboard('{PageUp}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada');
    await user.keyboard('{Home}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Contrato social.pdf');
    expect(onChange).toHaveBeenCalledTimes(4);
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({ index: 1 });
    document.removeEventListener('eds:viewer-change', onChange);
  });

  it('o botão Próximo desabilitado na ponta entrega o foco ao Anterior', async () => {
    const user = userEvent.setup();
    await user.click(el('a2'));
    q('.eds-viewer-next').focus();
    await user.click(q('.eds-viewer-next'));
    expect(q<HTMLButtonElement>('.eds-viewer-next').disabled).toBe(true);
    expect(document.activeElement).toBe(q('.eds-viewer-prev'));
  });

  it('com o foco no vídeo as setas não trocam de arquivo', async () => {
    const user = userEvent.setup();
    viewer.open([
      { src: '/f/v.mp4', name: 'V.mp4', type: 'video/mp4' },
      { src: '/f/o.png', name: 'O.png', type: 'image/png' },
    ]);
    const video = q<HTMLVideoElement>('video');
    video.tabIndex = 0;
    video.focus();
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-viewer-title')).toHaveTextContent('V.mp4');
    q('.eds-viewer-close').focus();
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-viewer-title')).toHaveTextContent('O.png');
  });

  it('imagem: carrega, zoom por teclado e botões, giro, ajuste e anúncio', async () => {
    const user = userEvent.setup();
    await user.click(el('a2'));
    const stage = q('.eds-viewer-stage');
    const img = q<HTMLImageElement>('.eds-viewer-image');
    expect(tool('zoom-in')).toHaveAttribute('aria-disabled', 'true');
    img.dispatchEvent(new Event('load'));
    expect(stage).toHaveAttribute('data-state', 'ready');
    expect(tool('zoom-in').hidden).toBe(false);
    expect(tool('zoom-in')).not.toHaveAttribute('aria-disabled');

    await user.keyboard('+');
    expect(stage.style.getPropertyValue('--_viewer-zoom')).toBe('1.5');
    expect(stage).toHaveAttribute('data-zoomed');
    expect(status()).toContain('Zoom 150%.');
    await user.click(tool('zoom-in'));
    expect(stage.style.getPropertyValue('--_viewer-zoom')).toBe('2');
    await user.keyboard('-');
    expect(stage.style.getPropertyValue('--_viewer-zoom')).toBe('1.5');
    await user.keyboard('r');
    expect(stage.style.getPropertyValue('--_viewer-rotate')).toBe('90deg');
    expect(stage).toHaveAttribute('data-rotated');
    expect(status()).toContain('Girada 90 graus.');
    await user.keyboard('0');
    expect(stage.style.getPropertyValue('--_viewer-zoom')).toBe('1');
    expect(stage.style.getPropertyValue('--_viewer-rotate')).toBe('0deg');
    expect(stage).not.toHaveAttribute('data-zoomed');
    expect(stage).not.toHaveAttribute('data-rotated');
    expect(status()).toContain('Imagem ajustada à tela.');
  });

  it('tamanho real usa as dimensões naturais; Ctrl+roda dá zoom; Shift+setas e arrasto movem a imagem ampliada', async () => {
    const user = userEvent.setup();
    await user.click(el('a2'));
    const stage = q('.eds-viewer-stage');
    const img = q<HTMLImageElement>('.eds-viewer-image');
    Object.defineProperty(img, 'naturalWidth', { value: 1600 });
    Object.defineProperty(img, 'clientWidth', { value: 800 });
    Object.defineProperty(img, 'clientHeight', { value: 400 });
    Object.defineProperty(stage, 'clientWidth', { value: 400 });
    Object.defineProperty(stage, 'clientHeight', { value: 300 });
    img.dispatchEvent(new Event('load'));

    await user.click(tool('actual'));
    expect(stage.style.getPropertyValue('--_viewer-zoom')).toBe('2');
    expect(status()).toContain('Zoom 100%.');
    await user.click(tool('fit'));

    stage.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -100, cancelable: true }));
    expect(stage.style.getPropertyValue('--_viewer-zoom')).toBe('1.5');
    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
    expect(stage.style.getPropertyValue('--_viewer-zoom')).toBe('1.5');

    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(stage.style.getPropertyValue('--_viewer-x')).toBe('40px');
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada');

    pointer(stage, 'pointerdown', 100, 100);
    expect(stage).toHaveAttribute('data-dragging');
    pointer(stage, 'pointermove', 90, 70);
    expect(stage.style.getPropertyValue('--_viewer-x')).toBe('30px');
    expect(stage.style.getPropertyValue('--_viewer-y')).toBe('-30px');
    pointer(stage, 'pointerup', 90, 70);
    expect(stage).not.toHaveAttribute('data-dragging');
  });

  it('falha de imagem vira erro com Tentar de novo, Baixar e Abrir; tentar de novo recarrega', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    document.addEventListener('eds:viewer-error', onError);
    await user.click(el('a2'));
    q('.eds-viewer-image').dispatchEvent(new Event('error'));
    const stage = q('.eds-viewer-stage');
    expect(stage).toHaveAttribute('data-state', 'error');
    expect(stage.querySelector('.eds-empty-error')).not.toBeNull();
    expect(stage.querySelectorAll('.eds-empty-actions > *')).toHaveLength(3);
    expect(status()).toContain('Não foi possível abrir Fachada.');
    expect((onError.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({ reason: 'network' });

    await user.click(stage.querySelector('button') as HTMLElement);
    expect(stage).toHaveAttribute('data-state', 'loading');
    expect(q('.eds-viewer-image')).toHaveAttribute('src', '/f/foto.png');
    document.removeEventListener('eds:viewer-error', onError);
  });

  it('o carregamento mostra o círculo depois de 300 ms e vira erro no tempo limite', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    document.addEventListener('eds:viewer-error', onError);
    viewer.open([{ src: '/f/b.png', name: 'B.png', type: 'image/png' }], 0, { loadTimeout: 2000 });
    const stage = q('.eds-viewer-stage');
    expect(stage).not.toHaveAttribute('data-slow');
    vi.advanceTimersByTime(300);
    expect(stage).toHaveAttribute('data-slow');
    expect(status()).toContain('Carregando B.png.');
    vi.advanceTimersByTime(1700);
    expect(stage).toHaveAttribute('data-state', 'error');
    expect(stage).not.toHaveAttribute('data-slow');
    expect(q('.eds-empty-text')).toHaveTextContent('demorou');
    expect((onError.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({ reason: 'timeout' });
    document.removeEventListener('eds:viewer-error', onError);
  });

  it('texto: baixa por fetch e mostra como texto, nunca como HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<img src=x onerror=alert(1)> linha 2')),
    );
    viewer.open([{ src: '/f/n.txt', name: 'n.txt', type: 'text/plain' }]);
    await vi.waitFor(() => expect(q('.eds-viewer-text')).not.toBeNull());
    const pre = q('.eds-viewer-text');
    expect(pre.textContent).toBe('<img src=x onerror=alert(1)> linha 2');
    expect(pre.querySelector('img')).toBeNull();
    expect(pre).toHaveAttribute('tabindex', '0');
    expect(pre).toHaveAttribute('aria-label', 'n.txt');
    expect(q('.eds-viewer-stage')).toHaveAttribute('data-state', 'ready');
  });

  it('texto acima do limite vira erro too-large, com o limite no aviso', async () => {
    const onError = vi.fn();
    document.addEventListener('eds:viewer-error', onError);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x'.repeat(5000))));
    viewer.open([{ src: '/f/g.log', name: 'g.log', type: 'text/plain' }], 0, {
      maxTextBytes: 1024,
    });
    await vi.waitFor(() => expect(q('.eds-viewer-stage')).toHaveAttribute('data-state', 'error'));
    expect(q('.eds-empty-text')).toHaveTextContent('limite de 1 KB');
    expect((onError.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
      reason: 'too-large',
    });
    document.removeEventListener('eds:viewer-error', onError);
  });

  it('vídeo e áudio: controles nativos, legendas e pronto em loadedmetadata', async () => {
    viewer.open([
      {
        src: '/f/v.mp4',
        name: 'V.mp4',
        type: 'video/mp4',
        tracks: [{ src: '/f/v.vtt', kind: 'subtitles', srclang: 'pt-BR', label: 'Português' }],
      },
      { src: '/f/s.mp3', name: 'S.mp3', type: 'audio/mpeg' },
    ]);
    const video = q<HTMLVideoElement>('video');
    expect(video.controls).toBe(true);
    expect(video.querySelector('track')).toHaveAttribute('srclang', 'pt-BR');
    video.dispatchEvent(new Event('loadedmetadata'));
    expect(q('.eds-viewer-stage')).toHaveAttribute('data-state', 'ready');
    viewer.open([{ src: '/f/s.mp3', name: 'S.mp3', type: 'audio/mpeg' }]);
    expect(q('audio')).toHaveAttribute('aria-label', 'S.mp3');
  });

  it('Esc fecha, devolve o foco ao gatilho, descarrega o PDF e remove o diálogo gerado', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    document.addEventListener('eds:viewer-close', onClose);
    await user.click(el('a2'));
    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{Escape}');
    await flush();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(el('a2'));
    expect((onClose.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({ index: 0 });
    document.removeEventListener('eds:viewer-close', onClose);
  });

  it('o fundo não fecha o diálogo', async () => {
    const user = userEvent.setup();
    await user.click(el('a2'));
    await user.click(dialog() as HTMLElement);
    expect(dialog()?.open).toBe(true);
  });

  it('eds:viewer-open cancelável impede a abertura; o detalhe traz o diálogo para o slot de ações', async () => {
    const user = userEvent.setup();
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('eds:viewer-open', block);
    const controller = viewer.open(items);
    expect(controller.current).toBeUndefined();
    await user.click(el('a2'));
    expect(dialog()).toBeNull();
    document.removeEventListener('eds:viewer-open', block);

    const fill = (e: Event) => {
      const { dialog: d, item } = (e as CustomEvent).detail;
      const slot = d.querySelector('.eds-viewer-actions') as HTMLElement;
      const b = document.createElement('button');
      b.textContent = `Aprovar ${item.name}`;
      slot.append(b);
    };
    document.addEventListener('eds:viewer-open', fill);
    viewer.open([{ src: '/f/b.png', name: 'B.png', type: 'image/png' }]);
    expect(q('.eds-viewer-footer').hidden).toBe(false);
    expect(q('.eds-viewer-actions')).toHaveTextContent('Aprovar B.png');
    document.removeEventListener('eds:viewer-open', fill);
  });

  it('viewer.open devolve o controlador: go, next, prev, current e close', async () => {
    const controller = viewer.open(items, 1);
    expect(controller.current?.name).toBe('B.png');
    expect(controller.index).toBe(1);
    controller.next();
    expect(controller.current?.name).toBe('C.zip');
    controller.next();
    expect(controller.index).toBe(2);
    controller.prev();
    controller.go(0);
    expect(q('.eds-viewer-title')).toHaveTextContent('A.pdf');
    controller.close();
    await flush();
    expect(dialog()).toBeNull();
    expect(controller.current).toBeUndefined();
  });

  it('abrir outro visualizador fecha o anterior', async () => {
    viewer.open([items[0] as ViewerItem]);
    viewer.open([items[1] as ViewerItem]);
    await flush();
    expect(document.querySelectorAll('dialog.eds-viewer')).toHaveLength(1);
    expect(q('.eds-viewer-title')).toHaveTextContent('B.png');
  });

  it('usa o diálogo do servidor quando existe e o mantém ao fechar', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<dialog class="eds-viewer" id="meu"><div class="eds-viewer-footer"><div class="eds-viewer-actions"><button id="ok">Aprovar</button></div></div></dialog>`,
    );
    viewer.open([{ src: '/f/b.png', name: 'B.png', type: 'image/png' }]);
    expect(document.querySelectorAll('dialog.eds-viewer')).toHaveLength(1);
    expect(dialog()?.id).toBe('meu');
    expect(q('.eds-viewer-title')).toHaveTextContent('B.png');
    expect(q('#ok')).not.toBeNull();
    expect(q('.eds-viewer-footer').hidden).toBe(false);
    viewer.close();
    await flush();
    expect(dialog()).not.toBeNull();
    expect(dialog()?.open).toBe(false);
  });

  it('o destroy tira o aria-haspopup dos gatilhos', () => {
    destroy();
    expect(el('a2')).not.toHaveAttribute('aria-haspopup');
    destroy = initViewer(document);
  });

  it('tela cheia: só aparece onde há requestFullscreen e alterna o rótulo', async () => {
    expect(viewer.open([items[1] as ViewerItem]).current).toBeDefined();
    expect(tool('fullscreen')).toBeNull();
    viewer.close();
    await flush();

    const request = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLDialogElement.prototype, 'requestFullscreen', {
      value: request,
      configurable: true,
    });
    viewer.open([items[1] as ViewerItem]);
    expect(tool('fullscreen')).toHaveAttribute('aria-label', 'Tela cheia');
    tool('fullscreen').click();
    expect(request).toHaveBeenCalled();
    delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>).requestFullscreen;
  });
});
