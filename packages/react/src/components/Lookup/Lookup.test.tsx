import { createRef, useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { Field } from '../Field';
import { Lookup, type LookupItem } from './Lookup';

const DATA: LookupItem[] = [
  { code: '10', description: 'Aurora Comércio Ltda.', cidade: 'Pelotas' },
  { code: '11', description: 'Boreal Serviços', cidade: 'Rio Grande' },
  { code: '12', description: 'Cedro Alimentos', cidade: 'Bagé' },
];

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => restore());

const search = vi.fn(async (q: string) => {
  const text = q.trim().toLowerCase();
  return DATA.filter(
    (i) => text === '' || `${i.code} ${i.description}`.toLowerCase().includes(text),
  );
});

const input = () => screen.getByRole('combobox', { name: 'Cliente' }) as HTMLInputElement;

describe('Lookup', () => {
  it('renderiza o contrato: código, botão de busca e descrição (output)', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <Field label="Cliente">
        <Lookup ref={ref} search={search} buttonLabel="Buscar cliente" />
      </Field>,
    );
    expect(ref.current).toBe(input());
    expect(input()).toHaveClass('eds-input', 'eds-lookup-code');
    expect(container.querySelector('.eds-lookup')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Buscar cliente' })).toBeInTheDocument();
    const out = container.querySelector('output.eds-lookup-description')!;
    expect(out).toHaveAttribute('data-empty', 'true');
    expect(out).toHaveTextContent('—');
    // O travessão do estado vazio não entra na descrição do campo.
    expect(input().getAttribute('aria-describedby') ?? '').not.toContain(out.id);
  });

  it('sair do campo resolve a descrição (pela busca com código exato) e avisa onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Lookup aria-label="Cliente" search={search} onChange={onChange} />);
    await user.type(input(), '11');
    await user.tab();
    await waitFor(() =>
      expect(document.querySelector('output')).toHaveTextContent('Boreal Serviços'),
    );
    expect(document.querySelector('output')).not.toHaveAttribute('data-empty');
    expect(onChange).toHaveBeenCalledWith(
      '11',
      expect.objectContaining({ description: 'Boreal Serviços' }),
    );
  });

  it('usa resolve quando existe; código inexistente mostra erro visível e aria-invalid', async () => {
    const user = userEvent.setup();
    const resolve = vi.fn(async () => null);
    render(<Lookup aria-label="Cliente" search={search} resolve={resolve} />);
    await user.type(input(), '99');
    await user.tab();
    await waitFor(() => expect(screen.getByText('Código não encontrado.')).toBeInTheDocument());
    expect(resolve).toHaveBeenCalledWith('99', expect.any(AbortSignal));
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input()).toHaveAccessibleDescription(/Código não encontrado\./);
  });

  it('apagar o código volta à descrição vazia', async () => {
    const user = userEvent.setup();
    render(<Lookup aria-label="Cliente" search={search} defaultValue="10" />);
    await waitFor(() => expect(document.querySelector('output')).toHaveTextContent('Aurora'));
    await user.clear(input());
    await user.tab();
    await waitFor(() => expect(document.querySelector('output')).toHaveTextContent('—'));
  });

  it('o botão abre o modal com a tabela; a busca filtra; escolher devolve o código e o foco', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Lookup
        aria-label="Cliente"
        search={search}
        onChange={onChange}
        buttonLabel="Buscar cliente"
        columns={[
          { key: 'code', label: 'Código' },
          { key: 'description', label: 'Descrição' },
          { key: 'cidade', label: 'Cidade', hideNarrow: true },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Buscar cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Buscar cliente' });
    expect(within(dialog).getByRole('columnheader', { name: 'Cidade' })).toHaveClass(
      'eds-table-hide-narrow',
    );
    expect(within(dialog).getByRole('columnheader', { name: 'Código' })).not.toHaveClass(
      'eds-table-hide-narrow',
    );
    await waitFor(() => expect(within(dialog).getAllByRole('row')).toHaveLength(4));
    expect(within(dialog).getByRole('columnheader', { name: 'Cidade' })).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent('3 resultados disponíveis.');
    await user.type(within(dialog).getByRole('searchbox', { name: 'Buscar' }), 'cedro');
    await waitFor(() => expect(within(dialog).getAllByRole('row')).toHaveLength(2));
    await user.click(
      within(dialog).getByRole('button', { name: 'Selecionar 12, Cedro Alimentos' }),
    );
    expect(onChange).toHaveBeenCalledWith('12', expect.objectContaining({ code: '12' }));
    await waitFor(() => expect(input()).toHaveFocus());
    expect(input()).toHaveValue('12');
    expect(document.querySelector('output')).toHaveTextContent('Cedro Alimentos');
  });

  it('falha na busca do modal mostra erro com "Tentar de novo"', async () => {
    const user = userEvent.setup();
    const failing = vi
      .fn<(q: string) => Promise<LookupItem[]>>()
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValue(DATA.slice(0, 1));
    render(<Lookup aria-label="Cliente" search={failing} buttonLabel="Buscar" />);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const dialog = await screen.findByRole('dialog');
    const retry = await within(dialog).findByRole('button', { name: 'Tentar de novo' });
    await user.click(retry);
    await waitFor(() => expect(within(dialog).getAllByRole('row')).toHaveLength(2));
  });

  it('controlado: o value de fora é descrito sem avisar onChange', async () => {
    const onChange = vi.fn();
    function Wrapper() {
      const [v] = useState('10');
      return <Lookup aria-label="Cliente" search={search} value={v} onChange={onChange} />;
    }
    render(<Wrapper />);
    await waitFor(() => expect(document.querySelector('output')).toHaveTextContent('Aurora'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('textos trocáveis', async () => {
    const user = userEvent.setup();
    render(
      <Lookup
        aria-label="Client"
        search={search}
        resolve={async () => null}
        texts={{ notFound: 'Code not found.' }}
      />,
    );
    await user.type(screen.getByRole('combobox', { name: 'Client' }), '9');
    await user.tab();
    await waitFor(() => expect(screen.getByText('Code not found.')).toBeInTheDocument());
  });
});

describe('Lookup: autocompletar', () => {
  it('digitar busca por código ou nome e as setas com Enter escolhem', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Lookup aria-label="Cliente" search={search} onChange={onChange} />);
    const field = input();
    expect(field).toHaveAttribute('aria-autocomplete', 'list');
    expect(field).toHaveAttribute('aria-expanded', 'false');
    await user.type(field, 'bor');
    const option = await screen.findByRole('option', { name: /Boreal/, hidden: true });
    expect(field).toHaveAttribute('aria-expanded', 'true');
    expect(option).toHaveTextContent('11');
    await user.keyboard('{ArrowDown}');
    expect(field.getAttribute('aria-activedescendant')).toBe(option.id);
    await user.keyboard('{Enter}');
    expect(field.value).toBe('11');
    expect(document.querySelector('output')).toHaveTextContent('Boreal Serviços');
    expect(onChange).toHaveBeenCalledWith('11', expect.objectContaining({ code: '11' }));
    expect(field).toHaveAttribute('aria-expanded', 'false');
  });

  it('Esc fecha a lista sem apagar o texto; clique escolhe', async () => {
    const user = userEvent.setup();
    render(<Lookup aria-label="Cliente" search={search} />);
    await user.type(input(), 'ced');
    await screen.findByRole('option', { name: /Cedro/, hidden: true });
    await user.keyboard('{Escape}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input().value).toBe('ced');
    await user.type(input(), 'r');
    await user.click(await screen.findByRole('option', { name: /Cedro/, hidden: true }));
    expect(input().value).toBe('12');
  });

  it('sem resultado e com onCreate mostra Cadastrar novo… e entrega o texto', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<Lookup aria-label="Cliente" search={search} onCreate={onCreate} />);
    await user.type(input(), 'zzz');
    const create = await screen.findByRole('option', { name: 'Cadastrar novo…', hidden: true });
    expect(create).toHaveClass('eds-combobox-option-create');
    await user.click(create);
    expect(onCreate).toHaveBeenCalledWith('zzz');
  });

  it('com resultados a opção de cadastrar só aparece com createAlways', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Lookup aria-label="Cliente" search={search} onCreate={() => undefined} />,
    );
    await user.type(input(), 'aur');
    await screen.findByRole('option', { name: /Aurora/, hidden: true });
    expect(screen.queryByRole('option', { name: 'Cadastrar novo…', hidden: true })).toBeNull();
    rerender(
      <Lookup aria-label="Cliente" search={search} onCreate={() => undefined} createAlways />,
    );
    expect(
      screen.getByRole('option', { name: 'Cadastrar novo…', hidden: true }),
    ).toBeInTheDocument();
  });

  it('autocomplete={false} mantém o campo simples', () => {
    render(<Lookup aria-label="Cliente" search={search} autocomplete={false} />);
    expect(screen.getByRole('textbox', { name: 'Cliente' })).not.toHaveAttribute('aria-expanded');
    expect(document.querySelector('.eds-combobox-popup')).toBeNull();
  });
});
