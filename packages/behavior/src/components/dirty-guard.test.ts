import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initDirtyGuard, markClean } from './dirty-guard';

const html = `
<form id="f" data-eds-dirty-guard action="/salvar">
  <input id="nome" name="nome" value="Ana Exemplo">
  <input id="ok" type="checkbox" name="ok">
  <select id="uf" name="uf"><option value="RS" selected>RS</option><option value="SC">SC</option></select>
  <input id="ign" name="ign" data-eds-dirty-ignore>
  <button id="enviar" type="submit">Salvar</button>
</form>
<a id="link" href="/outra-pagina">Outra página</a>
<a id="ancora" href="#topo">Topo</a>
<a id="ext" href="https://exemplo.invalid/x">Externo</a>`;

const dlg = () => document.querySelector<HTMLDialogElement>('dialog.eds-alert-dialog');
const press = async (label: string) => {
  const b = [...dlg()!.querySelectorAll('button')].find((x) => x.textContent === label)!;
  b.click();
  await flush();
};
const beforeUnload = (): boolean => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('alterações não salvas', () => {
  let restore: () => void;
  let destroy: () => void;
  const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = html;
    destroy = initDirtyGuard(document);
  });
  afterEach(async () => {
    destroy();
    while (dlg()) {
      dlg()!.dispatchEvent(new Event('cancel', { cancelable: true }));
      await flush();
    }
    restore();
    document.body.innerHTML = '';
  });

  it('sem alterações não avisa; com alterações avisa e emite eds:dirty-change', async () => {
    const onChange = vi.fn();
    $('f').addEventListener('eds:dirty-change', onChange);
    expect(beforeUnload()).toBe(false);
    await userEvent.setup().type($('nome'), 'x');
    expect(beforeUnload()).toBe(true);
    expect($('f')).toHaveAttribute('data-dirty');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ dirty: true });
  });

  it('voltar ao valor inicial tira o aviso', async () => {
    const user = userEvent.setup();
    await user.type($('nome'), 'x');
    await user.type($('nome'), '{Backspace}');
    expect(beforeUnload()).toBe(false);
    expect($('f')).not.toHaveAttribute('data-dirty');
  });

  it('detecta checkbox, select e ignora data-eds-dirty-ignore', async () => {
    const user = userEvent.setup();
    await user.type($('ign'), 'abc');
    expect(beforeUnload()).toBe(false);
    await user.click($('ok'));
    expect(beforeUnload()).toBe(true);
    await user.click($('ok'));
    expect(beforeUnload()).toBe(false);
    await user.selectOptions($('uf') as unknown as HTMLSelectElement, 'SC');
    expect(beforeUnload()).toBe(true);
  });

  it('link interno com alterações pergunta; "Continuar editando" não navega', async () => {
    await userEvent.setup().type($('nome'), 'x');
    const reached = vi.fn();
    const onClick = (e: Event) => {
      if ((e.target as Element).closest('#link, #ancora, #ext')) {
        reached();
        e.preventDefault();
      }
    };
    document.addEventListener('click', onClick);
    $('link').click();
    await flush();
    expect(reached).not.toHaveBeenCalled();
    expect(dlg()).not.toBeNull();
    expect(dlg()!.textContent).toContain('Alterações não salvas');
    await press('Continuar editando');
    expect(dlg()).toBeNull();
    expect(reached).not.toHaveBeenCalled();
    document.removeEventListener('click', onClick);
  });

  it('"Sair sem salvar" refaz o clique e a navegação segue', async () => {
    await userEvent.setup().type($('nome'), 'x');
    const reached = vi.fn();
    const onClick = (e: Event) => {
      if ((e.target as Element).closest('#link, #ancora, #ext')) {
        reached();
        e.preventDefault();
      }
    };
    document.addEventListener('click', onClick);
    $('link').click();
    await flush();
    await press('Sair sem salvar');
    expect(reached).toHaveBeenCalledTimes(1);
    document.removeEventListener('click', onClick);
  });

  it('usa data-eds-dirty-message; âncora da mesma página e link externo não perguntam', async () => {
    $('f').setAttribute('data-eds-dirty-message', 'Descartar o rascunho do cliente?');
    await userEvent.setup().type($('nome'), 'x');
    const reached = vi.fn();
    const onClick = (e: Event) => {
      if ((e.target as Element).closest('#link, #ancora, #ext')) {
        reached();
        e.preventDefault();
      }
    };
    document.addEventListener('click', onClick);
    $('ancora').click();
    $('ext').click();
    await flush();
    expect(dlg()).toBeNull();
    expect(reached).toHaveBeenCalledTimes(2);
    $('link').click();
    await flush();
    expect(dlg()!.querySelector('.eds-alert-dialog-text')!.textContent).toBe(
      'Descartar o rascunho do cliente?',
    );
    document.removeEventListener('click', onClick);
  });

  it('envio comum tira o aviso; envio barrado volta a valer', async () => {
    await userEvent.setup().type($('nome'), 'x');
    $('f').addEventListener('submit', (e) => e.preventDefault(), { once: true });
    $('f').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 5));
    expect(beforeUnload()).toBe(true);
    // segundo envio, sem preventDefault: a página vai sair
    $('f').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 5));
    expect(beforeUnload()).toBe(false);
  });

  it('markClean torna o estado atual o inicial', async () => {
    const user = userEvent.setup();
    await user.type($('nome'), 'x');
    markClean($('f') as unknown as HTMLFormElement);
    expect(beforeUnload()).toBe(false);
    await user.type($('nome'), 'y');
    expect(beforeUnload()).toBe(true);
    markClean($('f') as unknown as HTMLFormElement);
    expect(beforeUnload()).toBe(false);
  });

  it('reset do formulário tira o aviso', async () => {
    await userEvent.setup().type($('nome'), 'x');
    ($('f') as unknown as HTMLFormElement).reset();
    await new Promise((r) => setTimeout(r, 5));
    expect(beforeUnload()).toBe(false);
  });

  it('ao desligar, deixa de avisar', async () => {
    await userEvent.setup().type($('nome'), 'x');
    destroy();
    expect(beforeUnload()).toBe(false);
    destroy = initDirtyGuard(document);
  });
});

describe('alterações não salvas com valores normalizados por outros comportamentos', () => {
  it('a máscara que reformata o valor inicial não deixa o formulário "sujo"', async () => {
    const { init } = await import('../index');
    document.body.innerHTML = `<form id="tf" data-eds-dirty-guard>
      <input id="m" name="valor" data-eds-mask="moeda" value="1234.5">
      <input id="o" name="o" value="a"></form>`;
    const stop = init(document);
    await Promise.resolve();
    const form = document.getElementById('tf') as HTMLFormElement;
    const other = document.getElementById('o') as HTMLInputElement;
    expect((document.getElementById('m') as HTMLInputElement).value).toBe('R$ 1.234,50');
    other.value = 'a';
    other.dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.dataset.dirty).toBeUndefined();
    other.value = 'b';
    other.dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.dataset.dirty).toBe('');
    stop();
    document.body.innerHTML = '';
  });
});
