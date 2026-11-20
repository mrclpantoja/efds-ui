import type { ReactNode } from 'react';
import { useAnnouncer } from '../../internal/announcer';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { Popover, type PopoverPlacement } from '../Popover';

export interface NotificationItem {
  id: string;
  title: ReactNode;
  text?: ReactNode;
  /** Hora relativa ou data exibida ("há 5 minutos"). */
  time?: ReactNode;
  /** Valor ISO do `<time datetime>`. */
  dateTime?: string;
  /** Destino. Sem `href` o item é um botão (use `onItemClick`). */
  href?: string;
  /** Não lida. A cor e o ponto reforçam; o texto "Não lida" diz. */
  unread?: boolean;
}

export interface NotificationBellTexts {
  /** Título do painel e início do nome do sino. */
  title: string;
  /** Nome do sino sem não lidas. */
  none: string;
  /** Nome do sino com 1 não lida. */
  one: string;
  /** Nome do sino com várias não lidas (`{count}`). */
  many: string;
  /** Texto de status em cada item não lido. */
  unread: string;
  markAllRead: string;
  empty: string;
  /** Anúncio ao marcar todas. */
  allRead: string;
}

const defaultTexts: NotificationBellTexts = {
  title: 'Notificações',
  none: 'Notificações, nenhuma não lida',
  one: 'Notificações, 1 não lida',
  many: 'Notificações, {count} não lidas',
  unread: 'Não lida',
  markAllRead: 'Marcar todas como lidas',
  empty: 'Você não tem notificações.',
  allRead: 'Todas as notificações marcadas como lidas.',
};

const MAX_BADGE = 99;

export interface NotificationBellProps {
  items: NotificationItem[];
  /** Uma notificação não lida foi aberta (marque-a como lida nos dados). */
  onRead?: (id: string) => void;
  /** "Marcar todas como lidas" foi acionado. */
  onReadAll?: () => void;
  /** Clique num item (link ou botão), lido ou não. */
  onItemClick?: (item: NotificationItem) => void;
  placement?: PopoverPlacement;
  className?: string;
  texts?: Partial<NotificationBellTexts>;
}

const BellGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0" />
  </svg>
);

/**
 * Sino de notificações: botão com contagem (o nome acessível leva "N não lidas") que abre um
 * Popover com a lista, "Marcar todas como lidas" e o estado vazio. O estado de leitura vem
 * dos `items` (controlado): atualize `unread` em `onRead` e `onReadAll`.
 */
export function NotificationBell({
  items,
  onRead,
  onReadAll,
  onItemClick,
  placement = 'bottom',
  className,
  texts,
}: NotificationBellProps) {
  const t = mergeTexts(defaultTexts, texts);
  const { text: status, announce } = useAnnouncer();
  const count = items.filter((item) => item.unread).length;
  const label =
    count === 0 ? t.none : count === 1 ? t.one : t.many.replace('{count}', String(count));

  return (
    <>
      <Popover
        placement={placement}
        className="eds-notifications-panel"
        aria-label={t.title}
        trigger={
          <Button
            variant="ghost"
            iconOnly
            className={cx('eds-notifications', className)}
            aria-label={label}
          >
            <BellGlyph />
            <span className="eds-notifications-count" aria-hidden="true" hidden={count === 0}>
              {count > MAX_BADGE ? `${MAX_BADGE}+` : count}
            </span>
          </Button>
        }
      >
        <div className="eds-notifications-header">
          <h2 className="eds-popover-title">{t.title}</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={count === 0}
            onClick={(event) => {
              const button = event.currentTarget;
              const panel = button.closest<HTMLElement>('.eds-popover');
              onReadAll?.();
              announce(t.allRead);
              // O botão fica desabilitado (zero não lidas): o foco vai ao primeiro item. Se quem
              // usa o componente não zerou a contagem, o botão segue ativo e o foco fica onde está.
              setTimeout(() => {
                if (button.disabled) {
                  panel?.querySelector<HTMLElement>('.eds-notification-link')?.focus();
                }
              }, 0);
            }}
          >
            {t.markAllRead}
          </Button>
        </div>
        {items.length > 0 ? (
          <ul className="eds-notifications-list">
            {items.map((item) => {
              const body = (
                <>
                  <span className="eds-notification-dot" aria-hidden="true" />
                  <span className="eds-notification-body">
                    <span className="eds-notification-status">{t.unread}</span>
                    <span className="eds-notification-title">{item.title}</span>
                    {item.text != null && (
                      <span className="eds-notification-text">{item.text}</span>
                    )}
                    {item.time != null && (
                      <time className="eds-notification-time" dateTime={item.dateTime}>
                        {item.time}
                      </time>
                    )}
                  </span>
                </>
              );
              const click = () => {
                if (item.unread) onRead?.(item.id);
                onItemClick?.(item);
              };
              return (
                <li
                  key={item.id}
                  className="eds-notification"
                  data-unread={item.unread ? 'true' : undefined}
                  data-id={item.id}
                >
                  {item.href !== undefined ? (
                    <a className="eds-notification-link" href={item.href} onClick={click}>
                      {body}
                    </a>
                  ) : (
                    <button type="button" className="eds-notification-link" onClick={click}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="eds-notifications-empty">{t.empty}</p>
        )}
      </Popover>
      <span className="eds-visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
    </>
  );
}
NotificationBell.displayName = 'NotificationBell';
