import { useEffect, useState } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableLoadingRows,
  TableRow,
} from '@eds-ui/react';

const pedidos = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo', total: 'R$ 1.280,50' },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo', total: 'R$ 459,00' },
  { codigo: 'PED-0003', cliente: 'Oficina Fictícia', total: 'R$ 2.015,90' },
];

export default function Carregando() {
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!carregando) return undefined;
    const timer = setTimeout(() => setCarregando(false), 2000);
    return () => clearTimeout(timer);
  }, [carregando]);

  return (
    <div className="eds-stack eds-gap-3">
      <div>
        <Button variant="secondary" onClick={() => setCarregando(true)} loading={carregando}>
          Recarregar
        </Button>
      </div>
      <Table caption="Pedidos recentes" loading={carregando}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Código</TableHeaderCell>
            <TableHeaderCell>Cliente</TableHeaderCell>
            <TableHeaderCell numeric>Total</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {carregando ? (
            <TableLoadingRows columns={3} rows={3} numeric={[2]} />
          ) : (
            pedidos.map((p) => (
              <TableRow key={p.codigo}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>{p.cliente}</TableCell>
                <TableCell numeric>{p.total}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
