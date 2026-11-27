import { createRef, useState, type ComponentProps } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field';
import { MultiSelect } from './MultiSelect';

const cidades = [
  { value: 'poa', label: 'Porto Alegre' },
  { value: 'pel', label: 'Pelotas' },
  { value: 'sao', label: 'São Paulo' },
  { value: 'sal', label: 'Salvador', disabled: true },
  { value: 'bsb', label: 'Brasília' },
];

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function fakeTimers() {
  vi.useFakeTimers();
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
}

function setup(props: Partial<ComponentProps<typeof MultiSelect>> = {}) {
  const user = userEvent.setup();
  const utils = render(<MultiSelect aria-label="Cidades" options={cidades} {...props} />);
  const input = screen.getByRole('combobox', { name: 'Cidades' }) as HTMLInputElement;
  const status = () => utils.container.querySelector('[role="status"]')!;
  const hidden = () =>
    Array.from(utils.container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).map(
      (i) => i.value,
    );
  const opt = (label: string) => screen.getByRole('option', { name: label, hidden: true });
  return { user, input, status, hidden, opt, ...utils };
}

describe('MultiSelect', () => {
  it('renderiza o markup do contrato, ref no input e className', () => {
    const ref = createRef<HTMLInputElement>();
    const { input, container } = setup({ ref, className: 'extra', size: 'lg', name: 'cidades[]' });
    expect(ref.current).toBe(input);
    expect(input).toHaveClass('eds-combobox-input', 'extra');
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelector('.eds-combobox.eds-combobox-multiple')).toBeInTheDocument();
    expect(container.querySelector('.eds-combobox')).toHaveClass('eds-combobox-lg');
    expect(container.querySelector('.eds-combobox-popup')).toHaveAttribute('popover', 'manual');
    expect(container.querySelector('[role="listbox"]')).toHaveAttribute(
      'aria-multiselectable',
      'true',
    );
    expect(container.querySelector('.eds-combobox-tags')).toHaveAttribute('hidden');
  });

  it('Enter alterna a opção, mantém a lista aberta e limpa o texto', async () => {
    const onValueChange = vi.fn();
    const { user, input, opt, hidden } = setup({ onValueChange, name: 'c[]' });
    await user.type(input, 'pel');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(onValueChange).toHaveBeenLastCalledWith(['pel'], [cidades[1]]);
    expect(opt('Pelotas')).toHaveAttribute('aria-selected', 'true');
    expect(hidden()).toEqual(['pel']);
    // segunda escolha, na ordem de escolha
    await user.keyboard('{ArrowUp}{Enter}');
    expect(hidden()).toEqual(['pel', 'poa']);
    // alterna de volta (o destaque segue a opção alternada)
    await user.keyboard('{Enter}');
    expect(hidden()).toEqual(['pel']);
    expect(opt('Porto Alegre')).toHaveAttribute('aria-selected', 'false');
  });

  it('destaque é data-active e aria-selected só marca as escolhidas', async () => {
    const { user, input, opt } = setup();
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(opt('Porto Alegre')).toHaveAttribute('data-active');
    expect(opt('Porto Alegre')).toHaveAttribute('aria-selected', 'false');
    expect(input).toHaveAttribute('aria-activedescendant', opt('Porto Alegre').id);
    await user.keyboard('{ArrowDown}');
    expect(opt('Porto Alegre')).not.toHaveAttribute('data-active');
    expect(opt('Pelotas')).toHaveAttribute('data-active');
  });

  it('clique alterna e a lista continua aberta; desabilitada é ignorada', async () => {
    const onValueChange = vi.fn();
    const { user, input, opt } = setup({ onValueChange });
    await user.click(input);
    await user.click(opt('São Paulo'));
    await user.click(opt('Salvador'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(['sao'], [cidades[2]]);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('mostra etiquetas com botão Remover na ordem de Tab antes do input', async () => {
    const { user, input } = setup({ defaultValue: ['poa', 'pel'] });
    const tags = screen.getByRole('list', { name: 'Selecionados' });
    expect(tags).toHaveClass('eds-combobox-tags');
    const remove = screen.getAllByRole('button');
    expect(remove.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Remover Porto Alegre',
      'Remover Pelotas',
    ]);
    await user.tab();
    expect(remove[0]).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(input).toHaveFocus();
  });

  it('remover pela etiqueta leva o foco ao próximo botão, senão ao input', async () => {
    const onValueChange = vi.fn();
    const { user, input, hidden } = setup({
      defaultValue: ['poa', 'pel', 'sao'],
      name: 'c[]',
      onValueChange,
    });
    await user.click(screen.getByRole('button', { name: 'Remover Pelotas' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['poa', 'sao'], [cidades[0], cidades[2]]);
    expect(screen.getByRole('button', { name: 'Remover São Paulo' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remover São Paulo' }));
    expect(input).toHaveFocus();
    expect(hidden()).toEqual(['poa']);
  });

  it('Backspace com o texto vazio remove a última; com texto apaga o texto', async () => {
    const { user, input, hidden } = setup({ defaultValue: ['poa', 'pel'], name: 'c[]' });
    await user.click(input);
    await user.type(input, 'x');
    await user.keyboard('{Backspace}');
    expect(hidden()).toEqual(['poa', 'pel']);
    await user.keyboard('{Backspace}');
    expect(hidden()).toEqual(['poa']);
    expect(input).toHaveFocus();
  });

  it('Esc fecha a lista e, fechada, limpa só o texto (nunca as etiquetas)', async () => {
    const { user, input, hidden } = setup({ defaultValue: ['poa'], name: 'c[]' });
    await user.type(input, 'pel');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('pel');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(hidden()).toEqual(['poa']);
    await user.keyboard('{Escape}');
    expect(hidden()).toEqual(['poa']);
  });

  it('filtra sem diferenciar acento e mostra a mensagem de vazio', async () => {
    const { user, input } = setup();
    await user.type(input, 'sao');
    expect(screen.getAllByRole('option', { hidden: true }).map((o) => o.textContent)).toEqual([
      'São Paulo',
    ]);
    await user.clear(input);
    await user.type(input, 'zzz');
    expect(screen.getByText('Nenhum resultado')).not.toHaveAttribute('hidden');
  });

  it('modo controlado: reflete value e só muda quando o pai atualiza', async () => {
    function Host() {
      const [v, setV] = useState<string[]>(['poa']);
      return (
        <MultiSelect
          aria-label="Cidades"
          options={cidades}
          value={v}
          onValueChange={setV}
          name="c[]"
        />
      );
    }
    const user = userEvent.setup();
    const { container } = render(<Host />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Pelotas', hidden: true }));
    expect(screen.getAllByRole('button', { name: /^Remover/ })).toHaveLength(2);
    expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(2);
  });

  it('selectedLabels dá rótulo a valor controlado fora das opções', () => {
    setup({ value: ['rio'], options: [], selectedLabels: { rio: 'Rio Grande' } });
    expect(screen.getByRole('button', { name: 'Remover Rio Grande' })).toBeInTheDocument();
  });

  it('mantém o rótulo de escolha cuja opção saiu da lista filtrada', () => {
    const { rerender } = render(
      <MultiSelect aria-label="Cidades" options={cidades} defaultValue={['poa']} />,
    );
    rerender(<MultiSelect aria-label="Cidades" options={[cidades[1]!]} defaultValue={['poa']} />);
    expect(screen.getByRole('button', { name: 'Remover Porto Alegre' })).toBeInTheDocument();
  });

  it('maxSelected desabilita as não escolhidas e avisa no status', async () => {
    const { user, input, opt, status } = setup({ maxSelected: 2 });
    await user.click(input);
    await user.click(opt('Porto Alegre'));
    await user.click(opt('Pelotas'));
    expect(opt('São Paulo')).toHaveAttribute('aria-disabled', 'true');
    expect(opt('Pelotas')).not.toHaveAttribute('aria-disabled');
    expect(status()).toHaveTextContent(
      'Pelotas: selecionado. 2 itens selecionados. Limite de 2 itens atingido.',
    );
    expect(opt('São Paulo')).toHaveAttribute('data-max');
    expect(opt('Salvador')).not.toHaveAttribute('data-max');
    await user.click(opt('São Paulo'));
    expect(screen.getAllByRole('button', { name: /^Remover/ })).toHaveLength(2);
    await waitFor(() => expect(status()).toHaveTextContent('Limite de 2 itens atingido.'));
    // setas pulam as bloqueadas: o destaque não vai para elas
    await user.keyboard('{ArrowDown}');
    expect(input.getAttribute('aria-activedescendant')).not.toBe(opt('São Paulo').id);
    expect(opt('São Paulo')).not.toHaveAttribute('data-active');
  });

  it('anuncia a escolha e a remoção em texto neutro, com contagem', async () => {
    const { user, input, opt, status } = setup();
    await user.click(input);
    await user.click(opt('Pelotas'));
    expect(status()).toHaveTextContent('Pelotas: selecionado. 1 item selecionado.');
    await user.click(opt('Porto Alegre'));
    expect(status()).toHaveTextContent('Porto Alegre: selecionado. 2 itens selecionados.');
    await user.click(screen.getByRole('button', { name: 'Remover Pelotas' }));
    expect(status()).toHaveTextContent('Pelotas: removido. 1 item selecionado.');
  });

  it('anuncia a contagem de resultados com debounce ao digitar', async () => {
    fakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<MultiSelect aria-label="Cidades" options={cidades} />);
    const status = container.querySelector('[role="status"]')!;
    await user.type(screen.getByRole('combobox'), 'pa');
    expect(status).toBeEmptyDOMElement();
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(status).toHaveTextContent('1 resultado disponível.');
  });

  it('clicar numa opção bloqueada repete o aviso de limite (relido)', async () => {
    const { user, input, opt, status } = setup({ maxSelected: 1 });
    await user.click(input);
    await user.click(opt('Pelotas'));
    await user.click(opt('Porto Alegre'));
    await waitFor(() => expect(status()).toHaveTextContent('Limite de 1 item atingido.'));
    await user.click(opt('Porto Alegre'));
    await waitFor(() => expect(status()).toBeEmptyDOMElement());
    await waitFor(() => expect(status()).toHaveTextContent('Limite de 1 item atingido.'));
  });

  it('required: aria-required e validade até haver escolha', async () => {
    const { user, input, opt } = setup({ required: true });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('required');
    expect(input.validationMessage).toBe('Escolha ao menos uma opção.');
    await user.click(input);
    await user.click(opt('Pelotas'));
    expect(input.validity.customError).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Remover Pelotas' }));
    expect(input.validationMessage).toBe('Escolha ao menos uma opção.');
  });

  it('requiredMessage é configurável', () => {
    const { input } = setup({ required: true, texts: { required: 'Pick one.' } });
    expect(input.validationMessage).toBe('Pick one.');
  });

  it('loading e error aparecem no popup', async () => {
    const { user, input, rerender } = setup({ loading: true });
    await user.click(input);
    expect(screen.getByText('Carregando…', { exact: false })).not.toHaveAttribute('hidden');
    rerender(<MultiSelect aria-label="Cidades" options={[]} error="Falha ao buscar" />);
    await user.click(input);
    expect(screen.getAllByText('Falha ao buscar').length).toBeGreaterThan(0);
  });

  it('onInputChange recebe o texto e o vazio ao escolher', async () => {
    const onInputChange = vi.fn();
    const { user, input } = setup({ onInputChange });
    await user.type(input, 'p');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onInputChange).toHaveBeenNthCalledWith(1, 'p');
    expect(onInputChange).toHaveBeenLastCalledWith('');
  });

  it('disabled desabilita input, botões de remover e hidden', () => {
    const { input, hidden, container } = setup({
      disabled: true,
      defaultValue: ['poa'],
      name: 'c',
    });
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remover Porto Alegre' })).toBeDisabled();
    expect(hidden()).toEqual(['poa']);
    expect(container.querySelector('input[type="hidden"]')).toBeDisabled();
  });

  it('integra com Field: rótulo, ajuda, erro e nome da lista', () => {
    render(
      <Field label="Cidades atendidas" helper="Escolha várias" error="Obrigatório" required>
        <MultiSelect options={cidades} />
      </Field>,
    );
    const input = screen.getByRole('combobox', { name: 'Cidades atendidas' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAccessibleDescription('Escolha várias Obrigatório');
    expect(
      screen.getByRole('listbox', { name: 'Cidades atendidas', hidden: true }),
    ).toBeInTheDocument();
  });

  it('textos configuráveis', async () => {
    const { user, input, opt, status } = setup({
      defaultValue: ['poa'],
      texts: {
        tags: 'Chosen',
        remove: (l) => `Drop ${l}`,
        selected: (l, n) => `${l} picked (${n})`,
      },
    });
    expect(screen.getByRole('list', { name: 'Chosen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drop Porto Alegre' })).toBeInTheDocument();
    await user.click(input);
    await user.click(opt('Pelotas'));
    expect(status()).toHaveTextContent('Pelotas picked (2)');
  });
});
