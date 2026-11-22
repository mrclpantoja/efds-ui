import { describe, expect, it } from 'vitest';

/** Ordem de carga dos dois scripts: `var EDS = …` do behavior no escopo global. */
describe('window.EDS.editor (IIFE)', () => {
  it('editor primeiro, behavior depois: o editor sobrevive à atribuição do behavior', async () => {
    delete (window as unknown as { EDS?: unknown }).EDS;
    document.body.innerHTML = '';
    await import('./iife');
    const w = window as unknown as {
      EDS?: { editor?: { sanitizeHtml: unknown }; toast?: unknown };
    };
    expect(w.EDS?.editor?.sanitizeHtml).toBeTypeOf('function');
    // O que o `var EDS = (function () {...})()` do behavior faz no escopo global.
    (0, eval)('var EDS = { toast: 1 };');
    expect(w.EDS?.toast).toBe(1);
    expect(w.EDS?.editor?.sanitizeHtml).toBeTypeOf('function');
  });
});
