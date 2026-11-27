import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initModal } from './modal';

const html = `
<button type="button" id="open" data-eds-open="dlg">Abrir</button>
<button type="button" id="open-static" data-eds-open="dlg-static">Abrir fixo</button>
<dialog class="eds-modal" id="dlg" aria-labelledby="dlg-t">
  <header class="eds-modal-header"><h2 id="dlg-t">Título</h2></header>
  <div class="eds-modal-body"><input id="nome" data-autofocus /> <p id="texto">Corpo</p></div>
  <footer class="eds-modal-footer"><button type="button" id="cancelar" data-eds-close>Cancelar</button></footer>
</dialog>
<dialog class="eds-drawer" id="dlg-static" data-eds-backdrop="static" aria-labelledby="dlg-s-t">
  <header class="eds-drawer-header"><h2 id="dlg-s-t">Fixo</h2></header>
  <div class="eds-drawer-body">Corpo</div>
</dialog>`;

const dialog = (id: string) => document.getElementById(id) as HTMLDialogElement;

describe('modal e drawer', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = html;
    destroy = initModal(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });

  it('data-eds-open abre com showModal e foca o data-autofocus', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    document.addEventListener('eds:modal-open', onOpen);
    await user.click(document.getElementById('open') as HTMLElement);
    expect(dialog('dlg').open).toBe(true);
    expect(dialog('dlg').matches(':modal')).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('nome'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    document.removeEventListener('eds:modal-open', onOpen);
  });

  it('emite modal-close ao fechar (Esc, botão) e modal-open ao abrir por código', async () => {
    const user = userEvent.setup();
    const log: string[] = [];
    for (const name of ['modal-open', 'modal-close', 'drawer-open', 'drawer-close']) {
      document.addEventListener(`eds:${name}`, () => log.push(name));
    }
    await user.click(document.getElementById('open') as HTMLElement);
    await flush();
    await user.keyboard('{Escape}');
    await flush();
    // Aberto por código, sem gatilho.
    dialog('dlg').showModal();
    await flush();
    await user.click(document.getElementById('cancelar') as HTMLElement);
    await flush();
    // Drawer: nomes próprios.
    await user.click(document.getElementById('open-static') as HTMLElement);
    await flush();
    dialog('dlg-static').close();
    await flush();
    expect(log).toEqual([
      'modal-open',
      'modal-close',
      'modal-open',
      'modal-close',
      'drawer-open',
      'drawer-close',
    ]);
  });

  it('Esc fecha (nativo)', async () => {
    const user = userEvent.setup();
    await user.click(document.getElementById('open') as HTMLElement);
    await user.keyboard('{Escape}');
    expect(dialog('dlg').open).toBe(false);
  });

  it('[data-eds-close] fecha o diálogo', async () => {
    const user = userEvent.setup();
    await user.click(document.getElementById('open') as HTMLElement);
    await user.click(document.getElementById('cancelar') as HTMLElement);
    expect(dialog('dlg').open).toBe(false);
  });

  it('backdrop fecha só com pointerdown e click no próprio dialog', async () => {
    const user = userEvent.setup();
    await user.click(document.getElementById('open') as HTMLElement);
    const dlg = dialog('dlg');
    // Pressionou dentro, soltou no backdrop (seleção de texto): não fecha.
    document.getElementById('texto')?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    dlg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dlg.open).toBe(true);
    // Click sem pointerdown prévio: não fecha.
    dlg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dlg.open).toBe(true);
    // Pointerdown e click no backdrop: fecha.
    dlg.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    dlg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dlg.open).toBe(false);
  });

  it('data-eds-backdrop="static" não fecha pelo backdrop', async () => {
    const user = userEvent.setup();
    await user.click(document.getElementById('open-static') as HTMLElement);
    const dlg = dialog('dlg-static');
    dlg.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    dlg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dlg.open).toBe(true);
  });

  it('corpo vira região rolável só quando rola', async () => {
    const observers: (() => void)[] = [];
    class FakeRO {
      constructor(cb: () => void) {
        observers.push(cb);
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO);
    destroy();
    document.body.innerHTML = html;
    destroy = initModal(document);
    const body = document.querySelector('#dlg .eds-modal-body') as HTMLElement;
    expect(body).not.toHaveAttribute('role');
    Object.defineProperty(body, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(body, 'clientHeight', { value: 100, configurable: true });
    observers.forEach((cb) => cb());
    expect(body).toHaveAttribute('role', 'region');
    expect(body).toHaveAttribute('tabindex', '0');
    expect(body).toHaveAttribute('aria-labelledby', 'dlg-t');
    vi.unstubAllGlobals();
    await flush();
  });

  it('destroy remove os ouvintes', async () => {
    destroy();
    const user = userEvent.setup();
    await user.click(document.getElementById('open') as HTMLElement);
    expect(dialog('dlg').open).toBe(false);
  });
});

describe('modal: data-eds-close dentro de um aviso', () => {
  it('um Alert dentro do diálogo fecha só o aviso, não o diálogo', async () => {
    const restore = installDomPolyfills();
    document.body.innerHTML = `<dialog class="eds-modal" id="d">
      <div class="eds-alert" id="aviso"><button type="button" id="x" data-eds-close>x</button></div>
      <button type="button" id="sair" data-eds-close>Sair</button></dialog>`;
    const destroy = initModal(document);
    const d = document.getElementById('d') as HTMLDialogElement;
    d.showModal();
    const user = userEvent.setup();
    await user.click(document.getElementById('x') as HTMLElement);
    expect(d.open).toBe(true);
    await user.click(document.getElementById('sair') as HTMLElement);
    expect(d.open).toBe(false);
    destroy();
    restore();
    document.body.innerHTML = '';
  });
});
