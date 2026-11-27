const REREAD_MS = 60;

let region: HTMLElement | null = null;
let sameTick = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Anúncio solto para leitor de tela (`role="status"` global e oculto, criado na primeira
 * mensagem). Mensagens do mesmo tick são concatenadas; uma igual à anterior é relida.
 * Para hooks, que não têm onde renderizar uma região própria.
 */
export function announceStatus(text: string): void {
  if (typeof document === 'undefined' || text === '') return;
  if (!region || !region.isConnected) {
    region = document.createElement('div');
    region.className = 'eds-visually-hidden';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.append(region);
  }
  const el = region;
  if (timer) clearTimeout(timer);
  timer = null;
  if (sameTick && el.textContent) {
    el.textContent = `${el.textContent} ${text}`;
    return;
  }
  sameTick = true;
  queueMicrotask(() => {
    sameTick = false;
  });
  if (el.textContent === text) {
    el.textContent = '';
    timer = setTimeout(() => {
      timer = null;
      el.textContent = text;
    }, REREAD_MS);
  } else el.textContent = text;
}
