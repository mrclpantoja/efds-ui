import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyText, initCopy } from './copy';

describe('copy', () => {
  let destroy: () => void;
  let written: string[];
  beforeEach(() => {
    vi.useFakeTimers();
    written = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn((text: string) => {
          written.push(text);
          return Promise.resolve();
        }),
      },
    });
  });
  afterEach(() => {
    destroy?.();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });
  const settle = async () => {
    await vi.advanceTimersByTimeAsync(0);
  };

  it('copia o valor do alvo, troca o rótulo por 2 s e anuncia', async () => {
    document.body.innerHTML = `<input id="tk" value="TOKEN-FICTICIO-123" readonly>
      <button id="b" type="button" data-eds-copy="#tk"><svg></svg>Copiar</button>`;
    destroy = initCopy(document);
    const onCopy = vi.fn();
    document.addEventListener('eds:copy-success', onCopy);
    const b = document.getElementById('b') as HTMLButtonElement;
    b.click();
    await settle();
    expect(written).toEqual(['TOKEN-FICTICIO-123']);
    expect(b.textContent).toBe('Copiado');
    expect(b.querySelector('svg')).not.toBeNull();
    expect(b).toHaveAttribute('data-copied');
    expect((onCopy.mock.calls[0]?.[0] as CustomEvent).detail.text).toBe('TOKEN-FICTICIO-123');
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Copiado');
    await vi.advanceTimersByTimeAsync(2000);
    expect(b.textContent).toBe('Copiar');
    expect(b).not.toHaveAttribute('data-copied');
    document.removeEventListener('eds:copy-success', onCopy);
  });

  it('copia texto literal e usa aria-label em botão só de ícone', async () => {
    document.body.innerHTML =
      '<button id="b" type="button" aria-label="Copiar chave" data-eds-copy-text="abc"><svg></svg></button>';
    destroy = initCopy(document);
    const b = document.getElementById('b') as HTMLButtonElement;
    b.click();
    await settle();
    expect(written).toEqual(['abc']);
    expect(b).toHaveAttribute('aria-label', 'Copiado');
    await vi.advanceTimersByTimeAsync(2000);
    expect(b).toHaveAttribute('aria-label', 'Copiar chave');
  });

  it('usa o texto de elemento comum como alvo e [data-eds-copy-label]', async () => {
    document.body.innerHTML = `<code id="c"> npm i @efds-ui/react </code>
      <button id="b" type="button" data-eds-copy="#c"><svg></svg><span class="eds-copy-label">Copiar</span></button>`;
    destroy = initCopy(document);
    (document.getElementById('b') as HTMLElement).click();
    await settle();
    expect(written).toEqual(['npm i @efds-ui/react']);
    expect(document.querySelector('.eds-copy-label')?.textContent).toBe('Copiado');
  });

  it('sem Clipboard API usa execCommand; se falhar, anuncia o erro', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const exec = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: exec });
    expect(await copyText('x')).toBe(false);
    expect(exec).toHaveBeenCalledWith('copy');
    document.body.innerHTML = '<button id="b" type="button" data-eds-copy-text="x">Copiar</button>';
    destroy = initCopy(document);
    const onFail = vi.fn();
    document.addEventListener('eds:copy-error', onFail);
    (document.getElementById('b') as HTMLElement).click();
    await settle();
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(document.getElementById('b')?.textContent).toBe('Copiar');
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Não foi possível');
    document.removeEventListener('eds:copy-error', onFail);
  });
});
