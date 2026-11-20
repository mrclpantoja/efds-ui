import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFilterBar } from './filter-bar';

const html = `
<form id="f" class="eds-filter-bar" role="search" aria-label="Filtrar pedidos" data-eds-filter-bar method="get" action="/pedidos">
  <div class="eds-filter-bar-fields">
    <div class="eds-field"><label class="eds-label" for="q">Busca</label><input class="eds-input" id="q" name="q" value="caderno" /></div>
    <div class="eds-field"><label class="eds-label" for="sit">Situação</label>
      <select class="eds-select" id="sit" name="situacao">
        <option value="">Todas</option>
        <option value="ativo" selected>Ativo</option>
        <option value="inativo">Inativo</option>
      </select></div>
  </div>
  <details class="eds-filter-bar-more" id="mais">
    <summary>Mais filtros</summary>
    <div class="eds-field"><label class="eds-label" for="ini">Emitido desde</label><input class="eds-input" id="ini" name="desde" type="date" value="2026-03-15" /></div>
    <fieldset><legend>Canal</legend>
      <label><input type="checkbox" name="canal" value="loja" checked /> Loja</label>
      <label><input type="checkbox" name="canal" value="site" /> Site</label>
    </fieldset>
  </details>
  <div class="eds-filter-bar-actions">
    <button type="submit" class="eds-button">Filtrar</button>
    <button type="reset" class="eds-button">Limpar</button>
  </div>
  <ul class="eds-filter-chips" aria-label="Filtros ativos"></ul>
</form>`;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const chips = () => Array.from(document.querySelectorAll<HTMLElement>('.eds-filter-chips button'));
const texts = () => chips().map((c) => c.textContent?.replace(/\s+/g, ' ').trim());

describe('filter bar', () => {
  let destroy: () => void;
  let submits: number;
  const onSubmit = (e: Event) => {
    e.preventDefault();
    submits += 1;
  };
  beforeEach(() => {
    submits = 0;
    document.body.innerHTML = html;
    $('f').addEventListener('submit', onSubmit);
    destroy = initFilterBar(document);
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  it('monta os chips dos campos preenchidos, com rótulo e texto da opção', () => {
    expect(texts()).toEqual([
      'Busca: caderno — remover',
      'Situação: Ativo — remover',
      'Emitido desde: 15/03/2026 — remover',
      'Canal: Loja — remover',
    ]);
    const first = chips()[0] as HTMLElement;
    expect(first).toHaveClass('eds-chip');
    expect(first).toHaveAttribute('data-eds-filter-remove', 'q');
    expect(first.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(first.querySelector('.eds-visually-hidden')).toHaveTextContent('— remover');
  });

  it('mostra no "Mais filtros" quantos campos ocultos estão preenchidos, ao vivo', async () => {
    const user = userEvent.setup();
    expect($('mais').querySelector('summary')).toHaveTextContent('Mais filtros (2)');
    await user.clear($('ini'));
    expect($('mais').querySelector('summary')).toHaveTextContent('Mais filtros (1)');
  });

  it('remover um chip limpa o campo, envia e foca o próximo chip', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    $('f').addEventListener('eds:filter-change', change);
    await user.click(chips()[0] as HTMLElement);
    expect(($('q') as HTMLInputElement).value).toBe('');
    expect(submits).toBe(1);
    expect(texts()[0]).toBe('Situação: Ativo — remover');
    expect(document.activeElement).toBe(chips()[0]);
    const detail = (change.mock.calls[0]?.[0] as CustomEvent).detail;
    expect(detail.reason).toBe('remove');
    expect(detail.count).toBe(3);
    expect(detail.values).toEqual({ situacao: 'ativo', desde: '2026-03-15', canal: 'loja' });
    expect(document.querySelector('[role="status"]')).toHaveTextContent(
      'Filtro removido: Busca: caderno. 3 filtros ativos.',
    );
  });

  it('remover o último chip foca o anterior; sem chips, o primeiro campo', async () => {
    const user = userEvent.setup();
    await user.click(chips()[3] as HTMLElement);
    expect(($('f').querySelector('[value="loja"]') as HTMLInputElement).checked).toBe(false);
    expect(document.activeElement).toBe(chips()[2]);
    await user.click(chips()[0] as HTMLElement);
    await user.click(chips()[0] as HTMLElement);
    await user.click(chips()[0] as HTMLElement);
    expect(chips()).toHaveLength(0);
    expect(document.activeElement).toBe($('q'));
    expect(($('f').querySelector('.eds-filter-chips') as HTMLElement).hidden).toBe(true);
  });

  it('select volta à opção vazia', async () => {
    const user = userEvent.setup();
    await user.click(chips()[1] as HTMLElement);
    expect(($('sit') as HTMLSelectElement).value).toBe('');
  });

  it('Limpar zera tudo (não só restaura) e envia', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    $('f').addEventListener('eds:filter-change', change);
    await user.click(document.querySelector('button[type="reset"]') as HTMLElement);
    expect(($('q') as HTMLInputElement).value).toBe('');
    expect(($('sit') as HTMLSelectElement).value).toBe('');
    expect(($('ini') as HTMLInputElement).value).toBe('');
    expect(chips()).toHaveLength(0);
    expect(submits).toBe(1);
    expect((change.mock.calls[0]?.[0] as CustomEvent).detail.reason).toBe('clear');
    expect(document.querySelector('[role="status"]')).toHaveTextContent('Filtros removidos.');
    expect($('mais').querySelector('summary')).not.toHaveTextContent('(');
  });

  it('Filtrar atualiza os chips com o que foi digitado e emite eds:filter-change', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    $('f').addEventListener('eds:filter-change', change);
    await user.clear($('q'));
    await user.type($('q'), 'pasta');
    expect(texts()[0]).toBe('Busca: caderno — remover');
    await user.click(document.querySelector('button[type="submit"]') as HTMLElement);
    expect(texts()[0]).toBe('Busca: pasta — remover');
    expect((change.mock.calls[0]?.[0] as CustomEvent).detail.reason).toBe('submit');
  });

  it('cria a lista de chips quando o markup não a traz', () => {
    destroy();
    document.body.innerHTML = html.replace(/<ul class="eds-filter-chips"[^]*?<\/ul>/, '');
    destroy = initFilterBar(document);
    expect(document.querySelectorAll('.eds-filter-chips')).toHaveLength(1);
    expect(document.querySelector('.eds-filter-chips')).toHaveAttribute(
      'aria-label',
      'Filtros ativos',
    );
  });

  it('ignora campos marcados e hidden de parâmetros da página', () => {
    destroy();
    document.body.innerHTML = html.replace(
      '<div class="eds-filter-bar-fields">',
      '<div class="eds-filter-bar-fields"><input type="hidden" name="page" value="2" /><input name="x" value="1" data-eds-filter-ignore />',
    );
    destroy = initFilterBar(document);
    expect(chips()).toHaveLength(4);
  });
});
