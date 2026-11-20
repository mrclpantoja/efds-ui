import { Badge, Stack, Tag } from '@eds-ui/react';

export default function Diferenca() {
  return (
    <Stack gap={4}>
      <p className="eds-stack eds-stack-row eds-stack-wrap eds-gap-3 eds-stack-align-center">
        <span className="eds-text-small">Badge (estado)</span>
        <Badge variant="success">Pago</Badge>
      </p>
      <p className="eds-stack eds-stack-row eds-stack-wrap eds-gap-3 eds-stack-align-center">
        <span className="eds-text-small">Tag (classificação)</span>
        <Tag tone="info">Financeiro</Tag>
      </p>
      <p className="eds-stack eds-stack-row eds-stack-wrap eds-gap-3 eds-stack-align-center">
        <span className="eds-text-small">Chip (filtro)</span>
        <button type="button" className="eds-chip" aria-pressed="true">
          Situação: Pago
        </button>
      </p>
    </Stack>
  );
}
