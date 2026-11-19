import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type DialogHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeRefs } from '../../internal/refs-d';
import { Spinner } from '../Spinner';

export interface PageLoaderProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  'open' | 'title' | 'aria-labelledby' | 'aria-describedby' | 'onCancel'
> {
  /** Visível ou não (`showModal()`/`close()`). A página inteira fica inerte enquanto aberto. */
  open: boolean;
  /** Título que nomeia o diálogo. Padrão: "Carregando…". */
  title?: ReactNode;
  /** Texto secundário. Padrão: "Aguarde um instante." */
  text?: ReactNode;
  /** Conteúdo extra abaixo do texto (ex.: ações de saída). */
  children?: ReactNode;
}

/**
 * Carregamento que bloqueia a página: `<dialog>` modal sem caixa, com spinner, título e texto.
 * Esc é bloqueado (só o código fecha). Enquanto aberto, o `<main>` recebe `aria-busy="true"`.
 * Para o fluxo automático (atraso, tempo mínimo, contagem de pendências) use `PageLoaderProvider`.
 */
export const PageLoader = forwardRef<HTMLDialogElement, PageLoaderProps>(function PageLoader(
  {
    open,
    title = 'Carregando…',
    text = 'Aguarde um instante.',
    className,
    children,
    onClose,
    ...rest
  },
  ref,
) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const main = document.querySelector('main');
    if (!main) return;
    const previous = main.getAttribute('aria-busy');
    main.setAttribute('aria-busy', 'true');
    return () => {
      if (previous === null) main.removeAttribute('aria-busy');
      else main.setAttribute('aria-busy', previous);
    };
  }, [open]);

  return (
    <dialog
      tabIndex={-1}
      {...rest}
      ref={mergeRefs(ref, dialogRef)}
      className={cx('eds-page-loader', className)}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onCancel={(event) => event.preventDefault()}
      onClose={(event) => {
        // Fechado pelo navegador (ex.: Esc duplo no Chrome) sem o código pedir: reabre.
        const dialog = event.currentTarget;
        if (openRef.current && !dialog.open) dialog.showModal();
        onClose?.(event);
      }}
    >
      <Spinner size="lg" decorative />
      <p className="eds-page-loader-title" id={`${id}-title`}>
        {title}
      </p>
      <p className="eds-page-loader-text" id={`${id}-text`}>
        {text}
      </p>
      {children}
    </dialog>
  );
});
PageLoader.displayName = 'PageLoader';
