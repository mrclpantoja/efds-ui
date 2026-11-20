import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { Field } from '../Field';
import { Input } from '../Input';
import { InputGroup } from './InputGroup';

describe('InputGroup', () => {
  it('renderiza prefixo e sufixo de texto como .eds-input-group-text, ao redor do campo', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Field label="Valor, em reais">
        <InputGroup ref={ref} prefix="R$" suffix="/mês" className="extra" size="lg">
          <Input />
        </InputGroup>
      </Field>,
    );
    const group = container.querySelector('.eds-input-group')!;
    expect(ref.current).toBe(group);
    expect(group).toHaveClass('eds-input-group-lg', 'extra');
    const texts = group.querySelectorAll('.eds-input-group-text');
    expect(texts[0]).toHaveTextContent('R$');
    expect(texts[1]).toHaveTextContent('/mês');
    expect(group.children[0]).toBe(texts[0]);
    expect(group.children[1]).toBe(screen.getByLabelText('Valor, em reais'));
  });

  it('o erro do campo continua valendo e um nó (botão) entra como veio', () => {
    render(
      <InputGroup suffix={<Button className="eds-input-group-button">Aplicar</Button>}>
        <Input aria-label="Cupom" invalid />
      </InputGroup>,
    );
    expect(screen.getByLabelText('Cupom')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Aplicar' })).toHaveClass('eds-input-group-button');
  });
});
