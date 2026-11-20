import { describe, expect, it } from 'vitest';
import { createMask, isMaskName, type Mask } from './mask';

/** Campo simulado: aplica as edições do usuário como o navegador as entregaria ao `input`. */
function field(mask: Mask, value = '', caret = value.length) {
  const state = { value, caret, raw: mask.unmask(value) };
  const commit = (text: string, at: number, inputType: string) => {
    const result = mask.edit({ text, caret: at, prev: state.value, inputType });
    state.value = result.value;
    state.caret = result.caret;
    state.raw = result.raw;
  };
  const api = {
    state,
    type(chars: string) {
      for (const ch of chars) {
        const { value: v, caret: c } = state;
        commit(v.slice(0, c) + ch + v.slice(c), c + 1, 'insertText');
      }
      return api;
    },
    backspace() {
      const { value: v, caret: c } = state;
      if (c > 0) commit(v.slice(0, c - 1) + v.slice(c), c - 1, 'deleteContentBackward');
      return api;
    },
    del() {
      const { value: v, caret: c } = state;
      if (c < v.length) commit(v.slice(0, c) + v.slice(c + 1), c, 'deleteContentForward');
      return api;
    },
    select(start: number, end: number) {
      const { value: v } = state;
      commit(v.slice(0, start) + v.slice(end), start, 'deleteContentBackward');
      return api;
    },
    paste(text: string, start = state.caret, end = start) {
      const r = mask.paste(state.value, start, end, text);
      state.value = r.value;
      state.caret = r.caret;
      state.raw = r.raw;
      return api;
    },
  };
  return api;
}

describe('máscaras prontas', () => {
  it('reconhece os nomes', () => {
    expect(isMaskName('telefone')).toBe(true);
    expect(isMaskName('00.000-AAA')).toBe(false);
  });

  it('telefone escolhe 8 ou 9 dígitos pela quantidade digitada', () => {
    const f = field(createMask('telefone'));
    f.type('11');
    expect(f.state.value).toBe('(11');
    f.type('9876');
    expect(f.state.value).toBe('(11) 9876');
    f.type('5432');
    expect(f.state.value).toBe('(11) 9876-5432');
    f.type('1');
    expect(f.state.value).toBe('(11) 98765-4321');
    expect(f.state.raw).toBe('11987654321');
    f.type('9');
    expect(f.state.value).toBe('(11) 98765-4321');
  });

  it('telefone volta ao formato de 8 dígitos ao apagar o último', () => {
    const f = field(createMask('telefone'), '(11) 98765-4321');
    f.backspace();
    expect(f.state.value).toBe('(11) 9876-5432');
  });

  it('telefone ignora letras e símbolos digitados', () => {
    const f = field(createMask('telefone'));
    f.type('a(1b1)-9');
    expect(f.state.value).toBe('(11) 9');
  });

  it('cpf', () => {
    const f = field(createMask('cpf'));
    f.type('12345678900');
    expect(f.state.value).toBe('123.456.789-00');
    expect(f.state.raw).toBe('12345678900');
    f.type('1');
    expect(f.state.value).toBe('123.456.789-00');
    expect(createMask('cpf').maxLength).toBe(14);
  });

  it('cep', () => {
    const f = field(createMask('cep'));
    f.type('96010');
    expect(f.state.value).toBe('96010');
    f.type('000');
    expect(f.state.value).toBe('96010-000');
    expect(f.state.raw).toBe('96010000');
  });

  it('cnpj numérico', () => {
    const f = field(createMask('cnpj'));
    f.type('12345678000195');
    expect(f.state.value).toBe('12.345.678/0001-95');
  });

  it('cnpj alfanumérico: letras viram maiúsculas nas 12 primeiras posições', () => {
    const f = field(createMask('cnpj'));
    f.type('12abc345000102');
    expect(f.state.value).toBe('12.ABC.345/0001-02');
    expect(f.state.raw).toBe('12ABC345000102');
  });

  it('cnpj: as 2 últimas posições só aceitam dígitos', () => {
    const f = field(createMask('cnpj'));
    f.type('12ABC3450001');
    f.type('xz9a8');
    expect(f.state.value).toBe('12.ABC.345/0001-98');
    expect(f.state.raw).toBe('12ABC345000198');
  });

  it('cnpj aceita colar com máscara e minúsculas', () => {
    const f = field(createMask('cnpj'));
    f.paste('ab.cde.fgh/ijkl-12');
    expect(f.state.value).toBe('AB.CDE.FGH/IJKL-12');
  });

  it('cpf-cnpj alterna sozinho pelo tamanho', () => {
    const f = field(createMask('cpf-cnpj'));
    f.type('12345678900');
    expect(f.state.value).toBe('123.456.789-00');
    f.type('1');
    expect(f.state.value).toBe('12.345.678/9001');
    f.type('99');
    expect(f.state.value).toBe('12.345.678/9001-99');
    f.backspace().backspace().backspace();
    expect(f.state.value).toBe('123.456.789-00');
    f.backspace();
    expect(f.state.value).toBe('123.456.789-0');
  });

  it('cpf-cnpj com letra já é CNPJ alfanumérico', () => {
    const f = field(createMask('cpf-cnpj'));
    f.type('1234567890A');
    expect(f.state.value).toBe('12.345.678/90A');
  });

  it('metadados: inputmode e autocomplete só onde fazem sentido', () => {
    expect(createMask('telefone')).toMatchObject({ inputMode: 'tel', autocomplete: 'tel' });
    expect(createMask('cep')).toMatchObject({
      inputMode: 'numeric',
      autocomplete: 'postal-code',
    });
    expect(createMask('cpf')).toMatchObject({ inputMode: 'numeric', autocomplete: undefined });
    expect(createMask('cnpj').inputMode).toBe('text');
    expect(createMask('cpf-cnpj').inputMode).toBe('text');
    expect(createMask('moeda')).toMatchObject({ inputMode: 'decimal', maxLength: undefined });
    expect(createMask('moeda', { decimals: 0 }).inputMode).toBe('numeric');
    expect(createMask('moeda', { negative: true }).inputMode).toBe('text');
  });
});

describe('máscara personalizada', () => {
  it('0 dígito, A letra em maiúscula, * letra ou dígito, resto literal', () => {
    const f = field(createMask('00.000-AAA'));
    f.type('12345abc');
    expect(f.state.value).toBe('12.345-ABC');
    expect(f.state.raw).toBe('12345ABC');
    expect(createMask('00.000-AAA').name).toBe('custom');
    expect(createMask('00.000-AAA').maxLength).toBe(10);
  });

  it('descarta o que o espaço não aceita, na posição certa', () => {
    const f = field(createMask('00.000-AAA'));
    f.type('1a2b3');
    expect(f.state.value).toBe('12.3');
    const g = field(createMask('AA-**'));
    g.type('x1yz9');
    expect(g.state.value).toBe('XY-Z9');
    expect(g.state.raw).toBe('XYZ9');
  });

  it('letras acentuadas perdem o acento', () => {
    const f = field(createMask('AAA'));
    f.type('çãé');
    expect(f.state.value).toBe('CAE');
  });

  it('a barra invertida torna o próximo caractere literal', () => {
    const f = field(createMask('\\0 00'));
    f.type('12');
    expect(f.state.value).toBe('0 12');
  });

  it('inputmode numérico só quando todos os espaços são dígitos', () => {
    expect(createMask('00/00').inputMode).toBe('numeric');
    expect(createMask('00-AAA').inputMode).toBe('text');
  });

  it('literal no começo e no fim', () => {
    const f = field(createMask('(00)'));
    f.type('1');
    expect(f.state.value).toBe('(1');
    f.type('2');
    expect(f.state.value).toBe('(12)');
  });
});

describe('cursor', () => {
  it('digitar no meio mantém o cursor depois do caractere digitado', () => {
    const f = field(createMask('cpf'), '123.456.789-00', 2);
    f.type('9');
    expect(f.state.value).toBe('129.345.678-90');
    expect(f.state.caret).toBe(3);
  });

  it('o cursor atravessa o literal quando o dígito digitado desloca a máscara', () => {
    const f = field(createMask('cpf'), '123.456.789-00', 3);
    f.type('9');
    expect(f.state.value).toBe('123.945.678-90');
    expect(f.state.caret).toBe(5);
  });

  it('apagar no meio mantém o cursor', () => {
    const f = field(createMask('cpf'), '123.456.789-00', 6);
    f.backspace();
    expect(f.state.value).toBe('123.467.890-0');
    expect(f.state.caret).toBe(5);
  });

  it('Backspace sobre o literal apaga o dígito anterior', () => {
    const f = field(createMask('cpf'), '123.456.789-00', 4);
    f.backspace();
    expect(f.state.value).toBe('124.567.890-0');
    expect(f.state.caret).toBe(2);
  });

  it('Delete sobre o literal apaga o dígito seguinte', () => {
    const f = field(createMask('cpf'), '123.456.789-00', 3);
    f.del();
    expect(f.state.value).toBe('123.567.890-0');
    expect(f.state.caret).toBe(3);
  });

  it('Backspace sobre o parêntese do telefone não trava', () => {
    const f = field(createMask('telefone'), '(11) 9876', 1);
    f.backspace();
    expect(f.state.value).toBe('(11) 9876');
    const g = field(createMask('telefone'), '(11) 9876', 5);
    g.backspace();
    expect(g.state.value).toBe('(11) 9876'.replace('(11) ', '(19) ').replace('9876', '876'));
  });

  it('apagar o último caractere deixa o campo vazio', () => {
    const f = field(createMask('cep'), '9');
    f.backspace();
    expect(f.state.value).toBe('');
    expect(f.state.raw).toBe('');
  });

  it('apagar uma seleção refaz a máscara', () => {
    const f = field(createMask('cpf'), '123.456.789-00');
    f.select(4, 8);
    expect(f.state.value).toBe('123.789.00');
    expect(f.state.caret).toBe(3);
  });
});

describe('colar', () => {
  it('com ou sem máscara dá o mesmo resultado', () => {
    const a = field(createMask('cpf')).paste('12345678900');
    const b = field(createMask('cpf')).paste('123.456.789-00');
    const c = field(createMask('cpf')).paste('  CPF: 123 456 789 00 ');
    expect(a.state.value).toBe('123.456.789-00');
    expect(b.state.value).toBe('123.456.789-00');
    expect(c.state.value).toBe('123.456.789-00');
  });

  it('colar no meio substitui a seleção e põe o cursor depois do texto colado', () => {
    const f = field(createMask('cpf'), '123.456.789-00').paste('99', 4, 7);
    expect(f.state.value).toBe('123.997.890-0');
    expect(f.state.caret).toBe(6);
  });

  it('texto maior que o campo é cortado, nunca bloqueado', () => {
    const f = field(createMask('cep')).paste('96010-000 e mais coisa 123');
    expect(f.state.value).toBe('96010-000');
  });

  it('telefone: remove o código do país ao colar no campo todo', () => {
    const f = field(createMask('telefone')).paste('+55 (11) 98765-4321');
    expect(f.state.value).toBe('(11) 98765-4321');
    const g = field(createMask('telefone')).paste('(11) 98765-4321');
    expect(g.state.value).toBe('(11) 98765-4321');
  });
});

describe('moeda', () => {
  it('digita da direita para a esquerda: centavos primeiro', () => {
    const f = field(createMask('moeda'));
    f.type('1');
    expect(f.state.value).toBe('R$ 0,01');
    f.type('2');
    expect(f.state.value).toBe('R$ 0,12');
    f.type('3');
    expect(f.state.value).toBe('R$ 1,23');
    f.type('456');
    expect(f.state.value).toBe('R$ 1.234,56');
    expect(f.state.raw).toBe('1234.56');
    expect(f.state.caret).toBe('R$ 1.234,56'.length);
  });

  it('milhões e zeros à esquerda', () => {
    const f = field(createMask('moeda'));
    f.type('000');
    expect(f.state.value).toBe('R$ 0,00');
    f.type('1234567890');
    expect(f.state.value).toBe('R$ 12.345.678,90');
  });

  it('apagar tira o último dígito e zerar esvazia o campo', () => {
    const f = field(createMask('moeda'), 'R$ 1.234,56');
    f.backspace();
    expect(f.state.value).toBe('R$ 123,45');
    f.backspace().backspace().backspace().backspace().backspace();
    expect(f.state.value).toBe('');
    expect(f.state.raw).toBe('');
  });

  it('apagar o 0 de 10,00 chega a 1,00', () => {
    const f = field(createMask('moeda'), 'R$ 10,00');
    f.backspace();
    expect(f.state.value).toBe('R$ 1,00');
  });

  it('o cursor se mantém contando dígitos a partir da direita', () => {
    const f = field(createMask('moeda'), 'R$ 1.234,56', 5);
    f.type('9');
    expect(f.state.value).toBe('R$ 19.234,56');
    expect(f.state.caret).toBe(6);
  });

  it('Backspace sobre a vírgula apaga o dígito anterior', () => {
    const f = field(createMask('moeda'), 'R$ 1.234,56', 9);
    f.backspace();
    expect(f.state.value).toBe('R$ 123,56');
    expect(f.state.caret).toBe(7);
  });

  it('casas decimais configuráveis', () => {
    const zero = field(createMask('moeda', { decimals: 0 }));
    zero.type('1500');
    expect(zero.state.value).toBe('R$ 1.500');
    expect(zero.state.raw).toBe('1500');
    const tres = field(createMask('moeda', { decimals: 3 }));
    tres.type('1234567');
    expect(tres.state.value).toBe('R$ 1.234,567');
    expect(tres.state.raw).toBe('1234.567');
  });

  it('símbolo configurável e vazio permitido', () => {
    const us = field(createMask('moeda', { prefix: 'US$ ' }));
    us.type('150');
    expect(us.state.value).toBe('US$ 1,50');
    const sem = field(createMask('moeda', { prefix: '' }));
    sem.type('150');
    expect(sem.state.value).toBe('1,50');
  });

  it('negativo: "-" alterna o sinal e só vale se habilitado', () => {
    const neg = field(createMask('moeda', { negative: true }));
    neg.type('-');
    expect(neg.state.value).toBe('-');
    neg.type('250');
    expect(neg.state.value).toBe('-R$ 2,50');
    expect(neg.state.raw).toBe('-2.50');
    neg.type('-');
    expect(neg.state.value).toBe('R$ 2,50');
    expect(neg.state.raw).toBe('2.50');

    const pos = field(createMask('moeda'));
    pos.type('-250');
    expect(pos.state.value).toBe('R$ 2,50');
  });

  it('negativo zerado não vira "-0.00" no valor limpo', () => {
    const f = field(createMask('moeda', { negative: true }));
    f.type('-000');
    expect(f.state.value).toBe('-R$ 0,00');
    expect(f.state.raw).toBe('0.00');
  });

  it('apagar o "-" torna positivo; apagar só o sinal esvazia', () => {
    const f = field(createMask('moeda', { negative: true }), '-R$ 2,50', 1);
    f.backspace();
    expect(f.state.value).toBe('R$ 2,50');
    const g = field(createMask('moeda', { negative: true }), '-');
    g.backspace();
    expect(g.state.value).toBe('');
  });

  it('numero é a moeda sem símbolo', () => {
    const f = field(createMask('numero'));
    f.type('123456');
    expect(f.state.value).toBe('1.234,56');
    expect(f.state.raw).toBe('1234.56');
    const g = field(createMask('numero', { decimals: 0 }));
    g.type('1234567');
    expect(g.state.value).toBe('1.234.567');
  });

  it('limita o tamanho do número', () => {
    const f = field(createMask('numero', { decimals: 0 }));
    f.type('1'.repeat(30));
    expect(f.state.raw).toHaveLength(18);
  });

  it('colar interpreta o texto como número, não como centavos', () => {
    const m = createMask('moeda');
    expect(field(m).paste('1234.56').state.value).toBe('R$ 1.234,56');
    expect(field(m).paste('1234.5').state.value).toBe('R$ 1.234,50');
    expect(field(m).paste('1.234,56').state.value).toBe('R$ 1.234,56');
    expect(field(m).paste('R$ 1.234,56').state.value).toBe('R$ 1.234,56');
    expect(field(m).paste('1.234').state.value).toBe('R$ 1.234,00');
    expect(field(m).paste('1234').state.value).toBe('R$ 1.234,00');
    expect(field(m).paste('1,5').state.value).toBe('R$ 1,50');
    expect(field(m).paste('abc').state.value).toBe('');
    expect(field(createMask('moeda', { negative: true })).paste('-5,25').state.raw).toBe('-5.25');
    expect(field(m).paste('-5,25').state.raw).toBe('5.25');
  });

  it('format() mascara valor de fora: número limpo ou texto já mascarado', () => {
    const m = createMask('moeda');
    expect(m.format('1234.56')).toBe('R$ 1.234,56');
    expect(m.format('R$ 1.234,56')).toBe('R$ 1.234,56');
    expect(m.format('')).toBe('');
    expect(m.unmask('R$ 1.234,56')).toBe('1234.56');
    expect(createMask('moeda', { decimals: 0 }).format('R$ 1.234')).toBe('R$ 1.234');
    expect(createMask('cpf').format('12345678900')).toBe('123.456.789-00');
    expect(createMask('cpf').unmask('123.456.789-00')).toBe('12345678900');
  });

  it('decimais fora da faixa são ajustados', () => {
    expect(field(createMask('numero', { decimals: 20 })).type('1').state.value).toBe('0,00000001');
    expect(field(createMask('numero', { decimals: -3 })).type('7').state.value).toBe('7');
  });
});
