/**
 * Endereço seguro para `href`: aceita http(s), mailto, tel e caminhos relativos (`/x`, `../x`,
 * `#x`, `?x`, `pagina.html`). Qualquer outro esquema (`javascript:`, `data:`, `vbscript:`…) é
 * recusado. Devolve o endereço sem espaços nas pontas, ou `null`.
 */
export function safeHref(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const href = raw.trim();
  if (href === '') return null;
  // Navegadores ignoram espaços e controles dentro do esquema (`java\tscript:`).
  // eslint-disable-next-line no-control-regex
  const compact = href.replace(/[\u0000- \u007f-\u009f]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme) {
    const name = (scheme[1] ?? '').toLowerCase();
    return name === 'http' || name === 'https' || name === 'mailto' || name === 'tel' ? href : null;
  }
  return href;
}
