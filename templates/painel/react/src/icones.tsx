import type { ReactNode } from 'react';

/**
 * Glifos próprios do template para o que não existe em @efds-ui/icons (marca fictícia,
 * engrenagem, sair). Mesmo traço dos ícones do framework: viewBox 24, traço 2, currentColor.
 */
function Glifo({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const MarcaIcon = () => (
  <Glifo>
    <path d="M12 2 3 7v10l9 5 9-5V7z" />
    <path d="M3 7l9 5 9-5M12 12v10" />
  </Glifo>
);

export const EngrenagemIcon = () => (
  <Glifo>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
  </Glifo>
);

export const SairIcon = () => (
  <Glifo>
    <path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 16l-4-4 4-4M6 12h10" />
  </Glifo>
);

export const ConfereIcon = () => (
  <Glifo>
    <path d="M5 12l5 5 9-10" />
  </Glifo>
);

export const AtencaoIcon = () => (
  <Glifo>
    <path d="M12 8v4M12 16h.01" />
  </Glifo>
);
