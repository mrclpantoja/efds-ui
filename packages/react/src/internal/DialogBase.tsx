import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type DialogHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { cx } from '../utils/cx';
import { Button } from '../components/Button';
import { CloseGlyph } from './glyphs';
import { useScrollRegion } from './useScrollRegion';

export interface DialogBehaviorProps {
  /** Abertura controlada: `true` chama `showModal()`, `false` chama `close()`. */
  open: boolean;
  /**
   * Pedido de fechamento (Esc, botão Fechar, backdrop). O componente não se fecha sozinho:
   * quem controla deve passar `open={false}`.
   */
  onClose: () => void;
  /** Título (obrigatório: nomeia o diálogo via `aria-labelledby`). */
  title: ReactNode;
  /** Rodapé com as ações. Omitido, o rodapé não é renderizado. */
  footer?: ReactNode;
  /** Nome acessível do botão de fechar. Padrão: "Fechar". */
  closeLabel?: string;
  /**
   * Fecha ao clicar no backdrop, só se `pointerdown` e `click` ocorreram no próprio `<dialog>`
   * (WCAG 2.5.2). Padrão: `true`. Em formulário com dados a perder, use `false`.
   */
  closeOnBackdrop?: boolean;
  /**
   * Elemento que recebe o foco ao abrir. Padrão: o elemento com `data-autofocus` e, na falta,
   * o foco nativo do `showModal()` (primeiro focável, em geral o Fechar).
   * `autoFocus` do React só age na montagem, por isso não serve aqui.
   */
  initialFocus?: RefObject<HTMLElement | null>;
}

export type DialogNativeProps = Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  'open' | 'title' | 'onClose' | 'onCancel' | 'aria-labelledby'
>;

interface DialogBaseProps extends DialogBehaviorProps, DialogNativeProps {
  part: 'modal' | 'drawer';
  rootClassName: string;
}

/** Casca compartilhada por Modal e Drawer: `<dialog>` + `showModal()` e as partes do core. */
export const DialogBase = forwardRef<HTMLDialogElement, DialogBaseProps>(function DialogBase(
  {
    part,
    rootClassName,
    open,
    onClose,
    title,
    footer,
    closeLabel = 'Fechar',
    closeOnBackdrop = true,
    initialFocus,
    className,
    children,
    ...rest
  },
  ref,
) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const onCloseRef = useRef(onClose);
  const initialFocusRef = useRef(initialFocus);
  useEffect(() => {
    openRef.current = open;
    onCloseRef.current = onClose;
    initialFocusRef.current = initialFocus;
  });

  const setRefs = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // `open` (prop) -> showModal()/close(), com foco inicial depois de abrir.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const target =
        initialFocusRef.current?.current ?? dialog.querySelector<HTMLElement>('[data-autofocus]');
      target?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Esc (cancel) e fechamento nativo viram onClose; o estado segue com quem controla.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const onNativeClose = () => {
      if (dialog.open) return;
      // Fechado pela prop (open=false) não é pedido do usuário.
      if (!openRef.current) return;
      onCloseRef.current();
      // O 2º Esc sem nova ativação do usuário fecha o dialog nativamente (cancel não cancelável).
      // Se quem controla manteve open=true, o dialog é reaberto: a prop manda.
      // Espera o React confirmar o setState do consumidor (open=false) antes de decidir.
      setTimeout(() => {
        if (openRef.current && !dialog.open && dialog.isConnected) dialog.showModal();
      }, 50);
    };
    dialog.addEventListener('cancel', onCancel);
    // O atributo `open` é a fonte da verdade: o evento `close` é assíncrono e pode não disparar
    // com a aba oculta.
    const observer = new MutationObserver(onNativeClose);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      observer.disconnect();
    };
  }, []);

  // Backdrop: pointerdown E click no próprio <dialog> (arrastar seleção de dentro para fora não fecha).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !closeOnBackdrop) return;
    let downOnDialog = false;
    const onDown = (event: Event) => {
      downOnDialog = event.target === dialog;
    };
    const onClick = (event: Event) => {
      if (downOnDialog && event.target === dialog) onCloseRef.current();
      downOnDialog = false;
    };
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('click', onClick);
    };
  }, [closeOnBackdrop]);

  useScrollRegion(bodyRef, titleId);

  return (
    <dialog
      {...rest}
      ref={setRefs}
      className={cx(rootClassName, className)}
      aria-labelledby={titleId}
    >
      <header className={`eds-${part}-header`}>
        <h2 className={`eds-${part}-title`} id={titleId}>
          {title}
        </h2>
        <Button variant="ghost" iconOnly aria-label={closeLabel} onClick={() => onClose()}>
          <CloseGlyph />
        </Button>
      </header>
      <div ref={bodyRef} className={`eds-${part}-body`}>
        {children}
      </div>
      {footer ? <footer className={`eds-${part}-footer`}>{footer}</footer> : null}
    </dialog>
  );
});
