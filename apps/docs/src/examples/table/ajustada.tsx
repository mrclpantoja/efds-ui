import {
  Card,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';

const vencimentos = [
  { fornecedor: 'Papelaria Exemplo', valor: 'R$ 1.280,50' },
  { fornecedor: 'Transportes Modelo', valor: 'R$ 459,00' },
  { fornecedor: 'Serviços Fictícios', valor: 'R$ 8.920,90' },
];

export default function Ajustada() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vencimentos da semana</CardTitle>
      </CardHeader>
      <Table caption="Vencimentos da semana" className="eds-table-fit">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Fornecedor</TableHeaderCell>
            <TableHeaderCell numeric>Valor</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vencimentos.map((v) => (
            <TableRow key={v.fornecedor}>
              <TableCell>{v.fornecedor}</TableCell>
              <TableCell numeric>{v.valor}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
