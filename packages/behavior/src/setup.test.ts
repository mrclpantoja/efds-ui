import { afterEach, describe, expect, it } from 'vitest';
import * as eds from './index';

afterEach(() => {
  document.body.innerHTML = '';
  eds.toast.closeAll();
});

describe('API pública', () => {
  it('table, lookup e submit devolvem null quando o elemento não é do tipo', () => {
    document.body.innerHTML = '<div id="d"></div><form id="f"></form>';
    const div = document.getElementById('d');
    expect(eds.table(div)).toBeNull();
    expect(eds.lookup(div)).toBeNull();
    expect(eds.submit(div)).toBeNull();
    expect(eds.submit(document.getElementById('f'))).not.toBeNull();
  });

  it('exporta os init e as configurações que faltavam, e não os nomes antigos', () => {
    expect(typeof eds.initCopy).toBe('function');
    expect(typeof eds.initNotifications).toBe('function');
    expect(typeof eds.initConditional).toBe('function');
    expect(typeof eds.initDirtyGuard).toBe('function');
    expect(typeof eds.resetLoaderConfig).toBe('function');
    expect(typeof eds.resetSubmitConfig).toBe('function');
    expect(typeof eds.toast.close).toBe('function');
    expect(typeof eds.toast.closeAll).toBe('function');
    const all = eds as Record<string, unknown>;
    for (const old of ['tableController', 'lookupController', 'submitState']) {
      expect(all[old]).toBeUndefined();
    }
    expect((eds.toast as unknown as Record<string, unknown>).dismiss).toBeUndefined();
  });
});
