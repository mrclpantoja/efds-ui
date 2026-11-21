import {
  Button,
  EmptyState,
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';
import { SearchIcon } from '@efds-ui/icons';

export default function Vazia() {
  return (
    <Table caption="Pedidos (nenhum resultado)">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell numeric>Total</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableEmpty colSpan={3}>
          <EmptyState
            icon={<SearchIcon />}
            title="Nenhum pedido encontrado"
            description="Nenhum resultado para os filtros atuais. Remova um filtro ou crie um novo pedido."
            actions={
              <>
                <Button variant="primary" size="sm">
                  Novo pedido
                </Button>
                <Button size="sm">Limpar busca e filtros</Button>
              </>
            }
          />
        </TableEmpty>
      </TableBody>
    </Table>
  );
}
