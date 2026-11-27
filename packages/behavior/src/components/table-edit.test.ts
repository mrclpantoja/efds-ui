import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindAll } from '../core/registry';
import { tableBehavior } from './table';
import { tableEditBehavior } from './table-edit';

function build(): void {
  document.body.innerHTML = `
  <div class="eds-table-wrap">
  <table class="eds-table" id="t">
    <caption>Pedidos</caption>
    <thead><tr>
      <th scope="col" data-eds-col="codigo">Código</th>
      <th scope="col" data-eds-col="total" data-eds-editor="ed-total">Total</th>
    </tr></thead>
    <tbody>
      <tr data-eds-row-id="PED-1" data-eds-row-label="PED-1"><td>PED-1</td>
        <td data-eds-editable data-eds-edit-field="total" data-eds-edit-format="moeda" data-sort-value="1280.5">R$ 1.280,50</td></tr>
      <tr data-eds-row-id="PED-2" data-eds-row-label="PED-2"><td>PED-2</td>
        <td data-eds-editable data-eds-edit-field="total" data-eds-edit-format="moeda" data-sort-value="459">R$ 459,00</td></tr>
      <tr data-eds-row-id="PED-3"><td>PED-3</td><td data-eds-editable="false">fixo</td></tr>
    </tbody>
  </table></div>
  <button type="button" id="depois">depois</button>
  <template id="ed-total"><input class="eds-input" type="text" required /></template>`;
}

const T = () => document.getElementById('t') as HTMLTableElement;
const cell = (n: number) => T().tBodies[0]?.rows[n]?.cells[1] as HTMLTableCellElement;
const editBtn = (n: number) => cell(n).querySelector('.eds-table-cell-edit') as HTMLElement;
const editor = () => document.querySelector('td[data-editing] input') as HTMLInputElement;
const plain = (s: string | null | undefined) =>
  (s ?? '').replace(new RegExp('[\u00a0\u202f]', 'g'), ' ');
const status = () => plain(document.querySelector('[role="status"]')?.textContent);

let stop: () => void;
beforeEach(() => {
  build();
  stop = bindAll(document, [tableBehavior, tableEditBehavior]);
});
afterEach(() => {
  stop();
  document.body.innerHTML = '';
});

describe('edição na célula', () => {
  it('troca o texto por um botão cujo nome contém o texto visível; célula fixa fica de fora', () => {
    expect(editBtn(0).textContent).toBe('R$ 1.280,50, editar Total de PED-1');
    expect(editBtn(0).querySelector('.eds-visually-hidden')).not.toBeNull();
    expect(cell(2).querySelector('button')).toBeNull();
  });

  it('Enter abre o editor rotulado com o valor e a dica; Esc cancela e devolve o foco', async () => {
    const user = userEvent.setup();
    const canceled = vi.fn();
    T().addEventListener('eds:table-edit-cancel', () => canceled());
    editBtn(0).focus();
    await user.keyboard('{Enter}');
    expect(cell(0).hasAttribute('data-editing')).toBe(true);
    expect(editor().getAttribute('aria-label')).toBe('Total de PED-1');
    expect(editor().value).toBe('1280.5');
    expect(document.activeElement).toBe(editor());
    const hint = document.getElementById(editor().getAttribute('aria-describedby') as string);
    expect(hint?.textContent).toBe('Enter confirma, Esc cancela.');
    await user.keyboard('{Escape}');
    expect(cell(0).hasAttribute('data-editing')).toBe(false);
    expect(document.activeElement).toBe(editBtn(0));
    expect(cell(0).getAttribute('data-sort-value')).toBe('1280.5');
    expect(canceled).toHaveBeenCalledTimes(1);
  });

  it('Enter confirma: formata, atualiza data-sort-value e anuncia', async () => {
    const user = userEvent.setup();
    const commit = vi.fn();
    T().addEventListener('eds:table-edit-commit', (e) => commit((e as CustomEvent).detail));
    await user.click(editBtn(0));
    await user.clear(editor());
    await user.type(editor(), '1300{Enter}');
    expect(commit.mock.calls[0]?.[0]).toMatchObject({
      rowId: 'PED-1',
      field: 'total',
      value: '1300',
      previous: '1280.5',
      number: 1300,
    });
    expect(plain(editBtn(0).textContent)).toContain('R$ 1.300,00');
    expect(cell(0).getAttribute('data-sort-value')).toBe('1300');
    expect(cell(0).getAttribute('data-value')).toBe('1300');
    expect(status()).toBe('Total de PED-1 atualizado para R$ 1.300,00.');
    expect(document.activeElement).toBe(editBtn(0));
  });

  it('valor inalterado sai sem evento', async () => {
    const user = userEvent.setup();
    const commit = vi.fn();
    T().addEventListener('eds:table-edit-commit', commit);
    await user.click(editBtn(0));
    await user.keyboard('{Enter}');
    expect(commit).not.toHaveBeenCalled();
    expect(cell(0).hasAttribute('data-editing')).toBe(false);
  });

  it('inválido permanece em edição com erro visível, aria-invalid e anúncio', async () => {
    const user = userEvent.setup();
    await user.click(editBtn(0));
    await user.clear(editor());
    await user.keyboard('{Enter}');
    expect(cell(0).hasAttribute('data-editing')).toBe(true);
    expect(editor().getAttribute('aria-invalid')).toBe('true');
    const error = cell(0).querySelector(':scope > p.eds-error') as HTMLElement;
    expect(error.textContent).not.toBe('');
    expect(editor().getAttribute('aria-describedby')).toContain(error.id);
    expect(status()).toMatch(/^Erro: /);
    expect(document.activeElement).toBe(editor());
    await user.keyboard('{Escape}');
    expect(cell(0).hasAttribute('data-editing')).toBe(false);
  });

  it('Tab com valor válido e mudado confirma e o foco segue; inválido fica em edição', async () => {
    const user = userEvent.setup();
    await user.click(editBtn(0));
    await user.clear(editor());
    await user.type(editor(), '77');
    await user.tab();
    expect(cell(0).hasAttribute('data-editing')).toBe(false);
    expect(cell(0).getAttribute('data-sort-value')).toBe('77');
    expect(document.activeElement).not.toBe(editBtn(0));
    await user.click(editBtn(1));
    await user.clear(editor());
    await user.tab();
    expect(cell(1).hasAttribute('data-editing')).toBe(true);
    expect(cell(1).querySelector('.eds-error')).not.toBeNull();
  });

  it('respondWith: célula ocupada e somente leitura; resolve aplica o valor do servidor', async () => {
    const user = userEvent.setup();
    let done: (v: { text: string }) => void = () => undefined;
    T().addEventListener('eds:table-edit-commit', (e) => {
      (e as CustomEvent).detail.respondWith(new Promise((r) => (done = r)));
    });
    await user.click(editBtn(0));
    await user.clear(editor());
    await user.type(editor(), '5{Enter}');
    expect(cell(0).getAttribute('aria-busy')).toBe('true');
    expect(editor().readOnly).toBe(true);
    expect(status()).toBe('Salvando.');
    // Cancelar durante o salvamento é ignorado.
    await user.keyboard('{Escape}');
    expect(cell(0).hasAttribute('data-editing')).toBe(true);
    done({ text: 'R$ 5,00 (servidor)' });
    await vi.waitFor(() => expect(cell(0).hasAttribute('data-editing')).toBe(false));
    expect(editBtn(0).textContent).toContain('R$ 5,00 (servidor)');
  });

  it('respondWith rejeitado volta à edição com o erro e emite eds:table-edit-error', async () => {
    const user = userEvent.setup();
    const errors = vi.fn();
    T().addEventListener('eds:table-edit-error', (e) => errors((e as CustomEvent).detail.message));
    T().addEventListener('eds:table-edit-commit', (e) => {
      (e as CustomEvent).detail.respondWith(Promise.reject(new Error('Total acima do limite.')));
    });
    await user.click(editBtn(0));
    await user.clear(editor());
    await user.type(editor(), '9{Enter}');
    await vi.waitFor(() => expect(cell(0).hasAttribute('aria-busy')).toBe(false));
    expect(editor().readOnly).toBe(false);
    expect(cell(0).querySelector('.eds-error')?.textContent).toBe('Total acima do limite.');
    expect(document.activeElement).toBe(editor());
    expect(errors).toHaveBeenCalledWith('Total acima do limite.');
    expect(cell(0).getAttribute('data-sort-value')).toBe('1280.5');
  });

  it('preventDefault no commit mantém a edição; o app mostra o erro com setError', async () => {
    const user = userEvent.setup();
    T().addEventListener('eds:table-edit-commit', (e) => {
      e.preventDefault();
      (e as CustomEvent).detail.setError('Valor recusado.');
    });
    await user.click(editBtn(0));
    await user.clear(editor());
    await user.type(editor(), '3{Enter}');
    expect(cell(0).hasAttribute('data-editing')).toBe(true);
    expect(cell(0).querySelector('.eds-error')?.textContent).toBe('Valor recusado.');
  });

  it('só uma célula por vez: abrir outra confirma a atual (se válida)', async () => {
    const user = userEvent.setup();
    await user.click(editBtn(0));
    await user.clear(editor());
    await user.type(editor(), '8');
    editBtn(1).click();
    expect(cell(0).hasAttribute('data-editing')).toBe(false);
    expect(cell(0).getAttribute('data-sort-value')).toBe('8');
    expect(cell(1).hasAttribute('data-editing')).toBe(true);
  });

  it('eds:table-edit-start cancelável e tabela ocupada bloqueiam a edição', async () => {
    const user = userEvent.setup();
    T().addEventListener('eds:table-edit-start', (e) => e.preventDefault(), { once: true });
    await user.click(editBtn(0));
    expect(cell(0).hasAttribute('data-editing')).toBe(false);
    T().setAttribute('aria-busy', 'true');
    await user.click(editBtn(1));
    expect(cell(1).hasAttribute('data-editing')).toBe(false);
  });

  it('F2 também abre', async () => {
    const user = userEvent.setup();
    editBtn(1).focus();
    await user.keyboard('{F2}');
    expect(cell(1).hasAttribute('data-editing')).toBe(true);
  });
});
