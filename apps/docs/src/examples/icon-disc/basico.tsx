import { IconDisc } from '@efds-ui/react';

const svg = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export default function Basico() {
  return (
    <>
      <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-4">
        <IconDisc>{svg('M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z')}</IconDisc>
        <IconDisc tone="neutral">{svg('M4 6h16M4 12h16M4 18h16')}</IconDisc>
        <IconDisc tone="info">{svg('M12 8h.01M11 12h1v5h1')}</IconDisc>
        <IconDisc tone="success">{svg('M5 12l5 5 9-10')}</IconDisc>
        <IconDisc tone="warning">{svg('M12 8v5M12 17h.01')}</IconDisc>
        <IconDisc tone="danger">{svg('M6 6l12 12M18 6L6 18')}</IconDisc>
      </div>

      <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-4">
        <IconDisc size="sm">{svg('M12 5v14M5 12h14')}</IconDisc>
        <IconDisc round tone="success">
          {svg('M5 12l5 5 9-10')}
        </IconDisc>
        <IconDisc size="lg" tone="info">
          {svg('M12 8h.01M11 12h1v5h1')}
        </IconDisc>
      </div>

      <h1 className="eds-page-title">
        <IconDisc>{svg('M4 7h16v12H4zM9 7V4h6v3')}</IconDisc>
        <span>Contas a pagar</span>
      </h1>
    </>
  );
}
