/**
 * Consulta de CEP (sem DOM). **Nenhuma chamada externa por padrão**: sem URL configurada, não há
 * consulta. O autor escolhe o serviço (por `configure({ cepUrl })`, `data-eds-cep-url` ou a opção
 * `url` do `useCep`) e responde pelo tratamento do dado. O formato esperado é o do ViaCEP
 * (`logradouro`, `bairro`, `localidade`, `uf`, e `erro` quando não existe).
 */

export interface CepAddress {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  [key: string]: unknown;
}

export type CepResult =
  | { status: 'found'; cep: string; data: CepAddress }
  | { status: 'notfound'; cep: string }
  | { status: 'error'; cep: string };

/** Só os 8 dígitos, ou `null` se o CEP não está completo. */
export function cepDigits(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

/** Monta a URL: `{cep}` vira os 8 dígitos; sem `{cep}`, os dígitos são acrescentados. */
export function cepRequestUrl(template: string, cep: string): string {
  return template.includes('{cep}') ? template.replaceAll('{cep}', cep) : `${template}${cep}`;
}

/** `fetch` aceita só o que a especificação define; `edsLoader` é lido pelo PageLoader. */
type FetchInit = RequestInit & { edsLoader?: false };

/**
 * Consulta o CEP. Resolve sempre (nunca rejeita): `found`, `notfound` (`erro` no JSON ou 404) ou
 * `error` (rede, HTTP, JSON inválido). Cancelar por `signal` rejeita com `AbortError`, para quem
 * chamou ignorar a resposta.
 */
export async function lookupCep(
  cep: string,
  template: string,
  signal?: AbortSignal,
): Promise<CepResult> {
  if (template === '') return { status: 'error', cep };
  try {
    const init: FetchInit = { signal, headers: { Accept: 'application/json' }, edsLoader: false };
    const response = await fetch(cepRequestUrl(template, cep), init);
    if (response.status === 404) return { status: 'notfound', cep };
    if (!response.ok) return { status: 'error', cep };
    const data = (await response.json()) as CepAddress | null;
    if (!data || typeof data !== 'object') return { status: 'error', cep };
    if (data.erro === true || data.erro === 'true') return { status: 'notfound', cep };
    return { status: 'found', cep, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return { status: 'error', cep };
  }
}
