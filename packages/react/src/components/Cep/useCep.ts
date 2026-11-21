import { useCallback, useEffect, useState } from 'react';
import { cepDigits, lookupCep, type CepAddress } from '@efds-ui/behavior/fields';

export type CepStatus = 'idle' | 'loading' | 'found' | 'notfound' | 'error';

export interface UseCepOptions {
  /**
   * Serviço de consulta, com `{cep}` no lugar dos 8 dígitos (ex.: `https://viacep.com.br/ws/{cep}/json/`).
   * **Sem ela nenhuma chamada é feita** (estado `idle`): o serviço é escolha de quem implanta.
   */
  url?: string;
}

export interface UseCepResult {
  status: CepStatus;
  /** Endereço (formato do ViaCEP: `logradouro`, `bairro`, `localidade`, `uf`) quando `found`. */
  data: CepAddress | null;
  /** Consulta de novo (para o botão "Tentar de novo" depois de `error`). */
  retry: () => void;
}

/**
 * Consulta o endereço de um CEP quando ele fica completo (8 dígitos). Estados: `idle` (CEP
 * incompleto ou sem `url`), `loading`, `found`, `notfound` e `error` (rede). Uma consulta nova
 * cancela a anterior. Mostre `loading` com um spinner e `notfound`/`error` num erro visível.
 */
export function useCep(cep: string, { url = '' }: UseCepOptions = {}): UseCepResult {
  const digits = cepDigits(cep);
  const [state, setState] = useState<{ key: string; status: CepStatus; data: CepAddress | null }>({
    key: '',
    status: 'idle',
    data: null,
  });
  const [attempt, setAttempt] = useState(0);
  const key = digits && url !== '' ? `${digits}|${url}|${attempt}` : '';

  useEffect(() => {
    if (!digits || url === '') return undefined;
    const controller = new AbortController();
    lookupCep(digits, url, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setState({
          key,
          status: result.status,
          data: result.status === 'found' ? result.data : null,
        });
      },
      () => undefined, // cancelada
    );
    return () => controller.abort();
  }, [digits, url, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // Resultado de outro CEP (ou CEP apagado) não vale: volta a `idle`.
  const current = state.key === key && key !== '';
  return {
    // Sem resposta para esta consulta ainda: está carregando.
    status: current ? state.status : key === '' ? 'idle' : 'loading',
    data: current ? state.data : null,
    retry,
  };
}
