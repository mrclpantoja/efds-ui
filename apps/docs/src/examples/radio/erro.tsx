import { useState } from 'react';
import { Radio, RadioGroup } from '@efds-ui/react';

export default function Erro() {
  // Controlado: `value` e `onValueChange` (o grupo também funciona sem eles).
  const [forma, setForma] = useState<string>();

  return (
    <RadioGroup
      legend="Forma de pagamento"
      helper="A cobrança acontece no fechamento do pedido."
      error={forma ? undefined : 'Escolha uma forma de pagamento.'}
      value={forma}
      onValueChange={setForma}
      required
    >
      <Radio value="boleto">Boleto</Radio>
      <Radio value="cartao">Cartão</Radio>
    </RadioGroup>
  );
}
