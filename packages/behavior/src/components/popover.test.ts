import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initPopover } from './popover';

const html = `
<button type="button" id="b" class="eds-button" popovertarget="pp" aria-expanded="false" data-eds-popover>Detalhes</button>
<div class="eds-popover" id="pp" popover aria-labelledby="pp-t">
  <h2 class="eds-popover-title" id="pp-t">Prazo</h2>
  <p>Entrega em até 5 dias úteis.</p>
  <button type="button" id="ok" popovertarget="pp" popovertargetaction="hide">Entendi</button>
</div>
<button type="button" id="outro">Outro</button>`;

describe('popover', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = html;
    destroy = initPopover(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });
  const $ = (id: string) => document.getElementById(id) as HTMLElement;

  it('sincroniza aria-expanded, posiciona e emite eventos', async () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    $('pp').addEventListener('eds:popover-open', onOpen);
    $('pp').addEventListener('eds:popover-close', onClose);
    $('b').click();
    await flush();
    expect($('b')).toHaveAttribute('aria-expanded', 'true');
    expect($('pp').style.getPropertyValue('--_popover-x')).toMatch(/px$/);
    expect($('pp').style.getPropertyValue('--_popover-y')).toMatch(/px$/);
    expect($('pp')).toHaveAttribute('data-placement');
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect((onOpen.mock.calls[0]?.[0] as CustomEvent).detail.trigger).toBe($('b'));
    $('b').click();
    await flush();
    expect($('b')).toHaveAttribute('aria-expanded', 'false');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('devolve o foco ao gatilho quando fecha com o foco dentro', async () => {
    $('b').click();
    await flush();
    $('ok').focus();
    $('ok').click();
    await flush();
    expect(document.activeElement).toBe($('b'));
  });

  it('Esc fecha e o foco volta ao gatilho', async () => {
    $('b').click();
    await flush();
    $('ok').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flush();
    expect($('b')).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe($('b'));
  });

  it('não rouba o foco quando o usuário foi para outro controle', async () => {
    $('b').click();
    await flush();
    $('outro').focus();
    $('pp').hidePopover();
    await flush();
    expect(document.activeElement).toBe($('outro'));
  });

  it('só liga gatilhos com data-eds-popover', async () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="x" popovertarget="pp">X</button>');
    await flush();
    expect($('x')).not.toHaveAttribute('aria-expanded');
  });
});
