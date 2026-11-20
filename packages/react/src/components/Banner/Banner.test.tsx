import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Banner } from '.';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Banner', () => {
  it('estático: região nomeada com tom, texto e ação', () => {
    render(
      <Banner aria-label="Aviso do sistema" tone="warning" actions={<a href="#x">Saiba mais</a>}>
        <strong>Manutenção.</strong> Sábado às 22h.
      </Banner>,
    );
    const region = screen.getByRole('region', { name: 'Aviso do sistema' });
    expect(region).toHaveClass('eds-banner', 'eds-banner-warning');
    expect(region.querySelector('.eds-banner-text')).toHaveTextContent(
      'Manutenção. Sábado às 22h.',
    );
    expect(region.querySelector('.eds-banner-actions a')).toHaveTextContent('Saiba mais');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('dinâmico usa role=status', () => {
    render(<Banner live>Conexão restabelecida.</Banner>);
    expect(screen.getByRole('status')).toHaveClass('eds-banner-info');
  });

  it('dispensável: fecha, lembra por id, move o foco e avisa', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <Banner aria-label="Homologação" dismissible rememberId="homolog" onDismiss={onDismiss}>
          Ambiente de homologação.
        </Banner>
        <a href="#depois">depois</a>
      </>,
    );
    const close = screen.getByRole('button', { name: 'Fechar aviso' });
    expect(close).toHaveClass('eds-banner-close');
    await user.click(close);
    expect(screen.queryByRole('region')).toBeNull();
    expect(localStorage.getItem('eds:banner:homolog')).toBe('1');
    expect(screen.getByText('depois')).toHaveFocus();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('já fechado antes não aparece; sem rememberId volta a cada carga', () => {
    localStorage.setItem('eds:banner:homolog', '1');
    const { unmount } = render(
      <Banner aria-label="H" dismissible rememberId="homolog">
        x
      </Banner>,
    );
    expect(screen.queryByRole('region')).toBeNull();
    unmount();
    render(
      <Banner aria-label="H" dismissible>
        x
      </Banner>,
    );
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('armazenamento indisponível não impede de fechar; texto do botão configurável', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });
    render(
      <Banner aria-label="H" dismissible rememberId="a" texts={{ close: 'Dismiss' }}>
        x
      </Banner>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('region')).toBeNull();
  });
});
