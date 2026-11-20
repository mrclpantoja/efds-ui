import { emit } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { pm } from './page-messages';
import { announce } from './status-region';

const ITEM = '.eds-notification';
const MAX_BADGE = 99;

/** Quantas notificações não lidas (`data-unread="true"`). */
function unreadOf(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(ITEM)].filter(
    (item) => item.getAttribute('data-unread') === 'true',
  );
}

/**
 * Notificações (sino): o painel é um `popover` (reuso do Popover: abrir, Esc, foco e posição) com
 * `data-eds-notifications`. O behavior liga o estado de leitura:
 * - clicar no link ou botão de um `.eds-notification[data-unread="true"]` o marca como lido
 *   (tira `data-unread`);
 * - `[data-eds-notifications-read-all]` marca todos;
 * - o botão que abre (`[popovertarget]`) ganha o nome "Notificações, N não lidas" e o
 *   `.eds-notifications-count` dentro dele mostra N (`hidden` em 0; 99+ acima de 99);
 * - sem itens, o `.eds-notifications-empty` aparece.
 * Eventos no painel: `eds:notifications-read` (`detail { id, unread }`, `id` de `data-id`) e
 * `eds:notifications-read-all` (`detail { unread }`).
 */
export const notificationsBehavior: Behavior = {
  name: 'notifications',
  selector: '[data-eds-notifications]',
  bind(panel) {
    const doc = panel.ownerDocument;
    const trigger = (): HTMLElement | null =>
      panel.id
        ? ([...doc.querySelectorAll<HTMLElement>('[popovertarget]')].find(
            (el) => el.getAttribute('popovertarget') === panel.id,
          ) ?? null)
        : null;
    const empty = panel.querySelector<HTMLElement>('.eds-notifications-empty');

    const label = (count: number): string =>
      count === 0
        ? pm('notificationsNone')
        : count === 1
          ? pm('notificationsOne')
          : pm('notificationsMany', { count });

    const render = (): number => {
      const count = unreadOf(panel).length;
      const button = trigger();
      if (button) {
        button.setAttribute('aria-label', label(count));
        const badge = button.querySelector<HTMLElement>('.eds-notifications-count');
        if (badge) {
          badge.textContent = count > MAX_BADGE ? `${MAX_BADGE}+` : String(count);
          badge.hidden = count === 0;
        }
      }
      if (empty) empty.hidden = panel.querySelector(ITEM) !== null;
      return count;
    };

    const markRead = (item: HTMLElement) => {
      item.removeAttribute('data-unread');
    };

    const onClick = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const all = event.target.closest('[data-eds-notifications-read-all]');
      if (all && panel.contains(all)) {
        const pending = unreadOf(panel);
        for (const item of pending) markRead(item);
        const unread = render();
        if (pending.length > 0) announce(pm('notificationsAllRead'));
        emit(panel, 'notifications-read-all', { unread });
        return;
      }
      const item = event.target.closest<HTMLElement>(ITEM);
      if (!item || !panel.contains(item) || item.getAttribute('data-unread') !== 'true') return;
      // Só o link ou botão do item conta (não o espaço em volta).
      if (!event.target.closest('a, button')) return;
      markRead(item);
      const unread = render();
      emit(panel, 'notifications-read', {
        id: item.getAttribute('data-id') ?? (item.id || null),
        unread,
      });
    };

    render();
    panel.addEventListener('click', onClick);
    return () => panel.removeEventListener('click', onClick);
  },
};

export function initNotifications(root: ParentNode = document): () => void {
  return bindAll(root, [notificationsBehavior]);
}
