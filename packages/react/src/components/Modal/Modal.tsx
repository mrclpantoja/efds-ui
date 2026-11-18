import { forwardRef } from 'react';
import {
  DialogBase,
  type DialogBehaviorProps,
  type DialogNativeProps,
} from '../../internal/DialogBase';
import { cx } from '../../utils/cx';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps extends DialogBehaviorProps, DialogNativeProps {
  /** Largura. Padrão: `md`. */
  size?: ModalSize;
}

/** Modal controlado sobre `<dialog>` + `showModal()`: foco preso, Esc e retorno de foco nativos. */
export const Modal = forwardRef<HTMLDialogElement, ModalProps>(function Modal(
  { size = 'md', ...rest },
  ref,
) {
  return (
    <DialogBase
      {...rest}
      ref={ref}
      part="modal"
      rootClassName={cx('eds-modal', size !== 'md' && `eds-modal-${size}`)}
    />
  );
});
Modal.displayName = 'Modal';
