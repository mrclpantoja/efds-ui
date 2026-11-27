import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initNotifications } from './notifications';

const html = `
<button id="bell" type="button" class="eds-notifications" popovertarget="n" data-eds-popover aria-label="x">
  <span class="eds-notifications-count" hidden>0</span></button>
<div id="n" class="eds-popover" popover role="dialog" aria-labelledby="nt" data-eds-notifications>
  <h2 id="nt" class="eds-popover-title">Notificações</h2>
  <ul>
    <li id="a" class="eds-notification" data-unread><a href="#a1">Pedido aprovado</a></li>
    <li id="b" class="eds-notification" data-unread><button type="button">Relatório pronto</button></li>
    <li id="c" class="eds-notification"><a href="#c1">Backup concluído</a></li>
  </ul>
  <p class="eds-notifications-empty" hidden>Nenhuma notificação.</p>
  <button id="all" type="button" data-eds-notifications-read-all>Marcar todas como lidas</button>
</div>`;

describe('notificações', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = html;
    destroy = initNotifications(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  const badge = () => document.querySelector('.eds-notifications-count') as HTMLElement;

  it('liga o nome e a contagem do sino ao carregar', () => {
    expect($('bell')).toHaveAttribute('aria-label', 'Notificações, 2 não lidas');
    expect(badge().textContent).toBe('2');
    expect(badge().hidden).toBe(false);
  });

  it('abrir um item o marca como lido e atualiza o sino', () => {
    const onRead = vi.fn();
    $('n').addEventListener('eds:notifications-read', onRead);
    ($('a').querySelector('a') as HTMLElement).click();
    expect($('a')).not.toHaveAttribute('data-unread');
    expect($('bell')).toHaveAttribute('aria-label', 'Notificações, 1 não lida');
    expect((onRead.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      id: 'a',
      unread: 1,
    });
    // item já lido não emite de novo
    ($('c').querySelector('a') as HTMLElement).click();
    expect(onRead).toHaveBeenCalledTimes(1);
  });

  it('marcar todas zera, esconde o selo, anuncia e emite', async () => {
    const onRead = vi.fn();
    $('n').addEventListener('eds:notifications-read-all', onRead);
    $('all').click();
    await flush();
    expect($('bell')).toHaveAttribute('aria-label', 'Notificações, nenhuma não lida');
    expect(badge().hidden).toBe(true);
    expect((onRead.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ unread: 0 });
    expect(document.querySelector('[data-eds-page-status]')?.textContent).toContain(
      'Todas as notificações',
    );
  });

  it('"marcar todas" fica desabilitado sem não lidas e o foco não se perde', () => {
    expect($('all')).not.toBeDisabled();
    $('all').focus();
    $('all').click();
    expect($('all')).toBeDisabled();
    expect(document.activeElement).toBe($('a').querySelector('a'));
  });

  it('já nasce desabilitado quando nada está não lido', () => {
    destroy();
    document.body.innerHTML = html.replace(/ data-unread/g, '');
    destroy = initNotifications(document);
    expect($('all')).toBeDisabled();
  });

  it('limita o selo a 99+', () => {
    destroy();
    const list = $('n').querySelector('ul') as HTMLElement;
    for (let i = 0; i < 120; i += 1) {
      list.insertAdjacentHTML(
        'beforeend',
        '<li class="eds-notification" data-unread><a href="#x">n</a></li>',
      );
    }
    destroy = initNotifications(document);
    expect(badge().textContent).toBe('99+');
  });

  it('sem itens mostra o estado vazio', () => {
    destroy();
    document.body.innerHTML = html.replace(/<li[\s\S]*?<\/li>/g, '');
    destroy = initNotifications(document);
    expect(($('n').querySelector('.eds-notifications-empty') as HTMLElement).hidden).toBe(false);
  });
});
