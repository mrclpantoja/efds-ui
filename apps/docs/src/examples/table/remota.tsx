import { useEffect, useState } from 'react';
import {
  Button,
  ErrorState,
  Input,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumnFilter,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  useTableQuery,
} from '@efds-ui/react';

interface Pedido {
  codigo: string;
  cliente: string;
  situacao: string;
  total: number;
}

const clientes = ['Atelier Exemplo', 'Comércio Modelo', 'Oficina Fictícia', 'Mercado Teste'];
const situacoes = ['Pago', 'Pendente', 'Atrasado'];
// "Servidor" em memória: 48 pedidos fictícios.
const base: Pedido[] = Array.from({ length: 48 }, (_, i) => ({
  codigo: `PED-${String(i + 1).padStart(4, '0')}`,
  cliente: clientes[i % clientes.length] as string,
  situacao: situacoes[i % situacoes.length] as string,
  total: Math.round((((i * 7919) % 9000) + 50) * 100) / 100,
}));

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface Resposta {
  total: number;
  linhas: Pedido[];
}

/** Simula o `fetch`: filtra, ordena e pagina como o servidor faria a partir da query string. */
function buscar(params: URLSearchParams, falhar: boolean): Promise<Resposta> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (falhar) {
        reject(new Error('Falha simulada'));
        return;
      }
      const q = (params.get('q') ?? '').toLowerCase();
      const situacao = params.getAll('filter[situacao]');
      let linhas = base.filter(
        (p) =>
          (q === '' || `${p.codigo} ${p.cliente}`.toLowerCase().includes(q)) &&
          (situacao.length === 0 || situacao.includes(p.situacao)),
      );
      const criterios = (params.get('sort') ?? '').split(',').filter(Boolean).reverse();
      for (const criterio of criterios) {
        const desc = criterio.startsWith('-');
        const chave = (desc ? criterio.slice(1) : criterio) as keyof Pedido;
        const sinal = desc ? -1 : 1;
        linhas = [...linhas].sort(
          (a, b) => (a[chave] > b[chave] ? 1 : a[chave] < b[chave] ? -1 : 0) * sinal,
        );
      }
      const tamanho = Number(params.get('size') ?? 10);
      const pagina = Number(params.get('page') ?? 1);
      resolve({
        total: linhas.length,
        linhas: linhas.slice((pagina - 1) * tamanho, pagina * tamanho),
      });
    }, 600);
  });
}

export default function Remota() {
  const consulta = useTableQuery({ initial: { size: 10 } });
  const { query, searchParams } = consulta;
  const [dados, setDados] = useState<Resposta | null>(null);
  // Última consulta respondida (com sucesso ou erro): enquanto for outra, está carregando.
  const [respondida, setRespondida] = useState<{ id: string; erro: boolean } | null>(null);
  const [falhar, setFalhar] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const id = `${searchParams.toString()}|${falhar}|${tentativa}`;
  const carregando = respondida?.id !== id;
  const erro = respondida?.id === id && respondida.erro;

  // Só a última consulta vale: respostas atrasadas de consultas antigas são descartadas.
  useEffect(() => {
    let atual = true;
    buscar(new URLSearchParams(id.split('|')[0]), falhar)
      .then((resposta) => {
        if (!atual) return;
        setDados(resposta);
        setRespondida({ id, erro: false });
      })
      .catch(() => {
        // Os dados anteriores são mantidos.
        if (atual) setRespondida({ id, erro: true });
      });
    return () => {
      atual = false;
    };
  }, [id, falhar]);

  const paginas = Math.max(1, Math.ceil((dados?.total ?? 0) / query.size));
  const linhas = dados?.linhas ?? [];

  return (
    <div className="eds-stack eds-gap-3">
      <TableToolbar>
        <Input
          type="search"
          aria-label="Buscar pedido"
          value={query.q}
          onChange={(e) => consulta.setQ(e.target.value)}
        />
        <Button variant="ghost" size="sm" onClick={() => setFalhar((f) => !f)}>
          {falhar ? 'Voltar a responder' : 'Simular falha do servidor'}
        </Button>
      </TableToolbar>
      {erro && (
        <ErrorState
          title="Não foi possível carregar os dados"
          description="Os dados anteriores foram mantidos."
          onRetry={() => setTentativa((t) => t + 1)}
          announce
        />
      )}
      <Table
        caption="Pedidos (consulta no servidor)"
        multiSort
        sort={consulta.sortState}
        onSortChange={consulta.setSortState}
        loading={carregando}
        loadingOverlay={dados !== null}
        status={
          dados ? `${dados.total} resultados. Página ${query.page} de ${paginas}.` : undefined
        }
      >
        <TableHead>
          <TableRow>
            <TableHeaderCell sortKey="codigo">Código</TableHeaderCell>
            <TableHeaderCell sortKey="cliente">Cliente</TableHeaderCell>
            <TableHeaderCell
              sortKey="situacao"
              filter={
                <TableColumnFilter
                  type="select"
                  multiple
                  label="Situação"
                  options={situacoes.map((s) => ({ value: s, label: s }))}
                  value={query.filters.situacao}
                  onValueChange={(v) => consulta.setFilter('situacao', v)}
                />
              }
            >
              Situação
            </TableHeaderCell>
            <TableHeaderCell sortKey="total" numeric>
              Total
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dados && linhas.length === 0 && (
            <TableEmpty colSpan={4}>Nenhum pedido encontrado.</TableEmpty>
          )}
          {linhas.map((p) => (
            <TableRow key={p.codigo}>
              <TableCell>{p.codigo}</TableCell>
              <TableCell>{p.cliente}</TableCell>
              <TableCell>{p.situacao}</TableCell>
              <TableCell numeric>{moeda.format(p.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableFooter>
        <span>{dados ? `${dados.total} resultados` : ''}</span>
        <Pagination
          aria-label="Paginação dos pedidos"
          page={query.page}
          pageCount={paginas}
          onPageChange={consulta.setPage}
        />
      </TableFooter>
    </div>
  );
}
