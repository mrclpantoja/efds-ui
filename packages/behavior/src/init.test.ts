import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, init, resetMessages } from './index';
import { resetLoaderConfig } from './components/loader';
import { flush, installDomPolyfills } from './test-utils/dom-polyfills';

const tabs = (suffix: string) => `
<div class="eds-tabs">
  <div class="eds-tablist" role="tablist" aria-label="x">
    <button type="button" class="eds-tab" role="tab" id="a${suffix}" aria-selected="true" aria-controls="pa${suffix}">A</button>
    <button type="button" class="eds-tab" role="tab" id="b${suffix}" aria-selected="false" aria-controls="pb${suffix}">B</button>
  </div>
  <div id="pa${suffix}" role="tabpanel">A</div>
  <div id="pb${suffix}" role="tabpanel">B</div>
</div>`;

describe('init', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = `<section id="dentro">${tabs('1')}</section><section id="fora">${tabs('2')}</section>`;
  });
  afterEach(() => {
    resetLoaderConfig();
    resetMessages();
    restore();
    document.body.innerHTML = '';
  });

  it('não liga nada fora do root', () => {
    const destroy = init(document.getElementById('dentro') as HTMLElement);
    expect(document.getElementById('b1')).toHaveAttribute('tabindex', '-1');
    expect(document.getElementById('b2')).not.toHaveAttribute('tabindex');
    destroy();
  });

  it('liga o que entra depois e desliga o que sai', async () => {
    const root = document.getElementById('dentro') as HTMLElement;
    const destroy = init(root);
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:tabs-change', onChange);
    root.insertAdjacentHTML('beforeend', tabs('3'));
    await flush();
    await user.click(document.getElementById('b3') as HTMLElement);
    expect(onChange).toHaveBeenCalledTimes(1);

    const removed = document.getElementById('b3')?.closest('.eds-tabs') as HTMLElement;
    removed.remove();
    await flush();
    // Reinserido fora do root: continua desligado.
    document.getElementById('fora')?.append(removed);
    await user.click(document.getElementById('a3') as HTMLElement);
    expect(onChange).toHaveBeenCalledTimes(1);
    document.removeEventListener('eds:tabs-change', onChange);
    destroy();
  });

  it('mover um elemento dentro do root não o desliga', async () => {
    const root = document.getElementById('dentro') as HTMLElement;
    const destroy = init(root);
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:tabs-change', onChange);
    const el = root.querySelector('.eds-tabs') as HTMLElement;
    root.append(el);
    await flush();
    await user.click(document.getElementById('b1') as HTMLElement);
    expect(onChange).toHaveBeenCalledTimes(1);
    document.removeEventListener('eds:tabs-change', onChange);
    destroy();
  });

  it('destroy para o observador e é idempotente', async () => {
    const root = document.getElementById('dentro') as HTMLElement;
    const destroy = init(root);
    destroy();
    destroy();
    root.insertAdjacentHTML('beforeend', tabs('4'));
    await flush();
    expect(document.getElementById('b4')).not.toHaveAttribute('tabindex');
  });

  it('configure troca as mensagens', async () => {
    configure({
      messages: { sortedBy: 'Sorted by {column}, {direction}.', sortAscending: 'ascending' },
    });
    document.body.innerHTML = `<div class="eds-table-wrap"><table class="eds-table"><caption>t</caption>
      <thead><tr><th aria-sort="none"><button class="eds-table-sort">Name</button></th></tr></thead>
      <tbody><tr><td>b</td></tr><tr><td>a</td></tr></tbody></table></div><div role="status" id="s"></div>`;
    const destroy = init(document);
    await userEvent.setup().click(document.querySelector('.eds-table-sort') as HTMLElement);
    expect(document.getElementById('s')).toHaveTextContent('Sorted by Name, ascending.');
    destroy();
  });

  it('liga tooltip, popover, wizard e barra de filtros (onda B) e usa os textos configurados', async () => {
    configure({
      messages: { wizardStep: 'Step {current} of {total}: {title}.', filterRemove: ' - remove' },
    });
    document.body.innerHTML = `
      <button id="tb" aria-describedby="tt" data-eds-tooltip>x</button>
      <span class="eds-tooltip" id="tt" role="tooltip" popover="manual">dica</span>
      <button id="pb" popovertarget="pp" aria-expanded="false" data-eds-popover>p</button>
      <div id="pp" popover>conteúdo</div>
      <form id="wz" data-eds-wizard>
        <section data-eds-wizard-step><h2>Um</h2></section>
        <section data-eds-wizard-step hidden><h2>Dois</h2></section>
        <button type="button" data-eds-wizard-next id="nx">Próximo</button>
      </form>
      <form id="fb" data-eds-filter-bar><label for="q">Busca</label><input id="q" name="q" value="a" /></form>`;
    const destroy = init(document);
    await flush();
    expect(document.getElementById('pb')).toHaveAttribute('aria-expanded', 'false');
    document.getElementById('pb')?.click();
    await flush();
    expect(document.getElementById('pb')).toHaveAttribute('aria-expanded', 'true');
    document.getElementById('nx')?.click();
    expect(document.querySelector('#wz [role="status"]')).toHaveTextContent('Step 2 of 2: Dois.');
    expect(document.querySelector('#fb .eds-chip')).toHaveTextContent('Busca: a - remove');
    destroy();
  });
});
