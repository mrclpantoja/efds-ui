import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@efds-ui/react';

export interface ClassRow {
  /** Classe do core (`.eds-button-primary`) ou atributo de estado (`[aria-busy="true"]`). */
  name: string;
  effect: ReactNode;
}

interface ClassTableProps {
  caption: string;
  rows: readonly ClassRow[];
  /** Cabeçalhos das duas colunas. Padrão: "Classe ou atributo" e "Efeito". */
  headers?: readonly [string, string];
}

/** Classes e atributos de estado do core e o efeito de cada um. Fonte: `packages/core/src/components/<nome>.css`. */
export function ClassTable({
  caption,
  rows,
  headers = ['Classe ou atributo', 'Efeito'],
}: ClassTableProps) {
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{headers[0]}</TableHeaderCell>
          <TableHeaderCell>{headers[1]}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableHeaderCell scope="row">
              <code>{row.name}</code>
            </TableHeaderCell>
            <TableCell className="eds-table-wrap-text">{row.effect}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
