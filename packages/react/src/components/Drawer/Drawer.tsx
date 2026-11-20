import { forwardRef } from 'react';
import {
  DialogBase,
  type DialogBehaviorProps,
  type DialogShellTexts,
  type DialogNativeProps,
} from '../../internal/DialogBase';
import { cx } from '../../utils/cx';

export type DrawerPlacement = 'start' | 'end';

/** Textos internos do Drawer (`close`). */
export type DrawerTexts = DialogShellTexts;

export interface DrawerProps extends DialogBehaviorProps, DialogNativeProps {
  /** Borda de ancoragem. Padrão: `end` (direita em LTR). */
  placement?: DrawerPlacement;
}

/** Drawer controlado sobre `<dialog>` + `showModal()`: mesmo comportamento do Modal. */
export const Drawer = forwardRef<HTMLDialogElement, DrawerProps>(function Drawer(
  { placement = 'end', ...rest },
  ref,
) {
  return (
    <DialogBase
      {...rest}
      ref={ref}
      part="drawer"
      rootClassName={cx('eds-drawer', placement === 'start' && 'eds-drawer-start')}
    />
  );
});
Drawer.displayName = 'Drawer';
