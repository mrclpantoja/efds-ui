import { describe, expect, it, vi } from 'vitest';
import { formatFileSize, kindOf } from './file-kind';
import {
  actualSizeZoom,
  blocksViewerKeys,
  canEmbedPdf,
  clampPan,
  nextRotation,
  readTextLimited,
  resolveViewerOptions,
  stepZoom,
  viewerKeyAction,
  ViewerLoadError,
  type ViewerKeyContext,
} from './viewer-logic';

describe('kindOf', () => {
  it('usa o MIME quando é específico', () => {
    expect(kindOf('application/pdf', 'x')).toBe('pdf');
    expect(kindOf('image/png', 'x.bin')).toBe('image');
    expect(kindOf('video/mp4')).toBe('video');
    expect(kindOf('audio/mpeg')).toBe('audio');
    expect(kindOf('text/plain; charset=utf-8')).toBe('text');
    expect(kindOf('application/json')).toBe('text');
  });

  it('SVG, HTML e Office viram other, mesmo com extensão de imagem', () => {
    expect(kindOf('image/svg+xml', 'a.png')).toBe('other');
    expect(kindOf('text/html', 'a.txt')).toBe('other');
    expect(kindOf('application/vnd.ms-excel', 'a.pdf')).toBe('other');
    expect(kindOf(undefined, 'logo.svg')).toBe('other');
    expect(kindOf('', 'pagina.html')).toBe('other');
  });

  it('sem MIME (ou octet-stream) cai na extensão, sem caixa e ignorando a query', () => {
    expect(kindOf(undefined, 'Contrato.PDF')).toBe('pdf');
    expect(kindOf('application/octet-stream', 'foto.jpeg')).toBe('image');
    expect(kindOf(null, '/arquivos/12/relatorio.csv?inline=1')).toBe('text');
    expect(kindOf(undefined, 'musica.m4a')).toBe('audio');
    expect(kindOf(undefined, 'sem-extensao')).toBe('other');
  });
});

describe('formatFileSize', () => {
  it('formata em pt-BR e ignora o inválido', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1,5 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatFileSize(undefined)).toBe('');
    expect(formatFileSize(-1)).toBe('');
  });
});

describe('opções, PDF e zoom', () => {
  it('as camadas de opções somam e undefined não apaga', () => {
    expect(
      resolveViewerOptions({ pdf: 'link' }, { download: false, pdf: undefined }),
    ).toMatchObject({ pdf: 'link', download: false, loadTimeout: 20_000, maxTextBytes: 1_048_576 });
  });

  it('PDF: auto não embute em toque nem sem leitor; embed e link mandam', () => {
    expect(canEmbedPdf('auto', { coarse: false, viewerEnabled: true })).toBe(true);
    expect(canEmbedPdf('auto', { coarse: false, viewerEnabled: undefined })).toBe(true);
    expect(canEmbedPdf('auto', { coarse: true, viewerEnabled: true })).toBe(false);
    expect(canEmbedPdf('auto', { coarse: false, viewerEnabled: false })).toBe(false);
    expect(canEmbedPdf('embed', { coarse: true, viewerEnabled: false })).toBe(true);
    expect(canEmbedPdf('link', { coarse: false, viewerEnabled: true })).toBe(false);
  });

  it('passos de zoom sobem e descem até os limites', () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(0.25, -1)).toBe(0.25);
    expect(stepZoom(8, 1)).toBe(16);
    expect(stepZoom(16, 1)).toBe(16);
    expect(stepZoom(1.2, 1)).toBe(1.5);
  });

  it('tamanho real e giro', () => {
    expect(actualSizeZoom(1600, 800)).toBe(2);
    expect(actualSizeZoom(0, 800)).toBe(1);
    expect(nextRotation(270)).toBe(0);
    expect(nextRotation(0)).toBe(90);
  });

  it('o deslocamento fica dentro do que sobra da imagem ampliada', () => {
    const stage = { width: 400, height: 300 };
    const image = { width: 400, height: 200 };
    expect(clampPan(500, 500, 1, stage, image)).toEqual({ x: 0, y: 0 });
    expect(clampPan(500, 500, 2, stage, image)).toEqual({ x: 200, y: 50 });
    expect(clampPan(-500, -500, 2, stage, image)).toEqual({ x: -200, y: -50 });
    // De lado, largura e altura da imagem trocam.
    expect(clampPan(500, 500, 2, stage, image, 90)).toEqual({ x: 0, y: 250 });
  });
});

const ctx = (over: Partial<ViewerKeyContext>): ViewerKeyContext => ({
  key: '',
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  kind: 'pdf',
  index: 1,
  total: 3,
  rtl: false,
  blocked: false,
  ...over,
});

describe('viewerKeyAction', () => {
  it('setas, PageUp/PageDown, Home e End navegam sem passar das pontas', () => {
    expect(viewerKeyAction(ctx({ key: 'ArrowRight' }))).toEqual({ type: 'go', index: 2 });
    expect(viewerKeyAction(ctx({ key: 'PageDown', index: 2 }))).toEqual({ type: 'go', index: 2 });
    expect(viewerKeyAction(ctx({ key: 'ArrowLeft' }))).toEqual({ type: 'go', index: 0 });
    expect(viewerKeyAction(ctx({ key: 'PageUp', index: 0 }))).toEqual({ type: 'go', index: 0 });
    expect(viewerKeyAction(ctx({ key: 'Home' }))).toEqual({ type: 'go', index: 0 });
    expect(viewerKeyAction(ctx({ key: 'End' }))).toEqual({ type: 'go', index: 2 });
  });

  it('da direita para a esquerda as setas trocam de sentido', () => {
    expect(viewerKeyAction(ctx({ key: 'ArrowLeft', rtl: true }))).toEqual({ type: 'go', index: 2 });
  });

  it('com o foco num controle que usa as teclas, ou com modificador, não age', () => {
    expect(viewerKeyAction(ctx({ key: 'ArrowRight', blocked: true }))).toBeNull();
    expect(viewerKeyAction(ctx({ key: 'ArrowRight', ctrlKey: true }))).toBeNull();
    expect(viewerKeyAction(ctx({ key: 'a' }))).toBeNull();
  });

  it('imagem: + - 0 1 R e Shift+setas; em outros tipos essas teclas não valem', () => {
    const img = (key: string, shiftKey = false) => ctx({ key, shiftKey, kind: 'image' });
    expect(viewerKeyAction(img('+'))).toEqual({ type: 'zoom-in' });
    expect(viewerKeyAction(img('-'))).toEqual({ type: 'zoom-out' });
    expect(viewerKeyAction(img('0'))).toEqual({ type: 'zoom-fit' });
    expect(viewerKeyAction(img('1'))).toEqual({ type: 'zoom-actual' });
    expect(viewerKeyAction(img('r'))).toEqual({ type: 'rotate' });
    expect(viewerKeyAction(img('ArrowLeft', true))).toEqual({ type: 'pan', dx: -40, dy: 0 });
    expect(viewerKeyAction(img('ArrowDown', true))).toEqual({ type: 'pan', dx: 0, dy: 40 });
    expect(viewerKeyAction(ctx({ key: '+', kind: 'video' }))).toBeNull();
  });

  it('blocksViewerKeys reconhece vídeo, campo e o texto rolável', () => {
    document.body.innerHTML =
      '<video id="v"></video><pre class="eds-viewer-text"><b id="b"></b></pre><button id="x"></button>';
    expect(blocksViewerKeys(document.getElementById('v'))).toBe(true);
    expect(blocksViewerKeys(document.getElementById('b'))).toBe(true);
    expect(blocksViewerKeys(document.getElementById('x'))).toBe(false);
    expect(blocksViewerKeys(null)).toBe(false);
    document.body.innerHTML = '';
  });
});

describe('readTextLimited', () => {
  const answer = (body: string, init?: ResponseInit) =>
    vi.fn().mockResolvedValue(new Response(body, init));

  it('lê o texto até o limite', async () => {
    vi.stubGlobal('fetch', answer('olá, mundo'));
    await expect(readTextLimited('/a.txt', 100)).resolves.toBe('olá, mundo');
    vi.unstubAllGlobals();
  });

  it('recusa o que passa do limite (cabeçalho ou leitura) e a resposta com erro', async () => {
    vi.stubGlobal('fetch', answer('x'.repeat(50)));
    await expect(readTextLimited('/a.txt', 10)).rejects.toMatchObject({ reason: 'too-large' });
    vi.stubGlobal('fetch', answer('x', { headers: { 'content-length': '999' } }));
    await expect(readTextLimited('/a.txt', 10)).rejects.toBeInstanceOf(ViewerLoadError);
    vi.stubGlobal('fetch', answer('no', { status: 500 }));
    await expect(readTextLimited('/a.txt', 10)).rejects.toMatchObject({ reason: 'network' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(readTextLimited('/a.txt', 10)).rejects.toMatchObject({ reason: 'network' });
    vi.unstubAllGlobals();
  });
});
