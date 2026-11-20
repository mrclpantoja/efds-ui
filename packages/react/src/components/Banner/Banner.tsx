import { forwardRef, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { CloseGlyph } from '../../internal/glyphs';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { mergeRefs } from '../../internal/refs-d';
import { Button } from '../Button';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BannerTexts {
  /** Nome do botão de fechar. Padrão: "Fechar aviso". */
  close: string;
}

const defaultTexts: BannerTexts = { close: 'Fechar aviso' };

const KEY_PREFIX = 'eds:banner:';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function wasDismissed(id: string | undefined): boolean {
  if (!id) return false;
  try {
    return window.localStorage.getItem(`${KEY_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

interface BannerBase extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'> {
  /** Padrão: `info`. O texto deve dizer a natureza ("Manutenção", "Ambiente de homologação"). */
  tone?: BannerTone;
  /** O aviso do sistema (texto corrido; aceita `<strong>` e links). */
  children: ReactNode;
  /** Botões ou links à direita (`Button size="sm"`). */
  actions?: ReactNode;
  /** Mostra o botão de fechar. */
  dismissible?: boolean;
  /**
   * Lembra o fechamento no `localStorage` (só `1`, na chave `eds:banner:<id>`, a mesma do
   * `@eds-ui/behavior`) e não mostra o banner nas próximas visitas. Sem isso, volta a cada carga.
   */
  rememberId?: string;
  /** O banner foi fechado pelo usuário. */
  onDismiss?: () => void;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<BannerTexts>;
}

/**
 * Estático: região nomeada (`aria-label`). Inserido depois do carregamento ou que muda:
 * `live` (`role="status"`).
 */
export type BannerProps = BannerBase &
  ({ live: true; 'aria-label'?: string } | { live?: false; 'aria-label': string });

/**
 * Banner de sistema (manutenção, homologação, aviso legal): faixa de largura total no topo.
 * Ocupa o seu lugar no fluxo e empurra o conteúdo; no `AppShell`, use a prop `banner`.
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  {
    tone = 'info',
    live = false,
    actions,
    dismissible = false,
    rememberId,
    onDismiss,
    texts,
    className,
    children,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const [dismissed, setDismissed] = useState(() => dismissible && wasDismissed(rememberId));
  const innerRef = useRef<HTMLDivElement | null>(null);

  if (dismissed) return null;

  const dismiss = () => {
    const root = innerRef.current;
    const doc = root?.ownerDocument;
    let candidates: HTMLElement[] = [];
    // O foco estava no botão: segue para o próximo elemento focável depois do banner.
    if (root && doc && root.contains(doc.activeElement)) {
      candidates = Array.from(doc.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          !root.contains(el) &&
          Boolean(root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
      );
    }
    if (rememberId) {
      try {
        window.localStorage.setItem(`${KEY_PREFIX}${rememberId}`, '1');
      } catch {
        /* sem armazenamento: some só nesta visita */
      }
    }
    setDismissed(true);
    // Candidatos ocultos ou inertes não aceitam foco: tenta o seguinte, para não perdê-lo no body.
    for (const el of candidates) {
      el.focus();
      if (doc?.activeElement === el) break;
    }
    onDismiss?.();
  };

  return (
    <div
      {...rest}
      ref={mergeRefs(ref, innerRef)}
      className={cx('eds-banner', `eds-banner-${tone}`, className)}
      role={live ? 'status' : 'region'}
    >
      <p className="eds-banner-text">{children}</p>
      {actions ? <div className="eds-banner-actions">{actions}</div> : null}
      {dismissible ? (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="eds-banner-close"
          aria-label={t.close}
          onClick={dismiss}
        >
          <CloseGlyph />
        </Button>
      ) : null}
    </div>
  );
});
Banner.displayName = 'Banner';
