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
  TableBulkBar,
  TableCell,
  TableColumnFilter,
  TableColumnsMenu,
  TableEditableCell,
  TableEmpty,
  TableExport,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableLoadingRows,
  TableRow,
  TableToolbar,
  filterTableData,
  sortTableData,
  useDialog,
  useTableColumns,
  useTableFilter,
  useToast,
  describeColumnFilter,
  type FilterTextType,
  type FilterValue,
  type TableColumnDef,
  type TableSortState,
} from '@efds-ui/react';
import { EditIcon, MoreVerticalIcon, PlusIcon, SearchIcon, TrashIcon } from '@efds-ui/icons';
import { cidades, maskDoc, moeda, situacoes, type Fornecedor, type Situacao } from '../data';
import { Shell } from '../Shell';
import { useStore } from '../store';

const PAGE_SIZE = 8;

interface Filtros {
  situacao: '' | Situacao;
  categoria: string;
  cidade: string;
}
const semFiltros: Filtros = { situacao: '', categoria: '', cidade: '' };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Colunas ajustáveis (ordem e visibilidade pelo painel "Colunas" ou pela alça do cabeçalho). A seleção e
 * as ações ficam de fora: não se movem nem se ocultam. O nome do fornecedor é fixo no início.
 */
const COLUNAS: TableColumnDef[] = [
  { id: 'razao', label: 'Fornecedor', pin: 'start' },
  { id: 'id', label: 'Código' },
  { id: 'documento', label: 'Documento' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'situacao', label: 'Situação' },
  { id: 'limite', label: 'Limite' },
];

/** Tipo dos limites de filtro por coluna (o chip mostra "R$ 50.000,00", não "50000"). */
const TIPO_FILTRO: Record<string, FilterTextType> = { limite: 'currency' };

/** Texto da coluna Fornecedor: razão social e, se houver, o nome fantasia (o que a célula mostra). */
const textoFornecedor = (f: Fornecedor) => `${f.razao} ${f.tipo !== 'pf' ? f.fantasia : ''}`.trim();

/** Valor de cada coluna para filtrar. */
const valorFiltro = (f: Fornecedor, chave: string): unknown =>
  chave === 'razao'
    ? textoFornecedor(f)
    : chave === 'cidade'
      ? f.cidadeNome
      : (f as unknown as Record<string, unknown>)[chave];

/** Valor de cada coluna para ordenar (a cidade ordena pelo nome). */
const valorOrdem = (f: Fornecedor, chave: string): unknown =>
  chave === 'cidade' ? f.cidadeNome : (f as unknown as Record<string, unknown>)[chave];

/** "R$ 7.500,00" -> 7500 (ou `null` se não for um valor). */
const lerReais = (texto: string): number | null => {
  const limpo = texto.replace(/[^\d,]/g, '').replace(',', '.');
  if (limpo === '') return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
};

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
  const { lista, remover, salvar, categorias } = useStore();
  const { confirm } = useDialog();
  const { show } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [rascunho, setRascunho] = useState<Filtros>(semFiltros);
  const [filtros, setFiltros] = useState<Filtros>(semFiltros);
  // Ordenação por colunas (Shift + clique acrescenta); filtros por coluna (popover do cabeçalho).
  const [sort, setSort] = useState<TableSortState[]>([{ column: 'razao', direction: 'ascending' }]);
  const [filtrosColuna, setFiltrosColuna] = useState<Record<string, FilterValue>>({});
  const [page, setPage] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);
  const todosRef = useRef<HTMLInputElement>(null);
  // `prefsKey`: ordem e colunas ocultas ficam neste navegador (chave estática, sem dado pessoal).
  const controle = useTableColumns(COLUNAS, { prefsKey: 'cadastro-fornecedores' });

  // A primeira carga é simulada para mostrar o estado "carregando".
  useEffect(() => {
    const timer = setTimeout(() => setCarregando(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const doBarra = useMemo(
    () =>
      lista.filter(
        (f) =>
          (!filtros.situacao || f.situacao === filtros.situacao) &&
          (!filtros.categoria || f.categoria === filtros.categoria) &&
          (!filtros.cidade || f.cidade === filtros.cidade),
      ),
    [lista, filtros],
  );
  const base = useMemo(
    () => filterTableData(doBarra, '', { filters: filtrosColuna, getValue: valorFiltro }),
    [doBarra, filtrosColuna],
  );
  const busca = useTableFilter(base, {
    getText: (f) =>
      `${f.id} ${f.razao} ${f.fantasia} ${f.documento} ${f.categoria} ${f.cidadeNome}`,
  });
  const ordenadas = useMemo(
    () => sortTableData(busca.rows, sort, { getValue: valorOrdem }),
    [busca.rows, sort],
  );

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
  const temFiltroColuna = Object.keys(filtrosColuna).length > 0;
  // Colunas visíveis + seleção + ações (o `colSpan` do estado vazio e dos esqueletos).
  const totalColunas = controle.columns.length + 2;

  // A seleção vale só para as linhas desta página (a barra de lote conta as marcadas na tabela):
  // quando as linhas da página mudam, saem da seleção as que deixaram de aparecer.
  const idsDaPagina = linhas.map((f) => f.id).join('|');
  const [idsAnteriores, setIdsAnteriores] = useState(idsDaPagina);
  if (idsAnteriores !== idsDaPagina) {
    setIdsAnteriores(idsDaPagina);
    const visiveis = new Set(idsDaPagina.split('|'));
    setSelecionados((prev) => new Set([...prev].filter((id) => visiveis.has(id))));
  }

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
    setFiltrosColuna({});
    busca.setQuery('');
    voltarAoInicio();
  };
  const remover1 = (chave: keyof Filtros) => {
    setRascunho((d) => ({ ...d, [chave]: '' }));
    setFiltros((f) => ({ ...f, [chave]: '' }));
    voltarAoInicio();
  };

  /** Aplica (ou, com `null`, remove) o filtro de uma coluna e anuncia o total. */
  const definirFiltroColuna = (chave: string, valor: FilterValue | null) => {
    const proximo = { ...filtrosColuna };
    if (valor === null) delete proximo[chave];
    else proximo[chave] = valor;
    setFiltrosColuna(proximo);
    voltarAoInicio();
    const n = filterTableData(doBarra, busca.query, {
      filters: proximo,
      getValue: valorFiltro,
      getText: (f) =>
        `${f.id} ${f.razao} ${f.fantasia} ${f.documento} ${f.categoria} ${f.cidadeNome}`,
    }).length;
    setAviso(
      n === 0 ? 'Nenhum fornecedor com esses filtros.' : `${plural(n, 'resultado', 'resultados')}.`,
    );
  };
  const filtroDaColuna = (chave: string) => ({
    value: filtrosColuna[chave],
    onValueChange: (valor: FilterValue | null) => definirFiltroColuna(chave, valor),
  });
  const rotuloFiltro = (chave: string, valor: FilterValue): string => {
    const nome = COLUNAS.find((c) => c.id === chave)?.label ?? chave;
    return `${nome}: ${describeColumnFilter(valor, { type: TIPO_FILTRO[chave] })}`;
  };
  const chipsColuna = Object.entries(filtrosColuna).map(([chave, valor]) => ({
    chave,
    rotulo: rotuloFiltro(chave, valor),
  }));
  const removerChipColuna = (chave: string) => {
    definirFiltroColuna(chave, null);
    // O chip some: o foco vai ao botão de filtro da coluna.
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`th[data-eds-col="${chave}"] .eds-table-filter-btn`)
        ?.focus(),
    );
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
      tone: 'success',
      message: um
        ? `Fornecedor ${alvos[0]?.razao} excluído (simulação).`
        : `${ids.length} fornecedores excluídos (simulação).`,
    });
    buscaRef.current?.focus();
  };

  /** Ação em lote com confirmação: os fornecedores marcados passam a inativos. */
  const inativar = async (alvos: Fornecedor[]) => {
    const ok = await confirm(
      'Inativar os fornecedores selecionados? Eles deixam de aparecer como ativos.',
      'Inativar fornecedores',
      'warning',
      { okText: 'Inativar' },
    );
    if (!ok) return;
    const mudaram = alvos.filter((f) => f.situacao !== 'inativo');
    mudaram.forEach((f) =>
      salvar({ ...f, situacao: 'inativo', motivo: 'Inativado em lote (simulação).' }),
    );
    setSelecionados(new Set());
    const texto = plural(mudaram.length, 'fornecedor inativado', 'fornecedores inativados');
    setAviso(`${texto}.`);
    show({ tone: 'success', message: `${texto} (simulação).` });
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
  const mascarar = (data: ExportData): ExportData => ({
    ...data,
    rows: data.rows.map((row) => ({ ...row, documento: maskDoc(String(row.documento ?? '')) })),
  });

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

  /** Cabeçalho de cada coluna ajustável (ordenação, filtro e alça vêm do `columnId`). */
  const cabecalho = (id: string) => {
    switch (id) {
      case 'id':
        return (
          <TableHeaderCell key={id} columnId={id} sortKey="id">
            Código
          </TableHeaderCell>
        );
      case 'razao':
        return (
          <TableHeaderCell
            key={id}
            columnId={id}
            sortKey="razao"
            filter={
              <TableColumnFilter type="text" label="Fornecedor" {...filtroDaColuna('razao')} />
            }
          >
            Fornecedor
          </TableHeaderCell>
        );
      case 'documento':
        return (
          <TableHeaderCell key={id} columnId={id}>
            Documento
          </TableHeaderCell>
        );
      case 'categoria':
        return (
          <TableHeaderCell
            key={id}
            columnId={id}
            sortKey="categoria"
            filter={
              <TableColumnFilter
                type="select"
                multiple
                label="Categoria"
                options={categorias.map((c) => ({ value: c.description, label: c.description }))}
                {...filtroDaColuna('categoria')}
              />
            }
          >
            Categoria
          </TableHeaderCell>
        );
      case 'cidade':
        return (
          <TableHeaderCell key={id} columnId={id} sortKey="cidade">
            Cidade
          </TableHeaderCell>
        );
      case 'situacao':
        return (
          <TableHeaderCell key={id} columnId={id}>
            Situação
          </TableHeaderCell>
        );
      default:
        return (
          <TableHeaderCell
            key={id}
            columnId={id}
            sortKey="limite"
            numeric
            filter={
              <TableColumnFilter type="number" label="Limite" {...filtroDaColuna('limite')} />
            }
          >
            Limite
          </TableHeaderCell>
        );
    }
  };

  /** Célula de cada coluna ajustável. */
  const celula = (f: Fornecedor, id: string) => {
    switch (id) {
      case 'id':
        return (
          <TableCell key={id} columnId={id}>
            {f.id}
          </TableCell>
        );
      case 'razao':
        return (
          <TableHeaderCell key={id} scope="row" pin="start" className="eds-table-pin-edge">
            <a href={`#/fornecedor/${f.id}`}>{f.razao}</a>
            {f.tipo !== 'pf' && f.fantasia ? <span className="cad-sub">{f.fantasia}</span> : null}
          </TableHeaderCell>
        );
      case 'documento':
        return (
          <TableCell key={id} columnId={id}>
            {f.documento}
          </TableCell>
        );
      case 'categoria':
        return (
          <TableCell key={id} columnId={id}>
            {f.categoria}
          </TableCell>
        );
      case 'cidade':
        return (
          <TableCell key={id} columnId={id}>
            {f.cidadeNome}/{f.uf}
          </TableCell>
        );
      case 'situacao':
        return (
          <TableCell key={id} columnId={id}>
            <Badge tone={situacoes[f.situacao].badge}>{situacoes[f.situacao].label}</Badge>
          </TableCell>
        );
      default:
        // Edição na célula: o servidor é simulado (400 ms; recusa acima de R$ 1.000.000).
        return (
          <TableEditableCell
            key={id}
            numeric
            required
            field="limite"
            columnLabel="Limite"
            rowLabel={f.id}
            value={moeda.format(f.limite)}
            editor={<Input mask="moeda" size="sm" inputMode="decimal" autoComplete="off" />}
            validate={(v) => (lerReais(v) === null ? 'Informe um valor em reais.' : '')}
            onCommit={async (v) => {
              const valor = lerReais(v);
              await new Promise((resolve) => setTimeout(resolve, 400));
              if (valor === null) throw new Error('Informe um valor em reais.');
              if (valor > 1_000_000) throw new Error('O limite máximo é de R$ 1.000.000,00.');
              salvar({ ...f, limite: valor });
            }}
          />
        );
    }
  };

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
                <option key={c.code}>{c.description}</option>
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
            <TableColumnsMenu controller={controle} />
            <TableExport
              size="sm"
              formats={['csv', 'xlsx', 'pdf']}
              filename="fornecedores"
              title="Fornecedores"
              subtitle="Dados fictícios. CNPJ e CPF mascarados."
              getData={dadosExportacao}
              onBeforeExport={mascarar}
            />
          </div>
        </TableToolbar>

        {chipsColuna.length > 0 ? (
          <ul className="eds-filter-chips" aria-label="Filtros das colunas">
            {chipsColuna.map((chip) => (
              <li key={chip.chave}>
                <button
                  type="button"
                  className="eds-chip"
                  onClick={() => removerChipColuna(chip.chave)}
                >
                  {chip.rotulo}
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                  <span className="eds-visually-hidden"> — remover</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <Table
          caption="Lista de fornecedores"
          multiSort
          sortMax={3}
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            setPage(1);
            setAviso('');
          }}
          columnsController={controle}
          reorderable
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
              {controle.columns.map((c) => cabecalho(c.id))}
              <TableHeaderCell column="actions">
                <span className="eds-visually-hidden">Ações</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carregando ? (
              <TableLoadingRows columns={totalColunas} rows={5} />
            ) : linhas.length === 0 ? (
              <TableEmpty colSpan={totalColunas}>
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
                          {temFiltros || temFiltroColuna
                            ? 'Limpar busca e filtros'
                            : 'Limpar busca'}
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
                  {controle.columns.map((c) => celula(f, c.id))}
                  <TableCell column="actions">
                    <RowActions fornecedor={f} onDelete={(alvo) => void excluir([alvo])} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <p className="eds-helper">
          Dica: Shift + clique (ou Shift + Enter) no título de uma coluna ordena por mais de uma
          coluna.
        </p>

        <TableBulkBar
          count={selecionados.size}
          returnFocusTo={todosRef}
          onClear={() => {
            setAviso('Seleção desfeita.');
            setSelecionados(new Set());
          }}
        >
          <TableExport
            size="sm"
            formats={['xlsx', 'csv']}
            filename="fornecedores-selecionados"
            title="Fornecedores selecionados"
            subtitle="Dados fictícios. CNPJ e CPF mascarados."
            texts={{ label: 'Exportar selecionados' }}
            getData={dadosExportacao}
            onBeforeExport={mascarar}
          />
          <Button size="sm" onClick={() => void inativar(selecionadosLista)}>
            Inativar
          </Button>
          <Button size="sm" variant="danger" onClick={() => void excluir(selecionadosLista)}>
            Excluir
          </Button>
        </TableBulkBar>

        <TableFooter>
          <p>{carregando ? '' : contagem}</p>
          {paginas > 1 && !carregando ? (
            <Pagination
              page={atual}
              pageCount={paginas}
              onPageChange={(n) => {
                setPage(n);
                setSelecionados(new Set());
                setAviso(`Página ${n} de ${paginas}.`);
              }}
            />
          ) : null}
        </TableFooter>
      </section>
    </Shell>
  );
}
