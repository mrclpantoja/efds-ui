import { createRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Dropdown, DropdownItem } from '../Dropdown';
import { Popover } from './Popover';

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover;
  delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover;
});

function stubPopover() {
  const show = vi.fn();
  const hide = vi.fn();
  HTMLElement.prototype.showPopover = show;
  HTMLElement.prototype.hidePopover = hide;
  return { show, hide };
}

describe('Popover: abertura', () => {
  it('defaultOpen abre ao montar e repassa o ref ao painel', () => {
    const { show } = stubPopover();
    const ref = createRef<HTMLDivElement>();
    render(
      <Popover ref={ref} trigger={<Button>Ajuda</Button>} aria-label="Ajuda" defaultOpen>
        x
      </Popover>,
    );
    expect(show).toHaveBeenCalledTimes(1);
    expect(ref.current).toBe(document.querySelector('.eds-popover'));
  });

  it('sem defaultOpen nem open, não abre sozinho', () => {
    const { show } = stubPopover();
    render(
      <Popover trigger={<Button>Ajuda</Button>} aria-label="Ajuda">
        x
      </Popover>,
    );
    expect(show).not.toHaveBeenCalled();
  });
});

describe('Dropdown: abertura', () => {
  it('defaultOpen abre ao montar', () => {
    const { show } = stubPopover();
    render(
      <Dropdown trigger={<Button>Ações</Button>} defaultOpen>
        <DropdownItem>Editar</DropdownItem>
      </Dropdown>,
    );
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('open controlado abre e fecha o popover', () => {
    const { show, hide } = stubPopover();
    const menu = (open: boolean) => (
      <Dropdown trigger={<Button>Ações</Button>} open={open}>
        <DropdownItem>Editar</DropdownItem>
      </Dropdown>
    );
    const { rerender } = render(menu(false));
    expect(show).not.toHaveBeenCalled();
    const el = document.querySelector<HTMLElement>('.eds-dropdown')!;
    el.matches = ((selector: string) =>
      selector === ':popover-open') as unknown as typeof el.matches;
    rerender(menu(true));
    expect(show).not.toHaveBeenCalled();
    el.matches = (() => false) as unknown as typeof el.matches;
    rerender(menu(false));
    rerender(menu(true));
    expect(show).toHaveBeenCalledTimes(1);
    el.matches = ((selector: string) =>
      selector === ':popover-open') as unknown as typeof el.matches;
    rerender(menu(false));
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
