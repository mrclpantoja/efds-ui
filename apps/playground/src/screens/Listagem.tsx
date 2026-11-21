import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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
  MultiSelect,
  Input,
  Modal,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  ToastProvider,
  useToast,
} from '@efds-ui/react';
import {
  CopyIcon,
  DownloadIcon,
  EditIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '@efds-ui/icons';
import {
  clientes,
  formatarData,
  moeda,
  segmentos,
  situacoes,
  type Cliente,
  type Situacao,
} from './data';
import { ReferenceShell } from './ReferenceShell';

const PAGE_SIZE = 10;
const COLS = 8;

type SortKey = 'id' | 'nome' | 'segmento' | 'ultimoPedido' | 'total';
type SortDir = 'ascending' | 'descending';

/** Colunas por prioridade: identificação, depois situação e valor, depois o resto. */
const colunas: { key: SortKey | 'situacao'; label: string }[] = [
  { key: 'id', label: 'Código' },
  { key: 'nome', label: 'Cliente' },
  { key: 'situacao', label: 'Situação' },
  { key: 'total', label: 'Total comprado' },
  { key: 'segmento', label: 'Segmento' },
  { key: 'ultimoPedido', label: 'Último pedido' },
];

/** O que mudou por último: decide o texto da única região de status da tabela. */
type Acao = 'nenhuma' | 'ordem' | 'busca' | 'pagina' | 'selecao';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

interface Filtros {
  situacoes: Situacao[];
  segmento: string;
}

const semFiltros: Filtros = { situacoes: [], segmento: '' };

/** Busca sem acento e sem caixa. */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Menu de ações da linha: Dropdown em padrão disclosure (Popover API). */
function RowActions({
  cliente,
  onDuplicate,
  onDelete,
}: {
  cliente: Cliente;
  onDuplicate: (cliente: Cliente) => void;
  onDelete: (cliente: Cliente) => void;
}) {
  return (
    <Dropdown
      trigger={
        <Button variant="ghost" size="sm" iconOnly aria-label={`Ações de ${cliente.nome}`}>
          <MoreVerticalIcon />
        </Button>
      }
    >
      <DropdownItem href="#/formulario">
        <EditIcon />
        Editar
      </DropdownItem>
      {/* O item fecha o menu antes do onClick: o foco já voltou ao gatilho quando a ação roda. */}
      <DropdownItem onClick={() => onDuplicate(cliente)}>
        <CopyIcon />
        Duplicar
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem variant="danger" onClick={() => onDelete(cliente)}>
        <TrashIcon />
        Excluir
      </DropdownItem>
    </Dropdown>
  );
}

function ListagemTela() {
  const [dados, setDados] = useState<Cliente[]>(clientes);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(semFiltros);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'nome',
    dir: 'ascending',
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Cliente[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Valores dos campos da barra de filtros; `filtros` guarda o que foi aplicado (os chips).
  const [draft, setDraft] = useState({ situacoes: [] as Situacao[], segmento: '' });
  const [acao, setAcao] = useState<{ tipo: Acao; limpouSelecao: boolean }>({
    tipo: 'nenhuma',
    limpouSelecao: false,
  });

  const { show } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const allRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const lista = dados.filter(
      (c) =>
        (!termo || normalizar(`${c.id} ${c.nome}`).includes(termo)) &&
        (filtros.situacoes.length === 0 || filtros.situacoes.includes(c.situacao)) &&
        (!filtros.segmento || c.segmento === filtros.segmento),
    );
    const sign = sort.dir === 'ascending' ? 1 : -1;
    return lista.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const diff =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), 'pt-BR');
      return diff * sign;
    });
  }, [dados, busca, filtros, sort]);

  const pageCount = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const rows = filtrados.slice(start, start + PAGE_SIZE);
  const selectedOnPage = rows.filter((c) => selected.has(c.id)).length;
  const allOnPage = rows.length > 0 && selectedOnPage === rows.length;
  const activeFilters = filtros.situacoes.length + (filtros.segmento ? 1 : 0);
  const sortLabel = colunas.find((c) => c.key === sort.key)?.label ?? '';
  const end = Math.min(start + PAGE_SIZE, filtrados.length);
  const contagem =
    filtrados.length === 0
      ? 'Nenhum cliente encontrado.'
      : `Mostrando ${start + 1}–${end} de ${plural(filtrados.length, 'cliente', 'clientes')}.`;
  const ordem = `Ordenado por ${sortLabel}, ${sort.dir === 'ascending' ? 'crescente' : 'decrescente'}.`;
  // Uma única região de status, com texto composto conforme a última ação.
  const status = {
    nenhuma: '',
    ordem: `${ordem} ${contagem}`,
    busca: `${contagem}${acao.limpouSelecao ? ' A seleção foi desfeita.' : ''}`,
    pagina: `Página ${current} de ${pageCount}. ${contagem}`,
    selecao:
      selected.size > 0
        ? `${plural(selected.size, 'cliente selecionado', 'clientes selecionados')}.`
        : 'Seleção desfeita.',
  }[acao.tipo];

  // Busca e filtros voltam à página 1 e desfazem a seleção (e o status avisa).
  const resetView = () => {
    setPage(1);
    setAcao({ tipo: 'busca', limpouSelecao: selected.size > 0 });
    setSelected(new Set());
  };

  const toggleSort = (key: SortKey) => {
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === 'ascending' ? 'descending' : 'ascending',
    }));
    setPage(1);
    setAcao({ tipo: 'ordem', limpouSelecao: false });
  };

  const toggleRow = (id: string) => {
    setAcao({ tipo: 'selecao', limpouSelecao: false });
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setAcao({ tipo: 'selecao', limpouSelecao: false });
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((c) => (allOnPage ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  };

  const changePage = (n: number) => {
    setPage(n);
    setAcao({ tipo: 'pagina', limpouSelecao: false });
  };

  const limpar = () => {
    setBusca('');
    setDraft({ situacoes: [] as Situacao[], segmento: '' });
    setFiltros(semFiltros);
    resetView();
  };

  const clearSearch = () => {
    limpar();
    searchRef.current?.focus();
  };

  const clearSelection = () => {
    setAcao({ tipo: 'selecao', limpouSelecao: false });
    setSelected(new Set());
    allRef.current?.focus();
  };

  const askDelete = (alvo: Cliente[]) => {
    setPending(alvo);
    setDeleteOpen(true);
  };

  // Confirmar remove, avisa e leva o foco a um controle habilitado; cancelar (botão, Esc,
  // backdrop) só fecha: o foco volta nativamente a quem abriu o modal.
  const confirmDelete = () => {
    const ids = new Set(pending.map((c) => c.id));
    flushSync(() => {
      setDeleteOpen(false);
      setAcao({ tipo: 'busca', limpouSelecao: false }); // status passa a dizer a nova contagem
      setDados((list) => list.filter((c) => !ids.has(c.id)));
      setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    });
    // Fecha já (idempotente): o retorno de foco nativo termina antes de focarmos o alvo.
    deleteRef.current?.close();
    // Foco num controle habilitado: "selecionar todos" se ainda há linhas; se a lista visível
    // esvaziou (o checkbox fica disabled), a ação do estado vazio ou a busca.
    const alvo =
      allRef.current && !allRef.current.disabled
        ? allRef.current
        : (document.getElementById('lst-limpar') ?? searchRef.current);
    alvo?.focus();
    const first = pending[0];
    show({
      variant: 'success',
      title: pending.length === 1 ? 'Cliente excluído.' : `${pending.length} clientes excluídos.`,
      message:
        pending.length === 1 && first
          ? `${first.nome} foi removido (simulação).`
          : 'Os registros foram removidos (simulação).',
    });
  };

  const aplicarFiltros = () => {
    setFiltros({
      situacoes: draft.situacoes,
      segmento: draft.segmento,
    });
    resetView();
  };

  // Cada situação aplicada é um chip; remover um tira só aquele valor.
  const removerSituacao = (valor: Situacao) => {
    setDraft((d) => ({ ...d, situacoes: d.situacoes.filter((s) => s !== valor) }));
    setFiltros((f) => ({ ...f, situacoes: f.situacoes.filter((s) => s !== valor) }));
    resetView();
  };

  const removerSegmento = () => {
    setDraft((d) => ({ ...d, segmento: '' }));
    setFiltros((f) => ({ ...f, segmento: '' }));
    resetView();
  };

  const chips = [
    ...filtros.situacoes.map((s) => ({
      key: `situacao-${s}`,
      label: `Situação: ${situacoes[s].label}`,
      onRemove: () => removerSituacao(s),
    })),
    ...(filtros.segmento
      ? [
          {
            key: 'segmento',
            label: `Segmento: ${filtros.segmento}`,
            onRemove: removerSegmento,
          },
        ]
      : []),
  ];

  const exportar = (n: number) =>
    show({
      variant: 'info',
      title: 'Exportação simulada.',
      message: `${plural(n, 'cliente', 'clientes')} no arquivo.`,
    });

  const selectedList = dados.filter((c) => selected.has(c.id));

  return (
    <ReferenceShell
      current="listagem"
      title="Clientes"
      description="Cadastro de clientes. Dados fictícios em memória: exclusões somem ao recarregar."
      breadcrumb={[{ label: 'Início', href: '#/dashboard' }, { label: 'Clientes' }]}
      actions={
        <Button variant="primary" href="#/formulario">
          <PlusIcon />
          Novo cliente
        </Button>
      }
    >
      <section aria-labelledby="lst-tabela-t">
        <h2 id="lst-tabela-t" className="eds-visually-hidden">
          Lista de clientes
        </h2>
        <FilterBar
          aria-label="Filtrar clientes"
          active={chips}
          onSubmit={aplicarFiltros}
          onClear={limpar}
        >
          <Field label="Buscar" className="eds-filter-bar-search">
            <Input
              ref={searchRef}
              type="search"
              placeholder="Buscar por nome ou código"
              autoComplete="off"
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                resetView();
              }}
            />
          </Field>
          <Field label="Situação">
            <MultiSelect
              placeholder="Todas"
              options={(Object.keys(situacoes) as Situacao[]).map((s) => ({
                value: s,
                label: situacoes[s].label,
              }))}
              value={draft.situacoes}
              onChange={(values) => setDraft((d) => ({ ...d, situacoes: values as Situacao[] }))}
            />
          </Field>
          <Field label="Segmento">
            <Select
              value={draft.segmento}
              onChange={(event) => setDraft((d) => ({ ...d, segmento: event.target.value }))}
            >
              <option value="">Todos</option>
              {segmentos.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </FilterBar>
        {/* Com seleção, só o Exportar da barra em massa fica (evita dois "Exportar"). */}
        {selected.size === 0 ? (
          <TableToolbar>
            <Stack direction="row" gap={2} className="eds-push-end">
              <Button onClick={() => exportar(filtrados.length)}>
                <DownloadIcon />
                Exportar
              </Button>
            </Stack>
          </TableToolbar>
        ) : null}

        {/* Ação em massa: linha própria, só com seleção. O sólido danger fica no Modal. */}
        {selected.size > 0 ? (
          <TableToolbar>
            <p className="eds-text-label">{plural(selected.size, 'selecionado', 'selecionados')}</p>
            <Stack direction="row" wrap gap={2}>
              <Button onClick={() => exportar(selected.size)}>
                <DownloadIcon />
                Exportar
              </Button>
              <Button onClick={() => askDelete(selectedList)}>
                <TrashIcon />
                Excluir
              </Button>
              <Button variant="ghost" onClick={clearSelection}>
                Limpar seleção
              </Button>
            </Stack>
          </TableToolbar>
        ) : null}

        {/* Única live region da tabela: montada vazia, texto composto pela última ação. */}
        <p className="eds-visually-hidden" role="status">
          {status}
        </p>

        {/* Nome estável da tabela e da região rolável: a ordenação é anunciada pelo status. */}
        <Table caption="Lista de clientes">
          <TableHead>
            <TableRow>
              <TableHeaderCell column="check">
                <Checkbox
                  ref={allRef}
                  aria-label="Selecionar todos desta página"
                  checked={allOnPage}
                  indeterminate={selectedOnPage > 0 && !allOnPage}
                  disabled={rows.length === 0}
                  onChange={togglePage}
                />
              </TableHeaderCell>
              {colunas.map(({ key, label }) =>
                key === 'situacao' ? (
                  <TableHeaderCell key={key}>{label}</TableHeaderCell>
                ) : (
                  <TableHeaderCell
                    key={key}
                    numeric={key === 'total'}
                    sort={sort.key === key ? sort.dir : 'none'}
                    onSort={() => toggleSort(key)}
                  >
                    {label}
                  </TableHeaderCell>
                ),
              )}
              <TableHeaderCell column="actions">
                <span className="eds-visually-hidden">Ações</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={COLS}>
                <EmptyState
                  icon={<SearchIcon />}
                  headingLevel={2}
                  title="Nenhum cliente encontrado"
                  description={
                    busca.trim()
                      ? `Nada corresponde a “${busca.trim()}”${activeFilters ? ' com os filtros aplicados' : ''}. Revise o termo ou limpe a busca.`
                      : 'Nenhum cliente atende aos filtros aplicados.'
                  }
                  actions={
                    <Button id="lst-limpar" onClick={clearSearch}>
                      {activeFilters > 0 ? 'Limpar busca e filtros' : 'Limpar busca'}
                    </Button>
                  }
                />
              </TableEmpty>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell column="check">
                    <Checkbox
                      aria-label={`Selecionar ${c.nome}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggleRow(c.id)}
                    />
                  </TableCell>
                  <TableCell>{c.id}</TableCell>
                  <TableHeaderCell scope="row">{c.nome}</TableHeaderCell>
                  <TableCell>
                    <Badge variant={situacoes[c.situacao].badge}>
                      {situacoes[c.situacao].label}
                    </Badge>
                  </TableCell>
                  <TableCell numeric>{moeda.format(c.total)}</TableCell>
                  <TableCell>{c.segmento}</TableCell>
                  <TableCell>{formatarData(c.ultimoPedido)}</TableCell>
                  <TableCell column="actions">
                    <RowActions
                      cliente={c}
                      onDuplicate={(cliente) =>
                        show({
                          variant: 'info',
                          title: 'Cópia criada.',
                          message: `Rascunho de ${cliente.nome} (simulação).`,
                        })
                      }
                      onDelete={(cliente) => askDelete([cliente])}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TableFooter>
          <p>{contagem}</p>
          {pageCount > 1 ? (
            <Pagination page={current} pageCount={pageCount} onPageChange={changePage} />
          ) : null}
        </TableFooter>
      </section>

      <Modal
        ref={deleteRef}
        size="sm"
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={pending.length === 1 ? 'Excluir cliente?' : `Excluir ${pending.length} clientes?`}
        aria-describedby="lst-del-d"
        initialFocus={cancelRef}
        footer={
          <Stack direction="row" wrap gap={3}>
            <Button ref={cancelRef} onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Excluir
            </Button>
          </Stack>
        }
      >
        <p id="lst-del-d">
          {pending.length === 1
            ? `${pending[0]?.nome} e o histórico de pedidos serão removidos.`
            : `${pending.length} clientes e seus históricos de pedidos serão removidos.`}{' '}
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </ReferenceShell>
  );
}

export function Listagem() {
  return (
    <ToastProvider>
      <ListagemTela />
    </ToastProvider>
  );
}
