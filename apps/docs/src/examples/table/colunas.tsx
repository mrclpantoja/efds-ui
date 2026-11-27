import {
  Table,
  TableBody,
  TableCell,
  TableColumnsMenu,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  useTableColumns,
  type TableColumnDef,
} from '@efds-ui/react';

const colunas: TableColumnDef[] = [
  { id: 'codigo', label: 'Código', pin: 'start', defaultWidth: 120 },
  { id: 'cliente', label: 'Cliente', defaultWidth: 220 },
  { id: 'situacao', label: 'Situação', defaultWidth: 140 },
  { id: 'total', label: 'Total', defaultWidth: 140 },
  { id: 'data', label: 'Data', defaultWidth: 130 },
  { id: 'obs', label: 'Observação', defaultWidth: 200, defaultHidden: true },
];

const pedidos = [
  {
    codigo: 'PED-0001',
    cliente: 'Atelier Exemplo',
    situacao: 'Pago',
    total: 'R$ 1.280,50',
    data: '15/03/2026',
    obs: 'Entrega na loja',
  },
  {
    codigo: 'PED-0002',
    cliente: 'Comércio Modelo',
    situacao: 'Pendente',
    total: 'R$ 459,00',
    data: '02/02/2026',
    obs: 'Aguardando pagamento',
  },
  {
    codigo: 'PED-0003',
    cliente: 'Oficina Fictícia',
    situacao: 'Atrasado',
    total: 'R$ 8.920,90',
    data: '20/11/2025',
    obs: 'Contato feito',
  },
] as const;

export default function Colunas() {
  // `prefsKey` guarda ordem, colunas ocultas e larguras neste navegador (chave estática, sem dado pessoal).
  const controle = useTableColumns(colunas, { prefsKey: 'exemplo-pedidos' });

  return (
    <div className="eds-stack eds-gap-3">
      <TableToolbar>
        <span>Pedidos recentes</span>
        <TableColumnsMenu controller={controle} resizable />
      </TableToolbar>
      <Table
        caption="Pedidos com colunas ajustáveis"
        columnsController={controle}
        reorderable
        resizable
      >
        <TableHead>
          <TableRow>
            {controle.columns.map((c) => (
              <TableHeaderCell key={c.id} columnId={c.id}>
                {c.label}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pedidos.map((p) => (
            <TableRow key={p.codigo}>
              {controle.columns.map((c) => (
                <TableCell key={c.id} columnId={c.id}>
                  {p[c.id as keyof typeof p]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
