import { getCepUrl, getMessages } from '../core/config';
import { cepDigits, lookupCep, type CepAddress, type CepResult } from '../core/cep';
import { emit } from '../core/dom';
import { createErrorSlot } from '../core/error-slot';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

/** `logradouro:#rua,bairro:#bairro` -> pares campo do serviço / seletor do campo da página. */
function parseFill(spec: string): [string, string][] {
  return spec
    .split(',')
    .map((part) => {
      const at = part.indexOf(':');
      return at < 0
        ? null
        : ([part.slice(0, at).trim(), part.slice(at + 1).trim()] as [string, string]);
    })
    .filter((pair): pair is [string, string] => pair !== null && pair[0] !== '' && pair[1] !== '');
}

/** Põe o valor e avisa quem escuta (máscaras, validação, frameworks). */
function fill(field: HTMLElement, value: string): void {
  if (!(
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ))
    return;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * CEP: `input[data-eds-cep]` consulta o endereço quando o CEP fica completo (8 dígitos; use junto
 * com `data-eds-mask="cep"`) e preenche os campos de `data-eds-cep-fill`
 * (`logradouro:#rua,bairro:#bairro,localidade:#cidade,uf:#uf`).
 *
 * **Nenhuma chamada externa por padrão.** O serviço é escolhido pelo autor: `data-eds-cep-url`
 * (por campo) ou `configure({ cepUrl })`, com `{cep}` no lugar dos dígitos (ex.:
 * `https://viacep.com.br/ws/{cep}/json/`). Sem URL, nada acontece. O CEP é um dado pessoal
 * quando ligado a uma pessoa: a escolha do serviço é de quem implanta.
 *
 * Estados: carregando (`aria-busy` no campo e no `.eds-input-group`, e o spinner do grupo: o que o autor escreveu, com `hidden`, ou um criado), não
 * encontrado e falha de rede (`p.eds-error`, esta com "Tentar de novo"). Evento `eds:cep-lookup`
 * (`{ cep, status: 'found' | 'notfound' | 'error', data? }`).
 */
export const cepBehavior: Behavior = {
  name: 'cep',
  selector: 'input[data-eds-cep]',
  bind(el) {
    if (!(el instanceof HTMLInputElement)) return;
    const input = el;
    const fills = parseFill(input.getAttribute('data-eds-cep-fill') ?? '');
    const group = input.closest<HTMLElement>('.eds-input-group');
    const anchor = group ?? input;
    const ac = new AbortController();
    const { signal } = ac;

    const statusEl = document.createElement('span');
    statusEl.className = 'eds-visually-hidden';
    statusEl.setAttribute('role', 'status');
    anchor.after(statusEl);
    const announcer = createAnnouncer(statusEl);

    // Spinner que o autor já escreveu no grupo (`.eds-input-group-text` com `.eds-spinner`, hidden).
    const existing = group
      ? (Array.from(group.querySelectorAll<HTMLElement>('.eds-input-group-text')).find((t) =>
          t.querySelector('.eds-spinner'),
        ) ?? null)
      : null;
    let spinner: HTMLElement | null = existing;
    let controller: AbortController | null = null;
    let lastQueried = '';
    const slot = createErrorSlot(input, () => anchor);
    const clearError = () => slot.clear();
    const showError = (message: string, retry: boolean) => {
      const el = slot.show(message);
      if (retry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'eds-button eds-button-ghost eds-button-sm';
        button.textContent = getMessages().cepRetry;
        button.addEventListener('click', () => void query(true), { signal });
        // Texto e botão num só item: o `p.eds-error` é flex (ícone + texto) e separaria os dois.
        const line = document.createElement('span');
        line.append(message, ' ', button);
        el.replaceChildren(line);
      }
    };
    const setLoading = (on: boolean) => {
      if (on) {
        input.setAttribute('aria-busy', 'true');
        group?.setAttribute('aria-busy', 'true');
        if (spinner) spinner.hidden = false;
        else if (group) {
          spinner = document.createElement('span');
          spinner.className = 'eds-input-group-text eds-cep-loading';
          const dot = document.createElement('span');
          dot.className = 'eds-spinner eds-spinner-sm';
          dot.setAttribute('aria-hidden', 'true');
          spinner.append(dot);
          group.append(spinner);
        }
      } else {
        input.removeAttribute('aria-busy');
        group?.removeAttribute('aria-busy');
        if (spinner && spinner === existing) spinner.hidden = true;
        else {
          spinner?.remove();
          spinner = null;
        }
      }
    };

    const apply = (data: CepAddress) => {
      const scope: ParentNode = input.form ?? input.ownerDocument;
      for (const [key, selector] of fills) {
        const field =
          scope.querySelector<HTMLElement>(selector) ??
          input.ownerDocument.querySelector<HTMLElement>(selector);
        const value = data[key];
        if (field && value !== undefined && value !== null) fill(field, String(value));
      }
    };

    async function query(force: boolean): Promise<void> {
      const cep = cepDigits(input.value);
      if (!cep) {
        controller?.abort();
        lastQueried = '';
        clearError();
        setLoading(false);
        return;
      }
      const url = input.getAttribute('data-eds-cep-url') ?? getCepUrl();
      if (url === '') return;
      if (cep === lastQueried && !force) return;
      lastQueried = cep;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      clearError();
      setLoading(true);
      if (!existing) announcer.say(getMessages().cepLoading);
      let result: CepResult;
      try {
        result = await lookupCep(cep, url, current.signal);
      } catch {
        return; // cancelado por uma consulta mais nova
      }
      if (current.signal.aborted) return;
      setLoading(false);
      const m = getMessages();
      if (result.status === 'found') {
        apply(result.data);
        announcer.say(m.cepFilled);
        emit(input, 'cep-lookup', { cep, status: 'found', data: result.data });
      } else if (result.status === 'notfound') {
        showError(m.cepNotFound, false);
        announcer.say(m.cepNotFound);
        emit(input, 'cep-lookup', { cep, status: 'notfound' });
      } else {
        showError(m.cepError, true);
        announcer.say(m.cepError);
        emit(input, 'cep-lookup', { cep, status: 'error' });
      }
    }

    input.addEventListener('input', () => void query(false), { signal });
    input.addEventListener('change', () => void query(false), { signal });

    return () => {
      ac.abort();
      controller?.abort();
      clearError();
      setLoading(false);
      announcer.dispose();
      statusEl.remove();
    };
  },
};

export function initCep(root: ParentNode = document): () => void {
  return bindAll(root, [cepBehavior]);
}
