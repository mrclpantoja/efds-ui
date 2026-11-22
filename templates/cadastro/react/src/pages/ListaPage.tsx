import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExportData } from '@efds-ui/behavior/export';
import {
  Badge,
  Button,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableExport,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableLoadingRows,
  TableRow,
  TableToolbar,
  sortTableData,
  useDialog,
  useTableFilter,
  useToast,
  type TableSortState,
} from '@efds-ui/react';
import { EditIcon, MoreVerticalIcon, PlusIcon, SearchIcon, TrashIcon } from '@efds-ui/icons';
import {
  categorias,
  cidades,
  maskDoc,
  moeda,
  situacoes,
  type Fornecedor,
  type Situacao,
} from '../data';
import { Shell } from '../Shell';
import { useStore } from '../store';

const PAGE_SIZE = 8;
const COLS = 9;

interface Filtros {
  situacao: '' | Situacao;
  categoria: string;
  cidade: string;
}
const semFiltros: Filtros = { situacao: '', categoria: '', cidade: '' };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Menu de ações da linha: Dropdown em padrão disclosure (Popover API). */
function RowActions({
  fornecedor,
  onDelete,
}: {
  fornecedor: Fornecedor;
  onDelete: (f: Fornecedor) => void;
}) {
  return (
    <Dropdown
      trigger={
        <Button variant="ghost" size="sm" iconOnly aria-label={`Ações de ${fornecedor.razao}`}>
          <MoreVerticalIcon />
        </Button>
      }
    >
      <DropdownItem href={`#/fornecedor/${fornecedor.id}`}>Ver detalhes</DropdownItem>
      <DropdownItem href={`#/editar/${fornecedor.id}`}>
        <EditIcon />
        Editar
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem variant="danger" onClick={() => onDelete(fornecedor)}>
        <TrashIcon />
        Excluir
      </DropdownItem>
    </Dropdown>
  );
}

export function ListaPage() {
  const { lista, remover } = useStore();
  const { confirm } = useDialog();
  const { show } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [rascunho, setRascunho] = useState<Filtros>(semFiltros);
  const [filtros, setFiltros] = useState<Filtros>(semFiltros);
  const [sort, setSort] = useState<TableSortState>({ column: 'razao', direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);
  const todosRef = useRef<HTMLInputElement>(null);

  // A primeira carga é simulada para mostrar o estado "carregando".
  useEffect(() => {
    const timer = setTimeout(() => setCarregando(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const base = useMemo(
    () =>
      lista.filter(
        (f) =>
          (!filtros.situacao || f.situacao === filtros.situacao) &&
          (!filtros.categoria || f.categoria === filtros.categoria) &&
          (!filtros.cidade || f.cidade === filtros.cidade),
      ),
    [lista, filtros],
  );
  const busca = useTableFilter(base, {
    getText: (f) =>
      `${f.id} ${f.razao} ${f.fantasia} ${f.documento} ${f.categoria} ${f.cidadeNome}`,
  });
  const ordenadas = useMemo(() => sortTableData(busca.rows, sort), [busca.rows, sort]);

  const paginas = Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE));
  const atual = Math.min(page, paginas);
  const inicio = (atual - 1) * PAGE_SIZE;
  const linhas = ordenadas.slice(inicio, inicio + PAGE_SIZE);
  const marcadasNaPagina = linhas.filter((f) => selecionados.has(f.id)).length;
  const todasNaPagina = linhas.length > 0 && marcadasNaPagina === linhas.length;
  const contagem =
    ordenadas.length === 0
      ? 'Nenhum fornecedor encontrado.'
      : `Mostrando ${inicio + 1}–${inicio + linhas.length} de ${plural(ordenadas.length, 'fornecedor', 'fornecedores')}.`;
  const temFiltros = filtros.situacao !== '' || filtros.categoria !== '' || filtros.cidade !== '';

  const voltarAoInicio = () => {
    setPage(1);
    setSelecionados(new Set());
  };

  const aplicar = () => {
    setFiltros(rascunho);
    voltarAoInicio();
  };
  const limparFiltros = () => {
    setRascunho(semFiltros);
    setFiltros(semFiltros);
    busca.setQuery('');
    voltarAoInicio();
  };
  const remover1 = (chave: keyof Filtros) => {
    setRascunho((d) => ({ ...d, [chave]: '' }));
    setFiltros((f) => ({ ...f, [chave]: '' }));
    voltarAoInicio();
  };

  const alternar = (id: string) => {
    setAviso('');
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const alternarPagina = () => {
    setAviso('');
    setSelecionados((prev) => {
      const next = new Set(prev);
      linhas.forEach((f) => (todasNaPagina ? next.delete(f.id) : next.add(f.id)));
      return next;
    });
  };

  const excluir = async (alvos: Fornecedor[]) => {
    const um = alvos.length === 1;
    const ok = await confirm(
      um
        ? `Excluir o fornecedor ${alvos[0]?.razao}? Esta ação não pode ser desfeita.`
        : `Excluir ${alvos.length} fornecedores? Esta ação não pode ser desfeita.`,
      um ? 'Excluir fornecedor' : 'Excluir fornecedores',
      'danger',
      { okText: 'Excluir' },
    );
    if (!ok) return;
    const ids = alvos.map((f) => f.id);
    remover(ids);
    setSelecionados((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    setAviso(`${plural(ids.length, 'fornecedor excluído', 'fornecedores excluídos')}.`);
    show({
      variant: 'success',
      message: um
        ? `Fornecedor ${alvos[0]?.razao} excluído (simulação).`
        : `${ids.length} fornecedores excluídos (simulação).`,
    });
    buscaRef.current?.focus();
  };

  // Arquivo com todas as linhas da busca (ou as selecionadas); o CNPJ/CPF é mascarado antes de sair.
  const dadosExportacao = (): ExportData => {
    const fonte =
      selecionados.size > 0 ? ordenadas.filter((f) => selecionados.has(f.id)) : ordenadas;
    return {
      columns: [
        { key: 'id', label: 'Código' },
        { key: 'razao', label: 'Fornecedor' },
        { key: 'documento', label: 'Documento' },
        { key: 'categoria', label: 'Categoria' },
        { key: 'cidade', label: 'Cidade' },
        { key: 'situacao', label: 'Situação' },
        { key: 'limite', label: 'Limite', type: 'currency' },
      ],
      rows: fonte.map((f) => ({
        id: f.id,
        razao: f.razao,
        documento: f.documento,
        categoria: f.categoria,
        cidade: `${f.cidadeNome}/${f.uf}`,
        situacao: situacoes[f.situacao].label,
        limite: f.limite,
      })),
    };
  };

  const chips = [
    ...(filtros.situacao
      ? [
          {
            key: 'situacao',
            label: `Situação: ${situacoes[filtros.situacao].label}`,
            onRemove: () => remover1('situacao'),
          },
        ]
      : []),
    ...(filtros.categoria
      ? [
          {
            key: 'categoria',
            label: `Categoria: ${filtros.categoria}`,
            onRemove: () => remover1('categoria'),
          },
        ]
      : []),
    ...(filtros.cidade
      ? [
          {
            key: 'cidade',
            label: `Cidade: ${cidades.find((c) => c.value === filtros.cidade)?.label ?? ''}`,
            onRemove: () => remover1('cidade'),
          },
        ]
      : []),
  ];

  const selecionadosLista = lista.filter((f) => selecionados.has(f.id));

  return (
    <Shell
      current="lista"
      title="Fornecedores"
      description="Cadastro de fornecedores. Dados fictícios em memória: as alterações somem ao recarregar."
      breadcrumb={[{ label: 'Início', href: '#/' }, { label: 'Fornecedores' }]}
      width="xl"
      actions={
        <Button variant="primary" href="#/novo">
          <PlusIcon />
          Novo fornecedor
        </Button>
      }
    >
      <section aria-labelledby="lst-t">
        <h2 id="lst-t" className="eds-visually-hidden">
          Lista de fornecedores
        </h2>
        <FilterBar
          aria-label="Filtrar fornecedores"
          active={chips}
          onSubmit={aplicar}
          onClear={limparFiltros}
        >
          <Field label="Situação">
            <Select
              value={rascunho.situacao}
              onChange={(e) =>
                setRascunho((d) => ({ ...d, situacao: e.target.value as Filtros['situacao'] }))
              }
            >
              <option value="">Todas</option>
              {(Object.keys(situacoes) as Situacao[]).map((s) => (
                <option key={s} value={s}>
                  {situacoes[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoria">
            <Select
              value={rascunho.categoria}
              onChange={(e) => setRascunho((d) => ({ ...d, categoria: e.target.value }))}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cidade">
            <Select
              value={rascunho.cidade}
              onChange={(e) => setRascunho((d) => ({ ...d, cidade: e.target.value }))}
            >
              <option value="">Todas</option>
              {cidades.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}/{c.uf}
                </option>
              ))}
            </Select>
          </Field>
        </FilterBar>

        <TableToolbar>
          <Input
            ref={buscaRef}
            type="search"
            size="sm"
            className="cad-search"
            placeholder="Buscar por nome, código ou documento"
            aria-label="Buscar na lista"
            autoComplete="off"
            {...busca.inputProps}
            onChange={(e) => {
              setAviso('');
              setPage(1);
              setSelecionados(new Set());
              busca.inputProps.onChange(e);
            }}
          />
          <div className="cad-table-tools">
            {selecionados.size > 0 ? (
              <>
                <span className="eds-text-label">
                  {plural(selecionados.size, 'selecionado', 'selecionados')}
                </span>
                <Button size="sm" onClick={() => void excluir(selecionadosLista)}>
                  <TrashIcon />
                  Excluir selecionados
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAviso('Seleção desfeita.');
                    setSelecionados(new Set());
                    todosRef.current?.focus();
                  }}
                >
                  Limpar seleção
                </Button>
              </>
            ) : null}
            <TableExport
              size="sm"
              formats={['csv', 'xlsx', 'pdf']}
              filename="fornecedores"
              title="Fornecedores"
              subtitle="Dados fictícios. CNPJ e CPF mascarados."
              getData={dadosExportacao}
              onBeforeExport={(data) => ({
                ...data,
                rows: data.rows.map((row) => ({
                  ...row,
                  documento: maskDoc(String(row.documento ?? '')),
                })),
              })}
            />
          </div>
        </TableToolbar>

        <Table
          caption="Lista de fornecedores"
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            setPage(1);
            setAviso('');
          }}
          loading={carregando}
          status={aviso || busca.status}
        >
          <TableHead>
            <TableRow>
              <TableHeaderCell column="check">
                <Checkbox
                  ref={todosRef}
                  aria-label="Selecionar todos desta página"
                  checked={todasNaPagina}
                  indeterminate={marcadasNaPagina > 0 && !todasNaPagina}
                  disabled={linhas.length === 0}
                  onChange={alternarPagina}
                />
              </TableHeaderCell>
              <TableHeaderCell sortKey="id">Código</TableHeaderCell>
              <TableHeaderCell sortKey="razao">Fornecedor</TableHeaderCell>
              <TableHeaderCell>Documento</TableHeaderCell>
              <TableHeaderCell sortKey="categoria">Categoria</TableHeaderCell>
              <TableHeaderCell sortKey="cidadeNome">Cidade</TableHeaderCell>
              <TableHeaderCell>Situação</TableHeaderCell>
              <TableHeaderCell sortKey="limite" numeric>
                Limite
              </TableHeaderCell>
              <TableHeaderCell column="actions">
                <span className="eds-visually-hidden">Ações</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carregando ? (
              <TableLoadingRows columns={COLS} rows={5} numeric={[7]} />
            ) : linhas.length === 0 ? (
              <TableEmpty colSpan={COLS}>
                <EmptyState
                  icon={<SearchIcon />}
                  headingLevel={3}
                  title={
                    lista.length === 0
                      ? 'Nenhum fornecedor cadastrado'
                      : 'Nenhum fornecedor encontrado'
                  }
                  description={
                    lista.length === 0
                      ? 'Ainda não há fornecedores. Cadastre o primeiro.'
                      : 'Nada corresponde à busca ou aos filtros aplicados. Revise o termo ou limpe os filtros.'
                  }
                  actions={
                    <>
                      <Button variant="primary" size="sm" href="#/novo">
                        Novo fornecedor
                      </Button>
                      {lista.length > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            limparFiltros();
                            buscaRef.current?.focus();
                          }}
                        >
                          {temFiltros ? 'Limpar busca e filtros' : 'Limpar busca'}
                        </Button>
                      ) : null}
                    </>
                  }
                />
              </TableEmpty>
            ) : (
              linhas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell column="check">
                    <Checkbox
                      aria-label={`Selecionar ${f.razao}`}
                      checked={selecionados.has(f.id)}
                      onChange={() => alternar(f.id)}
                    />
                  </TableCell>
                  <TableCell>{f.id}</TableCell>
                  <TableHeaderCell scope="row">
                    <a href={`#/fornecedor/${f.id}`}>{f.razao}</a>
                    {f.tipo === 'pj' && f.fantasia ? (
                      <span className="cad-sub">{f.fantasia}</span>
                    ) : null}
                  </TableHeaderCell>
                  <TableCell>{f.documento}</TableCell>
                  <TableCell>{f.categoria}</TableCell>
                  <TableCell>
                    {f.cidadeNome}/{f.uf}
                  </TableCell>
                  <TableCell>
                    <Badge variant={situacoes[f.situacao].badge}>
                      {situacoes[f.situacao].label}
                    </Badge>
                  </TableCell>
                  <TableCell numeric>{moeda.format(f.limite)}</TableCell>
                  <TableCell column="actions">
                    <RowActions fornecedor={f} onDelete={(alvo) => void excluir([alvo])} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TableFooter>
          <p>{carregando ? '' : contagem}</p>
          {paginas > 1 && !carregando ? (
            <Pagination
              page={atual}
              pageCount={paginas}
              onPageChange={(n) => {
                setPage(n);
                setAviso(`Página ${n} de ${paginas}.`);
              }}
            />
          ) : null}
        </TableFooter>
      </section>
    </Shell>
  );
}
