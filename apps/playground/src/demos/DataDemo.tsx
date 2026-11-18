import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

type Status = 'success' | 'warning' | 'danger' | 'neutral';
type Order = { code: string; client: string; status: Status; label: string; total: number };
type SortKey = 'code' | 'client' | 'total';
type SortDir = 'ascending' | 'descending';

const orders: Order[] = [
  { code: 'PED-0001', client: 'Atelier Exemplo', status: 'success', label: 'Pago', total: 1280.5 },
  { code: 'PED-0002', client: 'Comércio Modelo', status: 'warning', label: 'Pendente', total: 459 },
  {
    code: 'PED-0003',
    client: 'Oficina Fictícia',
    status: 'danger',
    label: 'Atrasado',
    total: 8920.9,
  },
  { code: 'PED-0004', client: 'Mercado Teste', status: 'success', label: 'Pago', total: 312.25 },
  { code: 'PED-0005', client: 'Studio Amostra', status: 'neutral', label: 'Rascunho', total: 75 },
  {
    code: 'PED-0006',
    client: 'Padaria Exemplo',
    status: 'warning',
    label: 'Pendente',
    total: 2140,
  },
  { code: 'PED-0007', client: 'Gráfica Modelo', status: 'success', label: 'Pago', total: 640.8 },
  { code: 'PED-0008', client: 'Clínica Fictícia', status: 'success', label: 'Pago', total: 5033.1 },
];

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const section: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  minInlineSize: 0,
  gap: 'var(--eds-space-4)',
  padding: 'var(--eds-space-5)',
  border: '1px solid var(--eds-color-border-default)',
  borderRadius: 'var(--eds-radius-lg)',
  background: 'var(--eds-color-bg-surface)',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={section}>
      <h3 className="eds-text-h4">{title}</h3>
      {children}
    </section>
  );
}

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

function SortIcon() {
  return (
    <svg className="eds-table-sort-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path className="eds-table-sort-up" d="M4.5 6.5 8 3l3.5 3.5" />
      <path className="eds-table-sort-down" d="M4.5 9.5 8 13l3.5-3.5" />
    </svg>
  );
}
function ChevronLeft() {
  return (
    <svg {...svgProps}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg {...svgProps}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg className="eds-empty-icon" {...svgProps}>
      <path d="M4 13l2-8h12l2 8v6H4v-6zM4 13h5a3 3 0 006 0h5" />
    </svg>
  );
}

/* ------------------------------- Paginação ------------------------------- */

function Pagination({
  current,
  total,
  narrow,
}: {
  current: number;
  total: number;
  narrow?: boolean;
}) {
  const pages = [1, 2, 3, 4, 5].filter((p) => p <= total);
  return (
    <nav className="eds-pagination" aria-label={narrow ? 'Paginação (estreita)' : 'Paginação'}>
      <ul className="eds-pagination-list">
        <li>
          <button type="button" className="eds-pagination-prev" disabled={current === 1}>
            <ChevronLeft />
            <span>Anterior</span>
          </button>
        </li>
        {pages.map((p) => (
          <li key={p}>
            <a
              className="eds-pagination-item"
              href={`#pagina-${p}`}
              aria-current={p === current ? 'page' : undefined}
              aria-label={`Página ${p}`}
            >
              {p}
            </a>
          </li>
        ))}
        <li>
          <span className="eds-pagination-ellipsis" aria-hidden="true">
            …
          </span>
        </li>
        <li>
          <a
            className="eds-pagination-item"
            href={`#pagina-${total}`}
            aria-label={`Página ${total}`}
          >
            {total}
          </a>
        </li>
        <li>
          <span className="eds-pagination-info">
            Página {current} de {total}
          </span>
        </li>
        <li>
          <a className="eds-pagination-next" href={`#pagina-${current + 1}`}>
            <span>Próxima</span>
            <ChevronRight />
          </a>
        </li>
      </ul>
    </nav>
  );
}

/* --------------------------- Tabela interativa --------------------------- */

function InteractiveTable() {
  const captionId = useId();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'code',
    dir: 'ascending',
  });
  const [selected, setSelected] = useState<Set<string>>(new Set(['PED-0003']));

  const rows = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      const result =
        sort.key === 'total' ? a.total - b.total : a[sort.key].localeCompare(b[sort.key], 'pt-BR');
      return sort.dir === 'ascending' ? result : -result;
    });
    return sorted;
  }, [sort]);

  const allSelected = selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const ariaSort = (key: SortKey) => (sort.key === key ? sort.dir : 'none');
  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'ascending' ? 'descending' : 'ascending' }
        : { key, dir: 'ascending' },
    );
  const toggleRow = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <Section title="Table: ordenação, seleção, números e ações">
      <div>
        <div className="eds-table-toolbar">
          <div
            className="eds-stack eds-stack-row eds-stack-wrap eds-gap-2"
            style={{ alignItems: 'center' }}
          >
            <input
              type="search"
              className="eds-input eds-input-sm"
              placeholder="Buscar pedido"
              aria-label="Buscar pedido"
            />
            <button type="button" className="eds-button eds-button-secondary eds-button-sm">
              Filtros
            </button>
          </div>
          <div
            className="eds-stack eds-stack-row eds-stack-wrap eds-gap-2"
            style={{ alignItems: 'center' }}
          >
            {selected.size > 0 ? (
              <span role="status" className="eds-text-small">
                {selected.size} selecionado{selected.size > 1 ? 's' : ''}
              </span>
            ) : null}
            <button type="button" className="eds-button eds-button-primary eds-button-sm">
              Novo pedido
            </button>
          </div>
        </div>

        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco (WCAG 2.1.1) */}
        <div className="eds-table-wrap" role="region" aria-labelledby={captionId} tabIndex={0}>
          <table className="eds-table">
            <caption id={captionId} className="eds-table-caption eds-visually-hidden">
              Pedidos recentes, ordenáveis por código, cliente e total
            </caption>
            <thead>
              <tr>
                <th scope="col" className="eds-table-check">
                  <input
                    type="checkbox"
                    className="eds-checkbox"
                    aria-label="Selecionar todos os pedidos"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.code)))
                    }
                  />
                </th>
                <th scope="col" aria-sort={ariaSort('code')}>
                  <button
                    type="button"
                    className="eds-table-sort"
                    onClick={() => toggleSort('code')}
                  >
                    Código <SortIcon />
                  </button>
                </th>
                <th scope="col" aria-sort={ariaSort('client')}>
                  <button
                    type="button"
                    className="eds-table-sort"
                    onClick={() => toggleSort('client')}
                  >
                    Cliente <SortIcon />
                  </button>
                </th>
                <th scope="col">Situação</th>
                <th scope="col" className="eds-table-num" aria-sort={ariaSort('total')}>
                  <button
                    type="button"
                    className="eds-table-sort"
                    onClick={() => toggleSort('total')}
                  >
                    Total <SortIcon />
                  </button>
                </th>
                <th scope="col" className="eds-table-actions">
                  <span className="eds-visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code}>
                  <td className="eds-table-check">
                    <input
                      type="checkbox"
                      className="eds-checkbox"
                      aria-label={`Selecionar ${row.code}`}
                      checked={selected.has(row.code)}
                      onChange={() => toggleRow(row.code)}
                    />
                  </td>
                  <td>{row.code}</td>
                  <td>{row.client}</td>
                  <td>
                    <span className={`eds-badge eds-badge-${row.status}`}>{row.label}</span>
                  </td>
                  <td className="eds-table-num">{money.format(row.total)}</td>
                  <td className="eds-table-actions">
                    <button
                      type="button"
                      className="eds-button eds-button-ghost eds-button-icon eds-button-sm"
                      aria-label={`Editar ${row.code}`}
                    >
                      <EditIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="eds-table-footer">
          <p>1–{rows.length} de 248</p>
          <Pagination current={1} total={25} />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------- Sticky, vazia e estreita ------------------------ */

function StickyTable() {
  const id = useId();
  return (
    <Section title="Table sticky (wrap com altura limitada)">
      <div
        className="eds-table-wrap"
        role="region"
        aria-labelledby={id}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco (WCAG 2.1.1)
        tabIndex={0}
        style={{ maxBlockSize: '14rem' }}
      >
        <table className="eds-table eds-table-sticky">
          <caption id={id} className="eds-table-caption eds-visually-hidden">
            Pedidos com cabeçalho fixo
          </caption>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Cliente</th>
              <th scope="col" className="eds-table-num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {[...orders, ...orders].map((row, i) => (
              <tr key={i}>
                <td>{row.code}</td>
                <td>{row.client}</td>
                <td className="eds-table-num">{money.format(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function CardTable() {
  const id = useId();
  return (
    <article className="eds-card">
      <header className="eds-card-header">
        <h3 className="eds-card-title" id={id}>
          Table dentro de Card
        </h3>
      </header>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco (WCAG 2.1.1) */}
      <div className="eds-table-wrap" role="region" aria-labelledby={id} tabIndex={0}>
        <table className="eds-table">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Cliente</th>
              <th scope="col" className="eds-table-num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 4).map((row) => (
              <tr key={row.code}>
                <td>{row.code}</td>
                <td>{row.client}</td>
                <td className="eds-table-num">{money.format(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function EmptyTable() {
  return (
    <Section title="Table vazia e Empty State">
      <div className="eds-table-wrap">
        <table className="eds-table">
          <caption className="eds-table-caption eds-visually-hidden">
            Pedidos (nenhum resultado)
          </caption>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Cliente</th>
              <th scope="col" className="eds-table-num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} className="eds-table-empty">
                <div className="eds-empty">
                  <InboxIcon />
                  <h3 className="eds-empty-title">Nenhum pedido encontrado</h3>
                  <p className="eds-empty-text">
                    Nenhum resultado para os filtros atuais. Remova um filtro ou crie um novo
                    pedido.
                  </p>
                  <div className="eds-empty-actions">
                    <button type="button" className="eds-button eds-button-primary eds-button-sm">
                      Novo pedido
                    </button>
                    <button type="button" className="eds-button eds-button-secondary eds-button-sm">
                      Limpar filtros
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Paginations() {
  return (
    <Section title="Pagination: larga e estreita">
      <Pagination current={3} total={25} />
      <div style={{ inlineSize: '20rem', maxInlineSize: '100%' }}>
        <Pagination current={3} total={25} narrow />
      </div>
      <div style={{ inlineSize: '30rem', maxInlineSize: '100%' }}>
        <Pagination current={1} total={25} narrow />
      </div>
    </Section>
  );
}

export function DataDemo() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 'var(--eds-space-5)',
        marginBlockStart: 'var(--eds-space-7)',
      }}
    >
      <h2 className="eds-text-h2">Dados</h2>
      <InteractiveTable />
      <StickyTable />
      <CardTable />
      <EmptyTable />
      <Paginations />
    </div>
  );
}
