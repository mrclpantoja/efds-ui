import { useState } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from '@eds-ui/react';
import { TrashIcon } from '@eds-ui/icons';

interface Pedido {
  codigo: string;
  cliente: string;
}

const inicial: Pedido[] = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo' },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo' },
  { codigo: 'PED-0003', cliente: 'Oficina Fictícia' },
];

/**
 * Exclusão otimista: a linha some na hora e o Toast oferece "Desfazer" por 8 s. Só depois do
 * prazo (ou sem desfazer) o servidor receberia o pedido de exclusão. O `ToastProvider` vem de fora.
 */
export default function ExcluirDesfazer() {
  const toast = useToast();
  const [linhas, setLinhas] = useState(inicial);

  const excluir = (pedido: Pedido, indice: number) => {
    setLinhas((atual) => atual.filter((p) => p.codigo !== pedido.codigo));
    toast.show({
      variant: 'info',
      message: `Pedido ${pedido.codigo} excluído.`,
      duration: 8000,
      action: {
        label: 'Desfazer',
        onClick: () =>
          setLinhas((atual) => {
            if (atual.some((p) => p.codigo === pedido.codigo)) return atual;
            const copia = [...atual];
            copia.splice(Math.min(indice, copia.length), 0, pedido);
            return copia;
          }),
      },
    });
  };

  return (
    <Table caption="Pedidos">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell column="actions">Ações</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {linhas.map((pedido, indice) => (
          <TableRow key={pedido.codigo}>
            <TableCell>{pedido.codigo}</TableCell>
            <TableCell>{pedido.cliente}</TableCell>
            <TableCell column="actions">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Excluir ${pedido.codigo}`}
                onClick={() => excluir(pedido, indice)}
              >
                <TrashIcon />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
