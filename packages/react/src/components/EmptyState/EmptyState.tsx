import {
  cloneElement,
  createElement,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Ícone (um `<svg>`): recebe `.eds-empty-icon` e `aria-hidden`. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Botões/links de ação. */
  actions?: ReactNode;
  /** Nível do título conforme a hierarquia onde aparece. Padrão: 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/** Estado vazio. Dentro de Table, use `<TableEmpty>`. */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon, title, description, actions, headingLevel = 3, className, ...rest },
  ref,
) {
  return (
    <div {...rest} ref={ref} className={cx('eds-empty', className)}>
      {isValidElement(icon)
        ? cloneElement(icon as ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
            className: cx('eds-empty-icon', (icon.props as { className?: string }).className),
            'aria-hidden': true,
          })
        : icon}
      {createElement(`h${headingLevel}`, { className: 'eds-empty-title' }, title)}
      {description != null ? <p className="eds-empty-text">{description}</p> : null}
      {actions != null ? <div className="eds-empty-actions">{actions}</div> : null}
    </div>
  );
});
EmptyState.displayName = 'EmptyState';
