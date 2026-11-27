import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableEditableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';

interface Pedido {
  codigo: string;
  cliente: string;
  total: string;
  obs: string;
}

const inicial: Pedido[] = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo', total: '1280.50', obs: 'Entrega na loja' },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo', total: '459.00', obs: 'Aguardando pagamento' },
  { codigo: 'PED-0003', cliente: 'Oficina Fictícia', total: '8920.90', obs: 'Contato feito' },
];

const moeda = (valor: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));

const numero = (texto: string) => Number(texto.replace(',', '.'));

/** Simula o servidor: recusa valores acima de R$ 10.000,00. */
const salvar = (valor: string) =>
  new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (numero(valor) > 10000) reject(new Error('Valor acima do limite de R$ 10.000,00.'));
      else resolve();
    }, 500);
  });

export default function Edicao() {
  const [linhas, setLinhas] = useState(inicial);
  const atualizar = (codigo: string, campo: keyof Pedido, valor: string) =>
    setLinhas((atual) => atual.map((l) => (l.codigo === codigo ? { ...l, [campo]: valor } : l)));

  return (
    <Table caption="Pedidos com edição na célula">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell>Cliente</TableHeaderCell>
          <TableHeaderCell numeric>Total</TableHeaderCell>
          <TableHeaderCell>Observação</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {linhas.map((l) => (
          <TableRow key={l.codigo}>
            <TableCell>{l.codigo}</TableCell>
            <TableCell>{l.cliente}</TableCell>
            <TableEditableCell
              numeric
              field="total"
              type="number"
              required
              value={l.total}
              format={moeda}
              columnLabel="Total"
              rowLabel={l.codigo}
              validate={(v) => (Number.isNaN(numero(v)) ? 'Informe um valor numérico.' : '')}
              onCommit={async (valor) => {
                await salvar(valor);
                atualizar(l.codigo, 'total', String(numero(valor)));
              }}
            />
            <TableEditableCell
              field="obs"
              value={l.obs}
              columnLabel="Observação"
              rowLabel={l.codigo}
              onCommit={(valor) => atualizar(l.codigo, 'obs', valor)}
            />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
