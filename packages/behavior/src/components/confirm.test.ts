import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init, resetMessages } from '../index';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initConfirm } from './confirm';

const dlg = () => document.querySelector<HTMLDialogElement>('dialog.eds-alert-dialog');
const press = async (label: string) => {
  const b = Array.from(dlg()!.querySelectorAll('button')).find((x) => x.textContent === label)!;
  b.click();
  await flush();
};

describe('confirmação declarativa (data-eds-confirm)', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
  });
  afterEach(async () => {
    destroy?.();
    while (dlg()) {
      dlg()!.dispatchEvent(new Event('cancel', { cancelable: true }));
      await flush();
    }
    resetMessages();
    restore();
    document.body.innerHTML = '';
  });

  it('botão comum: pergunta e só então dispara o clique para os outros ouvintes', async () => {
    document.body.innerHTML =
      '<main><button id="b" type="button" data-eds-confirm="Excluir o pedido PED-0001?" data-eds-confirm-title="Excluir" data-eds-confirm-variant="danger" data-eds-confirm-ok="Excluir">Excluir</button></main>';
    destroy = init(document);
    const handler = vi.fn();
    document.getElementById('b')!.addEventListener('click', handler);
    document.getElementById('b')!.click();
    await flush();
    expect(handler).not.toHaveBeenCalled();
    const d = dlg()!;
    expect(d.getAttribute('data-variant')).toBe('danger');
    expect(d.querySelector('.eds-alert-dialog-title')!.textContent).toContain('Excluir');
    expect(d.querySelector('.eds-alert-dialog-text')!.textContent).toBe(
      'Excluir o pedido PED-0001?',
    );
    await press('Excluir');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(dlg()).toBeNull();
  });

  it('cancelar não prossegue', async () => {
    document.body.innerHTML = '<button id="b" type="button" data-eds-confirm="Certeza?">x</button>';
    destroy = init(document);
    const handler = vi.fn();
    document.getElementById('b')!.addEventListener('click', handler);
    document.getElementById('b')!.click();
    await flush();
    await press('Cancelar');
    expect(handler).not.toHaveBeenCalled();
  });

  it('link: navega só depois de confirmar (clique repetido não reentra)', async () => {
    document.body.innerHTML = '<a id="a" href="#feito" data-eds-confirm="Sair?">Sair</a>';
    destroy = init(document);
    const link = document.getElementById('a')!;
    const seen = vi.fn((e: Event) => e.preventDefault());
    link.addEventListener('click', seen);
    link.click();
    link.click();
    await flush();
    expect(document.querySelectorAll('dialog.eds-alert-dialog')).toHaveLength(1);
    expect(seen).not.toHaveBeenCalled();
    await press('Confirmar');
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('botão de envio: envia o form com o submitter correto, uma só pergunta', async () => {
    document.body.innerHTML =
      '<form id="f"><button id="s1" type="submit" name="acao" value="salvar">Salvar</button><button id="s2" type="submit" name="acao" value="excluir" data-eds-confirm="Excluir?">Excluir</button></form>';
    destroy = init(document);
    const submitters: Array<Element | null> = [];
    document.getElementById('f')!.addEventListener('submit', (e) => {
      e.preventDefault();
      submitters.push((e as SubmitEvent).submitter);
    });
    document.getElementById('s2')!.click();
    await flush();
    expect(submitters).toHaveLength(0);
    await press('Confirmar');
    expect(submitters).toHaveLength(1);
    expect(submitters[0]!.id).toBe('s2');
    // o outro botão não pergunta
    document.getElementById('s1')!.click();
    expect(submitters).toHaveLength(2);
    expect(dlg()).toBeNull();
  });

  it('form: intercepta o envio, confirma e reenvia com o submitter; botão com confirmação própria não pergunta duas vezes', async () => {
    document.body.innerHTML =
      '<form id="f" data-eds-confirm="Enviar?"><button id="s" type="submit">Enviar</button></form>';
    destroy = init(document);
    const submitters: Array<Element | null> = [];
    document.getElementById('f')!.addEventListener('submit', (e) => {
      e.preventDefault();
      submitters.push((e as SubmitEvent).submitter);
    });
    document.getElementById('s')!.click();
    await flush();
    expect(submitters).toHaveLength(0);
    await press('Confirmar');
    expect(submitters).toHaveLength(1);
    expect(submitters[0]!.id).toBe('s');

    document.getElementById('s')!.setAttribute('data-eds-confirm', 'Mesmo?');
    document.getElementById('s')!.click();
    await flush();
    await press('Confirmar');
    expect(submitters).toHaveLength(2);
    expect(dlg()).toBeNull();
  });

  it('elementos novos são ligados e o destroy desliga', async () => {
    destroy = init(document);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<button id="n" type="button" data-eds-confirm="Certeza?">x</button>',
    );
    const handler = vi.fn();
    document.getElementById('n')!.addEventListener('click', handler);
    document.getElementById('n')!.click();
    await flush();
    expect(dlg()).not.toBeNull();
    await press('Cancelar');
    destroy();
    document.getElementById('n')!.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(dlg()).toBeNull();
  });
});

describe('initConfirm: ciclo init → destroy → init', () => {
  it('depois de reiniciar, um clique abre um só diálogo', async () => {
    const restore = installDomPolyfills();
    document.body.innerHTML =
      '<button type="button" id="b" data-eds-confirm="Excluir?">Excluir</button>';
    initConfirm(document)();
    const stop = initConfirm(document);
    (document.getElementById('b') as HTMLElement).click();
    await flush();
    expect(document.querySelectorAll('dialog.eds-alert-dialog')).toHaveLength(1);
    stop();
    while (dlg()) {
      dlg()!.dispatchEvent(new Event('cancel', { cancelable: true }));
      await flush();
    }
    restore();
    document.body.innerHTML = '';
  });
});
