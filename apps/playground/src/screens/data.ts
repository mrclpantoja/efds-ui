/*
 * Dados 100% fictícios das telas de referência. Nomes inventados ("… Exemplo"), códigos
 * sequenciais, nenhum documento, e-mail ou telefone real. Gerados de forma determinística.
 */

export type Situacao = 'ativo' | 'pendente' | 'inativo' | 'bloqueado';

export const situacoes: Record<
  Situacao,
  { label: string; badge: 'success' | 'warning' | 'neutral' | 'danger' }
> = {
  ativo: { label: 'Ativo', badge: 'success' },
  pendente: { label: 'Pendente', badge: 'warning' },
  inativo: { label: 'Inativo', badge: 'neutral' },
  bloqueado: { label: 'Bloqueado', badge: 'danger' },
};

export const segmentos = ['Comércio', 'Serviços', 'Indústria', 'Logística', 'Tecnologia'] as const;
export type Segmento = (typeof segmentos)[number];

export interface Cliente {
  id: string;
  nome: string;
  segmento: Segmento;
  situacao: Situacao;
  /** ISO yyyy-mm-dd */
  ultimoPedido: string;
  total: number;
}

const prefixos = [
  'Aurora',
  'Atlas',
  'Bússola',
  'Cedro',
  'Delta',
  'Estrela',
  'Farol',
  'Granito',
  'Horizonte',
  'Ipê',
  'Jade',
  'Lótus',
  'Mirante',
  'Nascente',
  'Órbita',
  'Prisma',
];
const sufixos = ['Comércio', 'Serviços', 'Indústria', 'Logística', 'Tecnologia', 'Distribuidora'];
const ordemSituacao: Situacao[] = ['ativo', 'ativo', 'pendente', 'ativo', 'inativo', 'bloqueado'];

function isoDate(dayOfYear: number): string {
  const date = new Date(Date.UTC(2026, 0, 1 + dayOfYear));
  return date.toISOString().slice(0, 10);
}

/** 86 clientes: (prefixo, sufixo) é único para i < 96. */
export const clientes: Cliente[] = Array.from({ length: 86 }, (_, i) => {
  const sufixo = sufixos[(i + Math.floor(i / 16)) % sufixos.length] ?? 'Comércio';
  return {
    id: `CLI-${String(i + 1).padStart(4, '0')}`,
    nome: `${prefixos[i % prefixos.length]} ${sufixo} Exemplo`,
    segmento: segmentos[(i * 7) % segmentos.length] ?? 'Comércio',
    situacao: ordemSituacao[(i * 5) % ordemSituacao.length] ?? 'ativo',
    ultimoPedido: isoDate((i * 37) % 300),
    total: ((i * 7919) % 90000) + 1500 + ((i * 13) % 100) / 100,
  };
});

export const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
export const formatarData = (iso: string) => dataBr.format(new Date(`${iso}T00:00:00Z`));
