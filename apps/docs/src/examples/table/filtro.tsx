import { useEffect, useId, useMemo, useState } from 'react';
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

/** Minúsculas e sem acento: "CLINICA" encontra "Clínica". */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export default function Filtro() {
  const id = useId();
  const [consulta, setConsulta] = useState('');
  const [aviso, setAviso] = useState('');

  const agulha = normalizar(consulta.trim());
  const visiveis = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          agulha === '' ||
          normalizar(`${p.codigo} ${p.cliente} ${p.cidade} ${moeda.format(p.total)}`).includes(
            agulha,
          ),
      ),
    [agulha],
  );

  // Anuncia só depois de uma pausa na digitação, nunca a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (agulha === '') setAviso('');
      else if (visiveis.length === 0) setAviso('Nenhum resultado.');
      else setAviso(visiveis.length === 1 ? '1 resultado.' : `${visiveis.length} resultados.`);
    }, 150);
    return () => clearTimeout(timer);
  }, [agulha, visiveis.length]);

  return (
    <div>
      <TableToolbar>
        <Input
          type="search"
          size="sm"
          placeholder="Buscar pedido"
          aria-label="Buscar pedido"
          aria-controls={id}
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && consulta !== '') {
              event.preventDefault();
              setConsulta('');
            }
          }}
        />
      </TableToolbar>

      <Table id={id} caption="Pedidos, com busca local">
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

      <div role="status" className="eds-visually-hidden">
        {aviso}
      </div>
    </div>
  );
}
