import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';

const contratos = [
  [
    'CT-2026-0001',
    'Papelaria Exemplo',
    'Materiais',
    '01/03/2026',
    '28/02/2027',
    'Equipe Modelo',
    'Vigente',
    'R$ 48.000,00',
  ],
  [
    'CT-2026-0002',
    'Transportes Modelo',
    'Serviços',
    '15/04/2026',
    '14/04/2027',
    'Equipe Fictícia',
    'A vencer',
    'R$ 120.500,00',
  ],
  [
    'CT-2026-0003',
    'Serviços Fictícios',
    'Obras',
    '02/06/2026',
    '01/06/2028',
    'Equipe Exemplo',
    'Vigente',
    'R$ 890.900,00',
  ],
];

export default function ColunaFixa() {
  return (
    <Table caption="Contratos e vigências">
      <TableHead>
        <TableRow>
          <TableHeaderCell className="eds-table-pin-start eds-table-pin-edge">
            Contrato
          </TableHeaderCell>
          <TableHeaderCell>Fornecedor</TableHeaderCell>
          <TableHeaderCell>Categoria</TableHeaderCell>
          <TableHeaderCell>Início</TableHeaderCell>
          <TableHeaderCell>Término</TableHeaderCell>
          <TableHeaderCell>Responsável</TableHeaderCell>
          <TableHeaderCell>Situação</TableHeaderCell>
          <TableHeaderCell numeric>Valor</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {contratos.map(([codigo, fornecedor, categoria, inicio, fim, resp, situacao, valor]) => (
          <TableRow key={codigo}>
            <TableHeaderCell scope="row" className="eds-table-pin-start eds-table-pin-edge">
              {codigo}
            </TableHeaderCell>
            <TableCell>{fornecedor}</TableCell>
            <TableCell>{categoria}</TableCell>
            <TableCell>{inicio}</TableCell>
            <TableCell>{fim}</TableCell>
            <TableCell>{resp}</TableCell>
            <TableCell>
              <Badge tone={situacao === 'Vigente' ? 'success' : 'warning'}>{situacao}</Badge>
            </TableCell>
            <TableCell numeric>{valor}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
