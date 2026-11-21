import { useId } from 'react';
import {
  Button,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  useTableFilter,
} from '@eds-ui/react';
import { SearchIcon } from '@eds-ui/icons';

interface Pedido {
  codigo: string;
  cliente: string;
  cidade: string;
  total: number;
}

const pedidos: Pedido[] = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo', cidade: 'São Paulo', total: 1280.5 },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo', cidade: 'Pelotas', total: 459 },
  { codigo: 'PED-0003', cliente: 'Oficina Fictícia', cidade: 'Porto Alegre', total: 8920.9 },
  { codigo: 'PED-0004', cliente: 'Clínica Fictícia', cidade: 'Passo Fundo', total: 5033.1 },
  { codigo: 'PED-0005', cliente: 'Livraria Teste', cidade: 'Caxias do Sul', total: 189.9 },
];

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Texto pesquisável da linha: inclui o total como aparece na tela. */
const textoDe = (p: Pedido) => `${p.codigo} ${p.cliente} ${p.cidade} ${moeda.format(p.total)}`;

export default function Filtro() {
  const id = useId();
  // O hook filtra sem acento/caixa, espera 150 ms, limpa com Esc e devolve o anúncio para a Table
  // ("2 resultados.", "Filtro removido. 5 linhas."), como o data-eds-table-filter do HTML.
  const {
    query: consulta,
    setQuery: setConsulta,
    rows: visiveis,
    status,
    inputProps,
  } = useTableFilter(pedidos, { getText: textoDe });

  return (
    <div>
      <TableToolbar>
        <Input
          type="search"
          size="sm"
          placeholder="Buscar pedido"
          aria-label="Buscar pedido"
          aria-controls={id}
          {...inputProps}
        />
      </TableToolbar>

      <Table id={id} caption="Pedidos, com busca local" status={status}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Código</TableHeaderCell>
            <TableHeaderCell>Cliente</TableHeaderCell>
            <TableHeaderCell>Cidade</TableHeaderCell>
            <TableHeaderCell numeric>Total</TableHeaderCell>
            <TableHeaderCell column="actions">
              <span className="eds-visually-hidden">Ações</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visiveis.length === 0 ? (
            <TableEmpty colSpan={5}>
              <EmptyState
                icon={<SearchIcon />}
                title="Nenhum resultado"
                description={`Nenhum resultado para "${consulta.trim()}".`}
                actions={
                  <Button size="sm" onClick={() => setConsulta('')}>
                    Limpar busca
                  </Button>
                }
              />
            </TableEmpty>
          ) : (
            visiveis.map((p) => (
              <TableRow key={p.codigo}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>{p.cliente}</TableCell>
                <TableCell>{p.cidade}</TableCell>
                <TableCell numeric>{moeda.format(p.total)}</TableCell>
                <TableCell column="actions">
                  <Button variant="ghost" size="sm">
                    Abrir
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
