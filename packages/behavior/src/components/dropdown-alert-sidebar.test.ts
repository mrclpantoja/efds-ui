import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initAlert } from './alert';
import { initDropdown } from './dropdown';
import { initSidebar } from './sidebar';

const byId = (id: string) => document.getElementById(id) as HTMLElement;

describe('dropdown', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = `
      <button type="button" id="gatilho" popovertarget="menu" aria-expanded="false">Ações</button>
      <div id="menu" class="eds-dropdown" role="group" aria-labelledby="gatilho" popover="auto">
        <button type="button" id="editar" class="eds-dropdown-item" popovertarget="menu" popovertargetaction="hide">Editar</button>
        <button type="button" id="duplicar" class="eds-dropdown-item" aria-disabled="true">Duplicar</button>
      </div>
      <button type="button" id="fora">Fora</button>`;
    destroy = initDropdown(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });

  it('sincroniza aria-expanded do gatilho com o toggle', async () => {
    const user = userEvent.setup();
    await user.click(byId('gatilho'));
    await flush();
    expect(byId('gatilho')).toHaveAttribute('aria-expanded', 'true');
    await user.click(byId('editar'));
    await flush();
    expect(byId('gatilho')).toHaveAttribute('aria-expanded', 'false');
  });

  it('Esc fecha e atualiza aria-expanded', async () => {
    const user = userEvent.setup();
    await user.click(byId('gatilho'));
    await flush();
    await user.keyboard('{Escape}');
    await flush();
    expect(byId('gatilho')).toHaveAttribute('aria-expanded', 'false');
  });

  it('fecha quando o foco sai do menu por Tab', async () => {
    const user = userEvent.setup();
    await user.click(byId('gatilho'));
    await flush();
    byId('editar').focus();
    byId('fora').focus();
    await flush();
    expect(byId('menu').matches(':popover-open')).toBe(false);
    expect(byId('gatilho')).toHaveAttribute('aria-expanded', 'false');
  });

  it('item aria-disabled não age', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: Event) => e.defaultPrevented);
    byId('duplicar').addEventListener('click', onClick);
    await user.click(byId('gatilho'));
    await user.click(byId('duplicar'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('alert fechável', () => {
  let destroy: () => void;
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="main">
        <button type="button" id="antes">Antes</button>
        <div class="eds-alert eds-alert-info" id="aviso">
          <div class="eds-alert-content">Novidade</div>
          <button type="button" id="fechar" class="eds-alert-close" data-eds-dismiss aria-label="Fechar aviso">x</button>
        </div>
        <button type="button" id="depois">Depois</button>
      </main>`;
    destroy = initAlert(document);
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  it('remove o aviso e move o foco para o elemento seguinte', async () => {
    const user = userEvent.setup();
    await user.click(byId('fechar'));
    expect(document.getElementById('aviso')).toBeNull();
    expect(document.activeElement).toBe(byId('depois'));
  });

  it('eds:dismiss cancelável mantém o aviso', async () => {
    const user = userEvent.setup();
    document.addEventListener('eds:dismiss', (e) => e.preventDefault(), { once: true });
    await user.click(byId('fechar'));
    expect(document.getElementById('aviso')).not.toBeNull();
  });

  it('sem elemento seguinte, usa o anterior', async () => {
    byId('depois').remove();
    const user = userEvent.setup();
    await user.click(byId('fechar'));
    expect(document.activeElement).toBe(byId('antes'));
  });
});

describe('sidebar', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = `
      <div class="eds-app">
        <a class="eds-skip-link" href="#conteudo">Pular</a>
        <nav class="eds-sidebar" id="nav" popover aria-label="Principal">
          <a class="eds-sidebar-item" id="home" href="/dashboard" aria-current="page">Dashboard</a>
          <a class="eds-sidebar-item" id="users" href="/usuarios">Usuários</a>
          <div class="eds-sidebar-footer">
            <button type="button" class="eds-sidebar-item" id="colapsar" data-eds-sidebar-collapse>Menu lateral</button>
          </div>
        </nav>
        <header class="eds-app-header"><button type="button" id="menu" popovertarget="nav" aria-expanded="false">Menu</button></header>
        <main class="eds-app-main" id="conteudo" tabindex="-1">Conteúdo</main>
      </div>`;
    destroy = initSidebar(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });

  it('ao abrir: inert nos irmãos, aria-expanded e foco na página atual', async () => {
    const user = userEvent.setup();
    await user.click(byId('menu'));
    await flush();
    expect(byId('menu')).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.eds-app-header')).toHaveAttribute('inert');
    expect(byId('conteudo')).toHaveAttribute('inert');
    expect(document.querySelector('.eds-skip-link')).toHaveAttribute('inert');
    expect(document.activeElement).toBe(byId('home'));
  });

  it('ao fechar (Esc): remove inert e devolve o foco ao gatilho', async () => {
    const user = userEvent.setup();
    await user.click(byId('menu'));
    await flush();
    document.body.focus();
    await user.keyboard('{Escape}');
    await flush();
    expect(byId('menu')).toHaveAttribute('aria-expanded', 'false');
    expect(byId('conteudo')).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(byId('menu'));
  });

  it('clicar em link fecha e foca o main', async () => {
    const user = userEvent.setup();
    await user.click(byId('menu'));
    await flush();
    byId('users').addEventListener('click', (e) => e.preventDefault());
    await user.click(byId('users'));
    await flush();
    expect(byId('nav').matches(':popover-open')).toBe(false);
    expect(document.activeElement).toBe(byId('conteudo'));
  });

  it('botão de colapsar alterna data-collapsed e aria-expanded', async () => {
    const user = userEvent.setup();
    const onCollapse = vi.fn();
    document.addEventListener('eds:sidebar-collapse', onCollapse);
    expect(byId('colapsar')).toHaveAttribute('aria-expanded', 'true');
    expect(byId('colapsar')).toHaveAttribute('aria-controls', 'nav');
    await user.click(byId('colapsar'));
    expect(byId('nav')).toHaveAttribute('data-collapsed');
    expect(byId('colapsar')).toHaveAttribute('aria-expanded', 'false');
    await user.click(byId('colapsar'));
    expect(byId('nav')).not.toHaveAttribute('data-collapsed');
    expect(onCollapse).toHaveBeenCalledTimes(2);
    document.removeEventListener('eds:sidebar-collapse', onCollapse);
  });
});
