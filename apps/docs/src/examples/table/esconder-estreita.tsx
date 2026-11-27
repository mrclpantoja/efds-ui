import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';

const clientes = [
  { codigo: '10', nome: 'Atelier Exemplo', cidade: 'Pelotas', situacao: 'Ativo' },
  { codigo: '11', nome: 'Comércio Modelo', cidade: 'Rio Grande', situacao: 'Pendente' },
];

/* A classe vai na célula (className); o wrap vira contêiner sozinho quando há uma coluna assim. */
export default function EsconderEstreita() {
  return (
    <Table caption="Clientes" className="eds-table-fit">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell>Nome</TableHeaderCell>
          <TableHeaderCell className="eds-table-hide-narrow">Cidade</TableHeaderCell>
          <TableHeaderCell className="eds-table-hide-narrow">Situação</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {clientes.map((c) => (
          <TableRow key={c.codigo}>
            <TableCell>{c.codigo}</TableCell>
            <TableCell>{c.nome}</TableCell>
            <TableCell className="eds-table-hide-narrow">{c.cidade}</TableCell>
            <TableCell className="eds-table-hide-narrow">
              <Badge tone={c.situacao === 'Ativo' ? 'success' : 'warning'}>{c.situacao}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
