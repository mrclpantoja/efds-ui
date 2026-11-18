import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppShell, AppShellHeader, AppShellNavToggle } from './AppShell';
import { useAppShell } from './context';
import { Sidebar, SidebarItem } from '../Sidebar/Sidebar';

function Probe() {
  const { navOpen, mainId } = useAppShell();
  return <p data-testid="probe">{`${navOpen}:${mainId === '' ? 'vazio' : 'ok'}`}</p>;
}

describe('AppShell', () => {
  it('monta a grade do core com um único main, skip link e slots', () => {
    const ref = createRef<HTMLDivElement>();
    const mainRef = createRef<HTMLElement>();
    const { container } = render(
      <AppShell
        ref={ref}
        mainRef={mainRef}
        mainClassName="pagina"
        className="extra"
        sidebar={<nav aria-label="Principal">Menu</nav>}
        header={<AppShellHeader aria-label="Topo">Cabeçalho</AppShellHeader>}
      >
        <h1>Conteúdo</h1>
      </AppShell>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveClass('eds-app', 'extra');
    expect(ref.current).toBe(root);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('eds-app-main', 'pagina');
    expect(mainRef.current).toBe(main);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('banner')).toHaveClass('eds-app-header', 'eds-navbar');
    expect(root?.firstElementChild).toHaveClass('eds-skip-link');
  });

  it('Sidebar no conteúdo não adota o estado do shell (ids distintos)', () => {
    render(
      <AppShell
        sidebar={
          <Sidebar aria-label="Principal">
            <SidebarItem href="#a">A</SidebarItem>
          </Sidebar>
        }
        header={
          <AppShellHeader aria-label="Topo">
            <AppShellNavToggle />
          </AppShellHeader>
        }
      >
        <Sidebar aria-label="Exemplo">
          <SidebarItem href="#b">B</SidebarItem>
        </Sidebar>
      </AppShell>,
    );
    const principal = document.querySelector<HTMLElement>('nav[aria-label="Principal"]');
    const exemplo = document.querySelector<HTMLElement>('nav[aria-label="Exemplo"]');
    if (!principal || !exemplo) throw new Error('navs não renderizadas');
    expect(principal.id).not.toBe(exemplo.id);
    const toggle = document.querySelector('[popovertarget]');
    expect(toggle?.getAttribute('popovertarget')).toBe(principal.id);
  });

  it('skip link move o foco ao main sem alterar o hash', async () => {
    const user = userEvent.setup();
    render(<AppShell skipLinkLabel="Ir ao conteúdo">x</AppShell>);
    await user.click(screen.getByRole('link', { name: 'Ir ao conteúdo' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('useAppShell expõe o estado e falha fora do shell', () => {
    render(
      <AppShell>
        <Probe />
      </AppShell>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('false:ok');
    const spy = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow(/AppShell/);
    console.error = spy;
  });

  it('botão de menu: rótulo e ícone configuráveis', () => {
    render(
      <AppShell
        navId="menu"
        header={
          <AppShellHeader>
            <AppShellNavToggle label="Open menu" />
          </AppShellHeader>
        }
      >
        x
      </AppShell>,
    );
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('popovertarget', 'menu');
    expect(toggle.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
