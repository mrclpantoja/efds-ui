import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMessages, setMessages } from '../core/config';
import { avatarInitials, avatarTone, initAvatar } from './avatar';
import { initBanner } from './banner';

let destroy: () => void;

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  destroy?.();
  resetMessages();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('avatar', () => {
  it('tom estável por nome (sem acento nem caixa), entre 1 e 6', () => {
    expect(avatarTone('Ana Souza')).toBe(avatarTone('  ANA   souza '));
    expect(avatarTone('José')).toBe(avatarTone('jose'));
    for (const name of ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Dario', 'Eva Costa', 'Fábio']) {
      const tone = avatarTone(name);
      expect(tone).toBeGreaterThanOrEqual(1);
      expect(tone).toBeLessThanOrEqual(6);
    }
    // Valores fixos: o React usa o mesmo algoritmo e confere estes números.
    expect(
      ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Dario', 'Eva Costa', 'Fábio'].map(avatarTone),
    ).toEqual([6, 1, 6, 3, 6, 3]);
  });

  it('iniciais', () => {
    expect(avatarInitials('Ana Souza')).toBe('AS');
    expect(avatarInitials('maria de Fátima Lima')).toBe('ML');
    expect(avatarInitials('Dario')).toBe('DA');
    expect(avatarInitials('  ')).toBe('');
    expect(avatarInitials('Álvaro')).toBe('ÁL');
  });

  it('põe a classe de tom pelo nome do aria-label, sem tocar em quem já definiu', () => {
    document.body.innerHTML = `
      <span id="a" class="eds-avatar" role="img" aria-label="Ana Souza">AS</span>
      <span id="b" class="eds-avatar eds-avatar-tone-3" role="img" aria-label="Ana Souza">AS</span>
      <span id="c" class="eds-avatar" data-eds-tone aria-hidden="true">X</span>`;
    destroy = initAvatar(document);
    expect(document.getElementById('a')).toHaveClass(`eds-avatar-tone-${avatarTone('Ana Souza')}`);
    expect(document.getElementById('b')?.className).toBe('eds-avatar eds-avatar-tone-3');
    expect(document.getElementById('c')?.className).toBe('eds-avatar');
  });

  it('avatar vazio com data-name ganha iniciais e nome acessível', () => {
    document.body.innerHTML = '<span id="a" class="eds-avatar" data-name="Bruno Lima"></span>';
    destroy = initAvatar(document);
    const el = document.getElementById('a') as HTMLElement;
    expect(el.textContent).toBe('BL');
    expect(el).toHaveAttribute('role', 'img');
    expect(el).toHaveAccessibleName('Bruno Lima');
  });
});

describe('banner', () => {
  const html = (attrs = '') => `
<div id="b" class="eds-banner" data-eds-banner="manutencao" ${attrs} role="region" aria-label="Aviso">
  <p>Manutenção programada.</p>
  <button type="button" data-eds-close aria-label="Fechar aviso">x</button>
</div>
<a id="depois" href="#x">depois</a>`;

  it('fechar esconde, lembra o id e leva o foco ao próximo elemento', () => {
    document.body.innerHTML = html();
    destroy = initBanner(document);
    const onClose = vi.fn();
    document.getElementById('b')?.addEventListener('eds:banner-close', onClose);
    const button = document.querySelector<HTMLButtonElement>('[data-eds-close]');
    button?.focus();
    button?.click();
    expect(document.getElementById('b')?.hidden).toBe(true);
    expect(localStorage.getItem('eds:banner:manutencao')).toBe('1');
    expect(document.activeElement).toBe(document.getElementById('depois'));
    expect((onClose.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ id: 'manutencao' });
  });

  it('o próximo focável que não aceita foco (oculto) é pulado: o foco não se perde', () => {
    document.body.innerHTML = html().replace(
      '<a id="depois"',
      '<a id="oculto" href="#o" style="display:none">oculto</a><a id="depois"',
    );
    destroy = initBanner(document);
    const button = document.querySelector<HTMLButtonElement>('[data-eds-close]');
    button?.focus();
    button?.click();
    expect(document.activeElement).toBe(document.getElementById('depois'));
  });

  it('já fechado antes: nasce escondido', () => {
    localStorage.setItem('eds:banner:manutencao', '1');
    document.body.innerHTML = html();
    destroy = initBanner(document);
    expect(document.getElementById('b')?.hidden).toBe(true);
  });

  it('lembrança desligável: fecha mas não grava nem esconde na próxima', () => {
    document.body.innerHTML = html('data-eds-banner-remember="false"');
    destroy = initBanner(document);
    document.querySelector<HTMLButtonElement>('[data-eds-close]')?.click();
    expect(document.getElementById('b')?.hidden).toBe(true);
    expect(localStorage.length).toBe(0);
    destroy();
    document.body.innerHTML = html('data-eds-banner-remember="false"');
    localStorage.setItem('eds:banner:manutencao', '1');
    destroy = initBanner(document);
    expect(document.getElementById('b')?.hidden).toBe(false);
  });

  it('armazenamento indisponível não impede de fechar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });
    document.body.innerHTML = html();
    destroy = initBanner(document);
    document.querySelector<HTMLButtonElement>('[data-eds-close]')?.click();
    expect(document.getElementById('b')?.hidden).toBe(true);
  });

  it('data-eds-dismissible cria o botão Fechar (texto configurável)', () => {
    setMessages({ bannerClose: 'Dismiss' });
    document.body.innerHTML =
      '<div id="b" class="eds-banner" data-eds-banner="x" data-eds-dismissible><p>Oi</p></div>';
    destroy = initBanner(document);
    const button = document.querySelector<HTMLButtonElement>('.eds-banner-close');
    expect(button).toHaveAccessibleName('Dismiss');
    button?.click();
    expect(document.getElementById('b')?.hidden).toBe(true);
  });

  it('sem id não lembra', () => {
    document.body.innerHTML =
      '<div id="b" class="eds-banner" data-eds-banner><p>Oi</p><button type="button" data-eds-close>x</button></div>';
    destroy = initBanner(document);
    document.querySelector<HTMLButtonElement>('[data-eds-close]')?.click();
    expect(localStorage.length).toBe(0);
  });
});
