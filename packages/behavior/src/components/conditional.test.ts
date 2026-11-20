import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateCondition, initConditional } from './conditional';

const form = `
<form id="f">
  <fieldset>
    <legend>Tipo</legend>
    <label><input type="radio" name="tipo" value="pf" checked> Pessoa física</label>
    <label><input type="radio" name="tipo" value="pj"> Pessoa jurídica</label>
  </fieldset>
  <div id="pj" data-eds-show-if="tipo=pj" data-eds-show-if-announce="Campos da empresa exibidos.">
    <label for="cnpj">CNPJ</label><input id="cnpj" name="cnpj">
    <input id="ja" name="ja" disabled>
  </div>
  <label><input id="outro" type="checkbox" name="outro"> Outro motivo</label>
  <div id="motivo" data-eds-show-if="outro">
    <input id="txt" name="motivo">
    <div id="fundo" data-eds-show-if="tipo=pj"><input id="aninhado" name="aninhado"></div>
  </div>
  <input id="email" name="email" data-eds-require-if="tipo!=pf">
  <select id="uf" name="uf"><option value="">Escolha</option><option value="RS">RS</option><option value="SC">SC</option></select>
  <input id="rs" name="rs" data-eds-show-if="uf=RS|SC">
  <input id="vazio" name="vazio" data-eds-show-if="!uf">
</form>`;

describe('campos condicionais', () => {
  let destroy: () => void;
  afterEach(() => {
    destroy?.();
    document.body.innerHTML = '';
  });
  const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

  it('oculta com hidden e desabilita os campos de dentro, respeitando os já desabilitados', async () => {
    document.body.innerHTML = form;
    destroy = initConditional(document);
    expect($('pj').hidden).toBe(true);
    expect($('cnpj').disabled).toBe(true);
    const user = userEvent.setup();
    await user.click(screen_radio('pj'));
    expect($('pj').hidden).toBe(false);
    expect($('cnpj').disabled).toBe(false);
    // já vinha desabilitado pelo autor: continua
    expect($('ja').disabled).toBe(true);
    await user.click(screen_radio('pf'));
    expect($('pj').hidden).toBe(true);
    expect($('cnpj').disabled).toBe(true);
  });

  it('campo oculto não vai no envio nem valida', () => {
    document.body.innerHTML = form;
    destroy = initConditional(document);
    $('cnpj').required = true;
    const f = document.getElementById('f') as HTMLFormElement;
    expect(new FormData(f).has('cnpj')).toBe(false);
    expect(f.checkValidity()).toBe(true);
  });

  it('data-eds-require-if torna obrigatório e devolve o estado original', async () => {
    document.body.innerHTML = form;
    destroy = initConditional(document);
    expect($('email').required).toBe(false);
    await userEvent.setup().click(screen_radio('pj'));
    expect($('email').required).toBe(true);
    await userEvent.setup().click(screen_radio('pf'));
    expect($('email').required).toBe(false);
  });

  it('checkbox, lista a|b, ausência e aninhamento', async () => {
    document.body.innerHTML = form;
    destroy = initConditional(document);
    const user = userEvent.setup();
    expect($('motivo').hidden).toBe(true);
    expect($('rs').hidden).toBe(true);
    expect($('vazio').hidden).toBe(false);
    await user.click($('outro'));
    expect($('motivo').hidden).toBe(false);
    expect($('txt').disabled).toBe(false);
    // interno continua oculto (tipo=pf) e desabilitado
    expect($('fundo').hidden).toBe(true);
    expect($('aninhado').disabled).toBe(true);
    await user.selectOptions($('uf') as unknown as HTMLSelectElement, 'SC');
    expect($('rs').hidden).toBe(false);
    expect($('vazio').hidden).toBe(true);
    await user.click(screen_radio('pj'));
    expect($('aninhado').disabled).toBe(false);
  });

  it('emite eds:conditional-change e anuncia só depois de ação do usuário', async () => {
    document.body.innerHTML = form;
    const onChange = vi.fn();
    document.addEventListener('eds:conditional-change', onChange);
    destroy = initConditional(document);
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector('[data-eds-page-status]')?.textContent ?? '').toBe('');
    await userEvent.setup().click(screen_radio('pj'));
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ visible: true });
    expect(document.querySelector('[data-eds-page-status]')?.textContent).toBe(
      'Campos da empresa exibidos.',
    );
    document.removeEventListener('eds:conditional-change', onChange);
  });

  it('reavalia ao limpar o formulário (reset)', async () => {
    document.body.innerHTML = form;
    destroy = initConditional(document);
    await userEvent.setup().click(screen_radio('pj'));
    (document.getElementById('f') as HTMLFormElement).reset();
    await new Promise((r) => setTimeout(r, 5));
    expect($('pj').hidden).toBe(true);
  });
});

describe('foco ao ocultar', () => {
  it('o foco que estava no bloco que some vai ao campo que controla a condição', () => {
    document.body.innerHTML = `<form>
      <label><input id="sim" type="checkbox" name="mais" checked> Mais</label>
      <div data-eds-show-if="mais"><input id="dentro" name="dentro"></div></form>`;
    const stop = initConditional(document);
    const dentro = document.getElementById('dentro') as HTMLInputElement;
    dentro.focus();
    const sim = document.getElementById('sim') as HTMLInputElement;
    sim.checked = false;
    sim.dispatchEvent(new Event('change', { bubbles: true }));
    expect(dentro.disabled).toBe(true);
    expect(document.activeElement).toBe(sim);
    stop();
    document.body.innerHTML = '';
  });
});

function screen_radio(value: string): HTMLInputElement {
  return document.querySelector(`input[name="tipo"][value="${value}"]`) as HTMLInputElement;
}

describe('evaluateCondition', () => {
  it('trata sintaxe vazia ou campo inexistente como falso', () => {
    document.body.innerHTML = '<input name="a" value="1">';
    expect(evaluateCondition('', document)).toBe(false);
    expect(evaluateCondition('b', document)).toBe(false);
    expect(evaluateCondition('!b', document)).toBe(true);
    expect(evaluateCondition('a', document)).toBe(true);
    expect(evaluateCondition('a=1', document)).toBe(true);
    expect(evaluateCondition('a!=1', document)).toBe(false);
    expect(evaluateCondition('a=2|1', document)).toBe(true);
    document.body.innerHTML = '';
  });
});
