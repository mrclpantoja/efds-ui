import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DescriptionList } from '.';

describe('DescriptionList', () => {
  const items = [
    { label: 'Número', value: 'PED-0001' },
    { label: 'Observação', value: '' },
    { label: 'Situação', value: <span>Pago</span> },
  ];

  it('dl com div > dt + dd', () => {
    const { container } = render(
      <DescriptionList items={items} columns={2} orientation="horizontal" striped />,
    );
    const dl = container.querySelector('dl')!;
    expect(dl).toHaveClass(
      'eds-description-list',
      'eds-description-list-cols-2',
      'eds-description-list-horizontal',
      'eds-description-list-striped',
    );
    expect(dl.querySelectorAll(':scope > div > dt')).toHaveLength(3);
    expect(dl.querySelectorAll(':scope > div > dd')).toHaveLength(3);
    expect(screen.getByText('PED-0001').tagName).toBe('DD');
  });

  it('valor vazio mostra "—" decorativo e diz "não informado"', () => {
    const { container } = render(<DescriptionList items={items} />);
    expect(container.querySelector('.eds-description-empty')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByText('não informado')).toHaveClass('eds-visually-hidden');
  });

  it('1 coluna não escreve classe de colunas; texto configurável', () => {
    const { container } = render(
      <DescriptionList items={[{ label: 'A' }]} texts={{ empty: 'not provided' }} divided />,
    );
    expect(container.querySelector('dl')).not.toHaveClass('eds-description-list-cols-1');
    expect(container.querySelector('dl')).toHaveClass('eds-description-list-divided');
    expect(screen.getByText('not provided')).toBeInTheDocument();
  });
});
