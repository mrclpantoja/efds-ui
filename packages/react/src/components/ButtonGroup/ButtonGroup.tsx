import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

/** Um grupo precisa de nome acessível: `aria-label` ou `aria-labelledby`. */
type GroupName = { 'aria-label': string } | { 'aria-labelledby': string };

export type ButtonGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'> & GroupName;

/** Botões colados com raio só nas pontas. Filhos: `Button` (mesma variante). */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} role="group" className={cx('eds-button-group', className)} />;
});
ButtonGroup.displayName = 'ButtonGroup';
