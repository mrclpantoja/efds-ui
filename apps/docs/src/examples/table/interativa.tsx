import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  sortTableData,
  type BadgeVariant,
  type TableSortState,
} from '@eds-ui/react';
import { EditIcon } from '@eds-ui/icons';

interface Pedido {
  codigo: string;
  cliente: string;
  situacao: string;
  variant: BadgeVariant;
  total: number;
}

const pedidos: Pedido[] = [
  {
    codigo: 'PED-0001',
    cliente: 'Atelier Exemplo',
    situacao: 'Pago',
    variant: 'success',
    total: 1280.5,
  },
  {
    codigo: 'PED-0002',
    cliente: 'Comércio Modelo',
    situacao: 'Pendente',
    variant: 'warning',
    total: 459,
  },
  {
    codigo: 'PED-0003',
    cliente: 'Oficina Fictícia',
    situacao: 'Atrasado',
    variant: 'danger',
    total: 8920.9,
  },
  {
    codigo: 'PED-0004',
    cliente: 'Mercado Teste',
    situacao: 'Pago',
    variant: 'success',
    total: 312.25,
  },
  {
    codigo: 'PED-0005',
    cliente: 'Studio Amostra',
    situacao: 'Rascunho',
    variant: 'neutral',
    total: 75,
  },
  {
    codigo: 'PED-0006',
    cliente: 'Padaria Exemplo',
    situacao: 'Pendente',
    variant: 'warning',
    total: 2140,
  },
  {
    codigo: 'PED-0007',
    cliente: 'Gráfica Modelo',
    situacao: 'Pago',
    variant: 'success',
    total: 640.8,
  },
  {
    codigo: 'PED-0008',
    cliente: 'Clínica Fictícia',
    situacao: 'Pago',
    variant: 'success',
    total: 5033.1,
  },
  {
    codigo: 'PED-0009',
    cliente: 'Livraria Teste',
    situacao: 'Em análise',
    variant: 'info',
    total: 189.9,
  },
];

const porPagina = 3;
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Interativa() {
  // Ordenação controlada: a Table deriva o aria-sort e anuncia; sortTableData ordena os dados.
  const [ordem, setOrdem] = useState<TableSortState>({ column: 'codigo', direction: 'ascending' });
  const [pagina, setPagina] = useState(1);
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(new Set(['PED-0003']));
  // Região de status da seleção e da página (a ordenação a Table anuncia sozinha).
  const [aviso, setAviso] = useState('');

  const ordenados = useMemo(() => sortTableData(pedidos, ordem), [ordem]);

  const totalPaginas = Math.ceil(ordenados.length / porPagina);
  const inicio = (pagina - 1) * porPagina;
  const visiveis = ordenados.slice(inicio, inicio + porPagina);

  const todosNaPagina = visiveis.every((p) => selecionados.has(p.codigo));
  const algunsNaPagina = !todosNaPagina && visiveis.some((p) => selecionados.has(p.codigo));

  const atualizarSelecao = (proxima: Set<string>) => {
    setSelecionados(proxima);
    setAviso(
      proxima.size === 0
        ? 'Nenhum pedido selecionado.'
        : `${proxima.size} ${proxima.size === 1 ? 'pedido selecionado' : 'pedidos selecionados'}.`,
    );
  };

  const alternarLinha = (codigo: string) => {
    const proxima = new Set(selecionados);
    if (proxima.has(codigo)) proxima.delete(codigo);
    else proxima.add(codigo);
    atualizarSelecao(proxima);
  };

  const alternarPagina = () => {
    const proxima = new Set(selecionados);
    for (const p of visiveis) {
      if (todosNaPagina) proxima.delete(p.codigo);
      else proxima.add(p.codigo);
    }
    atualizarSelecao(proxima);
  };

  const irParaPagina = (destino: number) => {
    setPagina(destino);
    const de = (destino - 1) * porPagina + 1;
    const ate = Math.min(destino * porPagina, ordenados.length);
    setAviso(
      `Página ${destino} de ${totalPaginas}: mostrando ${de}–${ate} de ${ordenados.length}.`,
    );
  };

  return (
    <div>
      <TableToolbar>
        <span>
          {selecionados.size === 0
            ? 'Nenhum pedido selecionado'
            : `${selecionados.size} ${selecionados.size === 1 ? 'selecionado' : 'selecionados'}`}
        </span>
        <Button size="sm" variant="primary">
          Novo pedido
        </Button>
      </TableToolbar>

      <Table
        caption="Pedidos recentes, ordenáveis por código, cliente e total"
        sort={ordem}
        onSortChange={setOrdem}
      >
        <TableHead>
          <TableRow>
            <TableHeaderCell column="check">
              <Checkbox
                aria-label="Selecionar todos desta página"
                checked={todosNaPagina}
                indeterminate={algunsNaPagina}
                onChange={alternarPagina}
              />
            </TableHeaderCell>
            <TableHeaderCell sortKey="codigo">Código</TableHeaderCell>
            <TableHeaderCell sortKey="cliente">Cliente</TableHeaderCell>
            <TableHeaderCell>Situação</TableHeaderCell>
            <TableHeaderCell numeric sortKey="total">
              Total
            </TableHeaderCell>
            <TableHeaderCell column="actions">
              <span className="eds-visually-hidden">Ações</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visiveis.map((p) => (
            <TableRow key={p.codigo}>
              <TableCell column="check">
                <Checkbox
                  aria-label={`Selecionar ${p.codigo}`}
                  checked={selecionados.has(p.codigo)}
                  onChange={() => alternarLinha(p.codigo)}
                />
              </TableCell>
              <TableCell>{p.codigo}</TableCell>
              <TableCell>{p.cliente}</TableCell>
              <TableCell>
                <Badge variant={p.variant}>{p.situacao}</Badge>
              </TableCell>
              <TableCell numeric>{moeda.format(p.total)}</TableCell>
              <TableCell column="actions">
                <Button variant="ghost" size="sm" iconOnly aria-label={`Editar ${p.codigo}`}>
                  <EditIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TableFooter>
        <p>
          {inicio + 1}–{inicio + visiveis.length} de {ordenados.length}
        </p>
        <Pagination page={pagina} pageCount={totalPaginas} onPageChange={irParaPagina} />
      </TableFooter>

      <div role="status" className="eds-visually-hidden">
        {aviso}
      </div>
    </div>
  );
}
