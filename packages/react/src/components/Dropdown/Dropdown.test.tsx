import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { Button } from '../Button';
import { Dropdown, DropdownItem, DropdownSeparator } from './Dropdown';

function toggle(menu: HTMLElement, newState: 'open' | 'closed') {
  fireEvent(menu, Object.assign(new Event('toggle'), { newState, oldState: 'closed' }));
}

function setup(onOpenChange?: (open: boolean) => void) {
  render(
    <Dropdown trigger={<Button>Ações</Button>} onOpenChange={onOpenChange}>
      <DropdownItem>Editar</DropdownItem>
      <DropdownItem disabled>Duplicar</DropdownItem>
      <DropdownSeparator />
      <DropdownItem variant="danger">Excluir</DropdownItem>
    </Dropdown>,
  );
  const trigger = screen.getByRole('button', { name: 'Ações' });
  const menu = document.querySelector<HTMLElement>('.eds-dropdown')!;
  return { trigger, menu };
}

describe('Dropdown', () => {
  it('liga gatilho e menu pelo padrão disclosure, sem role="menu"', () => {
    const { trigger, menu } = setup();
    expect(trigger).toHaveAttribute('popovertarget', menu.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('popover', 'auto');
    expect(menu).toHaveAttribute('aria-labelledby', trigger.id);
    expect(menu).toHaveAttribute('role', 'group');
    expect(screen.queryByRole('menu', { hidden: true })).toBeNull();
    expect(trigger).toHaveClass('eds-button');
  });

  it('sem anchor positioning, posiciona o menu junto ao gatilho', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    onTestFinished(() => void vi.unstubAllGlobals());
    const { menu } = setup();
    expect(menu.style.getPropertyValue('--_dropdown-x')).toBe('');
    toggle(menu, 'open');
    expect(menu.style.getPropertyValue('--_dropdown-x')).not.toBe('');
    expect(menu).toHaveAttribute('data-placement');
  });

  it('com anchor positioning não escreve coordenadas', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    onTestFinished(() => void vi.unstubAllGlobals());
    const { menu } = setup();
    toggle(menu, 'open');
    expect(menu.style.getPropertyValue('--_dropdown-x')).toBe('');
  });

  it('sincroniza aria-expanded pelo evento toggle e avisa onOpenChange', () => {
    const onOpenChange = vi.fn();
    const { trigger, menu } = setup(onOpenChange);
    toggle(menu, 'open');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    toggle(menu, 'closed');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('itens ativos fecham o menu (popovertargetaction="hide") e chamam onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Dropdown trigger={<Button>Ações</Button>}>
        <DropdownItem onClick={onClick}>Editar</DropdownItem>
      </Dropdown>,
    );
    const item = document.querySelector('.eds-dropdown-item') as HTMLElement;
    const menu = document.querySelector<HTMLElement>('.eds-dropdown')!;
    expect(item).toHaveAttribute('popovertarget', menu.id);
    expect(item).toHaveAttribute('popovertargetaction', 'hide');
    expect(item).toHaveAttribute('type', 'button');
    await user.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('item desabilitado: aria-disabled, focável, não age e não fecha o menu', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Dropdown trigger={<Button>Ações</Button>}>
        <DropdownItem disabled onClick={onClick}>
          Duplicar
        </DropdownItem>
      </Dropdown>,
    );
    const item = document.querySelector('.eds-dropdown-item') as HTMLElement;
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).not.toBeDisabled();
    expect(item).not.toHaveAttribute('popovertarget');
    await user.click(item);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('variante danger e separador usam as classes do core', () => {
    setup();
    expect(screen.getByText('Excluir', { selector: 'button' })).toHaveClass(
      'eds-dropdown-item',
      'eds-dropdown-item-danger',
    );
    expect(document.querySelector('hr')).toHaveClass('eds-dropdown-separator');
  });

  it('respeita o id do gatilho, mescla className e repassa ref e props nativas', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Dropdown
        ref={ref}
        trigger={<Button id="meu-gatilho">Ações</Button>}
        className="extra"
        data-testid="menu"
      >
        <DropdownItem>Editar</DropdownItem>
      </Dropdown>,
    );
    const menu = screen.getByTestId('menu');
    expect(ref.current).toBe(menu);
    expect(menu).toHaveClass('eds-dropdown', 'extra');
    expect(menu).toHaveAttribute('aria-labelledby', 'meu-gatilho');
    expect(screen.getByRole('button', { name: 'Ações' })).toHaveAttribute('id', 'meu-gatilho');
  });

  it('com href o item é um link; fecha o menu e respeita disabled', async () => {
    const user = userEvent.setup();
    const hide = vi.fn();
    HTMLElement.prototype.hidePopover = hide;
    render(
      <Dropdown trigger={<Button>Ações</Button>}>
        <DropdownItem href="#/editar">Editar</DropdownItem>
        <DropdownItem href="#/x" disabled>
          Bloqueado
        </DropdownItem>
      </Dropdown>,
    );
    const link = screen.getByText('Editar', { selector: 'a' });
    expect(link).toHaveClass('eds-dropdown-item');
    expect(link).toHaveAttribute('href', '#/editar');
    await user.click(link);
    expect(hide).toHaveBeenCalledTimes(1);
    const blocked = screen.getByText('Bloqueado', { selector: 'a' });
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(blocked).not.toHaveAttribute('href');
    expect(blocked).toHaveAttribute('role', 'link');
    expect(blocked).toHaveAttribute('tabindex', '0');
    await user.click(blocked);
    expect(hide).toHaveBeenCalledTimes(1);
    // @ts-expect-error: limpeza do stub
    delete HTMLElement.prototype.hidePopover;
  });

  it('fecha o popover antes do onClick (o foco já voltou ao gatilho quando a ação roda)', async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    HTMLElement.prototype.hidePopover = () => void order.push('hide');
    render(
      <Dropdown trigger={<Button>Ações</Button>}>
        <DropdownItem onClick={() => order.push('click')}>Excluir</DropdownItem>
      </Dropdown>,
    );
    await user.click(screen.getByText('Excluir'));
    expect(order).toEqual(['hide', 'click']);
    // @ts-expect-error: limpeza do stub
    delete HTMLElement.prototype.hidePopover;
  });

  it('fecha o menu quando o foco sai dele e do gatilho; Tab entre gatilho e itens não fecha', () => {
    const hide = vi.fn();
    HTMLElement.prototype.hidePopover = hide;
    render(
      <>
        <Dropdown trigger={<Button>Ações</Button>}>
          <DropdownItem>Editar</DropdownItem>
        </Dropdown>
        <button type="button">Fora</button>
      </>,
    );
    const menu = document.querySelector<HTMLElement>('.eds-dropdown')!;
    toggle(menu, 'open');
    screen.getByRole('button', { name: 'Ações' }).focus();
    screen.getByText('Editar').focus();
    expect(hide).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Fora' }).focus();
    expect(hide).toHaveBeenCalledTimes(1);
    // @ts-expect-error: limpeza do stub
    delete HTMLElement.prototype.hidePopover;
  });
});
