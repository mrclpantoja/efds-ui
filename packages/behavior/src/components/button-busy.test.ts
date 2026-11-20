import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from '../index';
import { initButtonBusy } from './button-busy';

describe('button busy (HTML)', () => {
  let destroy: () => void;
  let onClick: ReturnType<typeof vi.fn<(event: Event) => void>>;
  const record = (event: Event) => onClick(event);
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="f">
        <button type="submit" id="busy" class="eds-button eds-button-primary" aria-busy="true">Salvando</button>
        <button type="submit" id="ok" class="eds-button eds-button-primary">Salvar</button>
        <a href="#x" id="link" class="eds-button" aria-busy="true">Link</a>
        <button type="button" id="plain" aria-busy="true">Sem classe</button>
      </form>`;
    onClick = vi.fn();
    document.addEventListener('click', record);
    destroy = initButtonBusy(document);
  });
  afterEach(() => {
    destroy();
    document.removeEventListener('click', record);
    document.body.innerHTML = '';
  });

  it('cancela clique, Enter e Espaço no botão busy sem tirar o foco', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((e: Event) => e.preventDefault());
    document.getElementById('f')?.addEventListener('submit', submit);
    const busy = document.getElementById('busy') as HTMLButtonElement;
    busy.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(busy);
    expect(onClick).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(busy);
    expect(busy).not.toBeDisabled();
  });

  it('âncora .eds-button busy também não navega por teclado', async () => {
    const user = userEvent.setup();
    const link = document.getElementById('link') as HTMLElement;
    link.focus();
    await user.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('botão normal e sem a classe continuam ativando', async () => {
    const user = userEvent.setup();
    await user.click(document.getElementById('ok') as HTMLElement);
    await user.click(document.getElementById('plain') as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('o aria-busy é lido na hora: ao terminar, o botão volta a ativar', async () => {
    const user = userEvent.setup();
    const busy = document.getElementById('busy') as HTMLButtonElement;
    busy.removeAttribute('aria-busy');
    await user.click(busy);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('destroy remove os ouvintes; init liga e desliga junto', async () => {
    const user = userEvent.setup();
    destroy();
    await user.click(document.getElementById('busy') as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(1);
    onClick.mockClear();
    destroy = init(document);
    await user.click(document.getElementById('busy') as HTMLElement);
    expect(onClick).not.toHaveBeenCalled();
  });
});
