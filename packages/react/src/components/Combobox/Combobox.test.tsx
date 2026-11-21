import { createRef, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field';
import { Combobox, type ComboboxOption } from './Combobox';

const cidades: ComboboxOption[] = [
  { value: 'poa', label: 'Porto Alegre' },
  { value: 'sao', label: 'São Paulo' },
  { value: 'sal', label: 'Salvador', disabled: true },
  { value: 'bsb', label: 'Brasília' },
];

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// O asyncWrapper do Testing Library só avança timers falsos se achar um `jest` global.
function fakeTimers() {
  vi.useFakeTimers();
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
}

function setup(props: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  const user = userEvent.setup();
  const utils = render(<Combobox aria-label="Cidade" options={cidades} {...props} />);
  const input = screen.getByRole('combobox', { name: 'Cidade' });
  return { user, input: input as HTMLInputElement, ...utils };
}

describe('Combobox', () => {
  it('renderiza o markup do contrato, ref no input e className', () => {
    const ref = createRef<HTMLInputElement>();
    const { input, container } = setup({ ref, className: 'extra', size: 'lg' });
    expect(ref.current).toBe(input);
    expect(input).toHaveClass('eds-input', 'eds-input-lg', 'extra');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(container.querySelector('.eds-combobox')).toBeInTheDocument();
    expect(container.querySelector('.eds-combobox-popup')).toHaveAttribute('popover', 'manual');
    expect(container.querySelector('[role="status"]')).toBeEmptyDOMElement();
    expect(input).toHaveAttribute('aria-controls', container.querySelector('ul')!.id);
  });

  it('digitar abre e filtra sem diferenciar acento nem caixa', async () => {
    const { user, input } = setup();
    await user.type(input, 'sao');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option', { hidden: true });
    expect(options.map((o) => o.textContent)).toEqual(['São Paulo']);
  });

  it('filter={false} mantém as opções recebidas', async () => {
    const { user, input } = setup({ filter: false });
    await user.type(input, 'zzz');
    expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(4);
  });

  it('mostra a mensagem de vazio sem resultados', async () => {
    const { user, input } = setup();
    await user.type(input, 'zzz');
    expect(screen.getByText('Nenhum resultado', { ignore: 'x' })).not.toHaveAttribute('hidden');
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('setas movem aria-activedescendant sem dar a volta e pulam desabilitadas', async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option', { hidden: true });
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    // pula Salvador (desabilitada)
    expect(input).toHaveAttribute('aria-activedescendant', options[3]!.id);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[3]!.id);
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    expect(options[2]).toHaveAttribute('aria-disabled', 'true');
  });

  it('Alt+Seta abre sem mover e fecha', async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('Enter seleciona a opção destacada e dispara onChange', async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input).toHaveValue('São Paulo');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).toHaveBeenCalledWith('sao', cidades[1]);
  });

  it('Enter fechado envia o formulário', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Combobox aria-label="Cidade" options={cidades} />
        <button type="submit">Ok</button>
      </form>,
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Enter com lista aberta e opção destacada não envia o formulário', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Combobox aria-label="Cidade" options={cidades} />
        <button type="submit">Ok</button>
      </form>,
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Esc fecha; fechado, limpa o texto e o valor', async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange, defaultValue: 'poa' });
    expect(input).toHaveValue('Porto Alegre');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('Porto Alegre');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(onChange).toHaveBeenLastCalledWith('', null);
  });

  it('Tab fecha sem selecionar', async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.type(input, 'po');
    await user.keyboard('{ArrowDown}{Tab}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clique na opção seleciona e mantém o foco no campo', async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.click(screen.getByRole('option', { name: 'Brasília', hidden: true }));
    expect(input).toHaveValue('Brasília');
    expect(input).toHaveFocus();
  });

  it('opção desabilitada não seleciona', async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.click(screen.getByText('Salvador'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marca a opção atual com data-current e reabre com todas as opções', async () => {
    const { user, input } = setup({ defaultValue: 'sao' });
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'São Paulo', hidden: true })).toHaveAttribute(
      'data-current',
    );
  });

  it('editar o texto limpa o valor escolhido', async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange, defaultValue: 'poa' });
    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalledWith('', null);
  });

  it('name gera o input hidden com o valor', async () => {
    const { user, input, container } = setup({ name: 'cidade' });
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]')!;
    expect(hidden).toHaveAttribute('name', 'cidade');
    expect(hidden.value).toBe('');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(hidden.value).toBe('poa');
  });

  it('controlado: o valor externo define o texto', async () => {
    function Harness() {
      const [v, setV] = useState('poa');
      return (
        <>
          <Combobox aria-label="Cidade" options={cidades} value={v} onChange={setV} />
          <button onClick={() => setV('bsb')}>Brasília</button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Porto Alegre');
    await user.click(screen.getByRole('button', { name: 'Brasília' }));
    expect(input).toHaveValue('Brasília');
  });

  it('onInputChange e loading (fonte remota)', async () => {
    const onInputChange = vi.fn();
    const { user, input, container, rerender } = setup({
      onInputChange,
      filter: false,
      options: [],
    });
    await user.type(input, 'ab');
    expect(onInputChange).toHaveBeenLastCalledWith('ab');
    rerender(
      <Combobox
        aria-label="Cidade"
        options={[]}
        filter={false}
        loading
        texts={{ loading: 'Buscando…' }}
      />,
    );
    expect(screen.getByText(/Buscando/).closest('p')).not.toHaveAttribute('hidden');
    expect(container.querySelector('.eds-combobox-popup')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Nenhum resultado')).toHaveAttribute('hidden');
  });

  it('status com debounce: vazio ao abrir, preenchido depois de 500 ms', async () => {
    fakeTimers();
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<Combobox aria-label="Cidade" options={cidades} />);
    const input = screen.getByRole('combobox');
    const status = container.querySelector('[role="status"]')!;
    await user.type(input, 's');
    expect(status).toHaveTextContent('');
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(status).toHaveTextContent('');
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(status).toHaveTextContent('3 resultados disponíveis.');
    await user.clear(input);
    await user.type(input, 'brasi');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(status).toHaveTextContent('1 resultado disponível.');
    await user.type(input, 'zz');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(status).toHaveTextContent('Nenhum resultado.');
  });

  it('setas não anunciam no status', async () => {
    fakeTimers();
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<Combobox aria-label="Cidade" options={cidades} />);
    const status = container.querySelector('[role="status"]')!;
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    const first = status.textContent;
    await user.keyboard('{ArrowDown}{ArrowDown}');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(status.textContent).toBe(first);
  });

  it('posiciona o popup com as propriedades --_combobox-*', async () => {
    const { user, input, container } = setup();
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      right: 210,
      top: 20,
      bottom: 60,
      width: 200,
      height: 40,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    const popup = container.querySelector<HTMLElement>('.eds-combobox-popup')!;
    expect(popup.style.getPropertyValue('--_combobox-x')).toBe('10px');
    expect(popup.style.getPropertyValue('--_combobox-y')).toBe('60px');
    expect(popup.style.getPropertyValue('--_combobox-width')).toBe('200px');
    expect(popup).not.toHaveAttribute('data-placement');
  });

  it('coloca em cima quando não cabe embaixo e recalcula no resize', async () => {
    const { user, input, container } = setup();
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 100,
      top: 700,
      bottom: 740,
      width: 100,
      height: 40,
      x: 0,
      y: 700,
      toJSON: () => ({}),
    });
    const popup = container.querySelector<HTMLElement>('.eds-combobox-popup')!;
    Object.defineProperty(popup, 'offsetHeight', { value: 200, configurable: true });
    window.innerHeight = 768;
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(popup).toHaveAttribute('data-placement', 'top');
    expect(popup.style.getPropertyValue('--_combobox-y')).toBe('700px');
    window.innerHeight = 2000;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(popup).not.toHaveAttribute('data-placement');
    expect(popup.style.getPropertyValue('--_combobox-y')).toBe('740px');
  });

  it('integra com Field: id, rótulo, descrição e erro', () => {
    render(
      <Field label="Cidade" helper="Onde mora" error="Obrigatório" required>
        <Combobox options={cidades} />
      </Field>,
    );
    const input = screen.getByRole('combobox', { name: /Cidade/ });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Onde mora Obrigatório');
  });

  it('invalid, valid e disabled', () => {
    const { rerender, input } = setup({ invalid: true, disabled: true });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeDisabled();
    rerender(<Combobox aria-label="Cidade" options={cidades} valid />);
    expect(screen.getByRole('combobox')).toHaveAttribute('data-valid', 'true');
  });
});

describe('Combobox: auditoria de UX', () => {
  it('↑ com a lista fechada abre na última opção habilitada', async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option', { hidden: true });
    expect(input).toHaveAttribute('aria-activedescendant', options[3]!.id);
  });

  it('clique no campo abre a lista sem destacar', async () => {
    const { user, input } = setup();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('texto sem escolha: customValidity até escolher uma opção', async () => {
    const { user, input } = setup({ texts: { invalidChoice: 'Escolha na lista.' } });
    expect(input.validity.customError).toBe(false);
    await user.type(input, 'zz');
    expect(input.validity.customError).toBe(true);
    expect(input.validationMessage).toBe('Escolha na lista.');
    await user.clear(input);
    expect(input.validity.customError).toBe(false);
    await user.type(input, 'po');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input.validity.customError).toBe(false);
    expect(input.checkValidity()).toBe(true);
  });

  it('texto sem escolha: ao sair do campo mostra o erro em texto, ligado ao campo', async () => {
    const { user, input, container } = setup();
    await user.type(input, 'zz');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(container.querySelector('.eds-error')).toBeNull();
    await user.tab();
    const error = container.querySelector('.eds-error')!;
    expect(error).toHaveTextContent('Escolha uma das opções da lista.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    await user.clear(input);
    expect(container.querySelector('.eds-error')).toBeNull();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('freeText: sem customValidity e o hidden recebe o texto', async () => {
    const { user, input, container } = setup({ freeText: true, name: 'cidade' });
    await user.type(input, 'Outra');
    expect(input.validity.customError).toBe(false);
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe('Outra');
  });

  it('a lista é nomeada pelo rótulo do Field; fora dele, por listLabel', () => {
    const { unmount } = render(
      <Field label="Município">
        <Combobox options={cidades} />
      </Field>,
    );
    expect(screen.getByRole('listbox', { hidden: true })).toHaveAccessibleName('Município');
    unmount();
    render(<Combobox aria-label="Cidade" texts={{ list: 'Cidades' }} options={cidades} />);
    expect(screen.getByRole('listbox', { hidden: true })).toHaveAccessibleName('Cidades');
  });

  it('pointermove sobre opção habilitada move o destaque; desabilitada não', async () => {
    const { user, input } = setup();
    await user.click(input);
    const options = screen.getAllByRole('option', { hidden: true });
    await user.hover(options[1]!);
    expect(input).toHaveAttribute('aria-activedescendant', options[1]!.id);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    await user.hover(options[2]!);
    expect(input).toHaveAttribute('aria-activedescendant', options[1]!.id);
  });

  it('status: "Carregando…" após ~400 ms de loading', async () => {
    fakeTimers();
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const { container } = render(
      <Combobox aria-label="Cidade" options={[]} filter={false} loading />,
    );
    const status = container.querySelector('[role="status"]')!;
    await user.click(screen.getByRole('combobox'));
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(status).toHaveTextContent('');
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(status).toHaveTextContent('Carregando…');
  });

  it('status: "{label} selecionado." ao escolher', async () => {
    const { user, input, container } = setup();
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(container.querySelector('[role="status"]')).toHaveTextContent(
      'Porto Alegre selecionado.',
    );
  });

  it('error aparece em .eds-combobox-empty e no status', async () => {
    const { user, input, container } = setup({
      error: 'Não foi possível carregar as opções.',
      options: [],
    });
    await user.click(input);
    const empty = container.querySelector('.eds-combobox-empty')!;
    expect(empty).not.toHaveAttribute('hidden');
    expect(empty).toHaveTextContent('Não foi possível carregar as opções.');
    expect(container.querySelector('[role="status"]')).toHaveTextContent(
      'Não foi possível carregar',
    );
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('ignora setas e Enter enquanto loading', async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ loading: true, onChange });
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selectedLabel mostra o rótulo de um valor cuja opção não foi carregada', () => {
    render(
      <Combobox aria-label="Cidade" options={[]} value="x1" selectedLabel="Fulana Fictícia" />,
    );
    expect(screen.getByRole('combobox')).toHaveValue('Fulana Fictícia');
  });
});
