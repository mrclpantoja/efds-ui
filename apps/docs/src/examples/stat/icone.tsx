import { Stat, StatGrid } from '@efds-ui/react';

const Icone = ({ d }: { d: string }) => (
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

export default function ComIcone() {
  return (
    <StatGrid>
      <Stat
        label="Usuários ativos"
        value="1.284"
        delta="4,2%"
        trend="up"
        tone="success"
        meta="vs. outubro"
        icon={
          <Icone d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8" />
        }
      />
      <Stat
        label="Chamados resolvidos no prazo"
        value="92%"
        delta="0%"
        meta="vs. outubro"
        icon={<Icone d="M20 6L9 17l-5-5" />}
        iconTone="success"
      />
      <Stat
        label="Chamados atrasados"
        value="37"
        delta="6"
        trend="up"
        tone="danger"
        meta="vs. outubro"
        icon={
          <Icone d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        }
        iconTone="warning"
      />
    </StatGrid>
  );
}
