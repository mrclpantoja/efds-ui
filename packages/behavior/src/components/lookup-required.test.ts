import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindAll } from '../core/registry';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { validateFormBehavior } from './form-validation';
import { initLookup } from './lookup';

const items = JSON.stringify([
  { code: '10', description: 'Aurora Comércio Ltda.' },
  { code: '11', description: 'Boreal Serviços' },
]);

let restore: () => void;
let stopForm: () => void;
let stopLookup: () => void;

beforeEach(() => {
  restore = installDomPolyfills();
  document.body.innerHTML = `
  <form id="f" data-eds-validate-form>
    <label for="c">Cliente</label>
    <div class="eds-lookup" data-eds-lookup>
      <script type="application/json" data-eds-lookup-items>${items}</script>
      <input class="eds-input eds-lookup-code" id="c" name="cliente" autocomplete="off" required />
      <output class="eds-lookup-description" aria-live="polite" data-empty>—</output>
    </div>
    <button type="submit">Enviar</button>
  </form>`;
  stopForm = bindAll(document, [validateFormBehavior]);
  stopLookup = initLookup(document);
});
afterEach(() => {
  stopLookup();
  stopForm();
  document.body.innerHTML = '';
  restore();
});

const input = () => document.getElementById('c') as HTMLInputElement;
const errors = () =>
  Array.from(document.querySelectorAll<HTMLElement>('p.eds-error')).filter(
    (e) => !e.closest('dialog') && !e.hidden,
  );

async function refuse() {
  const user = userEvent.setup();
  await user.click(document.querySelector('button[type="submit"]') as HTMLElement);
  expect(errors().map((e) => e.textContent)).toEqual(['Preencha este campo.']);
  expect(input().getAttribute('aria-invalid')).toBe('true');
}

describe('Lookup required: o erro do formulário some ao ficar válido', () => {
  it('escolha por autocompletar', async () => {
    await refuse();
    const user = userEvent.setup();
    await user.type(input(), 'bore');
    await user.keyboard('{ArrowDown}{Enter}');
    await new Promise((r) => setTimeout(r, 0));
    expect(input().value).toBe('11');
    expect(errors()).toHaveLength(0);
    expect(input().hasAttribute('aria-invalid')).toBe(false);
  });

  it('código digitado e confirmado', async () => {
    await refuse();
    const user = userEvent.setup();
    await user.type(input(), '10{Enter}');
    await new Promise((r) => setTimeout(r, 0));
    expect(errors()).toHaveLength(0);
  });

  it('EDS.lookup().setValue (valor sem evento nativo)', async () => {
    await refuse();
    const { lookupController: lookupOf } = await import('./lookup');
    lookupOf(document.querySelector('[data-eds-lookup]') as HTMLElement)?.setValue({
      code: '10',
      description: 'Aurora Comércio Ltda.',
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(errors()).toHaveLength(0);
  });
});
