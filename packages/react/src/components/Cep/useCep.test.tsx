import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCep } from './useCep';

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('useCep', () => {
  it('sem url nenhuma chamada é feita (idle)', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCep('90010-100'));
    expect(result.current.status).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('CEP incompleto não consulta', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCep('90010', { url: 'https://exemplo.test/{cep}' }));
    expect(result.current.status).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loading, depois found com o endereço', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(() =>
      json({ logradouro: 'Rua Fictícia', uf: 'RS' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() =>
      useCep('90010-100', { url: 'https://exemplo.test/{cep}/json/' }),
    );
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.data?.logradouro).toBe('Rua Fictícia');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://exemplo.test/90010100/json/');
  });

  it('não encontrado e falha de rede; retry consulta de novo', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new TypeError('rede')))
      .mockImplementationOnce(() => json({ erro: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCep('90010100', { url: 'https://exemplo.test/{cep}' }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('notfound'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('apagar o CEP volta a idle e ignora a resposta antiga', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ localidade: 'X' })),
    );
    const { result, rerender } = renderHook(
      ({ cep }) => useCep(cep, { url: 'https://exemplo.test/{cep}' }),
      {
        initialProps: { cep: '90010100' },
      },
    );
    await waitFor(() => expect(result.current.status).toBe('found'));
    rerender({ cep: '' });
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
  });
});
