import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type BadgeVariant,
} from '@eds-ui/react';

const faturas: { codigo: string; cliente: string; situacao: string; variant: BadgeVariant }[] = [
  { codigo: 'FAT-0001', cliente: 'Cliente Exemplo A', situacao: 'Pago', variant: 'success' },
  { codigo: 'FAT-0002', cliente: 'Cliente Exemplo B', situacao: 'Pendente', variant: 'warning' },
  { codigo: 'FAT-0003', cliente: 'Cliente Exemplo C', situacao: 'Atrasado', variant: 'danger' },
];

export default function EmTabela() {
  return (
    <Table caption="Faturas recentes (dados fictícios)">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Fatura</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell>Situação</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {faturas.map((f) => (
          <TableRow key={f.codigo}>
            <TableCell>{f.codigo}</TableCell>
            <TableCell>{f.cliente}</TableCell>
            <TableCell>
              <Badge variant={f.variant}>{f.situacao}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
