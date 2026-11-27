import { Stat, StatGrid } from '@efds-ui/react';

export default function Grade() {
  return (
    <StatGrid>
      <Stat
        label="Pedidos no mês"
        value="1.284"
        delta="12,4%"
        trend="up"
        tone="success"
        meta="vs. mês anterior"
      />
      <Stat
        label="Faturamento"
        value="R$ 86.410,00"
        delta="3,1%"
        trend="down"
        tone="danger"
        meta="vs. mês anterior"
        texts={{ down: 'Queda de' }}
      />
      <Stat
        label="Inadimplência acumulada nos últimos 12 meses"
        value="4,8%"
        delta="0,6 ponto"
        trend="up"
        tone="danger"
        meta="vs. mês anterior"
      />
      <Stat label="Carregando" value="" loading />
    </StatGrid>
  );
}
