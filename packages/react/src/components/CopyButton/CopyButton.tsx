import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAnnouncer } from '../../internal/announcer';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import type { ButtonSize, ButtonVariant } from '../Button';

export interface CopyButtonTexts {
  /** Rótulo parado. */
  copy: string;
  /** Rótulo depois de copiar (2 s). */
  copied: string;
  /** Anúncio de sucesso. */
  announce: string;
  /** Anúncio de falha. */
  failed: string;
}

const defaultTexts: CopyButtonTexts = {
  copy: 'Copiar',
  copied: 'Copiado',
  announce: 'Copiado para a área de transferência.',
  failed: 'Não foi possível copiar. Selecione o texto e use Ctrl+C.',
};

/** Copia para a área de transferência (Clipboard API, com `execCommand` de reserva). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta a reserva */
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.append(area);
  try {
    area.select();
    return typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    active?.focus();
  }
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  focusable: 'false',
  'aria-hidden': true,
} as const;

interface CopyBase {
  /** Texto a copiar, ou função que o devolve na hora do clique. */
  text: string | (() => string);
  /** Chamado depois de copiar. */
  onCopy?: (text: string) => void;
  /** Chamado se a cópia falhar. */
  onCopyError?: () => void;
  /** Quanto tempo o "Copiado" fica (ms). Padrão: 2000. */
  feedbackMs?: number;
  texts?: Partial<CopyButtonTexts>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export type CopyButtonProps =
  | (CopyBase & {
      iconOnly?: false;
      /** Rótulo do botão. Padrão: `texts.copy`. */
      children?: ReactNode;
      'aria-label'?: string;
    })
  | (CopyBase & {
      /** Só ícone: exige o nome acessível, que vira "Copiado" por 2 s. */
      iconOnly: true;
      'aria-label': string;
      children?: undefined;
    });

/**
 * Botão de copiar. Depois de copiar, o rótulo vira "Copiado" por 2 s (`data-copied`) e um
 * status à parte anuncia. Só ícone (`iconOnly` + `aria-label`): o nome acessível também muda.
 */
export function CopyButton(props: CopyButtonProps) {
  const {
    text,
    onCopy,
    onCopyError,
    feedbackMs = 2000,
    texts,
    className,
    variant = 'secondary',
    size = 'sm',
    ...rest
  } = props;
  const t = mergeTexts(defaultTexts, texts);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { text: status, announce } = useAnnouncer();

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onClick = useCallback(() => {
    const value = typeof text === 'function' ? text() : text;
    void copyToClipboard(value).then((ok) => {
      if (!ok) {
        announce(t.failed);
        onCopyError?.();
        return;
      }
      setCopied(true);
      announce(t.announce);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), feedbackMs);
      onCopy?.(value);
    });
  }, [text, announce, t.failed, t.announce, onCopy, onCopyError, feedbackMs]);

  const icons = (
    <>
      <svg className="eds-copy-icon-idle" {...iconProps}>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 012-2h9" />
      </svg>
      <svg className="eds-copy-icon-done" {...iconProps}>
        <path d="M5 12l5 5 9-10" />
      </svg>
    </>
  );
  const common = {
    variant,
    size,
    className: cx('eds-copy', className),
    'data-copied': copied ? 'true' : undefined,
    disabled: rest.disabled,
    id: rest.id,
    onClick,
  };
  return (
    <>
      {rest.iconOnly ? (
        <Button {...common} iconOnly aria-label={copied ? t.copied : rest['aria-label']}>
          {icons}
        </Button>
      ) : (
        <Button {...common} aria-label={rest['aria-label']}>
          {icons}
          <span className="eds-copy-label">{copied ? t.copied : (rest.children ?? t.copy)}</span>
        </Button>
      )}
      <span className="eds-visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
    </>
  );
}
CopyButton.displayName = 'CopyButton';
