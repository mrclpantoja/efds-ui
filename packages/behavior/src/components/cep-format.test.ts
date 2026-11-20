import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init, configure, resetCepUrl } from '../index';

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const cepMarkup = (extra = '') => `
<form id="f">
  <div class="eds-field">
    <label for="cep">CEP</label>
    <div class="eds-input-group">
      <input class="eds-input" id="cep" name="cep" data-eds-cep data-eds-mask="cep" ${extra}
        data-eds-cep-fill="logradouro:#rua,bairro:#bairro,localidade:#cidade,uf:#uf" aria-describedby="cep-msg" />
      <span class="eds-input-group-text" hidden><span class="eds-spinner eds-spinner-sm"></span></span>
    </div>
    <p class="eds-error" id="cep-msg" hidden></p>
  </div>
  <input id="rua" name="rua" /><input id="bairro" name="bairro" />
  <input id="cidade" name="cidade" /><input id="uf" name="uf" />
</form>`;

const cep = () => document.getElementById('cep') as HTMLInputElement;
const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
const msg = () => document.getElementById('cep-msg') as HTMLElement;
const group = () => document.querySelector<HTMLElement>('.eds-input-group')!;

let destroy: (() => void) | undefined;
afterEach(() => {
  destroy?.();
  destroy = undefined;
  document.body.innerHTML = '';
  resetCepUrl();
  vi.unstubAllGlobals();
});

describe('CEP', () => {
  beforeEach(() => {
    document.body.innerHTML = cepMarkup();
  });

  it('sem URL configurada nenhuma chamada é feita', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    destroy = init(document);
    await userEvent.type(cep(), '90010100');
    expect(cep()).toHaveValue('90010-100');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('com a URL do autor, ao completar 8 dígitos preenche os campos e emite eds:cep-result', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(() =>
      json({
        logradouro: 'Rua Fictícia',
        bairro: 'Centro',
        localidade: 'Cidade Exemplo',
        uf: 'RS',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    destroy = init(document, { cepUrl: 'https://exemplo.test/cep/{cep}/json/' });
    const results: string[] = [];
    cep().addEventListener('eds:cep-result', (e) =>
      results.push((e as CustomEvent<{ status: string }>).detail.status),
    );
    await userEvent.type(cep(), '90010100');
    await vi.waitFor(() => expect(val('rua')).toBe('Rua Fictícia'));
    expect(val('bairro')).toBe('Centro');
    expect(val('cidade')).toBe('Cidade Exemplo');
    expect(val('uf')).toBe('RS');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://exemplo.test/cep/90010100/json/');
    expect(results).toEqual(['found']);
    expect(group()).not.toHaveAttribute('aria-busy');
    expect(cep()).not.toHaveAttribute('aria-invalid');
  });

  it('mostra o spinner e aria-busy enquanto consulta', async () => {
    let finish: (r: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((r) => (finish = r))),
    );
    destroy = init(document, { cepUrl: 'https://exemplo.test/{cep}' });
    await userEvent.type(cep(), '90010100');
    expect(group()).toHaveAttribute('aria-busy', 'true');
    expect(cep()).toHaveAttribute('aria-busy', 'true');
    expect(group().querySelector<HTMLElement>('.eds-input-group-text')!.hidden).toBe(false);
    finish(new Response(JSON.stringify({ localidade: 'X' })));
    await vi.waitFor(() => expect(group()).not.toHaveAttribute('aria-busy'));
    expect(group().querySelector<HTMLElement>('.eds-input-group-text')!.hidden).toBe(true);
  });

  it('CEP não encontrado (erro: true) mostra o erro, sem tentar de novo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ erro: true })),
    );
    destroy = init(document, { cepUrl: 'https://exemplo.test/{cep}' });
    await userEvent.type(cep(), '00000000');
    await vi.waitFor(() => expect(msg()).toHaveTextContent('CEP não encontrado.'));
    expect(msg().hidden).toBe(false);
    expect(msg().querySelector('button')).toBeNull();
    expect(cep()).toHaveAttribute('aria-invalid', 'true');
    // Apagar o CEP limpa o erro.
    await userEvent.clear(cep());
    expect(msg().hidden).toBe(true);
    expect(cep()).not.toHaveAttribute('aria-invalid');
  });

  it('falha de rede mostra o erro com "Tentar de novo", que consulta outra vez', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new TypeError('rede')))
      .mockImplementation(() => json({ logradouro: 'Rua B', uf: 'RS' }));
    vi.stubGlobal('fetch', fetchMock);
    destroy = init(document, { cepUrl: 'https://exemplo.test/{cep}' });
    await userEvent.type(cep(), '90010100');
    await vi.waitFor(() => expect(msg()).toHaveTextContent('Não foi possível consultar o CEP.'));
    const retry = msg().querySelector('button')!;
    expect(retry).toHaveTextContent('Tentar de novo');
    await userEvent.click(retry);
    await vi.waitFor(() => expect(val('rua')).toBe('Rua B'));
    expect(msg().hidden).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('data-eds-cep-url no campo vale mais que a configuração', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(() => json({ localidade: 'Y' }));
    vi.stubGlobal('fetch', fetchMock);
    document.body.innerHTML = cepMarkup('data-eds-cep-url="https://meu.test/cep?c="');
    configure({ cepUrl: 'https://outro.test/{cep}' });
    destroy = init(document);
    await userEvent.type(cep(), '90010100');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://meu.test/cep?c=90010100');
  });
});

describe('formatadores por atributo', () => {
  it('formata pelo data-value e mantém o texto de fallback se o valor não for reconhecido', () => {
    document.body.innerHTML = `
      <span id="a" data-eds-format="currency" data-value="1280.5">R$ 1280,5</span>
      <span id="b" data-eds-format="date" data-value="2026-03-15">2026-03-15</span>
      <span id="c" data-eds-format="cpf-mask">12345678900</span>
      <span id="d" data-eds-format="phone" data-value="11987654321">11987654321</span>
      <span id="e" data-eds-format="date" data-value="lixo">sem data</span>
      <time id="f" data-eds-format="date" data-value="2026-03-15">15 mar</time>
      <span id="g" data-eds-format="number" data-eds-format-decimals="1" data-value="1234.56">x</span>`;
    destroy = init(document);
    const text = (id: string) =>
      document
        .getElementById(id)!
        .textContent!.replace(new RegExp(String.fromCharCode(160), 'g'), ' ');
    expect(text('a')).toBe('R$ 1.280,50');
    expect(text('b')).toBe('15/03/2026');
    expect(text('c')).toBe('***.456.789-**');
    expect(text('d')).toBe('(11) 98765-4321');
    expect(text('e')).toBe('sem data');
    expect(document.getElementById('f')).toHaveAttribute('datetime');
    expect(text('g')).toBe('1.234,6');
  });

  it('destroy devolve o texto original', () => {
    document.body.innerHTML =
      '<span id="a" data-eds-format="cpf" data-value="12345678900">sem CPF</span>';
    destroy = init(document);
    expect(document.getElementById('a')).toHaveTextContent('123.456.789-00');
    destroy();
    destroy = undefined;
    expect(document.getElementById('a')).toHaveTextContent('sem CPF');
  });
});

describe('máscara com validação (data-eds-mask-validate)', () => {
  const field = (spec: string) => `
    <form id="f"><label for="h">Campo</label>
    <input id="h" class="eds-input" name="h" data-eds-mask="${spec}" data-eds-mask-validate /></form>`;

  it('hora fora da faixa deixa o campo inválido e mostra o erro ao sair', async () => {
    document.body.innerHTML = field('hora');
    destroy = init(document);
    const h = document.getElementById('h') as HTMLInputElement;
    await userEvent.type(h, '2599');
    expect(h.value).toBe('25:99');
    expect(h.validity.valid).toBe(false);
    await userEvent.tab();
    const error = document.querySelector('p.eds-error')!;
    expect(error).toHaveTextContent('Hora inválida');
    expect(h).toHaveAttribute('aria-invalid', 'true');
    await userEvent.clear(h);
    await userEvent.type(h, '2359');
    expect(h.validity.valid).toBe(true);
    expect(document.querySelector('p.eds-error')).toBeNull();
  });

  it('sem o atributo a máscara não valida', async () => {
    document.body.innerHTML = field('hora').replace('data-eds-mask-validate', '');
    destroy = init(document);
    const h = document.getElementById('h') as HTMLInputElement;
    await userEvent.type(h, '2599');
    expect(h.validity.valid).toBe(true);
  });

  it('competência: mês 13 é inválido', async () => {
    document.body.innerHTML = field('competencia');
    destroy = init(document);
    const h = document.getElementById('h') as HTMLInputElement;
    await userEvent.type(h, '132026');
    expect(h.validationMessage).toContain('Competência inválida');
  });
});
