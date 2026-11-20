import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { SessionTimeout } from './SessionTimeout';

let restore: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
  restore = installDialogPolyfill();
  localStorage.clear();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
  localStorage.clear();
});

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe('SessionTimeout', () => {
  it('não renderiza nada antes do aviso e abre o alertdialog depois', async () => {
    const onWarn = vi.fn();
    render(<SessionTimeout timeout={100} warnBefore={20} onWarn={onWarn} />);
    await advance(70_000);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await advance(10_000);
    const dialog = screen.getByRole('alertdialog', { name: 'Sua sessão vai expirar' });
    expect(dialog).toHaveClass('eds-modal', 'eds-alert-dialog');
    expect(onWarn).toHaveBeenCalledWith(20);
    expect(dialog.querySelector('.eds-session-countdown')).toHaveAttribute('aria-hidden', 'true');
    expect(dialog.querySelector('.eds-session-countdown')).toHaveTextContent('00:20');
    expect(dialog.querySelector('.eds-visually-hidden')).toHaveTextContent('20 segundos');
    await advance(5_000);
    expect(dialog.querySelector('.eds-session-countdown')).toHaveTextContent('00:15');
  });

  it('Continuar conectado reinicia a contagem e fecha o aviso', async () => {
    render(<SessionTimeout timeout={100} warnBefore={20} />);
    await advance(85_000);
    act(() => {
      screen.getByRole('button', { name: 'Continuar conectado' }).click();
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await advance(70_000);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await advance(15_000);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('expira ao zerar e chama onExpire uma vez; Sair expira na hora', async () => {
    const onExpire = vi.fn();
    const { unmount } = render(<SessionTimeout timeout={60} warnBefore={10} onExpire={onExpire} />);
    await advance(61_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    unmount();
    localStorage.clear();
    const onExpire2 = vi.fn();
    render(<SessionTimeout timeout={60} warnBefore={20} onExpire={onExpire2} />);
    await advance(45_000);
    act(() => {
      screen.getByRole('button', { name: 'Sair' }).click();
    });
    expect(onExpire2).toHaveBeenCalledTimes(1);
  });

  it('atividade antes do aviso reinicia; sem keepAliveUrl não há chamada de rede', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<SessionTimeout timeout={100} warnBefore={20} />);
    await advance(70_000);
    act(() => {
      document.dispatchEvent(new Event('keydown', { bubbles: true }));
    });
    await advance(70_000);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keepAliveUrl é chamada ao continuar conectado', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('')));
    vi.stubGlobal('fetch', fetchMock);
    render(<SessionTimeout timeout={100} warnBefore={20} keepAliveUrl="/api/sessao" />);
    await advance(85_000);
    act(() => {
      screen.getByRole('button', { name: 'Continuar conectado' }).click();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('enabled=false não conta; texts troca os textos', async () => {
    const { rerender } = render(<SessionTimeout timeout={30} warnBefore={10} enabled={false} />);
    await advance(40_000);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    rerender(
      <SessionTimeout
        timeout={30}
        warnBefore={10}
        texts={{ title: 'Session ending', continue: 'Stay' }}
      />,
    );
    await advance(25_000);
    expect(screen.getByRole('alertdialog', { name: 'Session ending' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
  });
});
