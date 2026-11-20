import { afterEach, describe, expect, it, vi } from 'vitest';
import { initThemeColor } from './theme-color';

describe('theme-color (demonstração)', () => {
  let destroy: () => void;
  afterEach(() => {
    destroy?.();
    document.body.innerHTML = '';
  });

  it('aplica o tema ao contêiner, copia o modo e escreve o relatório', () => {
    document.documentElement.setAttribute('data-mode', 'dark');
    document.body.innerHTML = `<div id="d" data-eds-theme-demo>
      <input id="c" type="color" value="#2f6f5e" data-eds-theme-color>
      <p data-eds-theme-report></p></div>`;
    const onChange = vi.fn();
    document.addEventListener('eds:theme-change', onChange);
    destroy = initThemeColor(document);
    const d = document.getElementById('d') as HTMLElement;
    expect(d).toHaveAttribute('data-theme', 'custom');
    expect(d).toHaveAttribute('data-mode', 'dark');
    expect(d.style.getPropertyValue('--eds-accent-500')).toMatch(/^#[0-9A-F]{6}$/);
    expect(d.querySelector('[data-eds-theme-report]')?.textContent).toMatch(
      /^Contraste do texto sobre a ação: \d,\d+:1/,
    );
    const input = document.getElementById('c') as HTMLInputElement;
    input.value = '#ffeb3b';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(d.querySelector('[data-eds-theme-report]')?.textContent).toContain('ajustada');
    expect(onChange).toHaveBeenCalledTimes(2);
    destroy();
    expect(d).not.toHaveAttribute('data-theme');
    document.removeEventListener('eds:theme-change', onChange);
    document.documentElement.removeAttribute('data-mode');
  });
});
