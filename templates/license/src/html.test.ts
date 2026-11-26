import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runLicenseGate } from './html';
import { baseLicense, makeKeys, sign } from './test-keys';

const { secretKey, publicKey } = makeKeys();

interface GateWin extends Window {
  EFDS_LICENSE?: unknown;
  EFDS_LICENSE_KEY?: string;
  EDS?: { init?: () => unknown };
}
const w = window as GateWin;

beforeEach(() => {
  document.body.innerHTML = '<header id="a">Topo</header><main id="b">Conteúdo</main>';
});
afterEach(() => {
  delete w.EFDS_LICENSE;
  delete w.EFDS_LICENSE_KEY;
  delete w.EDS;
});

function capture(name: string): { detail: unknown }[] {
  const events: { detail: unknown }[] = [];
  window.addEventListener(name, (e) => events.push({ detail: (e as CustomEvent).detail }), {
    once: true,
  });
  return events;
}

describe('trava de licença (HTML)', () => {
  it('licença válida chama EDS.init e dispara efds:license-ok', () => {
    const license = baseLicense();
    const init = vi.fn();
    w.EFDS_LICENSE = license;
    w.EFDS_LICENSE_KEY = sign(license, secretKey);
    w.EDS = { init };
    const ok = capture('efds:license-ok');
    runLicenseGate({ publicKey });
    expect(init).toHaveBeenCalledOnce();
    expect(ok).toHaveLength(1);
    expect(document.getElementById('b')?.hasAttribute('inert')).toBe(false);
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('sem chave: nada é ligado, conteúdo inert e oculto, alerta com foco no título', () => {
    const license = baseLicense();
    const init = vi.fn();
    w.EFDS_LICENSE = license;
    w.EDS = { init };
    const errors = capture('efds:license-error');
    runLicenseGate({ publicKey });
    expect(init).not.toHaveBeenCalled();
    for (const id of ['a', 'b']) {
      const node = document.getElementById(id)!;
      expect(node.hasAttribute('inert')).toBe(true);
      expect(node.hasAttribute('hidden')).toBe(true);
    }
    const alert = document.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Chave de licença ausente');
    const title = alert.querySelector('h1')!;
    expect(document.activeElement).toBe(title);
    expect(alert.querySelector('a')?.getAttribute('href')).toBe(
      'https://efds-ui.com.br/templates/licenca',
    );
    expect(errors[0]?.detail).toEqual({ reason: 'missing-key' });
    expect(document.querySelector('[style]')).toBeNull();
  });

  it('chave de outro arquivo bloqueia', () => {
    w.EFDS_LICENSE = baseLicense({ id: 'a' });
    w.EFDS_LICENSE_KEY = sign(baseLicense({ id: 'b' }), secretKey);
    w.EDS = { init: vi.fn() };
    runLicenseGate({ publicKey });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Chave não corresponde',
    );
  });

  it('domínio fora da licença bloqueia', () => {
    const license = baseLicense({ type: 'single', domains: ['exemplo.gov.br'] });
    w.EFDS_LICENSE = license;
    w.EFDS_LICENSE_KEY = sign(license, secretKey);
    w.EDS = { init: vi.fn() };
    runLicenseGate({ publicKey });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Domínio não coberto');
  });

  it('licença válida sem EDS vira erro visível', () => {
    const license = baseLicense();
    w.EFDS_LICENSE = license;
    w.EFDS_LICENSE_KEY = sign(license, secretKey);
    const errors = capture('efds:license-error');
    runLicenseGate({ publicKey });
    expect(errors[0]?.detail).toEqual({ reason: 'no-behavior' });
    expect(document.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('com a chave pública marcador de produção, nada passa', () => {
    const license = baseLicense();
    w.EFDS_LICENSE = license;
    w.EFDS_LICENSE_KEY = sign(license, secretKey);
    w.EDS = { init: vi.fn() };
    runLicenseGate();
    expect(w.EDS.init).not.toHaveBeenCalled();
  });
});
