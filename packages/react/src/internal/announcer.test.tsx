import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAnnouncer } from './announcer';

const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 5)));

describe('useAnnouncer', () => {
  it('mensagens do mesmo tick são concatenadas', async () => {
    const { result } = renderHook(() => useAnnouncer());
    act(() => {
      result.current.announce('Início: 03/03/2026.');
      result.current.announce('Escolha a data final.');
    });
    await tick();
    expect(result.current.text).toBe('Início: 03/03/2026. Escolha a data final.');
  });

  it('anúncios de ticks diferentes se substituem, mesmo com timers atrasados', async () => {
    const { result } = renderHook(() => useAnnouncer());
    act(() => result.current.announce('Início: 03/03/2026.'));
    // Sem esperar nenhum setTimeout (aba em segundo plano): só microtasks.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.text).toBe('Início: 03/03/2026.');
    act(() => result.current.announce('Período: 03/03/2026 a 05/03/2026.'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.text).toBe('Período: 03/03/2026 a 05/03/2026.');
  });

  it('mensagem igual à anterior é relida', async () => {
    const { result } = renderHook(() => useAnnouncer());
    act(() => result.current.announce('Oi.'));
    await tick();
    act(() => result.current.announce('Oi.'));
    await tick();
    expect(result.current.text).toBe('');
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
    expect(result.current.text).toBe('Oi.');
  });
});
