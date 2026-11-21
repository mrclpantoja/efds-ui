import { Stat } from '@efds-ui/react';

export default function Basico() {
  return (
    <Stat
      label="Pedidos no mês"
      value="1.284"
      delta="12,4%"
      trend="up"
      tone="positive"
      meta="vs. mês anterior"
    />
  );
}
