import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza <button type="button"> secondary md por padrão', () => {
    render(<Button>Cancelar</Button>);
    const button = screen.getByRole('button', { name: 'Cancelar' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('eds-button', 'eds-button-secondary');
    expect(button).not.toHaveClass('eds-button-md');
  });

  it.each(['primary', 'secondary', 'tertiary', 'ghost', 'danger'] as const)(
    'aplica a variante %s',
    (variant) => {
      render(<Button variant={variant}>Ação</Button>);
      expect(screen.getByRole('button')).toHaveClass(`eds-button-${variant}`);
    },
  );

  it.each(['sm', 'lg'] as const)('aplica o tamanho %s', (size) => {
    render(<Button size={size}>Ação</Button>);
    expect(screen.getByRole('button')).toHaveClass(`eds-button-${size}`);
  });

  it('mescla className, repassa ref e props nativas', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} className="extra" type="submit" data-testid="b" name="salvar">
        Salvar
      </Button>,
    );
    const button = screen.getByTestId('b');
    expect(ref.current).toBe(button);
    expect(button).toHaveClass('eds-button', 'extra');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'salvar');
  });

  it('chama onClick e respeita disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Ok</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Ok
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe('loading', () => {
    it('marca aria-busy e continua focável', () => {
      render(<Button loading>Salvar</Button>);
      const button = screen.getByRole('button', { name: 'Salvar' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeEnabled();
    });

    it('ignora clique, Enter e Espaço', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Salvar
        </Button>,
      );
      const button = screen.getByRole('button');
      await user.click(button);
      button.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('não envia o formulário', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" loading>
            Enviar
          </Button>
        </form>,
      );
      await user.click(screen.getByRole('button'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('iconOnly', () => {
    it('aplica eds-button-icon e usa o aria-label como nome', () => {
      render(
        <Button iconOnly aria-label="Editar">
          <svg aria-hidden="true" />
        </Button>,
      );
      expect(screen.getByRole('button', { name: 'Editar' })).toHaveClass('eds-button-icon');
    });

    it('exige aria-label no tipo', () => {
      // @ts-expect-error iconOnly sem aria-label não compila
      render(<Button iconOnly>x</Button>);
    });
  });

  describe('como link (href)', () => {
    it('renderiza <a> com as classes do botão e sem type', () => {
      const ref = createRef<HTMLAnchorElement>();
      render(
        <Button ref={ref} href="#contratos" variant="primary">
          Ver contratos
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Ver contratos' });
      expect(ref.current).toBe(link);
      expect(link).toHaveAttribute('href', '#contratos');
      expect(link).toHaveClass('eds-button', 'eds-button-primary');
      expect(link).not.toHaveAttribute('type');
    });

    it('desabilitado: aria-disabled, tabIndex -1 e não dispara onClick', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button href="#x" disabled onClick={onClick}>
          Indisponível
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Indisponível' });
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveAttribute('tabindex', '-1');
      await user.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('loading no link: aria-busy e clique cancelado', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button href="#x" loading onClick={onClick}>
          Abrir
        </Button>,
      );
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-busy', 'true');
      await user.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
