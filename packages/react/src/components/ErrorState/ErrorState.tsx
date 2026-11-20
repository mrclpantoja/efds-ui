import { createElement, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';

export interface ErrorStateTexts {
  /** Botão de repetir. */
  retry: string;
}

const defaultTexts: ErrorStateTexts = { retry: 'Tentar de novo' };

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Código técnico (mono), útil para o suporte. Ex.: `Código: ERR-0042`. */
  detail?: ReactNode;
  /** Repetir a operação. Sem ele o botão não aparece. */
  onRetry?: () => void;
  /** Enquanto repete: o botão fica `aria-busy` e ignora cliques. */
  retrying?: boolean;
  /** Ações extras ao lado de "Tentar de novo" (ex.: voltar). */
  actions?: ReactNode;
  /**
   * O erro apareceu depois de uma ação do usuário: usa `role="alert"` para anunciar. Na carga
   * da página, deixe `false` (sem anúncio).
   */
  announce?: boolean;
  /** Ícone próprio (um `<svg>`); o padrão é um círculo com exclamação. */
  icon?: ReactNode;
  /** Nível do título conforme a hierarquia. Padrão: 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  texts?: Partial<ErrorStateTexts>;
}

/** Erro de carga ou operação com "Tentar de novo". Para "sem dados", use `EmptyState`. */
export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(function ErrorState(
  {
    title,
    description,
    detail,
    onRetry,
    retrying = false,
    actions,
    announce = false,
    icon,
    headingLevel = 3,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  return (
    <div
      role={announce ? 'alert' : undefined}
      {...rest}
      ref={ref}
      className={cx('eds-empty', 'eds-empty-error', className)}
    >
      {icon ?? (
        <svg
          className="eds-empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      )}
      {createElement(`h${headingLevel}`, { className: 'eds-empty-title' }, title)}
      {description != null && <p className="eds-empty-text">{description}</p>}
      {detail != null && <p className="eds-empty-detail">{detail}</p>}
      {(onRetry || actions != null) && (
        <div className="eds-empty-actions">
          {onRetry && (
            <Button variant="primary" loading={retrying} onClick={onRetry}>
              {t.retry}
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
});
ErrorState.displayName = 'ErrorState';
