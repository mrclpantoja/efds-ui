/**
 * Serviços FICTÍCIOS só para os exemplos vivos da documentação (nenhuma chamada sai do navegador).
 * O site não tem servidor: sem isto, os exemplos de Lookup e CEP não teriam o que consultar.
 *
 * - `/api/clientes?q=texto`: lista de clientes inventados (código e descrição).
 * - `/mock/cep/{cep}`: 90010100 e 96200000 existem (endereços inventados), 00000000 não existe,
 *   99999999 simula falha de rede e qualquer outro dá "não encontrado".
 */
const CLIENTES = [
  { code: '10', description: 'Aurora Comércio Ltda.', cidade: 'Pelotas' },
  { code: '11', description: 'Boreal Serviços', cidade: 'Rio Grande' },
  { code: '12', description: 'Cedro Alimentos', cidade: 'Bagé' },
  { code: '13', description: 'Delta Transportes', cidade: 'Santa Maria' },
  { code: '14', description: 'Estrela Papelaria', cidade: 'Pelotas' },
];

const ENDERECOS: Record<string, Record<string, string>> = {
  '90010100': {
    logradouro: 'Rua Exemplo',
    bairro: 'Centro Histórico',
    localidade: 'Cidade Exemplo',
    uf: 'RS',
  },
  '96200000': {
    logradouro: 'Avenida Modelo',
    bairro: 'Distrito Fictício',
    localidade: 'Vila Modelo',
    uf: 'RS',
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const norm = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function installDocsMocks(): void {
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin) {
      if (url.pathname === '/api/clientes') {
        const q = norm(url.searchParams.get('q') ?? '');
        await new Promise((resolve) => setTimeout(resolve, 150));
        return json(
          CLIENTES.filter(
            (c) => q === '' || norm(`${c.code} ${c.description} ${c.cidade}`).includes(q),
          ),
        );
      }
      if (url.pathname.startsWith('/mock/cep/')) {
        const cep = url.pathname.slice('/mock/cep/'.length).replace(/\D/g, '');
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (cep === '99999999') throw new TypeError('Falha de rede simulada');
        const found = ENDERECOS[cep];
        return json(found ?? { erro: true });
      }
    }
    return original(input, init);
  };
}
