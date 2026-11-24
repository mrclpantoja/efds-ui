import './app-shell-demo.css';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

const NAV_ID = 'asd-nav';

/** Ícones de traço simples (24×24), herdam currentColor. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const icons = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  ),
  projetos: (
    <Icon>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Icon>
  ),
  usuarios: (
    <Icon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" />
    </Icon>
  ),
  financeiro: (
    <Icon>
      <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  ),
  relatorios: (
    <Icon>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  ),
  configuracoes: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  ),
  recolher: (
    <Icon>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M16 10l-2 2 2 2" />
    </Icon>
  ),
  menu: (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  ),
  sino: (
    <Icon>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </Icon>
  ),
  marca: (
    <Icon>
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="M3 7l9 5 9-5M12 12v10" />
    </Icon>
  ),
};

type Page = 'dashboard' | 'projetos' | 'usuarios' | 'financeiro' | 'relatorios' | 'configuracoes';

/** Contador de itens (markup `.eds-sidebar-badge`): o número entra no nome acessível do link. */
const counters: Partial<Record<Page, { count: number; label: string }>> = {
  financeiro: { count: 3, label: 'vencidas' },
};

const sections: { title: string; items: { id: Page; label: string }[] }[] = [
  {
    title: 'Geral',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'projetos', label: 'Projetos' },
      { id: 'usuarios', label: 'Usuários' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { id: 'financeiro', label: 'Financeiro' },
      { id: 'relatorios', label: 'Relatórios' },
    ],
  },
];

const widths = [
  { id: 'desktop', label: 'Desktop (100%)' },
  { id: 'tablet', label: 'Tablet (800px)' },
  { id: 'mobile', label: 'Mobile (375px)' },
] as const;

const kpis = [
  ['Projetos ativos', '24'],
  ['Horas no mês', '1.312'],
  ['Faturamento', 'R$ 84,2 mil'],
  ['Pendências', '7'],
] as const;

const activity = [
  ['Projeto Alfa', 'Etapa 3 concluída'],
  ['Projeto Beta', 'Orçamento revisado'],
  ['Projeto Gama', 'Novo membro na equipe'],
  ['Projeto Delta', 'Relatório mensal enviado'],
  ['Projeto Épsilon', 'Prazo ajustado'],
  ['Projeto Zeta', 'Contrato renovado'],
] as const;

/** Navbar avulsa (site/portal): marca, navegação com aria-current e ações. */
function NavbarExample() {
  return (
    <header className="eds-navbar">
      <a className="eds-navbar-brand" href="#asd-inicio">
        {icons.marca}
        Empresa Exemplo
      </a>
      <nav className="eds-navbar-nav" aria-label="Seções do portal">
        <a className="eds-navbar-link" href="#asd-inicio" aria-current="page">
          Visão geral
        </a>
        <a className="eds-navbar-link" href="#asd-inicio">
          Produtos
        </a>
        <a className="eds-navbar-link" href="#asd-inicio">
          Clientes
        </a>
        <a className="eds-navbar-link" href="#asd-inicio">
          Suporte
        </a>
      </nav>
      <div className="eds-navbar-actions">
        <button type="button" className="eds-button eds-button-primary eds-button-sm">
          Entrar
        </button>
      </div>
    </header>
  );
}

export function AppShellDemo() {
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState<(typeof widths)[number]['id']>('desktop');
  const [navOpen, setNavOpen] = useState(false);

  const navigated = useRef(false);

  // Contrato do React no mobile: o popover não é modal, então o evento `toggle` sincroniza
  // aria-expanded do gatilho e põe `inert` em tudo que não é a sidebar dentro de .eds-app.
  // Como o gatilho fica inerte, o foco é movido à mão: ao abrir, para o item atual; ao
  // fechar, para o conteúdo (se houve navegação) ou de volta ao gatilho.
  useEffect(() => {
    const nav = document.getElementById(NAV_ID);
    if (!nav) return;
    const onToggle = (event: Event) => {
      const open = (event as ToggleEvent).newState === 'open';
      flushSync(() => setNavOpen(open));
      if (open) {
        nav.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
      } else if (navigated.current) {
        navigated.current = false;
        document.getElementById('asd-conteudo')?.focus();
      } else if (document.activeElement === document.body || nav.contains(document.activeElement)) {
        document
          .querySelector<HTMLElement>(`[popovertarget="${NAV_ID}"]:not(.eds-sidebar-close)`)
          ?.focus();
      }
    };
    nav.addEventListener('toggle', onToggle);
    return () => nav.removeEventListener('toggle', onToggle);
  }, []);

  const label = [
    ...sections.flatMap((s) => s.items),
    { id: 'configuracoes', label: 'Configurações' },
  ].find((item) => item.id === page)?.label;

  // O React só troca o item atual e fecha o off-canvas (no mobile); a largura é CSS.
  const go = (id: Page) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setPage(id);
    const nav = document.getElementById(NAV_ID);
    if (nav?.matches(':popover-open')) {
      navigated.current = true; // o foco vai ao conteúdo quando o `toggle` fechar
      nav.hidePopover();
    } else {
      document.getElementById('asd-conteudo')?.focus();
    }
  };

  const item = (id: Page, text: string) => (
    <a
      key={id}
      className="eds-sidebar-item"
      href={`#asd-${id}`}
      aria-current={page === id ? 'page' : undefined}
      onClick={go(id)}
    >
      {icons[id]}
      <span className="eds-sidebar-label">{text}</span>
      {counters[id] ? (
        <span className="eds-sidebar-badge">
          {counters[id].count}
          <span className="eds-visually-hidden"> {counters[id].label}</span>
        </span>
      ) : null}
    </a>
  );

  return (
    <section className="asd-section" aria-labelledby="asd-title" id="asd-inicio">
      <div className="eds-container eds-container-2xl eds-stack">
        <h2 id="asd-title" className="eds-text-h2">
          App shell, Navbar e Sidebar
        </h2>
        <p className="eds-text-body asd-muted">
          O shell responde à largura do próprio contêiner (.eds-app): ≥1024px sidebar expandida,
          768–1023px compacta, &lt;768px off-canvas pelo botão de menu (Popover API). No mobile o
          off-canvas abre no top layer, ocupando a altura da janela, não só a da moldura.
        </p>

        <NavbarExample />

        <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-2">
          {widths.map((w) => (
            <button
              key={w.id}
              type="button"
              className="eds-button eds-button-secondary eds-button-sm"
              aria-pressed={width === w.id}
              onClick={() => setWidth(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="asd-frame" data-width={width}>
          <div className="eds-app">
            <a className="eds-skip-link" href="#asd-conteudo" inert={navOpen}>
              Pular para o conteúdo
            </a>

            <nav
              className="eds-sidebar"
              id={NAV_ID}
              popover="auto"
              aria-label="Principal"
              data-collapsed={collapsed || undefined}
            >
              <div className="eds-sidebar-header">
                {icons.marca}
                <span className="eds-sidebar-label">Gestão Exemplo</span>
                <button
                  type="button"
                  className="eds-sidebar-close eds-button eds-button-ghost eds-button-icon"
                  popoverTarget={NAV_ID}
                  popoverTargetAction="hide"
                  aria-label="Fechar menu"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {sections.map((section) => (
                <div key={section.title} className="eds-sidebar-section">
                  <p className="eds-sidebar-section-title">{section.title}</p>
                  {section.items.map((i) => item(i.id, i.label))}
                </div>
              ))}
              <div className="eds-sidebar-footer">
                {item('configuracoes', 'Configurações')}
                <button
                  type="button"
                  className="eds-sidebar-item"
                  aria-expanded={!collapsed}
                  aria-controls={NAV_ID}
                  onClick={() => setCollapsed((c) => !c)}
                >
                  {icons.recolher}
                  <span className="eds-sidebar-label">Menu lateral</span>
                </button>
              </div>
            </nav>

            <header className="eds-app-header eds-navbar" inert={navOpen}>
              <button
                type="button"
                className="eds-button eds-button-ghost eds-button-icon eds-app-nav-toggle"
                popoverTarget={NAV_ID}
                aria-label="Abrir navegação"
                aria-expanded={navOpen}
              >
                {icons.menu}
              </button>
              <div className="eds-navbar-actions">
                <div className="asd-search">
                  <input
                    className="eds-input"
                    type="search"
                    placeholder="Buscar…"
                    aria-label="Buscar no sistema"
                  />
                </div>
                <button
                  type="button"
                  className="eds-button eds-button-ghost eds-button-icon"
                  aria-label="Notificações"
                >
                  {icons.sino}
                </button>
                <span className="asd-avatar" role="img" aria-label="Usuário: Ana Exemplo">
                  AE
                </span>
              </div>
            </header>

            {/* No app real é <main>; aqui é região para a página ter um único main. */}
            <div
              className="eds-app-main"
              id="asd-conteudo"
              tabIndex={-1}
              role="region"
              aria-label="Conteúdo do exemplo"
              inert={navOpen}
            >
              <div className="eds-container eds-container-fluid eds-stack asd-content">
                <h3 className="eds-text-h1">{label}</h3>
                <p className="eds-text-body asd-muted">
                  Dados fictícios. A área principal rola sozinha; navbar e sidebar ficam fixas.
                </p>
                <div className="eds-grid">
                  {kpis.map(([name, value]) => (
                    <div key={name} className="eds-col-span-sm-6 eds-col-span-lg-3 asd-card">
                      <p className="eds-text-small asd-muted">{name}</p>
                      <p className="asd-kpi">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="asd-card">
                  <h2 className="eds-text-h4">Atividade recente</h2>
                  {[...activity, ...activity].map(([name, what], index) => (
                    <div key={index} className="asd-row">
                      <span>{name}</span>
                      <span className="asd-muted">{what}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
