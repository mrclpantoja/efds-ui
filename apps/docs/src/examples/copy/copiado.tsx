import { Button } from '@efds-ui/react';

/** Estado "copiado" estático, só para ver o visual: o CopyButton aplica `data-copied` por 2 s. */
export default function Copiado() {
  return (
    <Button size="sm" className="eds-copy" data-copied="true">
      <svg
        className="eds-copy-icon-idle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 012-2h9" />
      </svg>
      <svg
        className="eds-copy-icon-done"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        aria-hidden="true"
      >
        <path d="M5 12l5 5 9-10" />
      </svg>
      <span className="eds-copy-label">Copiado</span>
    </Button>
  );
}
