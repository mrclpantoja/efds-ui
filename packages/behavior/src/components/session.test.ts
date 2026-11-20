import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initSession, session, type SessionHandle } from './session';

const dlg = () => document.querySelector<HTMLDialogElement>('dialog[role="alertdialog"]');
const button = (label: string) =>
  [...dlg()!.querySelectorAll('button')].find((b) => b.textContent === label)!;
const status = () => dlg()?.querySelector('[role="status"]')?.textContent ?? '';

describe('sessão por inatividade', () => {
  let restore: () => void;
  let handle: SessionHandle | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
    restore = installDomPolyfills();
    localStorage.clear();
  });
  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    restore();
    vi.useRealTimers();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('não faz nada antes do aviso e abre o alertdialog faltando warnBefore', async () => {
    const onWarn = vi.fn();
    handle = session({ timeout: 120, warnBefore: 30, onWarn });
    await vi.advanceTimersByTimeAsync(89_000);
    expect(dlg()).toBeNull();
    await vi.advanceTimersByTimeAsync(1_000);
    const d = dlg()!;
    expect(d).not.toBeNull();
    expect(d.getAttribute('role')).toBe('alertdialog');
    expect(d.open).toBe(true);
    expect(onWarn).toHaveBeenCalledWith(30);
    expect(d.getAttribute('aria-labelledby')).toBeTruthy();
    expect(d.querySelector('h2')!.textContent).toBe('Sua sessão vai expirar');
    expect(document.activeElement).toBe(button('Continuar conectado'));
    // descrição falada uma vez, contagem visual escondida do leitor de tela
    expect(d.getAttribute('aria-describedby')).toBe(d.querySelector('p')!.id);
    expect(d.querySelector('.eds-visually-hidden')!.textContent).toBe('30 segundos');
    expect(d.querySelector('[data-eds-session-countdown]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('a contagem visual anda por segundo, mas o anúncio é raro', async () => {
    handle = session({ timeout: 200, warnBefore: 130 });
    await vi.advanceTimersByTimeAsync(70_000);
    const countdown = () => dlg()!.querySelector('[data-eds-session-countdown]')!.textContent;
    expect(countdown()).toBe('02:10');
    const seen: string[] = [];
    for (let i = 0; i < 125; i += 1) {
      await vi.advanceTimersByTimeAsync(1000);
      if (status() && seen[seen.length - 1] !== status()) seen.push(status());
    }
    // um por minuto cheio (120, 60) e o dos 10 s: três no total em 125 s
    expect(seen).toEqual([
      'A sessão expira em 2 minutos.',
      'A sessão expira em 1 minuto.',
      'A sessão expira em 10 segundos.',
    ]);
    expect(countdown()).toBe('00:05');
  });

  it('atividade antes do aviso reinicia a contagem; durante o aviso não', async () => {
    handle = session({ timeout: 100, warnBefore: 20 });
    await vi.advanceTimersByTimeAsync(70_000);
    document.dispatchEvent(new Event('keydown', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(70_000);
    expect(dlg()).toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(dlg()).not.toBeNull();
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(dlg()).not.toBeNull();
    expect(handle.remaining()).toBeLessThanOrEqual(15);
  });

  it('"Continuar conectado" reinicia, fecha, devolve o foco e emite', async () => {
    document.body.innerHTML = '<button id="origem">Origem</button>';
    document.getElementById('origem')!.focus();
    const onExtend = vi.fn();
    document.documentElement.addEventListener('eds:session-extend', onExtend);
    handle = session({ timeout: 100, warnBefore: 20 });
    await vi.advanceTimersByTimeAsync(80_000);
    button('Continuar conectado').click();
    expect(dlg()).toBeNull();
    expect(document.activeElement).toBe(document.getElementById('origem'));
    expect(handle.remaining()).toBe(100);
    expect(onExtend).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(70_000);
    expect(dlg()).toBeNull();
    document.documentElement.removeEventListener('eds:session-extend', onExtend);
  });

  it('Esc no aviso continua conectado', async () => {
    handle = session({ timeout: 100, warnBefore: 20 });
    await vi.advanceTimersByTimeAsync(80_000);
    dlg()!.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dlg()).toBeNull();
    expect(handle.remaining()).toBe(100);
  });

  it('ao zerar expira: onExpire, evento e logoutUrl', async () => {
    const onExpire = vi.fn();
    const onEvent = vi.fn();
    document.documentElement.addEventListener('eds:session-expire', onEvent);
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, assign },
    });
    handle = session({ timeout: 60, warnBefore: 10, onExpire, logoutUrl: '/sair' });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/sair');
    expect(dlg()).toBeNull();
    Object.defineProperty(window, 'location', { configurable: true, value: original });
    document.documentElement.removeEventListener('eds:session-expire', onEvent);
  });

  it('"Sair" expira na hora', async () => {
    const onExpire = vi.fn();
    handle = session({ timeout: 100, warnBefore: 20, onExpire });
    await vi.advanceTimersByTimeAsync(85_000);
    button('Sair').click();
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(dlg()).toBeNull();
  });

  it('sem keepAliveUrl não faz chamada de rede; com ele, avisa o servidor ao continuar', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('')));
    vi.stubGlobal('fetch', fetchMock);
    handle = session({ timeout: 100, warnBefore: 20 });
    await vi.advanceTimersByTimeAsync(85_000);
    button('Continuar conectado').click();
    expect(fetchMock).not.toHaveBeenCalled();
    handle.destroy();
    handle = session({ timeout: 100, warnBefore: 20, keepAliveUrl: '/api/sessao/renovar' });
    await vi.advanceTimersByTimeAsync(85_000);
    button('Continuar conectado').click();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      '/api/sessao/renovar',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    ]);
    vi.unstubAllGlobals();
  });

  it('sincroniza entre abas: atividade em outra aba fecha o aviso; expiração expira aqui', async () => {
    const onExpire = vi.fn();
    handle = session({ timeout: 100, warnBefore: 20, onExpire });
    await vi.advanceTimersByTimeAsync(85_000);
    expect(dlg()).not.toBeNull();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'eds-session',
        newValue: `outra-aba|activity|${Date.now()}|1`,
      }),
    );
    expect(dlg()).toBeNull();
    expect(handle.remaining()).toBe(100);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'eds-session', newValue: 'outra-aba|expired|1|2' }),
    );
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('textos configuráveis por sessão', async () => {
    handle = session({
      timeout: 60,
      warnBefore: 20,
      messages: { sessionTitle: 'Session expiring', sessionContinue: 'Stay signed in' },
    });
    await vi.advanceTimersByTimeAsync(41_000);
    expect(dlg()!.querySelector('h2')!.textContent).toBe('Session expiring');
    expect(button('Stay signed in')).toBeTruthy();
  });

  it('initSession lê os atributos do script; sem eles não liga nada', async () => {
    const stop0 = initSession(document);
    stop0();
    document.body.innerHTML =
      '<script data-eds-session-timeout="50" data-eds-session-warn="10"></script>';
    const stop = initSession(document);
    await vi.advanceTimersByTimeAsync(41_000);
    expect(dlg()).not.toBeNull();
    stop();
    expect(dlg()).toBeNull();
  });
});
