import { getLocale } from '../core/config';
import { formatBy, FORMAT_NAMES, toDate, type FormatName } from '../core/format';
import { bindAll, type Behavior } from '../core/registry';

/**
 * Formatadores por atributo: `<span data-eds-format="currency" data-value="1280.5">R$ 1.280,50</span>`.
 * O texto do conteúdo é o fallback (sem JS, ou se o valor não for reconhecido) e serve de valor
 * quando não há `data-value`. Nomes: `currency`, `number`, `date`, `datetime`, `relative`, `cpf`,
 * `cnpj`, `cpf-cnpj`, `phone`, `cep`, `cpf-mask` (alias `mask-cpf`). Opções: `data-eds-format-decimals`, `-currency`,
 * `-style` (`short|medium|long`) e `-locale` (padrão: o do `configure`). Em `<time>`, o
 * `datetime` é preenchido. Datas relativas são calculadas uma vez no `init` (use `title` com a
 * data completa se quiser). CPF: use `cpf-mask` para exibir `***.456.789-**` (LGPD).
 */
export const formatBehavior: Behavior = {
  name: 'format',
  selector: '[data-eds-format]',
  bind(el) {
    const name = el.getAttribute('data-eds-format') ?? '';
    if (!(FORMAT_NAMES as readonly string[]).includes(name)) return;
    const raw = el.getAttribute('data-value') ?? el.textContent ?? '';
    const fallback = el.textContent ?? '';
    const decimals = el.getAttribute('data-eds-format-decimals');
    const style = el.getAttribute('data-eds-format-style');
    const text = formatBy(name as FormatName, raw.trim(), {
      locale: el.getAttribute('data-eds-format-locale') ?? getLocale(),
      currency: el.getAttribute('data-eds-format-currency') ?? undefined,
      decimals: decimals !== null && decimals.trim() !== '' ? Number(decimals) : undefined,
      style: style === 'medium' || style === 'long' || style === 'short' ? style : undefined,
    });
    if (text === '') return;
    el.textContent = text;
    if (el instanceof HTMLTimeElement && !el.hasAttribute('datetime')) {
      const date = toDate(raw.trim());
      if (date) el.setAttribute('datetime', date.toISOString());
    }
    return () => {
      el.textContent = fallback;
    };
  },
};

export function initFormat(root: ParentNode = document): () => void {
  return bindAll(root, [formatBehavior]);
}
