import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tag } from '.';

describe('Tag', () => {
  it('é um span não interativo com tom por classe', () => {
    render(<Tag tone="info">Financeiro</Tag>);
    const tag = screen.getByText('Financeiro');
    expect(tag).toHaveClass('eds-tag');
    expect(tag).toHaveClass('eds-tag-info');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('neutro (padrão) não escreve classe de tom', () => {
    render(<Tag>Interno</Tag>);
    expect(screen.getByText('Interno')).not.toHaveClass('eds-tag-neutral');
  });

  it('removível: botão "Remover X" e callback', async () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Prioridade alta</Tag>);
    const remove = screen.getByRole('button', { name: 'Remover Prioridade alta' });
    expect(remove).toHaveClass('eds-tag-remove');
    await userEvent.setup().click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('removeLabel e texts', () => {
    render(
      <>
        <Tag onRemove={() => undefined} removeLabel="Remover área Jurídico">
          <b>Jurídico</b>
        </Tag>
        <Tag onRemove={() => undefined} texts={{ remove: (l) => `Delete ${l}` }}>
          Rascunho
        </Tag>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Remover área Jurídico' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Rascunho' })).toBeInTheDocument();
  });
});
