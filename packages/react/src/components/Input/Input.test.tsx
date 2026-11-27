import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renderiza com a classe do core e sem classe do tamanho padrão', () => {
    render(<Input aria-label="Nome" />);
    const input = screen.getByRole('textbox', { name: 'Nome' });
    expect(input).toHaveClass('eds-input');
    expect(input).not.toHaveClass('eds-input-md');
  });

  it.each(['sm', 'lg'] as const)('aplica o tamanho %s', (size) => {
    render(<Input aria-label="Nome" size={size} />);
    expect(screen.getByRole('textbox')).toHaveClass(`eds-input-${size}`);
  });

  it('invalid e valid viram atributos de estado', () => {
    const { rerender } = render(<Input aria-label="A" invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    rerender(<Input aria-label="A" valid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-valid');
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('mescla className, repassa ref e props nativas', async () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} className="extra" aria-label="Nome" name="nome" required />);
    const input = screen.getByRole('textbox');
    expect(ref.current).toBe(input);
    expect(input).toHaveClass('eds-input', 'extra');
    expect(input).toHaveAttribute('name', 'nome');
    expect(input).toBeRequired();
    await userEvent.type(input, 'Maria');
    expect(input).toHaveValue('Maria');
  });

  it('desabilitado e somente leitura usam atributos nativos', () => {
    render(
      <>
        <Input aria-label="D" disabled />
        <Input aria-label="R" readOnly />
      </>,
    );
    expect(screen.getByLabelText('D')).toBeDisabled();
    expect(screen.getByLabelText('R')).toHaveAttribute('readonly');
  });
});

describe('Input com máscara', () => {
  const box = () => screen.getByRole('textbox') as HTMLInputElement;

  it('emite o atributo, o inputmode, o autocomplete e o maxlength sem sobrescrever os do autor', () => {
    const { rerender } = render(<Input aria-label="Tel" mask="telefone" />);
    expect(box()).toHaveAttribute('data-eds-mask', 'telefone');
    expect(box()).toHaveAttribute('inputmode', 'tel');
    expect(box()).toHaveAttribute('autocomplete', 'tel');
    expect(box()).toHaveAttribute('maxlength', '15');
    rerender(
      <Input
        aria-label="Tel"
        mask="telefone"
        autoComplete="off"
        inputMode="numeric"
        maxLength={20}
      />,
    );
    expect(box()).toHaveAttribute('autocomplete', 'off');
    expect(box()).toHaveAttribute('inputmode', 'numeric');
    expect(box()).toHaveAttribute('maxlength', '20');
  });

  it('sem máscara não emite nada disso', () => {
    render(<Input aria-label="Nome" />);
    expect(box()).not.toHaveAttribute('data-eds-mask');
    expect(box()).not.toHaveAttribute('inputmode');
    expect(box()).not.toHaveAttribute('maxlength');
  });

  it('moeda não leva maxlength nem autocomplete', () => {
    render(<Input aria-label="Valor" mask="moeda" />);
    expect(box()).toHaveAttribute('inputmode', 'decimal');
    expect(box()).not.toHaveAttribute('maxlength');
    expect(box()).not.toHaveAttribute('autocomplete');
  });

  it('digitando (não controlado), aplica a máscara e chama onChange com o valor mascarado', async () => {
    const seen: string[] = [];
    render(<Input aria-label="CPF" mask="cpf" onChange={(e) => seen.push(e.target.value)} />);
    await userEvent.type(box(), '12345678900');
    expect(box()).toHaveValue('123.456.789-00');
    expect(seen.at(-1)).toBe('123.456.789-00');
  });

  it('onValueChange traz o valor mascarado e o limpo', async () => {
    const onValueChange = vi.fn();
    render(<Input aria-label="Valor" mask="moeda" onValueChange={onValueChange} />);
    await userEvent.type(box(), '123456');
    expect(box()).toHaveValue('R$ 1.234,56');
    expect(onValueChange).toHaveBeenLastCalledWith('R$ 1.234,56', '1234.56');
  });

  it('controlado: o estado do pai recebe o texto mascarado', async () => {
    function Controlled() {
      const [v, setV] = useState('');
      return (
        <>
          <Input aria-label="CEP" mask="cep" value={v} onChange={(e) => setV(e.target.value)} />
          <output data-testid="estado">{v}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.type(box(), '96010000');
    expect(box()).toHaveValue('96010-000');
    expect(screen.getByTestId('estado')).toHaveTextContent('96010-000');
  });

  it('controlado com valor sem máscara é exibido mascarado', () => {
    render(<Input aria-label="CPF" mask="cpf" value="12345678900" onChange={() => undefined} />);
    expect(box()).toHaveValue('123.456.789-00');
  });

  it('defaultValue sem máscara é exibido mascarado', () => {
    render(<Input aria-label="Valor" mask="moeda" defaultValue="1234.5" />);
    expect(box()).toHaveValue('R$ 1.234,50');
  });

  it('opções da moeda: casas, símbolo e negativo', async () => {
    render(
      <Input
        aria-label="Valor"
        mask="moeda"
        maskOptions={{ decimals: 0, prefix: 'US$ ', negative: true }}
      />,
    );
    await userEvent.type(box(), '-1500');
    expect(box()).toHaveValue('-US$ 1.500');
  });

  it('padrão personalizado', async () => {
    render(<Input aria-label="Placa" mask="00.000-AAA" />);
    await userEvent.type(box(), '12345abc');
    expect(box()).toHaveValue('12.345-ABC');
  });

  it('digitar no meio preserva o cursor e Backspace sobre o literal apaga o dígito anterior', async () => {
    render(<Input aria-label="CPF" mask="cpf" defaultValue="123.456.789" />);
    await userEvent.click(box());
    box().setSelectionRange(2, 2);
    await userEvent.keyboard('9');
    expect(box()).toHaveValue('129.345.678-9');
    expect(box().selectionStart).toBe(3);
    box().setSelectionRange(4, 4);
    await userEvent.keyboard('{Backspace}');
    expect(box()).toHaveValue('123.456.789');
    expect(box().selectionStart).toBe(2);
  });

  it('colar com e sem máscara, sem cortar pelo maxlength, e notifica o pai', async () => {
    const onValueChange = vi.fn();
    render(<Input aria-label="Tel" mask="telefone" onValueChange={onValueChange} />);
    await userEvent.click(box());
    await userEvent.paste('+55 (11) 98765-4321');
    expect(box()).toHaveValue('(11) 98765-4321');
    expect(onValueChange).toHaveBeenLastCalledWith('(11) 98765-4321', '11987654321');
    await userEvent.clear(box());
    await userEvent.paste('11987654321');
    expect(box()).toHaveValue('(11) 98765-4321');
  });

  it('colar também atualiza o estado de um campo controlado', async () => {
    function Controlled() {
      const [v, setV] = useState('');
      return <Input aria-label="CPF" mask="cpf" value={v} onChange={(e) => setV(e.target.value)} />;
    }
    render(<Controlled />);
    await userEvent.click(box());
    await userEvent.paste('12345678900');
    expect(box()).toHaveValue('123.456.789-00');
  });

  it('onPaste do autor pode impedir a colagem', async () => {
    render(<Input aria-label="CEP" mask="cep" onPaste={(e) => e.preventDefault()} />);
    await userEvent.click(box());
    await userEvent.paste('96010000');
    expect(box()).toHaveValue('');
  });

  it('unmask: o visível perde o name e um hidden leva o valor limpo', async () => {
    const { container } = render(<Input aria-label="Valor" mask="moeda" name="valor" unmask />);
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]');
    expect(box()).not.toHaveAttribute('name');
    expect(hidden).toHaveAttribute('name', 'valor');
    await userEvent.type(box(), '123456');
    expect(box()).toHaveValue('R$ 1.234,56');
    expect(hidden).toHaveValue('1234.56');
  });

  it('unmask controlado e disabled acompanham o campo', () => {
    const { container } = render(
      <Input
        aria-label="CPF"
        mask="cpf"
        name="cpf"
        unmask
        disabled
        value="123.456.789-00"
        onChange={() => undefined}
      />,
    );
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]');
    expect(hidden).toHaveValue('12345678900');
    expect(hidden).toBeDisabled();
  });

  it('unmask sem name não cria hidden', () => {
    const { container } = render(<Input aria-label="CPF" mask="cpf" unmask />);
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it('ref aponta para o campo visível', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="CEP" mask="cep" name="cep" unmask />);
    expect(ref.current).toBe(box());
  });
});
