import { useMemo, useState } from 'react';
import {
  Switch,
  Table,
  TableBody,
  TableCell,
  TableExport,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  type ExportData,
} from '@efds-ui/react';

interface Pedido {
  codigo: string;
  cliente: string;
  cpf: string;
  entrega: string;
  total: number;
}

const pedidos: Pedido[] = [
  {
    codigo: 'PED-0001',
    cliente: 'Atelier Exemplo',
    cpf: '000.000.000-00',
    entrega: '2026-11-24',
    total: 1280.5,
  },
  {
    codigo: 'PED-0002',
    cliente: 'Comércio Modelo',
    cpf: '000.000.000-01',
    entrega: '2026-11-25',
    total: 459,
  },
  {
    codigo: 'PED-0003',
    cliente: 'Oficina Fictícia',
    cpf: '000.000.000-02',
    entrega: '2026-11-30',
    total: 8920.9,
  },
];

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (iso: string) => iso.split('-').reverse().join('/');

/** Fica só com os dois últimos dígitos: ***.***.***-02. */
const mascarar = (cpf: string) => `***.***.***-${cpf.slice(-2)}`;

export default function Exportar() {
  const [soGrandes, setSoGrandes] = useState(false);
  const visiveis = useMemo(() => pedidos.filter((p) => !soGrandes || p.total >= 1000), [soGrandes]);

  // A fonte é o estado do React: o arquivo leva o que a tela mostra agora.
  const dados = (): ExportData => ({
    columns: [
      { key: 'codigo', label: 'Código' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'cpf', label: 'CPF do responsável' },
      { key: 'entrega', label: 'Entrega', type: 'date' },
      { key: 'total', label: 'Total', type: 'currency' },
    ],
    rows: visiveis.map((p) => ({ ...p })),
  });

  return (
    <div>
      <TableToolbar>
        <Switch checked={soGrandes} onChange={(e) => setSoGrandes(e.target.checked)}>
          Só pedidos a partir de R$ 1.000
        </Switch>
        <TableExport
          size="sm"
          getData={dados}
          filename="pedidos"
          title="Pedidos de novembro"
          subtitle="Dados fictícios"
          // LGPD: o CPF só sai mascarado, mesmo que a tela o mostre inteiro.
          onBeforeExport={(d) => ({
            ...d,
            rows: d.rows.map((r) => ({ ...r, cpf: mascarar(String(r.cpf)) })),
          })}
        />
      </TableToolbar>

      <Table caption="Pedidos de novembro, com exportação">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Código</TableHeaderCell>
            <TableHeaderCell>Cliente</TableHeaderCell>
            <TableHeaderCell>CPF do responsável</TableHeaderCell>
            <TableHeaderCell>Entrega</TableHeaderCell>
            <TableHeaderCell numeric>Total</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visiveis.map((p) => (
            <TableRow key={p.codigo}>
              <TableCell>{p.codigo}</TableCell>
              <TableCell>{p.cliente}</TableCell>
              <TableCell>{p.cpf}</TableCell>
              <TableCell>{data(p.entrega)}</TableCell>
              <TableCell numeric>{moeda.format(p.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
