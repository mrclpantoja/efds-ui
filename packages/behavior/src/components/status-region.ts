import { createAnnouncer, type Announcer } from '../core/status';

/**
 * Região `role="status"` global e oculta para anúncios soltos (copiado, notificações lidas,
 * sessão). Criada na primeira mensagem; se o `body` for esvaziado, é recriada.
 */
let region: HTMLElement | null = null;
let announcer: Announcer | null = null;

export function announce(text: string): void {
  if (typeof document === 'undefined') return;
  if (!region || !region.isConnected) {
    announcer?.dispose();
    region = document.createElement('div');
    region.className = 'eds-visually-hidden';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-eds-page-status', '');
    document.body.append(region);
    announcer = createAnnouncer(region);
  }
  announcer?.say(text);
}
