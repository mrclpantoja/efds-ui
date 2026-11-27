import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initToast, toast } from './toast';

const region = () => document.querySelector('.eds-toast-region') as HTMLElement | null;
const toasts = () => Array.from(document.querySelectorAll<HTMLElement>('.eds-toast'));

/** Avança o relógio e deixa a região "nascer" vazia antes do primeiro toast (50 ms). */
const settle = () => vi.advanceTimersByTimeAsync(60);

describe('toast', () => {
  let restore: () => void;
  let stop: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    restore = installDomPolyfills();
    document.body.innerHTML =
      '<main id="main"><button id="origem" type="button">Salvar</button></main>';
    stop = initToast();
  });
  afterEach(() => {
    stop();
    restore();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('cria a região aria-live vazia e só depois insere o toast', async () => {
    toast({ tone: 'success', message: 'Pedido salvo.' });
    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(toasts()).toHaveLength(0);
    await settle();
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toHaveClass('eds-toast-success');
    expect(region()).toContainElement(toasts()[0] as HTMLElement);
  });

  it('sem title: prefixo oculto de severidade; com title: em destaque', async () => {
    toast({ tone: 'success', message: 'Pedido salvo.' });
    toast({ tone: 'warning', title: 'Atenção:', message: 'Estoque baixo.' });
    await settle();
    expect(toasts()[0]?.querySelector('.eds-visually-hidden')).toHaveTextContent('Sucesso:');
    expect(toasts()[1]?.querySelector('.eds-toast-title')).toHaveTextContent('Atenção:');
  });

  it('danger tem role=alert; os demais não', async () => {
    toast({ tone: 'danger', message: 'Falhou.' });
    toast({ tone: 'info', message: 'Ok.' });
    await settle();
    expect(toasts()[0]).toHaveAttribute('role', 'alert');
    expect(toasts()[1]).not.toHaveAttribute('role');
  });

  it('info fecha sozinho depois de 5 s; danger e warning não', async () => {
    toast({ tone: 'info', message: 'Curto.' });
    toast({ tone: 'danger', message: 'Erro.' });
    toast({ tone: 'warning', message: 'Aviso.' });
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(400);
    expect(toasts().map((t) => t.className)).toEqual([
      'eds-toast eds-toast-danger',
      'eds-toast eds-toast-warning',
    ]);
  });

  it('mensagem longa dura ~1 s a cada 10 palavras', async () => {
    toast({ message: Array.from({ length: 80 }, () => 'palavra').join(' ') });
    await settle();
    await vi.advanceTimersByTimeAsync(6000);
    expect(toasts()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2500);
    expect(toasts()).toHaveLength(0);
  });

  it('duration explícita vale, e 0 mantém o toast', async () => {
    toast({ message: 'Rápido.', duration: 1000 });
    toast({ message: 'Fixo.', duration: 0 });
    await settle();
    await vi.advanceTimersByTimeAsync(1400);
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toHaveTextContent('Fixo.');
  });

  it('pausa em hover e retoma o tempo restante', async () => {
    toast({ message: 'Pausável.', duration: 4000 });
    await settle();
    await vi.advanceTimersByTimeAsync(3000);
    region()?.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.advanceTimersByTimeAsync(10000);
    expect(toasts()).toHaveLength(1);
    region()?.dispatchEvent(new MouseEvent('mouseleave'));
    await vi.advanceTimersByTimeAsync(1000 + 400);
    expect(toasts()).toHaveLength(0);
  });

  it('pausa com foco dentro da região', async () => {
    toast({ message: 'Foco.', duration: 2000 });
    await settle();
    (toasts()[0]?.querySelector('button') as HTMLElement).focus();
    await vi.advanceTimersByTimeAsync(5000);
    expect(toasts()).toHaveLength(1);
  });

  it('botão de fechar remove e devolve o foco a quem disparou', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    (document.getElementById('origem') as HTMLElement).focus();
    toast({ tone: 'danger', message: 'Erro.' });
    await settle();
    const close = toasts()[0]?.querySelector('button') as HTMLElement;
    expect(close).toHaveAccessibleName('Fechar notificação');
    close.focus();
    await user.click(close);
    await vi.advanceTimersByTimeAsync(400);
    expect(toasts()).toHaveLength(0);
    expect(document.activeElement).toBe(document.getElementById('origem'));
  });

  it('Esc fecha só o toast focado e não propaga', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onKey = vi.fn();
    document.addEventListener('keydown', onKey);
    toast({ tone: 'warning', message: 'Aviso.' });
    await settle();
    (toasts()[0]?.querySelector('button') as HTMLElement).focus();
    await user.keyboard('{Escape}');
    await vi.advanceTimersByTimeAsync(400);
    expect(toasts()).toHaveLength(0);
    expect(onKey).not.toHaveBeenCalled();
    document.removeEventListener('keydown', onKey);
  });

  it('mostra no máximo 3 e libera a fila ao fechar', async () => {
    const ids = Array.from({ length: 5 }, (_, i) =>
      toast({ message: `Toast ${i + 1}`, duration: 0 }),
    );
    await settle();
    expect(toasts()).toHaveLength(3);
    toast.close(ids[0] as number);
    await vi.advanceTimersByTimeAsync(400);
    expect(toasts().map((t) => t.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('Toast 4')]),
    );
    expect(toasts()).toHaveLength(3);
  });

  it('com dialog modal aberto, a região fica dentro dele', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<dialog id="dlg" class="eds-modal"><button type="button">ok</button></dialog>',
    );
    (document.getElementById('dlg') as HTMLDialogElement).showModal();
    toast({ message: 'Dentro.', duration: 0 });
    await settle();
    expect(document.getElementById('dlg')).toContainElement(region());
    (document.getElementById('dlg') as HTMLDialogElement).close();
    await vi.advanceTimersByTimeAsync(10);
    expect(document.body).toContainElement(region());
    expect(document.getElementById('dlg')).not.toContainElement(region());
  });

  it('ao fechar o modal, a mesma região vai para o body muda (sem releitura) e volta a polite', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<dialog id="dlg" class="eds-modal"><button type="button">ok</button></dialog>',
    );
    const dlg = document.getElementById('dlg') as HTMLDialogElement;
    dlg.showModal();
    toast({ message: 'Dentro.', duration: 0 });
    await settle();
    const live = region() as HTMLElement;
    const first = toasts()[0] as HTMLElement;
    expect(dlg).toContainElement(live);
    // Um toast novo enquanto a região está em trânsito espera.
    dlg.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.body).toContainElement(live);
    expect(live).toHaveAttribute('aria-live', 'off');
    toast({ message: 'Depois.', duration: 0 });
    await vi.advanceTimersByTimeAsync(10);
    expect(toasts()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(80);
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(toasts()).toHaveLength(2);
    // Mesmos nós (nada recriado) e uma só região no documento.
    expect(region()).toBe(live);
    expect(toasts()[0]).toBe(first);
    expect(document.querySelectorAll('.eds-toast-region')).toHaveLength(1);
  });

  it('região vazia muda de lugar sem passar por aria-live=off', async () => {
    toast({ message: 'Um.', duration: 0 });
    await settle();
    toast.closeAll();
    document.body.insertAdjacentHTML('beforeend', '<dialog id="dlg"><button>ok</button></dialog>');
    (document.getElementById('dlg') as HTMLDialogElement).showModal();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.getElementById('dlg')).toContainElement(region());
    expect(region()).toHaveAttribute('aria-live', 'polite');
  });

  it('destroy desmonta a região', async () => {
    toast({ message: 'Oi.', duration: 0 });
    await settle();
    stop();
    expect(region()).toBeNull();
    stop = initToast();
  });
});
