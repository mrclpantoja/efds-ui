import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { FileViewer, useFileViewer, type ViewerItem } from '.';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const items: ViewerItem[] = [
  { src: '/f/a.pdf', name: 'Contrato.pdf', type: 'application/pdf', size: 2048 },
  { src: '/f/b.png', name: 'Fachada.png', type: 'image/png', downloadUrl: '/f/b.png?dl=1' },
  { src: '/f/c.zip', name: 'Pacote.zip', type: 'application/zip', size: 1536 },
];

const dialog = () => document.querySelector('dialog.eds-viewer') as HTMLDialogElement | null;
const q = <T extends HTMLElement = HTMLElement>(sel: string) => dialog()?.querySelector(sel) as T;
const stage = () => q('.eds-viewer-stage');

function Harness({ initial = 0, onClose }: { initial?: number; onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(initial);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ver anexos
      </button>
      <FileViewer
        items={items}
        index={index}
        open={open}
        onIndexChange={setIndex}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      />
    </>
  );
}

describe('FileViewer', () => {
  it('fechado não renderiza nada; aberto é um diálogo modal escuro nomeado pelo arquivo', () => {
    const { rerender } = render(
      <FileViewer items={items} open={false} onClose={() => undefined} />,
    );
    expect(dialog()).toBeNull();
    rerender(<FileViewer items={items} open onClose={() => undefined} />);
    const d = dialog() as HTMLDialogElement;
    expect(d.open).toBe(true);
    expect(d).toHaveAttribute('data-mode', 'dark');
    expect(screen.getByRole('dialog', { name: 'Contrato.pdf' })).toBe(d);
    expect(q('.eds-viewer-position')).toHaveTextContent('1 de 3');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fechar' }));
  });

  it('PDF vira iframe com title e fica pronto no load', () => {
    render(<FileViewer items={items} open onClose={() => undefined} />);
    const frame = q('iframe');
    expect(frame).toHaveAttribute('title', 'Contrato.pdf');
    expect(frame).toHaveAttribute('src', '/f/a.pdf');
    expect(frame).not.toHaveAttribute('sandbox');
    expect(stage()).toHaveAttribute('data-state', 'loading');
    fireEvent.load(frame);
    expect(stage()).toHaveAttribute('data-state', 'ready');
    expect(screen.getByRole('link', { name: 'Baixar' })).toHaveAttribute('href', '/f/a.pdf');
    expect(screen.queryByRole('button', { name: 'Ampliar' })).toBeNull();
  });

  it('PDF com pdf="link" mostra "Sem pré-visualização" com Baixar e Abrir', () => {
    render(<FileViewer items={items} open pdf="link" onClose={() => undefined} />);
    expect(stage()).toHaveAttribute('data-state', 'unsupported');
    expect(q('iframe')).toBeNull();
    expect(screen.getByText('Sem pré-visualização')).toBeInTheDocument();
    expect(q('.eds-empty-detail')).toHaveTextContent('Contrato.pdf · 2 KB');
    expect(q('.eds-empty-actions').querySelectorAll('a')).toHaveLength(2);
  });

  it('navegação por botões e teclado, sem laço, com anúncio e foco no outro lado', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada.png');
    expect(screen.getByRole('status')).toHaveTextContent('Arquivo 2 de 3: Fachada.png.');
    await user.keyboard('{End}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Pacote.zip');
    expect(screen.getByRole('button', { name: 'Próximo' })).toBeDisabled();
    await user.keyboard('{PageUp}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada.png');
    screen.getByRole('button', { name: 'Próximo' }).focus();
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Anterior' }));
    await user.keyboard('{Home}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Contrato.pdf');
  });

  it('sem index o componente guarda o índice e avisa onIndexChange', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <FileViewer items={items} open onClose={() => undefined} onIndexChange={onIndexChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada.png');
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('imagem: zoom, giro e ajuste por botões e teclado, com anúncio', async () => {
    const user = userEvent.setup();
    render(<Harness initial={1} />);
    const img = q<HTMLImageElement>('.eds-viewer-image');
    expect(img).toHaveAttribute('alt', 'Fachada.png');
    const zoomIn = screen.getByRole('button', { name: 'Ampliar' });
    expect(zoomIn).toHaveAttribute('aria-disabled', 'true');
    fireEvent.load(img);
    expect(stage()).toHaveAttribute('data-state', 'ready');
    expect(zoomIn).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('link', { name: 'Baixar' })).toHaveAttribute('href', '/f/b.png?dl=1');

    await user.keyboard('+');
    expect(stage().style.getPropertyValue('--_viewer-zoom')).toBe('1.5');
    expect(stage()).toHaveAttribute('data-zoomed');
    expect(screen.getByRole('status')).toHaveTextContent('Zoom 150%.');
    await user.click(zoomIn);
    expect(stage().style.getPropertyValue('--_viewer-zoom')).toBe('2');
    await user.keyboard('-');
    expect(stage().style.getPropertyValue('--_viewer-zoom')).toBe('1.5');
    await user.keyboard('r');
    expect(stage().style.getPropertyValue('--_viewer-rotate')).toBe('90deg');
    expect(stage()).toHaveAttribute('data-rotated');
    await user.click(screen.getByRole('button', { name: 'Ajustar à tela' }));
    expect(stage().style.getPropertyValue('--_viewer-zoom')).toBe('1');
    expect(stage().style.getPropertyValue('--_viewer-rotate')).toBe('0deg');
    expect(stage()).not.toHaveAttribute('data-zoomed');
    expect(screen.getByRole('status')).toHaveTextContent('Imagem ajustada à tela.');
  });

  it('Shift+setas e arrasto movem a imagem ampliada; Ctrl+roda dá zoom', async () => {
    const user = userEvent.setup();
    render(<Harness initial={1} />);
    const img = q<HTMLImageElement>('.eds-viewer-image');
    Object.defineProperty(img, 'clientWidth', { value: 800 });
    Object.defineProperty(img, 'clientHeight', { value: 400 });
    Object.defineProperty(stage(), 'clientWidth', { value: 400 });
    Object.defineProperty(stage(), 'clientHeight', { value: 300 });
    fireEvent.load(img);

    fireEvent.wheel(stage(), { ctrlKey: true, deltaY: -100 });
    expect(stage().style.getPropertyValue('--_viewer-zoom')).toBe('1.5');
    fireEvent.wheel(stage(), { deltaY: -100 });
    expect(stage().style.getPropertyValue('--_viewer-zoom')).toBe('1.5');

    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(stage().style.getPropertyValue('--_viewer-x')).toBe('40px');
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada.png');

    fireEvent.pointerDown(stage(), { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    expect(stage()).toHaveAttribute('data-dragging');
    fireEvent.pointerMove(stage(), { clientX: 90, clientY: 70, pointerId: 1 });
    expect(stage().style.getPropertyValue('--_viewer-x')).toBe('30px');
    expect(stage().style.getPropertyValue('--_viewer-y')).toBe('-30px');
    fireEvent.pointerUp(stage(), { clientX: 90, clientY: 70, pointerId: 1 });
    expect(stage()).not.toHaveAttribute('data-dragging');
  });

  it('erro de imagem: Tentar de novo recarrega; o erro traz Baixar e Abrir', async () => {
    const user = userEvent.setup();
    render(<Harness initial={1} />);
    await act(async () => {
      fireEvent.error(q('.eds-viewer-image'));
    });
    expect(stage()).toHaveAttribute('data-state', 'error');
    expect(screen.getByText('Não foi possível abrir o arquivo')).toBeInTheDocument();
    expect(q('.eds-empty-actions').children).toHaveLength(3);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Não foi possível abrir Fachada.png.'),
    );
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(stage()).toHaveAttribute('data-state', 'loading');
    expect(q('.eds-viewer-image')).toHaveAttribute('src', '/f/b.png');
  });

  it('círculo depois de 300 ms e erro no tempo limite', () => {
    vi.useFakeTimers();
    render(
      <FileViewer
        items={[items[1] as ViewerItem]}
        open
        loadTimeout={2000}
        onClose={() => undefined}
      />,
    );
    expect(stage()).not.toHaveAttribute('data-slow');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(stage()).toHaveAttribute('data-slow');
    act(() => {
      vi.advanceTimersByTime(1700);
    });
    expect(stage()).toHaveAttribute('data-state', 'error');
    expect(stage()).not.toHaveAttribute('data-slow');
    expect(q('.eds-empty-text')).toHaveTextContent('demorou');
  });

  it('texto: mostra como texto, nunca como HTML; acima do limite vira erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<img src=x onerror=alert(1)> linha 2')),
    );
    const note: ViewerItem = { src: '/f/n.txt', name: 'n.txt', type: 'text/plain' };
    const { unmount } = render(<FileViewer items={[note]} open onClose={() => undefined} />);
    const pre = await screen.findByRole('region', { name: 'n.txt' });
    expect(pre.textContent).toBe('<img src=x onerror=alert(1)> linha 2');
    expect(pre.querySelector('img')).toBeNull();
    expect(stage()).toHaveAttribute('data-state', 'ready');
    unmount();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x'.repeat(5000))));
    render(<FileViewer items={[note]} open maxTextBytes={1024} onClose={() => undefined} />);
    expect(await screen.findByText(/limite de 1 KB/)).toBeInTheDocument();
    expect(stage()).toHaveAttribute('data-state', 'error');
  });

  it('vídeo e áudio com controles nativos e legendas', () => {
    const media: ViewerItem[] = [
      {
        src: '/f/v.mp4',
        name: 'V.mp4',
        type: 'video/mp4',
        poster: '/f/p.png',
        tracks: [{ src: '/f/v.vtt', kind: 'subtitles', srclang: 'pt-BR', label: 'Português' }],
      },
      { src: '/f/s.mp3', name: 'S.mp3', type: 'audio/mpeg' },
    ];
    const { rerender } = render(
      <FileViewer items={media} open index={0} onClose={() => undefined} />,
    );
    const video = q<HTMLVideoElement>('video');
    expect(video.controls).toBe(true);
    expect(video).toHaveAttribute('poster', '/f/p.png');
    expect(video.querySelector('track')).toHaveAttribute('srclang', 'pt-BR');
    fireEvent.loadedMetadata(video);
    expect(stage()).toHaveAttribute('data-state', 'ready');
    rerender(<FileViewer items={media} open index={1} onClose={() => undefined} />);
    expect(q('audio')).toHaveAttribute('aria-label', 'S.mp3');
  });

  it('opções download e openInNewTab escondem os links; o slot actions recebe o item', () => {
    render(
      <FileViewer
        items={[items[2] as ViewerItem]}
        open
        download={false}
        openInNewTab={false}
        actions={(item) => <button type="button">Aprovar {item.name}</button>}
        onClose={() => undefined}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(stage()).toHaveAttribute('data-state', 'unsupported');
    expect(screen.getByRole('button', { name: 'Aprovar Pacote.zip' })).toBeInTheDocument();
    expect(q('.eds-viewer-position')).toBeNull();
  });

  it('Esc e Fechar pedem onClose; o fundo não fecha; o foco volta a quem abriu', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Ver anexos' });
    await user.click(dialog() as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
    await user.click(opener);
    expect(dialog()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(opener);
  });

  it('textos trocáveis por texts', () => {
    render(
      <FileViewer
        items={items}
        open
        texts={{ close: 'Close', next: 'Next', position: (c, t) => `${c}/${t}` }}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(q('.eds-viewer-position')).toHaveTextContent('1/3');
  });

  it('tela cheia só aparece onde o navegador suporta', () => {
    const { unmount } = render(<FileViewer items={items} open onClose={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Tela cheia' })).toBeNull();
    unmount();
    const original = HTMLElement.prototype.requestFullscreen;
    HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    render(<FileViewer items={items} open onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    HTMLElement.prototype.requestFullscreen = original;
  });
});

describe('useFileViewer', () => {
  it('abre de qualquer lugar no índice pedido e fecha', async () => {
    const user = userEvent.setup();
    function App() {
      const viewer = useFileViewer();
      return (
        <>
          <button type="button" onClick={() => viewer.open(items, 1)}>
            Abrir segundo
          </button>
          <FileViewer {...viewer.viewerProps} />
        </>
      );
    }
    render(<App />);
    expect(dialog()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Abrir segundo' }));
    expect(q('.eds-viewer-title')).toHaveTextContent('Fachada.png');
    await user.keyboard('{ArrowRight}');
    expect(q('.eds-viewer-title')).toHaveTextContent('Pacote.zip');
    await user.keyboard('{Escape}');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir segundo' }));
  });
});
