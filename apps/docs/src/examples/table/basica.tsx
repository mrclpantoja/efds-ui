import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';
import { EditIcon } from '@efds-ui/icons';

const pedidos = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo', total: 'R$ 1.280,50' },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo', total: 'R$ 459,00' },
  { codigo: 'PED-0003', cliente: 'Oficina Fictícia', total: 'R$ 8.920,90' },
];

export default function Basica() {
  return (
    <Table caption="Pedidos recentes">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell numeric>Total</TableHeaderCell>
          <TableHeaderCell column="actions">
            <span className="eds-visually-hidden">Ações</span>
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pedidos.map((p) => (
          <TableRow key={p.codigo}>
            <TableCell>{p.codigo}</TableCell>
            <TableCell>{p.cliente}</TableCell>
            <TableCell numeric>{p.total}</TableCell>
            <TableCell column="actions">
              <Button variant="ghost" size="sm" iconOnly aria-label={`Editar ${p.codigo}`}>
                <EditIcon />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
