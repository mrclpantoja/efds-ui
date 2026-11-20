import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Accordion, AccordionItem } from './Accordion';

describe('Accordion', () => {
  it('emite details/summary com as classes do core e repassa ref e className', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Accordion ref={ref} className="x" flush>
        <AccordionItem title="Prazos" defaultOpen>
          Cinco dias úteis.
        </AccordionItem>
      </Accordion>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('eds-accordion', 'eds-accordion-flush', 'x');
    const details = root.querySelector('details') as HTMLDetailsElement;
    expect(details).toHaveClass('eds-accordion-item');
    expect(details.open).toBe(true);
    expect(details.querySelector('summary')).toHaveClass('eds-accordion-trigger');
    expect(details.querySelector('.eds-accordion-panel')).toHaveTextContent('Cinco dias úteis.');
    expect(details).not.toHaveAttribute('name');
  });

  it('exclusive dá o mesmo name a todos os itens', () => {
    const { container } = render(
      <Accordion exclusive>
        <AccordionItem title="A">a</AccordionItem>
        <AccordionItem title="B">b</AccordionItem>
      </Accordion>,
    );
    const names = Array.from(container.querySelectorAll('details')).map((d) =>
      d.getAttribute('name'),
    );
    expect(names[0]).toBeTruthy();
    expect(names[0]).toBe(names[1]);
  });

  it('alterna por clique e avisa onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Accordion>
        <AccordionItem title="Pergunta" onOpenChange={onOpenChange}>
          Resposta
        </AccordionItem>
      </Accordion>,
    );
    await user.click(screen.getByText('Pergunta'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByText('Pergunta'));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('controlado: open manda no estado', () => {
    const { rerender, container } = render(
      <Accordion>
        <AccordionItem title="P" open={false}>
          r
        </AccordionItem>
      </Accordion>,
    );
    const details = container.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    rerender(
      <Accordion>
        <AccordionItem title="P" open>
          r
        </AccordionItem>
      </Accordion>,
    );
    expect(details.open).toBe(true);
  });

  it('disabled marca aria-disabled e não alterna', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Accordion>
        <AccordionItem title="Indisponível" disabled>
          r
        </AccordionItem>
      </Accordion>,
    );
    const summary = screen.getByText('Indisponível');
    expect(summary).toHaveAttribute('aria-disabled', 'true');
    await user.click(summary);
    expect((container.querySelector('details') as HTMLDetailsElement).open).toBe(false);
  });
});
