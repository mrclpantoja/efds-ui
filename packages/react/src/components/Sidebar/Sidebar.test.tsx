import { createRef } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, AppShellHeader, AppShellNavToggle } from '../AppShell';
import { Sidebar, SidebarItem, SidebarSection } from './Sidebar';

/* jsdom não implementa a Popover API (e trata o popover fechado como oculto, daí `hidden: true`): simula só o que o componente usa (hidePopover + `toggle`). */
function fireToggle(nav: HTMLElement, newState: 'open' | 'closed') {
  // O jsdom oculta (e não deixa focar) popover fechado: tirar o atributo emula `:popover-open`.
  if (newState === 'open') nav.removeAttribute('popover');
  const event = new Event('toggle');
  Object.assign(event, { newState, oldState: newState === 'open' ? 'closed' : 'open' });
  act(() => {
    nav.dispatchEvent(event);
  });
}

beforeEach(() => {
  HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
    fireToggle(this, 'closed');
  };
});
afterEach(() => {
  // @ts-expect-error remoção do polyfill de teste
  delete HTMLElement.prototype.hidePopover;
});

function Layout({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <AppShell
      sidebar={
        <Sidebar brandLabel="Gestão Exemplo" data-testid="nav">
          <SidebarSection title="Geral">
            <SidebarItem href="#dash" current onClick={onNavigate}>
              Dashboard
            </SidebarItem>
            <SidebarItem href="#proj" onClick={onNavigate}>
              Projetos
            </SidebarItem>
          </SidebarSection>
        </Sidebar>
      }
      header={
        <AppShellHeader data-testid="header">
          <AppShellNavToggle />
        </AppShellHeader>
      }
    >
      <h1>Conteúdo</h1>
    </AppShell>
  );
}

describe('Sidebar', () => {
  it('o botão de colapsar aponta para a nav com aria-controls (avulsa e no shell)', () => {
    const { unmount } = render(<Sidebar />);
    const nav = screen.getByLabelText('Principal');
    expect(nav.id).not.toBe('');
    expect(screen.getByRole('button', { name: 'Menu lateral', hidden: true })).toHaveAttribute(
      'aria-controls',
      nav.id,
    );
    unmount();
    render(<Sidebar id="meu-menu" />);
    expect(screen.getByRole('button', { name: 'Menu lateral', hidden: true })).toHaveAttribute(
      'aria-controls',
      'meu-menu',
    );
    cleanup();
    render(<Layout />);
    const shellNav = screen.getByTestId('nav');
    expect(shellNav.id).not.toBe('');
    expect(screen.getByRole('button', { name: 'Menu lateral', hidden: true })).toHaveAttribute(
      'aria-controls',
      shellNav.id,
    );
  });

  it('é um nav popover nomeado, com seção, itens e aria-current', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Sidebar ref={ref} brandIcon={<svg />} brandLabel="Marca" className="extra">
        <SidebarSection title="Geral">
          <SidebarItem href="#a" current icon={<svg data-testid="ic" />}>
            Dashboard
          </SidebarItem>
          <SidebarItem href="#b">Projetos</SidebarItem>
        </SidebarSection>
      </Sidebar>,
    );
    const nav = screen.getByLabelText('Principal');
    expect(nav).toHaveClass('eds-sidebar', 'extra');
    expect(nav).toHaveAttribute('popover', 'auto');
    expect(ref.current).toBe(nav);
    expect(screen.getByText('Geral', { selector: 'p' })).toHaveClass('eds-sidebar-section-title');
    const current = screen.getByRole('link', { name: 'Dashboard', hidden: true });
    expect(current).toHaveClass('eds-sidebar-item');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Dashboard')).toHaveClass('eds-sidebar-label');
    expect(screen.getByRole('link', { name: 'Projetos', hidden: true })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });

  it('item sem href é botão', () => {
    render(
      <Sidebar collapsible={false}>
        <SidebarItem>Sair</SidebarItem>
      </Sidebar>,
    );
    const button = screen.getByRole('button', { name: 'Sair', hidden: true });
    expect(button).toHaveClass('eds-sidebar-item');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('colapsar: aria-expanded e aria-controls (id do próprio nav), rótulo fixo e data-collapsed', async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    render(
      <Sidebar aria-label="Principal" onCollapsedChange={onCollapsedChange}>
        <SidebarItem href="#a">A</SidebarItem>
      </Sidebar>,
    );
    const nav = screen.getByLabelText('Principal');
    const toggle = screen.getByRole('button', { name: 'Menu lateral', hidden: true });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', nav.id);
    expect(nav).not.toHaveAttribute('data-collapsed');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(nav).toHaveAttribute('data-collapsed', 'true');
    expect(toggle).toHaveAccessibleName('Menu lateral');
    expect(toggle).not.toHaveAttribute('title');
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('colapsar controlado', async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    render(<Sidebar collapsed={false} onCollapsedChange={onCollapsedChange} />);
    await user.click(screen.getByRole('button', { name: 'Menu lateral', hidden: true }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(screen.getByLabelText('Principal')).not.toHaveAttribute('data-collapsed');
  });
});

describe('AppShell + Sidebar (off-canvas)', () => {
  it('renderiza um único main e o gatilho aponta para a sidebar', () => {
    render(<Layout />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    const nav = screen.getByTestId('nav');
    const toggle = screen.getByRole('button', { name: 'Abrir navegação' });
    expect(toggle).toHaveAttribute('popovertarget', nav.id);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveClass('eds-app-nav-toggle');
    expect(screen.getByRole('main')).toHaveClass('eds-app-main');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute(
      'href',
      `#${screen.getByRole('main').id}`,
    );
  });

  it('ao abrir: aria-expanded, inert em header/main/skip link e foco no item atual', () => {
    render(<Layout />);
    const nav = screen.getByTestId('nav');
    fireToggle(nav, 'open');
    expect(screen.getByTestId('header')).toHaveAttribute('inert');
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert');
    expect(screen.getByText('Pular para o conteúdo')).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Abrir navegação', hidden: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Dashboard', hidden: true })).toHaveFocus();
  });

  it('ao fechar: remove inert, aria-expanded=false e devolve o foco ao botão', () => {
    render(<Layout />);
    const nav = screen.getByTestId('nav');
    fireToggle(nav, 'open');
    fireToggle(nav, 'closed');
    expect(screen.getByTestId('header')).not.toHaveAttribute('inert');
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
    const toggle = screen.getByRole('button', { name: 'Abrir navegação' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('botão Fechar menu: no cabeçalho, fecha o popover sem JS e não é tratado como gatilho', () => {
    render(<Layout />);
    const nav = screen.getByTestId('nav');
    const close = screen.getByRole('button', { name: 'Fechar menu', hidden: true });
    expect(close).toHaveClass('eds-sidebar-close');
    expect(close.closest('.eds-sidebar-header')).not.toBeNull();
    expect(close).toHaveAttribute('popovertarget', nav.id);
    expect(close).toHaveAttribute('popovertargetaction', 'hide');
    expect(close).not.toHaveAttribute('aria-expanded');
    fireToggle(nav, 'open');
    close.focus();
    fireToggle(nav, 'closed');
    expect(screen.getByRole('button', { name: 'Abrir navegação' })).toHaveFocus();
  });

  it('navegar por um item fecha o off-canvas e leva o foco ao conteúdo', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Layout onNavigate={onNavigate} />);
    const nav = screen.getByTestId('nav');
    fireToggle(nav, 'open');
    await user.click(screen.getByRole('link', { name: 'Projetos', hidden: true }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('header')).not.toHaveAttribute('inert');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('item clicado com o off-canvas fechado não mexe no foco', async () => {
    const user = userEvent.setup();
    render(<Layout />);
    const link = screen.getByRole('link', { name: 'Projetos', hidden: true });
    await user.click(link);
    expect(screen.getByRole('main')).not.toHaveFocus();
  });
});

describe('Sidebar id dentro do AppShell', () => {
  it('o id dado à Sidebar vira o navId: o gatilho aponta para ele', () => {
    render(
      <AppShell
        sidebar={
          <Sidebar id="minha-nav" aria-label="Principal">
            <SidebarItem href="#a">A</SidebarItem>
          </Sidebar>
        }
        header={
          <AppShellHeader>
            <AppShellNavToggle />
          </AppShellHeader>
        }
      >
        conteúdo
      </AppShell>,
    );
    expect(screen.getByLabelText('Principal', { selector: 'nav' })).toHaveAttribute(
      'id',
      'minha-nav',
    );
    expect(screen.getByRole('button', { name: 'Abrir navegação' })).toHaveAttribute(
      'popovertarget',
      'minha-nav',
    );
  });
});

describe('SidebarItem com contador', () => {
  it('mostra o contador e o inclui no nome acessível junto do complemento', () => {
    render(
      <Sidebar>
        <SidebarItem href="#contas" badge={3} badgeLabel="vencidas">
          Contas
        </SidebarItem>
      </Sidebar>,
    );
    const link = screen.getByRole('link', { name: 'Contas 3 vencidas', hidden: true });
    const badge = link.querySelector('.eds-sidebar-badge');
    expect(badge).not.toBeNull();
    expect(badge?.firstChild?.textContent).toBe('3');
    expect(badge?.querySelector('.eds-visually-hidden')).toHaveTextContent('vencidas');
  });

  it('sem badgeLabel o número sozinho entra no nome; sem badge não há contador', () => {
    render(
      <Sidebar>
        <SidebarItem href="#a" badge="12">
          Alertas
        </SidebarItem>
        <SidebarItem href="#b">Outros</SidebarItem>
      </Sidebar>,
    );
    expect(screen.getByRole('link', { name: 'Alertas 12', hidden: true })).toBeInTheDocument();
    expect(
      screen
        .getByRole('link', { name: 'Outros', hidden: true })
        .querySelector('.eds-sidebar-badge'),
    ).toBeNull();
  });

  it('um botão (sem href) também aceita o contador', () => {
    render(
      <Sidebar>
        <SidebarItem badge={0}>Fila</SidebarItem>
      </Sidebar>,
    );
    expect(screen.getByRole('button', { name: 'Fila 0', hidden: true })).toBeInTheDocument();
  });
});
