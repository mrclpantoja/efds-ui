import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';

const pedidos = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo', situacao: 'Pago', total: 'R$ 1.280,50' },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo', situacao: 'Pendente', total: 'R$ 459,00' },
  { codigo: 'PED-0003', cliente: 'Oficina Fictícia', situacao: 'Pago', total: 'R$ 8.920,90' },
];

/* O modificador vai no wrap (wrapClassName); cada célula leva data-label. Os papéis ARIA (role) são
   opcionais: mantêm a semântica de tabela nos leitores que a perdem quando o display muda. */
export default function Empilhada() {
  return (
    <Table caption="Pedidos recentes" wrapClassName="eds-table-stack">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell>Situação</TableHeaderCell>
          <TableHeaderCell numeric>Total</TableHeaderCell>
          <TableHeaderCell column="actions">
            <span className="eds-visually-hidden">Ações</span>
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pedidos.map((p) => (
          <TableRow key={p.codigo}>
            <TableCell data-label="Código">{p.codigo}</TableCell>
            <TableCell data-label="Cliente">{p.cliente}</TableCell>
            <TableCell data-label="Situação">
              <Badge tone={p.situacao === 'Pago' ? 'success' : 'warning'}>{p.situacao}</Badge>
            </TableCell>
            <TableCell data-label="Total" numeric>
              {p.total}
            </TableCell>
            <TableCell column="actions">
              <Button variant="secondary" size="sm">
                Ver pedido {p.codigo}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
