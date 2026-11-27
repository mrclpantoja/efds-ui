import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initStepperSections, isSectionComplete } from './stepper-sections';

const markup = `
<nav aria-label="Seções" data-eds-stepper-sections>
  <ol class="eds-stepper">
    <li class="eds-stepper-item"><a class="eds-stepper-link" href="#dados">Dados</a></li>
    <li class="eds-stepper-item"><a class="eds-stepper-link" href="#contato">Contato</a></li>
  </ol>
</nav>
<form>
  <fieldset id="dados"><legend>Dados</legend><input id="nome" required /></fieldset>
  <section id="contato"><h2>Contato</h2><input id="fone" /></section>
</form>`;

const item = (i: number) => document.querySelectorAll<HTMLElement>('.eds-stepper-item')[i]!;
const link = (i: number) => document.querySelectorAll<HTMLAnchorElement>('.eds-stepper-link')[i]!;

let destroy: (() => void) | undefined;
let ioCallback: (() => void) | undefined;

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: () => void) {
        ioCallback = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
  document.body.innerHTML = markup;
  document.getElementById('dados')!.getBoundingClientRect = () => ({ top: 10 }) as DOMRect;
  document.getElementById('contato')!.getBoundingClientRect = () => ({ top: 2000 }) as DOMRect;
});
afterEach(() => {
  destroy?.();
  destroy = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Stepper de seções', () => {
  it('marca a seção lida com aria-current e emite o evento ao mudar', () => {
    destroy = initStepperSections(document);
    expect(link(0)).toHaveAttribute('aria-current', 'step');
    expect(link(1)).not.toHaveAttribute('aria-current');
    expect(item(0)).toHaveAttribute('data-state', 'current');
    expect(item(1)).toHaveAttribute('data-state', 'upcoming');
    const seen: { id: string; index: number }[] = [];
    document
      .querySelector('nav')!
      .addEventListener('eds:stepper-section-change', (e) =>
        seen.push((e as CustomEvent<{ id: string; index: number }>).detail),
      );
    document.getElementById('contato')!.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    ioCallback!();
    expect(link(1)).toHaveAttribute('aria-current', 'step');
    expect(link(0)).not.toHaveAttribute('aria-current');
    expect(seen).toEqual([{ id: 'contato', index: 1, label: 'Contato' }]);
  });

  it('conclui a seção quando os obrigatórios estão válidos e anuncia uma única vez', async () => {
    destroy = initStepperSections(document);
    const nome = document.getElementById('nome') as HTMLInputElement;
    expect(item(0)).not.toHaveAttribute('data-state', 'done');
    nome.value = 'Maria Exemplo';
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(item(0)).toHaveAttribute('data-state', 'done'));
    expect(link(0)).toHaveTextContent('Dados (concluída)');
    const status = document.querySelector('[data-eds-page-status]')!;
    expect(status).toHaveTextContent('Seção Dados concluída.');
    status.textContent = '';
    nome.value = '';
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(item(0)).not.toHaveAttribute('data-state', 'done'));
    nome.value = 'Outra';
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(item(0)).toHaveAttribute('data-state', 'done'));
    expect(status.textContent).toBe('');
  });

  it('seção só com campos opcionais vazios não é concluída; preenchida, é', () => {
    document.body.innerHTML = '<section id="s"><input /></section>';
    const s = document.getElementById('s')!;
    expect(isSectionComplete(s)).toBe(false);
    (s.querySelector('input') as HTMLInputElement).value = 'x';
    expect(isSectionComplete(s)).toBe(true);
  });

  it('campo inválido impede a conclusão e não mostra erro', () => {
    document.body.innerHTML = '<section id="s"><input required type="email" value="x" /></section>';
    const field = document.querySelector('input')!;
    const onInvalid = vi.fn();
    field.addEventListener('invalid', onInvalid);
    expect(isSectionComplete(document.getElementById('s')!)).toBe(false);
    expect(onInvalid).not.toHaveBeenCalled();
  });

  it('clicar no link leva o foco ao título da seção', async () => {
    destroy = initStepperSections(document);
    link(1).addEventListener('click', (e) => e.preventDefault());
    link(1).click();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(document.querySelector('#contato h2')),
    );
    expect(link(1)).toHaveAttribute('aria-current', 'step');
  });
});
