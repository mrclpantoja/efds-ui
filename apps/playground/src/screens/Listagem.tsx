import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { openDialog, ToastRegion, useDialogBackdrop, useScrollRegion, useToasts } from './behavior';
import {
  clientes,
  formatarData,
  moeda,
  segmentos,
  situacoes,
  type Cliente,
  type Situacao,
} from './data';
import { icons } from './icons';
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

/** 1 … 4 5 6 … 9: primeira, última e vizinhas da atual; buraco de uma página vira o número. */
function paginas(atual: number, total: number): (number | 'gap-start' | 'gap-end')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = [...new Set([1, total, atual - 1, atual, atual + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | 'gap-start' | 'gap-end')[] = [];
  nums.forEach((n, i) => {
    const prev = nums[i - 1];
    if (prev !== undefined && n - prev === 2) out.push(n - 1);
    else if (prev !== undefined && n - prev > 2) out.push(n < atual ? 'gap-start' : 'gap-end');
    out.push(n);
  });
  return out;
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const first = page <= 1;
  const last = page >= pageCount;
  return (
    <nav className="eds-pagination" aria-label="Paginação">
      <ul className="eds-pagination-list">
        <li>
          <button
            type="button"
            className="eds-pagination-prev"
            aria-disabled={first || undefined}
            onClick={() => !first && onChange(page - 1)}
          >
            {icons.anterior}
            <span>Anterior</span>
          </button>
        </li>
        {paginas(page, pageCount).map((n) =>
          typeof n === 'number' ? (
            <li key={n}>
              <button
                type="button"
                className="eds-pagination-item"
                aria-label={`Página ${n}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            </li>
          ) : (
            <li key={n}>
              <span className="eds-pagination-ellipsis" aria-hidden="true">
                …
              </span>
            </li>
          ),
        )}
        <li>
          <span className="eds-pagination-info">
            Página {page} de {pageCount}
          </span>
        </li>
        <li>
          <button
            type="button"
            className="eds-pagination-next"
            aria-disabled={last || undefined}
            onClick={() => !last && onChange(page + 1)}
          >
            <span>Próxima</span>
            {icons.proxima}
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Menu de ações da linha: Dropdown em padrão disclosure (Popover API). */
function RowActions({
  cliente,
  onDuplicate,
  onDelete,
}: {
  cliente: Cliente;
  onDuplicate: (cliente: Cliente, trigger: HTMLElement | null) => void;
  onDelete: (cliente: Cliente, trigger: HTMLElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = `acoes-${cliente.id}`;

  // hidePopover() devolve o foco ao gatilho antes da ação (modal, toast) começar.
  const run = (action: typeof onDelete) => () => {
    document.getElementById(id)?.hidePopover();
    action(cliente, document.getElementById(`${id}-gatilho`));
  };

  return (
    <>
      <button
        type="button"
        className="eds-button eds-button-ghost eds-button-sm eds-button-icon"
        id={`${id}-gatilho`}
        popoverTarget={id}
        aria-expanded={open}
        aria-label={`Ações de ${cliente.nome}`}
      >
        {icons.opcoes}
      </button>
      <div
        id={id}
        className="eds-dropdown"
        aria-labelledby={`${id}-gatilho`}
        popover="auto"
        onToggle={(event) => setOpen(event.currentTarget.matches(':popover-open'))}
      >
        <a className="eds-dropdown-item" href="#/formulario">
          {icons.editar}
          Editar
        </a>
        <button type="button" className="eds-dropdown-item" onClick={run(onDuplicate)}>
          {icons.duplicar}
          Duplicar
        </button>
        <hr className="eds-dropdown-separator" />
        <button
          type="button"
          className="eds-dropdown-item eds-dropdown-item-danger"
          onClick={run(onDelete)}
        >
          {icons.excluir}
          Excluir
        </button>
      </div>
    </>
  );
}

export function Listagem() {
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
  const [drawerKey, setDrawerKey] = useState(0);
  const [acao, setAcao] = useState<{ tipo: Acao; limpouSelecao: boolean }>({
    tipo: 'nenhuma',
    limpouSelecao: false,
  });

  const { toasts, push, close } = useToasts();
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const allRef = useRef<HTMLInputElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const filtersRef = useRef<HTMLDialogElement>(null);
  const deleteOrigin = useRef<HTMLElement | null>(null);
  useScrollRegion(wrapRef, 'lst-tabela-t');
  useDialogBackdrop(deleteRef);
  useDialogBackdrop(filtersRef);

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

  // indeterminate é propriedade DOM, não atributo.
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selectedOnPage > 0 && !allOnPage;
  }, [selectedOnPage, allOnPage]);

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

  const clearSearch = () => {
    setBusca('');
    setFiltros(semFiltros);
    resetView();
    searchRef.current?.focus();
  };

  const clearSelection = () => {
    setAcao({ tipo: 'selecao', limpouSelecao: false });
    setSelected(new Set());
    allRef.current?.focus();
  };

  const askDelete = (alvo: Cliente[], origin: HTMLElement | null) => {
    deleteOrigin.current = origin;
    flushSync(() => setPending(alvo));
    if (deleteRef.current) deleteRef.current.returnValue = '';
    openDialog(deleteRef);
  };

  // Fechou o modal: confirmar remove e avisa; cancelar (botão, Esc, backdrop) devolve o foco.
  const onDeleteClose = () => {
    const confirmed = deleteRef.current?.returnValue === 'excluir';
    if (!confirmed) {
      deleteOrigin.current?.focus();
      return;
    }
    const ids = new Set(pending.map((c) => c.id));
    flushSync(() => {
      setAcao({ tipo: 'busca', limpouSelecao: false }); // status passa a dizer a nova contagem
      setDados((list) => list.filter((c) => !ids.has(c.id)));
      setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    });
    // Foco num controle habilitado: "selecionar todos" se ainda há linhas; se a lista visível
    // esvaziou (o checkbox fica disabled), a ação do estado vazio ou a busca.
    const alvo =
      allRef.current && !allRef.current.disabled
        ? allRef.current
        : (document.getElementById('lst-limpar') ?? searchRef.current);
    alvo?.focus();
    const first = pending[0];
    push(
      'success',
      pending.length === 1 ? 'Cliente excluído.' : `${pending.length} clientes excluídos.`,
      pending.length === 1 && first
        ? `${first.nome} foi removido (simulação).`
        : 'Os registros foram removidos (simulação).',
      alvo,
    );
  };

  const openFilters = () => {
    // Remonta o formulário com os filtros aplicados antes de abrir (o foco inicial depende disso).
    flushSync(() => setDrawerKey((k) => k + 1));
    openDialog(filtersRef);
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    setFiltros({
      situacoes: data.getAll('situacao').map(String) as Situacao[],
      segmento: String(data.get('segmento') ?? ''),
    });
    resetView();
  };

  const selectedList = dados.filter((c) => selected.has(c.id));

  return (
    <ReferenceShell
      current="listagem"
      title="Clientes"
      description="Cadastro de clientes. Dados fictícios em memória: exclusões somem ao recarregar."
      breadcrumb={[{ label: 'Início', href: '#/dashboard' }, { label: 'Clientes' }]}
      actions={
        <a className="eds-button eds-button-primary" href="#/formulario">
          {icons.mais}
          Novo cliente
        </a>
      }
    >
      <section aria-labelledby="lst-tabela-t">
        {/* Nome estável da seção e da região rolável (o caption muda com a ordenação). */}
        <h2 id="lst-tabela-t" className="eds-visually-hidden">
          Lista de clientes
        </h2>
        <div className="eds-table-toolbar">
          {/*
            Busca + Filtros sempre na mesma linha (sem wrap): a busca cede espaço, o botão não.
            O grupo cresce com a barra e Exportar quebra para baixo quando não couber.
          */}
          <div className="eds-stack eds-stack-row eds-gap-2 eds-stack-grow">
            <div className="eds-stack-grow">
              <label className="eds-visually-hidden" htmlFor="lst-busca">
                Buscar clientes
              </label>
              <input
                ref={searchRef}
                id="lst-busca"
                className="eds-input"
                type="search"
                placeholder="Buscar por nome ou código"
                autoComplete="off"
                value={busca}
                onChange={(event) => {
                  setBusca(event.target.value);
                  resetView();
                }}
              />
            </div>
            <button type="button" className="eds-button eds-button-secondary" onClick={openFilters}>
              {icons.filtro}
              Filtros{' '}
              {activeFilters > 0 ? (
                <span className="eds-badge eds-badge-info">
                  {activeFilters}
                  <span className="eds-visually-hidden">
                    {activeFilters === 1 ? ' filtro ativo' : ' filtros ativos'}
                  </span>
                </span>
              ) : null}
            </button>
          </div>
          {/* Com seleção, só o Exportar da barra em massa fica (evita dois "Exportar"). */}
          {selected.size === 0 ? (
            <div className="eds-stack eds-stack-row eds-gap-2">
              <button
                type="button"
                className="eds-button eds-button-secondary"
                onClick={() =>
                  push(
                    'info',
                    'Exportação simulada.',
                    `${plural(filtrados.length, 'cliente', 'clientes')} no arquivo.`,
                  )
                }
              >
                {icons.exportar}
                Exportar
              </button>
            </div>
          ) : null}
        </div>

        {/* Ação em massa: linha própria, só com seleção. O sólido danger fica no Modal. */}
        {selected.size > 0 ? (
          <div className="eds-table-toolbar">
            <p className="eds-text-label">{plural(selected.size, 'selecionado', 'selecionados')}</p>
            <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-2">
              <button
                type="button"
                className="eds-button eds-button-secondary"
                onClick={() =>
                  push(
                    'info',
                    'Exportação simulada.',
                    `${plural(selected.size, 'cliente', 'clientes')} no arquivo.`,
                  )
                }
              >
                {icons.exportar}
                Exportar
              </button>
              <button
                type="button"
                className="eds-button eds-button-secondary"
                onClick={(event) => askDelete(selectedList, event.currentTarget)}
              >
                {icons.excluir}
                Excluir
              </button>
              <button
                type="button"
                className="eds-button eds-button-ghost"
                onClick={clearSelection}
              >
                Limpar seleção
              </button>
            </div>
          </div>
        ) : null}

        {/* Única live region da tabela: montada vazia, texto composto pela última ação. */}
        <p className="eds-visually-hidden" role="status">
          {status}
        </p>

        <div className="eds-table-wrap" ref={wrapRef}>
          <table className="eds-table">
            <caption className="eds-table-caption eds-visually-hidden">Clientes. {ordem}</caption>
            <thead>
              <tr>
                <th scope="col" className="eds-table-check">
                  <input
                    ref={allRef}
                    type="checkbox"
                    className="eds-checkbox"
                    aria-label="Selecionar todos desta página"
                    checked={allOnPage}
                    disabled={rows.length === 0}
                    onChange={togglePage}
                  />
                </th>
                {colunas.map(({ key, label }) =>
                  key === 'situacao' ? (
                    <th key={key} scope="col">
                      {label}
                    </th>
                  ) : (
                    <th
                      key={key}
                      scope="col"
                      className={key === 'total' ? 'eds-table-num' : undefined}
                      aria-sort={sort.key === key ? sort.dir : 'none'}
                    >
                      <button
                        type="button"
                        className="eds-table-sort"
                        onClick={() => toggleSort(key)}
                      >
                        {label}
                        {icons.ordenar}
                      </button>
                    </th>
                  ),
                )}
                <th scope="col" className="eds-table-actions">
                  <span className="eds-visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLS} className="eds-table-empty">
                    <div className="eds-empty">
                      <svg
                        className="eds-empty-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-5-5M8.5 8.5l5 5M13.5 8.5l-5 5" />
                      </svg>
                      <h2 className="eds-empty-title">Nenhum cliente encontrado</h2>
                      <p className="eds-empty-text">
                        {busca.trim()
                          ? `Nada corresponde a “${busca.trim()}”${activeFilters ? ' com os filtros aplicados' : ''}. Revise o termo ou limpe a busca.`
                          : 'Nenhum cliente atende aos filtros aplicados.'}
                      </p>
                      <div className="eds-empty-actions">
                        <button
                          id="lst-limpar"
                          type="button"
                          className="eds-button eds-button-secondary"
                          onClick={clearSearch}
                        >
                          {activeFilters > 0 ? 'Limpar busca e filtros' : 'Limpar busca'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <td className="eds-table-check">
                      <input
                        type="checkbox"
                        className="eds-checkbox"
                        aria-label={`Selecionar ${c.nome}`}
                        checked={selected.has(c.id)}
                        onChange={() => toggleRow(c.id)}
                      />
                    </td>
                    <td>{c.id}</td>
                    <th scope="row">{c.nome}</th>
                    <td>
                      <span className={`eds-badge eds-badge-${situacoes[c.situacao].badge}`}>
                        {situacoes[c.situacao].label}
                      </span>
                    </td>
                    <td className="eds-table-num">{moeda.format(c.total)}</td>
                    <td>{c.segmento}</td>
                    <td>{formatarData(c.ultimoPedido)}</td>
                    <td className="eds-table-actions">
                      <RowActions
                        cliente={c}
                        onDuplicate={(cliente, trigger) =>
                          push(
                            'info',
                            'Cópia criada.',
                            `Rascunho de ${cliente.nome} (simulação).`,
                            trigger,
                          )
                        }
                        onDelete={(cliente, trigger) => askDelete([cliente], trigger)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="eds-table-footer">
          <p>{contagem}</p>
          {pageCount > 1 ? (
            <Pagination page={current} pageCount={pageCount} onChange={changePage} />
          ) : null}
        </div>
      </section>

      <dialog
        ref={deleteRef}
        className="eds-modal eds-modal-sm"
        aria-labelledby="lst-del-t"
        aria-describedby="lst-del-d"
        onClose={onDeleteClose}
      >
        <header className="eds-modal-header">
          <h2 className="eds-modal-title" id="lst-del-t">
            {pending.length === 1 ? 'Excluir cliente?' : `Excluir ${pending.length} clientes?`}
          </h2>
        </header>
        <div className="eds-modal-body" id="lst-del-d">
          {pending.length === 1
            ? `${pending[0]?.nome} e o histórico de pedidos serão removidos.`
            : `${pending.length} clientes e seus históricos de pedidos serão removidos.`}{' '}
          Esta ação não pode ser desfeita.
        </div>
        <footer className="eds-modal-footer">
          <form method="dialog" className="eds-stack eds-stack-row eds-stack-wrap eds-gap-3">
            <button className="eds-button eds-button-secondary" value="cancelar" data-autofocus="">
              Cancelar
            </button>
            <button className="eds-button eds-button-danger" value="excluir">
              Excluir
            </button>
          </form>
        </footer>
      </dialog>

      <dialog ref={filtersRef} className="eds-drawer" aria-labelledby="lst-fil-t">
        <header className="eds-drawer-header">
          <h2 className="eds-drawer-title" id="lst-fil-t">
            Filtros
          </h2>
          <button
            type="button"
            className="eds-button eds-button-ghost eds-button-icon"
            aria-label="Fechar"
            onClick={() => filtersRef.current?.close()}
          >
            {icons.fechar}
          </button>
        </header>
        <div className="eds-drawer-body">
          <form
            key={drawerKey}
            id="lst-fil-f"
            method="dialog"
            className="eds-stack eds-gap-5"
            onSubmit={applyFilters}
          >
            <fieldset className="eds-fieldset">
              <legend className="eds-legend">Situação</legend>
              {(Object.keys(situacoes) as Situacao[]).map((s, i) => (
                <label key={s} className="eds-check">
                  <input
                    type="checkbox"
                    className="eds-checkbox"
                    name="situacao"
                    value={s}
                    defaultChecked={filtros.situacoes.includes(s)}
                    {...(i === 0 ? { 'data-autofocus': '' } : {})}
                  />
                  {situacoes[s].label}
                </label>
              ))}
            </fieldset>
            <div className="eds-field">
              <label className="eds-label" htmlFor="lst-segmento">
                Segmento
              </label>
              <select
                id="lst-segmento"
                name="segmento"
                className="eds-select"
                defaultValue={filtros.segmento}
              >
                <option value="">Todos</option>
                {segmentos.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </form>
        </div>
        <footer className="eds-drawer-footer">
          <button
            type="button"
            className="eds-button eds-button-tertiary"
            onClick={() => {
              setFiltros(semFiltros);
              resetView();
              filtersRef.current?.close();
            }}
          >
            Limpar filtros
          </button>
          <button
            type="button"
            className="eds-button eds-button-secondary"
            onClick={() => filtersRef.current?.close()}
          >
            Cancelar
          </button>
          <button type="submit" form="lst-fil-f" className="eds-button eds-button-primary">
            Aplicar
          </button>
        </footer>
      </dialog>

      <ToastRegion toasts={toasts} onClose={close} />
    </ReferenceShell>
  );
}
