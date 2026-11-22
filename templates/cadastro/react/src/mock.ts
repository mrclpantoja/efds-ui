import { ceps } from './data';

/**
 * Serviço de CEP FICTÍCIO, local (nenhuma chamada sai do navegador). O pacote não consulta nada por
 * padrão: o autor escolhe o serviço. Aqui `mock/cep/{cep}` é respondido no navegador: 90010100 e
 * 88010000 existem, 99999999 simula falha de rede e o resto não é encontrado.
 */
export const CEP_URL = 'mock/cep/{cep}';

export function installMocks(): void {
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const found = /mock\/cep\/(\d+)/.exec(href);
    if (!found) return original(input, init);
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (found[1] === '99999999') throw new TypeError('Falha de rede simulada');
    return new Response(JSON.stringify(ceps[found[1] ?? ''] ?? { erro: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
