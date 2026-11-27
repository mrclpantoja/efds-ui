import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMessages, setMessages } from '../core/config';
import { flush } from '../test-utils/dom-polyfills';
import { initValidate } from './validate-init';

// Dados fictícios: documentos gerados por algoritmo, de ninguém.
const CPF_OK = '529.982.247-25';
const CPF_RUIM = '529.982.247-24';

const html = `
<div class="eds-error-summary" data-eds-error-summary="f" id="resumo" tabindex="-1" aria-labelledby="resumo-titulo" hidden>
  <h2 class="eds-error-summary-title" id="resumo-titulo"></h2>
  <ul class="eds-error-summary-list"></ul>
</div>
<form id="f" action="/enviar" method="post">
  <div class="eds-field">
    <label class="eds-label" for="nome">Nome</label>
    <input class="eds-input" id="nome" name="nome" required />
  </div>
  <div class="eds-field">
    <label class="eds-label" for="cpf">CPF</label>
    <input class="eds-input" id="cpf" name="cpf" data-eds-validate="cpf" />
  </div>
  <div class="eds-field">
    <label class="eds-label" for="email">E-mail</label>
    <input class="eds-input" id="email" name="email" data-eds-validate="email" data-eds-validate-message="Escreva um e-mail como nome@exemplo.com." />
  </div>
  <button type="submit" id="enviar">Enviar</button>
  <button type="submit" id="rascunho" formnovalidate>Salvar rascunho</button>
</form>`;

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const errorOf = (id: string): HTMLElement | null => {
  const ref = $(id).getAttribute('aria-describedby');
  return ref ? document.getElementById(ref.split(' ')[0] ?? '') : null;
};

describe('validação declarativa', () => {
  let destroy: () => void;
  let submitted: number;
  beforeEach(() => {
    document.body.innerHTML = html;
    submitted = 0;
    $('f').addEventListener('submit', (e) => {
      e.preventDefault();
      submitted += 1;
    });
    destroy = initValidate(document);
  });
  afterEach(() => {
    destroy();
    resetMessages();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('troca o balão nativo pelo erro visível (novalidate por JS) e devolve ao desligar', () => {
    const form = document.getElementById('f') as HTMLFormElement;
    expect(form.noValidate).toBe(true);
    destroy();
    expect(form.noValidate).toBe(false);
    destroy = initValidate(document);
  });

  it('não mostra erro enquanto digita pela primeira vez, mas mostra ao sair do campo', async () => {
    const user = userEvent.setup();
    await user.type($('cpf'), '529');
    expect($('cpf')).not.toHaveAttribute('aria-invalid');
    expect(document.querySelector('.eds-error')).toBeNull();
    await user.tab();
    expect($('cpf')).toHaveAttribute('aria-invalid', 'true');
    expect(errorOf('cpf')).toHaveTextContent('Informe um CPF válido.');
    expect(errorOf('cpf')).toHaveClass('eds-error');
  });

  it('depois do primeiro erro valida a cada tecla e o erro some ao ficar válido', async () => {
    const user = userEvent.setup();
    await user.type($('cpf'), '529');
    await user.tab();
    expect(errorOf('cpf')).not.toBeNull();
    await user.click($('cpf'));
    await user.clear($('cpf'));
    await user.type($('cpf'), CPF_RUIM);
    expect($('cpf')).toHaveAttribute('aria-invalid', 'true');
    await user.clear($('cpf'));
    await user.type($('cpf'), CPF_OK);
    expect($('cpf')).not.toHaveAttribute('aria-invalid');
    expect($('cpf')).not.toHaveAttribute('aria-describedby');
    expect(document.querySelector('p.eds-error')).toBeNull();
  });

  it('campo opcional vazio é válido; obrigatório vazio mostra o texto em pt-BR', async () => {
    const user = userEvent.setup();
    await user.click($('cpf'));
    await user.tab();
    expect($('cpf')).not.toHaveAttribute('aria-invalid');
    await user.click($('nome'));
    await user.tab();
    expect(errorOf('nome')).toHaveTextContent('Preencha este campo.');
  });

  it('data-eds-validate-message troca o texto', async () => {
    const user = userEvent.setup();
    await user.type($('email'), 'sem-arroba');
    await user.tab();
    expect(errorOf('email')).toHaveTextContent('Escreva um e-mail como nome@exemplo.com.');
  });

  it('mensagens configuráveis por configure/messages', async () => {
    setMessages({ validateCpf: 'CPF incorreto.', validateRequired: 'Obrigatório.' });
    const user = userEvent.setup();
    await user.type($('cpf'), '123');
    await user.tab();
    expect(errorOf('cpf')).toHaveTextContent('CPF incorreto.');
    await user.click($('nome'));
    await user.tab();
    expect(errorOf('nome')).toHaveTextContent('Obrigatório.');
  });

  it('envio inválido: sem submit, eds:form-invalid, resumo preenchido e com o foco', async () => {
    const user = userEvent.setup();
    const invalid = vi.fn();
    $('f').addEventListener('eds:form-invalid', (e) => invalid((e as CustomEvent).detail));
    await user.type($('cpf'), CPF_RUIM);
    await user.click($('enviar'));
    expect(submitted).toBe(0);
    expect(invalid).toHaveBeenCalledTimes(1);
    const fields = invalid.mock.calls[0]?.[0].fields as {
      id: string;
      label: string;
      message: string;
    }[];
    expect(fields.map((f) => f.id)).toEqual(['nome', 'cpf']);
    expect(fields[1]).toMatchObject({ label: 'CPF', message: 'Informe um CPF válido.' });

    const resumo = document.getElementById('resumo') as HTMLElement;
    expect(resumo).not.toHaveAttribute('hidden');
    expect(resumo).toHaveFocus();
    expect(document.getElementById('resumo-titulo')).toHaveTextContent('Corrija 2 campos');
    const links = Array.from(resumo.querySelectorAll('a')).map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Nome: preencha este campo.', '#nome'],
      ['CPF: informe um CPF válido.', '#cpf'],
    ]);
    expect($('nome')).toHaveAttribute('aria-invalid', 'true');
    expect($('cpf')).toHaveAttribute('aria-invalid', 'true');
  });

  it('o link do resumo leva o foco ao campo', async () => {
    const user = userEvent.setup();
    await user.type($('cpf'), CPF_RUIM);
    await user.click($('enviar'));
    await user.click(document.querySelector<HTMLAnchorElement>('#resumo a[href="#cpf"]')!);
    expect($('cpf')).toHaveFocus();
  });

  it('corrigir atualiza o resumo (título e itens) e esconde ao zerar, com anúncio discreto', async () => {
    const user = userEvent.setup();
    await user.type($('cpf'), CPF_RUIM);
    await user.click($('enviar'));
    expect(document.getElementById('resumo-titulo')).toHaveTextContent('Corrija 2 campos');
    await user.type($('nome'), 'Maria Teste');
    await flush();
    expect(document.getElementById('resumo-titulo')).toHaveTextContent('Corrija 1 campo');
    expect(document.querySelectorAll('#resumo li')).toHaveLength(1);
    await user.clear($('cpf'));
    await user.type($('cpf'), CPF_OK);
    await flush();
    expect(document.getElementById('resumo')).toHaveAttribute('hidden');
    expect(document.querySelector('[data-eds-page-status]')?.textContent).toContain(
      'Todos os erros foram corrigidos.',
    );
  });

  it('com tudo válido envia (o submit chega ao autor) e esconde o resumo', async () => {
    const user = userEvent.setup();
    await user.click($('enviar'));
    await user.type($('nome'), 'Maria Teste');
    await user.type($('cpf'), CPF_OK);
    await flush();
    await user.click($('enviar'));
    expect(submitted).toBe(1);
    expect(document.getElementById('resumo')).toHaveAttribute('hidden');
  });

  it('formnovalidate (rascunho) envia sem validar', async () => {
    const user = userEvent.setup();
    await user.click($('rascunho'));
    expect(submitted).toBe(1);
    expect(document.getElementById('resumo')).toHaveAttribute('hidden');
  });

  it('sem resumo, o foco vai ao primeiro campo inválido', async () => {
    destroy();
    document.getElementById('resumo')?.remove();
    destroy = initValidate(document);
    const user = userEvent.setup();
    await user.click($('enviar'));
    expect($('nome')).toHaveFocus();
  });

  it('reaproveita o p.eds-error do HTML ligado por aria-describedby', async () => {
    destroy();
    document.body.innerHTML = `
      <form id="f"><label for="c">CPF</label>
      <input id="c" data-eds-validate="cpf" aria-describedby="c-erro" />
      <p class="eds-error" id="c-erro" hidden></p>
      <button type="submit" id="ok">Enviar</button></form>`;
    destroy = initValidate(document);
    const user = userEvent.setup();
    await user.type(document.getElementById('c') as HTMLInputElement, '1');
    await user.tab();
    const p = document.getElementById('c-erro') as HTMLElement;
    expect(p).not.toHaveAttribute('hidden');
    expect(p).toHaveTextContent('Informe um CPF válido.');
    expect(document.querySelectorAll('.eds-error')).toHaveLength(1);
    await user.click(document.getElementById('c') as HTMLElement);
    await user.clear(document.getElementById('c') as HTMLInputElement);
    expect(p).toHaveAttribute('hidden');
  });

  it('grupo de rádios obrigatório: um erro só, pela legenda', async () => {
    destroy();
    document.body.innerHTML = `
      <form id="f" data-eds-validate-form>
        <fieldset><legend>Situação</legend>
          <label><input type="radio" name="s" value="a" required /> Ativa</label>
          <label><input type="radio" name="s" value="b" /> Inativa</label>
        </fieldset>
        <div data-eds-error-summary tabindex="-1" hidden></div>
        <button type="submit" id="ok">Enviar</button>
      </form>`;
    destroy = initValidate(document);
    const user = userEvent.setup();
    await user.click(document.getElementById('ok') as HTMLElement);
    expect(document.querySelectorAll('p.eds-error')).toHaveLength(1);
    expect(document.querySelectorAll('[data-eds-error-summary] li')).toHaveLength(1);
    expect(document.querySelector('[data-eds-error-summary] a')).toHaveTextContent(
      'Situação: escolha uma opção.',
    );
    await user.click(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]!);
    await flush();
    expect(document.querySelector('[data-eds-error-summary]')).toHaveAttribute('hidden');
    expect(document.querySelectorAll('p.eds-error')).toHaveLength(0);
  });

  it('data com faixa: mensagem diferente para fora do intervalo', async () => {
    destroy();
    document.body.innerHTML = `
      <form id="f"><label for="d">Data</label>
      <input id="d" data-eds-validate="data" min="01/01/2026" max="31/12/2026" />
      <button type="submit">Enviar</button></form>`;
    destroy = initValidate(document);
    const user = userEvent.setup();
    const d = document.getElementById('d') as HTMLInputElement;
    await user.type(d, '31/02/2026');
    await user.tab();
    expect(document.querySelector('p.eds-error')).toHaveTextContent('Informe uma data válida');
    await user.click(d);
    await user.clear(d);
    await user.type(d, '01/01/2027');
    expect(document.querySelector('p.eds-error')).toHaveTextContent(
      'Informe uma data entre 01/01/2026 e 31/12/2026.',
    );
  });

  it('o validador alimenta a validade nativa (Wizard e checkValidity enxergam)', async () => {
    const user = userEvent.setup();
    await user.type($('cpf'), '123');
    expect($('cpf').validity.customError).toBe(true);
    expect($('cpf').checkValidity()).toBe(false);
    await user.clear($('cpf'));
    expect($('cpf').checkValidity()).toBe(true);
  });
});

describe('validação dentro do Wizard', () => {
  it('o validador vira validade nativa e o Wizard mostra o erro (um só p.eds-error)', async () => {
    document.body.innerHTML = `
      <form id="w" data-eds-wizard>
        <section data-eds-wizard-step><h3>Dados</h3>
          <label for="wc">CPF</label><input id="wc" data-eds-validate="cpf" />
        </section>
        <section data-eds-wizard-step hidden><h3>Fim</h3><p>ok</p></section>
        <button type="button" data-eds-wizard-prev>Voltar</button>
        <button type="button" data-eds-wizard-next id="prox">Avançar</button>
      </form>`;
    const stopValidate = initValidate(document);
    const { initWizard } = await import('./wizard');
    const stopWizard = initWizard(document);
    const user = userEvent.setup();
    const cpf = document.getElementById('wc') as HTMLInputElement;
    await user.type(cpf, '123');
    await user.tab();
    // O controlador não mostra erro por conta própria no Wizard: quem mostra é o Wizard, ao avançar.
    expect(document.querySelectorAll('p.eds-error')).toHaveLength(0);
    await user.click(document.getElementById('prox') as HTMLElement);
    expect(document.querySelectorAll('p.eds-error')).toHaveLength(1);
    expect(cpf).toHaveAccessibleDescription('Informe um CPF válido.');
    stopWizard();
    stopValidate();
    document.body.innerHTML = '';
  });
});
