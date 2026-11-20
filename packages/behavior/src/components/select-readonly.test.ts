import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initSelectReadonly } from './select-readonly';

describe('select somente leitura (HTML)', () => {
  let destroy: () => void;
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="f">
        <select id="ro" name="uf" class="eds-select" aria-readonly="true" aria-label="Estado">
          <option value="RS" selected>Rio Grande do Sul</option>
          <option value="SC">Santa Catarina</option>
        </select>
        <select id="rw" name="x" class="eds-select" aria-label="Livre">
          <option value="a" selected>A</option>
          <option value="b">B</option>
        </select>
      </form>`;
    destroy = initSelectReadonly(document);
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  it('bloqueia setas e digitação, mantém o foco e o valor no envio', async () => {
    const user = userEvent.setup();
    const ro = document.getElementById('ro') as HTMLSelectElement;
    ro.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('S');
    expect(ro.value).toBe('RS');
    expect(document.activeElement).toBe(ro);
    expect(new FormData(document.getElementById('f') as HTMLFormElement).get('uf')).toBe('RS');
  });

  it('não interfere no select comum', async () => {
    const user = userEvent.setup();
    const rw = document.getElementById('rw') as HTMLSelectElement;
    await user.selectOptions(rw, 'b');
    expect(rw.value).toBe('b');
  });

  it('desfaz uma mudança que passe mesmo assim (seletor nativo de toque)', () => {
    const ro = document.getElementById('ro') as HTMLSelectElement;
    const onChange = vi.fn();
    document.addEventListener('change', onChange);
    ro.focus();
    ro.selectedIndex = 1;
    ro.dispatchEvent(new Event('change', { bubbles: true }));
    expect(ro.value).toBe('RS');
    expect(onChange).not.toHaveBeenCalled();
    document.removeEventListener('change', onChange);
  });

  it('o mousedown não abre a lista e devolve o foco', () => {
    const ro = document.getElementById('ro') as HTMLSelectElement;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    ro.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(ro);
  });
});
