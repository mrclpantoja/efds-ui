import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '../test-utils/dom-polyfills';
import { initTabs } from './tabs';

const html = `
<div class="eds-tabs" id="t">
  <div class="eds-tablist" role="tablist" aria-label="Seções">
    <button type="button" class="eds-tab" role="tab" id="a" aria-selected="true" aria-controls="pa">Geral</button>
    <button type="button" class="eds-tab" role="tab" id="b" aria-selected="false" aria-controls="pb">Itens</button>
    <button type="button" class="eds-tab" role="tab" id="c" aria-selected="false" aria-controls="pc" aria-disabled="true">Histórico</button>
    <button type="button" class="eds-tab" role="tab" id="d" aria-selected="false" aria-controls="pd">Anexos</button>
  </div>
  <div id="pa" role="tabpanel" aria-labelledby="a">Painel A</div>
  <div id="pb" role="tabpanel" aria-labelledby="b">Painel B</div>
  <div id="pc" role="tabpanel" aria-labelledby="c">Painel C</div>
  <div id="pd" role="tabpanel" aria-labelledby="d">Painel D</div>
</div>`;

const $ = (id: string) => document.getElementById(id) as HTMLElement;

describe('tabs', () => {
  let destroy: () => void;
  beforeEach(() => {
    document.body.innerHTML = html;
    destroy = initTabs(document);
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  it('aplica roving tabindex e esconde os painéis inativos', () => {
    expect($('a')).toHaveAttribute('tabindex', '0');
    expect($('b')).toHaveAttribute('tabindex', '-1');
    expect($('pa')).not.toHaveAttribute('hidden');
    expect($('pb')).toHaveAttribute('hidden');
  });

  it('ativa por clique e dispara eds:tabs-change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:tabs-change', onChange);
    await user.click($('b'));
    expect($('b')).toHaveAttribute('aria-selected', 'true');
    expect($('a')).toHaveAttribute('aria-selected', 'false');
    expect($('pb')).not.toHaveAttribute('hidden');
    expect($('pa')).toHaveAttribute('hidden');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail.id).toBe('b');
    document.removeEventListener('eds:tabs-change', onChange);
  });

  it('setas, Home e End movem e ativam, com volta', async () => {
    const user = userEvent.setup();
    $('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe($('b'));
    expect($('b')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(document.activeElement).toBe($('d'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe($('a'));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe($('d'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe($('a'));
  });

  it('aba indisponível recebe foco por seta mas não é ativada', async () => {
    const user = userEvent.setup();
    $('b').focus();
    await user.click($('b'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe($('c'));
    expect($('c')).toHaveAttribute('aria-selected', 'false');
    expect($('b')).toHaveAttribute('aria-selected', 'true');
    expect($('pc')).toHaveAttribute('hidden');
    await user.click($('c'));
    expect($('c')).toHaveAttribute('aria-selected', 'false');
  });

  it('tabindex=0 fica sempre na aba selecionada, mesmo com o foco numa desabilitada', async () => {
    const user = userEvent.setup();
    $('a').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe($('c'));
    expect($('b')).toHaveAttribute('tabindex', '0');
    expect($('c')).toHaveAttribute('tabindex', '-1');
    await user.keyboard('{End}');
    expect(document.activeElement).toBe($('d'));
    expect($('d')).toHaveAttribute('aria-selected', 'true');
    expect($('d')).toHaveAttribute('tabindex', '0');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe($('c'));
    const tabbable = Array.from(document.querySelectorAll('[role="tab"]')).filter(
      (tab) => (tab as HTMLElement).tabIndex === 0,
    );
    expect(tabbable).toEqual([$('d')]);
    $('c').blur();
    await flush();
    expect($('d')).toHaveAttribute('tabindex', '0');
  });

  it('é ligado uma única vez e destroy desliga', async () => {
    const user = userEvent.setup();
    const second = initTabs(document);
    const onChange = vi.fn();
    document.addEventListener('eds:tabs-change', onChange);
    await user.click($('b'));
    expect(onChange).toHaveBeenCalledTimes(1);
    second();
    destroy();
    await user.click($('d'));
    expect(onChange).toHaveBeenCalledTimes(1);
    document.removeEventListener('eds:tabs-change', onChange);
  });

  it('liga abas que entram depois (parciais do servidor)', async () => {
    const holder = document.createElement('div');
    holder.innerHTML = html
      .replace(/id="(\w+)"/g, 'id="x$1"')
      .replace(/aria-controls="(\w+)"/g, 'aria-controls="x$1"');
    document.body.append(holder);
    await flush();
    const tab = document.getElementById('xb') as HTMLElement;
    expect(tab).toHaveAttribute('tabindex', '-1');
    expect(document.getElementById('xpb')).toHaveAttribute('hidden');
  });

  it('não liga nada fora do root', () => {
    destroy();
    document.body.innerHTML = `<div id="in">${html}</div><div id="out">${html.replace(/id="(\w+)"/g, 'id="o$1"').replace(/aria-controls="(\w+)"/g, 'aria-controls="o$1"')}</div>`;
    destroy = initTabs(document.getElementById('in') as HTMLElement);
    expect(document.getElementById('ob')).not.toHaveAttribute('tabindex');
    expect(document.getElementById('b')).toHaveAttribute('tabindex', '-1');
  });
});
