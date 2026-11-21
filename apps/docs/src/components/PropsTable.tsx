import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@efds-ui/react';

export interface PropRow {
  name: string;
  /** Tipo TypeScript, como no código-fonte. */
  type: string;
  /** Valor padrão; omitido quando não há (ou quando a prop é obrigatória). */
  default?: string;
  required?: boolean;
  description: ReactNode;
}

interface PropsTableProps {
  /** Nome acessível da tabela (ex.: "Props de Button"). */
  caption: string;
  rows: readonly PropRow[];
}

/** API React escrita à mão a partir dos tipos em `packages/react/src/components/<Nome>/`. */
export function PropsTable({ caption, rows }: PropsTableProps) {
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Prop</TableHeaderCell>
          <TableHeaderCell>Tipo</TableHeaderCell>
          <TableHeaderCell>Padrão</TableHeaderCell>
          <TableHeaderCell>Descrição</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableHeaderCell scope="row">
              <code>{row.name}</code>
              {row.required ? <span className="eds-visually-hidden"> (obrigatória)</span> : null}
            </TableHeaderCell>
            <TableCell className="eds-table-wrap-text">
              <code className="docs-code-wrap">{row.type}</code>
            </TableCell>
            <TableCell>{row.default ? <code>{row.default}</code> : '—'}</TableCell>
            <TableCell className="eds-table-wrap-text">{row.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
