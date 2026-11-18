import type { ReactNode } from 'react';

/** Ícones de traço simples (24×24), herdam currentColor; sempre decorativos. */
export function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      /* Tamanho de apresentação: 1em onde o componente não dimensiona o svg (ex.: Badge);
         qualquer regra CSS (Button, Sidebar…) vence o atributo. */
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const icons = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  ),
  clientes: (
    <Icon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" />
    </Icon>
  ),
  novo: (
    <Icon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" />
    </Icon>
  ),
  voltar: (
    <Icon>
      <path d="M10 19l-7-7 7-7M3 12h18" />
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
  conta: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.2 18.4a6.5 6.5 0 0 1 11.6 0" />
    </Icon>
  ),
  marca: (
    <Icon>
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="M3 7l9 5 9-5M12 12v10" />
    </Icon>
  ),
  mais: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  filtro: (
    <Icon>
      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
    </Icon>
  ),
  exportar: (
    <Icon>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </Icon>
  ),
  editar: (
    <Icon>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </Icon>
  ),
  duplicar: (
    <Icon>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </Icon>
  ),
  excluir: (
    <Icon>
      <path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14" />
    </Icon>
  ),
  opcoes: (
    <Icon>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </Icon>
  ),
  fechar: (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  ),
  /** Contrato do core: dois chevrons; o CSS mostra/oculta por aria-sort e dá traço/cor. */
  ordenar: (
    <svg className="eds-table-sort-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path className="eds-table-sort-up" d="M4.5 6.5 8 3l3.5 3.5" />
      <path className="eds-table-sort-down" d="M4.5 9.5 8 13l3.5-3.5" />
    </svg>
  ),
  /** Variação de KPI (o sentido também vai em texto). */
  subiu: (
    <Icon>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Icon>
  ),
  desceu: (
    <Icon>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Icon>
  ),
  anterior: (
    <Icon>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  ),
  proxima: (
    <Icon>
      <path d="M9 18l6-6-6-6" />
    </Icon>
  ),
  busca: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-5-5" />
    </Icon>
  ),
};
