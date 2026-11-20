import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initTooltip, TOOLTIP_SHOW_DELAY } from './tooltip';

const html = `
<button type="button" id="b" class="eds-button" aria-describedby="tt" data-eds-tooltip>Salvar</button>
<span class="eds-tooltip" id="tt" role="tooltip" popover="manual">Salva o rascunho</span>
<button type="button" id="outro">Outro</button>`;

const open = (el: HTMLElement) => el.matches(':popover-open');
const enter = (el: Element) => el.dispatchEvent(new MouseEvent('pointerenter'));
const leave = (el: Element) => el.dispatchEvent(new MouseEvent('pointerleave'));

describe('tooltip', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    restore = installDomPolyfills();
    document.body.innerHTML = html;
    destroy = initTooltip(document);
  });
  afterEach(() => {
    destroy();
    restore();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const $ = (id: string) => document.getElementById(id) as HTMLElement;

  it('mostra com hover só depois de 300 ms e some ao sair', () => {
    enter($('b'));
    vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY - 10);
    expect(open($('tt'))).toBe(false);
    vi.advanceTimersByTime(20);
    expect(open($('tt'))).toBe(true);
    leave($('b'));
    vi.advanceTimersByTime(200);
    expect(open($('tt'))).toBe(false);
  });

  it('hover cancelado antes do atraso não mostra', () => {
    enter($('b'));
    vi.advanceTimersByTime(100);
    leave($('b'));
    vi.advanceTimersByTime(1000);
    expect(open($('tt'))).toBe(false);
  });

  it('mostra no foco (sem atraso) e esconde ao perder o foco', () => {
    $('b').focus();
    vi.advanceTimersByTime(1);
    expect(open($('tt'))).toBe(true);
    $('outro').focus();
    vi.advanceTimersByTime(200);
    expect(open($('tt'))).toBe(false);
  });

  it('foco que não é :focus-visible (clique ou toque) não mostra o balão', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'matches').mockImplementation(function (
      this: Element,
      sel: string,
    ) {
      if (sel === ':focus-visible') return false;
      return Element.prototype.matches.call(this, sel);
    });
    try {
      $('b').focus();
      vi.advanceTimersByTime(1000);
      expect(open($('tt'))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('Esc dispensa sem mover o foco e só volta depois de sair e voltar', () => {
    $('b').focus();
    vi.advanceTimersByTime(1);
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(esc);
    expect(open($('tt'))).toBe(false);
    expect(esc.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('b'));
    vi.advanceTimersByTime(1000);
    expect(open($('tt'))).toBe(false);
    $('outro').focus();
    $('b').focus();
    vi.advanceTimersByTime(1);
    expect(open($('tt'))).toBe(true);
  });

  it('Esc sem balão aberto não interfere', () => {
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(false);
  });

  it('é pairável: com o ponteiro sobre o balão ele não fecha', () => {
    enter($('b'));
    vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY + 1);
    leave($('b'));
    enter($('tt'));
    vi.advanceTimersByTime(1000);
    expect(open($('tt'))).toBe(true);
    leave($('tt'));
    vi.advanceTimersByTime(200);
    expect(open($('tt'))).toBe(false);
  });

  it('posiciona com variáveis e data-placement', () => {
    $('b').focus();
    vi.advanceTimersByTime(1);
    expect($('tt').style.getPropertyValue('--_tooltip-x')).toMatch(/px$/);
    expect($('tt').style.getPropertyValue('--_tooltip-y')).toMatch(/px$/);
    expect($('tt')).toHaveAttribute('data-placement');
  });

  it('toque não mostra por hover (o foco do toque mostra)', () => {
    $('b').dispatchEvent(Object.assign(new MouseEvent('pointerenter'), { pointerType: 'touch' }));
    vi.advanceTimersByTime(1000);
    expect(open($('tt'))).toBe(false);
  });

  it('clicar no gatilho dispensa o balão', () => {
    $('b').focus();
    vi.advanceTimersByTime(1);
    $('b').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(open($('tt'))).toBe(false);
  });

  it('ao desligar, fecha e remove os ouvintes', () => {
    $('b').focus();
    vi.advanceTimersByTime(1);
    destroy();
    expect(open($('tt'))).toBe(false);
    $('outro').focus();
    $('b').focus();
    vi.advanceTimersByTime(10);
    expect(open($('tt'))).toBe(false);
    destroy = initTooltip(document);
  });
});
