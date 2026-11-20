import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, getPaginationSlots } from './Pagination';

const texts = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('Pagination', () => {
  it('é a navegação "Paginação" com classes do core, ref e className', () => {
    const ref = createRef<HTMLElement>();
    render(<Pagination ref={ref} page={2} pageCount={5} className="extra" />);
    const nav = screen.getByRole('navigation', { name: 'Paginação' });
    expect(nav).toHaveClass('eds-pagination', 'extra');
    expect(ref.current).toBe(nav);
    expect(screen.getByText('Página 2 de 5')).toHaveClass('eds-pagination-info');
  });

  it('marca a página atual com aria-current e nomes acessíveis', () => {
    render(<Pagination page={3} pageCount={5} />);
    const current = screen.getByRole('button', { name: 'Página 3' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveClass('eds-pagination-item');
    expect(screen.getByRole('button', { name: 'Página 4' })).not.toHaveAttribute('aria-current');
  });

  it('gera reticências conforme a posição', () => {
    expect(getPaginationSlots(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getPaginationSlots(1, 25)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 25]);
    expect(getPaginationSlots(10, 25)).toEqual([
      1,
      'start-ellipsis',
      9,
      10,
      11,
      'end-ellipsis',
      25,
    ]);
    expect(getPaginationSlots(25, 25)).toEqual([1, 'start-ellipsis', 21, 22, 23, 24, 25]);

    render(<Pagination page={10} pageCount={25} showInfo={false} />);
    const nav = screen.getByRole('navigation');
    const ellipsis = nav.querySelectorAll('.eds-pagination-ellipsis');
    expect(ellipsis).toHaveLength(2);
    ellipsis.forEach((el) => expect(el).toHaveAttribute('aria-hidden', 'true'));
    expect(texts(nav).join('|')).toContain('1|…|9|10|11|…|25');
  });

  it('no limite, anterior fica aria-disabled, focável, e não dispara onPageChange', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={5} onPageChange={onPageChange} />);
    const prev = screen.getByRole('button', { name: 'Anterior' });
    expect(prev).toHaveAttribute('aria-disabled', 'true');
    expect(prev).not.toBeDisabled();
    await user.click(prev);
    prev.focus();
    await user.keyboard('{Enter}');
    expect(onPageChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Próxima' })).not.toHaveAttribute('aria-disabled');
  });

  it('próxima bloqueada na última página', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={5} pageCount={5} onPageChange={onPageChange} />);
    const next = screen.getByRole('button', { name: 'Próxima' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    await user.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('chama onPageChange com a página de destino; a atual é ignorada', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageCount={10} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    await user.click(screen.getByRole('button', { name: 'Página 5' }));
    expect(onPageChange).toHaveBeenLastCalledWith(5);
    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(onPageChange).toHaveBeenCalledTimes(3);
  });

  it('com getHref renderiza links', () => {
    render(<Pagination page={2} pageCount={4} getHref={(p) => `/lista?pagina=${p}`} />);
    expect(screen.getByRole('link', { name: 'Página 3' })).toHaveAttribute(
      'href',
      '/lista?pagina=3',
    );
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute(
      'href',
      '/lista?pagina=3',
    );
    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('aceita textos configuráveis e esconde a info', () => {
    render(
      <Pagination
        page={2}
        pageCount={3}
        showInfo={false}
        texts={{
          nav: 'Pagination',
          previous: 'Previous',
          next: 'Next',
          page: (p) => `Page ${p}`,
        }}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
    expect(screen.queryByText(/de 3/)).not.toBeInTheDocument();
  });
});
