import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Page, PageBody, PageFooter, PageHeader, PageToolbar } from './Page';

describe('Page', () => {
  it('compõe cabeçalho, ferramentas, corpo e rodapé com as classes do core', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <Page>
        <PageHeader
          ref={ref}
          title="Pedidos"
          description="Acompanhe os pedidos."
          breadcrumb={<nav aria-label="Trilha" />}
          meta={<span>Atualizado às 14:32</span>}
          actions={<button type="button">Novo</button>}
          sticky
        />
        <PageToolbar>filtros</PageToolbar>
        <PageBody>tabela</PageBody>
        <PageFooter>paginação</PageFooter>
      </Page>,
    );
    expect(container.firstElementChild).toHaveClass('eds-page');
    const header = container.querySelector('header') as HTMLElement;
    expect(ref.current).toBe(header);
    expect(header).toHaveClass('eds-page-header', 'eds-page-header-sticky');
    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toHaveClass(
      'eds-page-title',
    );
    expect(header.querySelector('.eds-page-heading > .eds-page-description')).toHaveTextContent(
      'Acompanhe os pedidos.',
    );
    expect(header.querySelector('.eds-page-meta')).toHaveTextContent('Atualizado');
    expect(header.querySelector('.eds-page-actions')).toHaveTextContent('Novo');
    expect(container.querySelector('.eds-page-toolbar')).toHaveTextContent('filtros');
    expect(container.querySelector('.eds-page-body')).toHaveTextContent('tabela');
    expect(container.querySelector('footer')).toHaveClass('eds-page-footer');
  });

  it('só renderiza o que foi dado', () => {
    const { container } = render(<PageHeader title="Só título" />);
    expect(container.querySelector('.eds-page-description')).toBeNull();
    expect(container.querySelector('.eds-page-actions')).toBeNull();
    expect(container.querySelector('.eds-page-meta')).toBeNull();
    expect(container.querySelector('header')).not.toHaveClass('eds-page-header-sticky');
  });
});
