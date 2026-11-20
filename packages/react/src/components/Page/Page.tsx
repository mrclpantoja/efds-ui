import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export type PageProps = HTMLAttributes<HTMLDivElement>;

/** Layout de página: cabeçalho, barra de ferramentas, corpo e rodapé empilhados. */
export const Page = forwardRef<HTMLDivElement, PageProps>(function Page(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-page', className)} />;
});
Page.displayName = 'Page';

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Título da página (o único `<h1>`). */
  title: ReactNode;
  description?: ReactNode;
  /** Um `<Breadcrumb>`. */
  breadcrumb?: ReactNode;
  /** Botões de ação da página; descem para baixo do título em contêiner estreito. */
  actions?: ReactNode;
  /** Selos e informações curtas abaixo da descrição (situação, atualização). */
  meta?: ReactNode;
  /**
   * Fixa o cabeçalho no topo da área de rolagem. O cabeçalho pode cobrir o campo focado (WCAG
   * 2.4.11): dê `scroll-padding-block-start` à área que rola, da altura do cabeçalho.
   */
  sticky?: boolean;
}

export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  { title, description, breadcrumb, actions, meta, sticky = false, className, ...rest },
  ref,
) {
  return (
    <header
      {...rest}
      ref={ref}
      className={cx('eds-page-header', sticky && 'eds-page-header-sticky', className)}
    >
      {breadcrumb}
      <div className="eds-page-heading">
        <h1 className="eds-page-title">{title}</h1>
        {description !== undefined && <p className="eds-page-description">{description}</p>}
        {meta !== undefined && <div className="eds-page-meta">{meta}</div>}
      </div>
      {actions !== undefined && <div className="eds-page-actions">{actions}</div>}
    </header>
  );
});
PageHeader.displayName = 'PageHeader';

export type PageToolbarProps = HTMLAttributes<HTMLDivElement>;

/** Faixa de filtros e ferramentas entre o cabeçalho e o corpo. */
export const PageToolbar = forwardRef<HTMLDivElement, PageToolbarProps>(function PageToolbar(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-page-toolbar', className)} />;
});
PageToolbar.displayName = 'PageToolbar';

export type PageBodyProps = HTMLAttributes<HTMLDivElement>;

export const PageBody = forwardRef<HTMLDivElement, PageBodyProps>(function PageBody(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-page-body', className)} />;
});
PageBody.displayName = 'PageBody';

export type PageFooterProps = HTMLAttributes<HTMLElement>;

/** Rodapé da página (paginação, totais). */
export const PageFooter = forwardRef<HTMLElement, PageFooterProps>(function PageFooter(
  { className, ...rest },
  ref,
) {
  return <footer {...rest} ref={ref} className={cx('eds-page-footer', className)} />;
});
PageFooter.displayName = 'PageFooter';
