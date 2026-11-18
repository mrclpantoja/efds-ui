import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { Card, CardActions, CardBody, CardFooter, CardHeader, CardLink, CardTitle } from './Card';

describe('Card', () => {
  it('renderiza a estrutura do core, com ref e className', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Card ref={ref} className="extra" aria-label="Resumo">
        <CardHeader>
          <CardTitle>Projeto Exemplo</CardTitle>
          <CardActions>
            <Button size="sm">Editar</Button>
          </CardActions>
        </CardHeader>
        <CardBody>Texto</CardBody>
        <CardFooter>Rodapé</CardFooter>
      </Card>,
    );
    const card = screen.getByRole('article');
    expect(card).toHaveClass('eds-card', 'extra');
    expect(card).not.toHaveClass('eds-card-default');
    expect(ref.current).toBe(card);
    expect(screen.getByRole('heading', { level: 3, name: 'Projeto Exemplo' })).toHaveClass(
      'eds-card-title',
    );
    expect(screen.getByText('Texto')).toHaveClass('eds-card-body');
    expect(screen.getByText('Rodapé')).toHaveClass('eds-card-footer');
    expect(screen.getByText('Editar').closest('.eds-card-actions')).not.toBeNull();
    expect(card.querySelector('header')).toHaveClass('eds-card-header');
  });

  it.each(['outlined', 'elevated'] as const)('aplica a variante %s', (variant) => {
    render(<Card variant={variant} />);
    expect(screen.getByRole('article')).toHaveClass(`eds-card-${variant}`);
  });

  it('subgrid e nível do título', () => {
    render(
      <Card subgrid>
        <CardTitle level={2}>Título</CardTitle>
      </Card>,
    );
    expect(screen.getByRole('article')).toHaveClass('eds-card-subgrid');
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('link esticado: o link é o do título e o card é interativo, não um botão', () => {
    render(
      <Card interactive>
        <CardTitle>
          <CardLink href="/relatorio">Relatório mensal</CardLink>
        </CardTitle>
        <CardFooter>
          <Button size="sm">Baixar PDF</Button>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole('article')).toHaveClass('eds-card-interactive');
    const link = screen.getByRole('link', { name: 'Relatório mensal' });
    expect(link).toHaveClass('eds-card-link');
    expect(link).toHaveAttribute('href', '/relatorio');
    expect(link.closest('h3')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument();
  });
});
