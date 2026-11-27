import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '../test-utils/dom-polyfills';
import { initWizard } from './wizard';

const item = (state: string, label: string, current = false) => `
  <li class="eds-stepper-item" data-state="${state}"${current ? ' aria-current="step"' : ''}>
    <span class="eds-stepper-marker"></span>
    <span class="eds-stepper-label">${label}</span>
  </li>`;

const html = `
<form id="f" data-eds-wizard action="/enviar" method="post">
  <ol class="eds-stepper" aria-label="Etapas do cadastro">
    ${item('current', 'Dados', true)}${item('upcoming', 'Endereço')}${item('upcoming', 'Revisão')}
  </ol>
  <section data-eds-wizard-step id="p1">
    <h2 id="h1">Dados</h2>
    <label for="nome">Nome</label><input id="nome" name="nome" required />
  </section>
  <section data-eds-wizard-step id="p2" hidden>
    <h2 id="h2">Endereço</h2>
    <label for="cep">CEP</label><input id="cep" name="cep" required pattern="[0-9]{8}" />
  </section>
  <section data-eds-wizard-step id="p3" hidden>
    <h2 id="h3">Revisão</h2>
    <p>Confira.</p>
  </section>
  <button type="button" id="prev" data-eds-wizard-prev>Voltar</button>
  <button type="button" id="next" data-eds-wizard-next>Avançar</button>
  <button type="submit" id="fim" data-eds-wizard-finish>Concluir</button>
</form>`;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const state = (n: number) =>
  document.querySelectorAll<HTMLElement>('.eds-stepper-item')[n]?.dataset.state;

describe('wizard', () => {
  let destroy: () => void;
  beforeEach(() => {
    document.body.innerHTML = html;
    destroy = initWizard(document);
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  it('mostra só o painel atual e ajusta os botões', () => {
    expect($('p1')).not.toHaveAttribute('hidden');
    expect($('p2')).toHaveAttribute('hidden');
    expect($('prev')).toHaveAttribute('hidden');
    expect($('next')).not.toHaveAttribute('hidden');
    expect($('fim')).toHaveAttribute('hidden');
    expect(($('f') as HTMLFormElement).noValidate).toBe(true);
  });

  it('não avança com campo inválido: erro visível, aria-invalid, foco e sem balão nativo', async () => {
    const user = userEvent.setup();
    const report = vi.spyOn($('nome') as HTMLInputElement, 'reportValidity');
    await user.click($('next'));
    expect(report).not.toHaveBeenCalled();
    expect($('p1')).not.toHaveAttribute('hidden');
    expect(state(0)).toBe('current');
    const nome = $('nome');
    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(nome);
    const err = document.getElementById(nome.getAttribute('aria-describedby') ?? '');
    expect(err).toHaveClass('eds-error');
    expect(err?.textContent).not.toBe('');
  });

  it('o erro some quando o campo fica válido e não se duplica', async () => {
    const user = userEvent.setup();
    await user.click($('next'));
    await user.click($('next'));
    expect(document.querySelectorAll('#p1 .eds-error')).toHaveLength(1);
    await user.type($('nome'), 'M');
    expect($('nome')).not.toHaveAttribute('aria-invalid');
    expect($('nome')).not.toHaveAttribute('aria-describedby');
    expect(document.querySelector('#p1 .eds-error')).toBeNull();
  });

  it('usa data-eds-error-message como mensagem e reaproveita o p.eds-error do .eds-field', async () => {
    destroy();
    document.body.innerHTML = html.replace(
      '<label for="nome">Nome</label><input id="nome" name="nome" required />',
      '<div class="eds-field"><label for="nome">Nome</label><input id="nome" name="nome" required data-eds-error-message="Informe o nome." aria-describedby="aj" /><p class="eds-error" id="e1" hidden></p></div>',
    );
    destroy = initWizard(document);
    const user = userEvent.setup();
    await user.click($('next'));
    expect($('e1')).toHaveTextContent('Informe o nome.');
    expect($('e1')).not.toHaveAttribute('hidden');
    expect($('nome').getAttribute('aria-describedby')).toBe('aj e1');
    expect(document.querySelectorAll('.eds-error')).toHaveLength(1);
    await user.type($('nome'), 'x');
    expect($('e1')).toHaveAttribute('hidden');
    expect($('e1')).toHaveTextContent('');
    expect($('nome').getAttribute('aria-describedby')).toBe('aj');
  });

  it('avança, foca o título, anuncia e atualiza o stepper', async () => {
    const user = userEvent.setup();
    await user.type($('nome'), 'Maria Exemplo');
    await user.click($('next'));
    expect($('p1')).toHaveAttribute('hidden');
    expect($('p2')).not.toHaveAttribute('hidden');
    expect(document.activeElement).toBe($('h2'));
    expect($('h2')).toHaveAttribute('tabindex', '-1');
    expect(document.querySelector('[role="status"]')).toHaveTextContent('Etapa 2 de 3: Endereço.');
    expect(state(0)).toBe('done');
    expect(state(1)).toBe('current');
    const items = document.querySelectorAll('.eds-stepper-item');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[0]?.querySelector('button.eds-stepper-label')).not.toBeNull();
    expect(items[1]?.querySelector('.eds-stepper-summary')).toHaveTextContent('Etapa 2 de 3');
    expect(items[0]?.querySelector('.eds-stepper-summary')).toBeNull();
    expect(items[0]?.querySelector('.eds-visually-hidden')).toHaveTextContent('(concluída)');
    expect($('prev')).not.toHaveAttribute('hidden');
  });

  it('dispara beforechange cancelável e change', async () => {
    const user = userEvent.setup();
    const before = vi.fn((e: Event) => e.preventDefault());
    const change = vi.fn();
    $('f').addEventListener('eds:wizard-beforechange', before);
    $('f').addEventListener('eds:wizard-change', change);
    await user.type($('nome'), 'Maria');
    await user.click($('next'));
    expect(before).toHaveBeenCalledTimes(1);
    expect((before.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      from: 0,
      to: 1,
      direction: 'next',
    });
    expect($('p1')).not.toHaveAttribute('hidden');
    expect(change).not.toHaveBeenCalled();
    $('f').removeEventListener('eds:wizard-beforechange', before);
    await user.click($('next'));
    expect(change).toHaveBeenCalledTimes(1);
    const detail = (change.mock.calls[0]?.[0] as CustomEvent).detail;
    expect(detail.from).toBe(0);
    expect(detail.to).toBe(1);
    expect(detail.total).toBe(3);
    expect(detail.step).toBe($('p2'));
  });

  it('Voltar e etapa concluída clicável voltam, preservando os valores', async () => {
    const user = userEvent.setup();
    await user.type($('nome'), 'Maria');
    await user.click($('next'));
    await user.click($('prev'));
    expect($('p1')).not.toHaveAttribute('hidden');
    expect(($('nome') as HTMLInputElement).value).toBe('Maria');
    await user.click($('next'));
    await user.type($('cep'), '90010000');
    await user.click($('next'));
    expect(state(2)).toBe('current');
    const button = document.querySelector<HTMLButtonElement>(
      '.eds-stepper-item[data-state="done"] button.eds-stepper-label',
    );
    expect(button).not.toBeNull();
    await user.click(button as HTMLElement);
    expect(state(0)).toBe('current');
    expect(document.querySelector('[role="status"]')).toHaveTextContent('Etapa 1 de 3: Dados.');
  });

  it('Enter em um campo avança em vez de enviar; na última valida tudo e deixa enviar', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((e: Event) => e.preventDefault());
    $('f').addEventListener('submit', submit);
    await user.type($('nome'), 'Maria{Enter}');
    expect($('p2')).not.toHaveAttribute('hidden');
    await user.type($('cep'), '90010000{Enter}');
    expect($('p3')).not.toHaveAttribute('hidden');
    expect($('fim')).not.toHaveAttribute('hidden');
    expect($('next')).toHaveAttribute('hidden');
    await user.click($('fim'));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[0]?.defaultPrevented).toBe(true);
    // O envio chegou ao ouvinte do app: nenhum painel anterior ficou inválido.
    expect($('p3')).not.toHaveAttribute('hidden');
  });

  it('o envio final leva ao primeiro painel inválido e marca erro', async () => {
    const user = userEvent.setup();
    await user.type($('nome'), 'Maria');
    await user.click($('next'));
    await user.type($('cep'), '90010000');
    await user.click($('next'));
    // Alguém invalida o painel 1 depois de concluído.
    ($('nome') as HTMLInputElement).value = '';
    await user.click($('fim'));
    await flush();
    expect($('p1')).not.toHaveAttribute('hidden');
    expect($('p3')).toHaveAttribute('hidden');
    expect(state(0)).toBe('current');
    // Ao sair dele, o painel segue como erro até ficar válido.
    await user.type($('nome'), 'Maria');
    await user.click($('next'));
    expect(state(0)).toBe('done');
  });

  it('inicia na etapa indicada pelo stepper do servidor', () => {
    destroy();
    document.body.innerHTML = html
      .replace('data-state="current" aria-current="step"', 'data-state="done"')
      .replace(/data-state="upcoming"/, 'data-state="current" aria-current="step"');
    destroy = initWizard(document);
    expect($('p1')).toHaveAttribute('hidden');
    expect($('p2')).not.toHaveAttribute('hidden');
  });

  it('Enter avança também quando o formulário não tem botão de envio', async () => {
    destroy();
    document.body.innerHTML = html.replace(/<button type="submit"[^]*?<\/button>/, '');
    destroy = initWizard(document);
    const user = userEvent.setup();
    await user.type($('nome'), 'Maria{Enter}');
    expect($('p2')).not.toHaveAttribute('hidden');
  });
});
