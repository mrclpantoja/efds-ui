/*
 * Dados FICTÍCIOS do template Cadastro (Fornecedores): nenhuma pessoa ou empresa real, documentos
 * e contatos inventados (example.com). Em produção, troque por chamadas ao seu servidor.
 */

export type Situacao = 'ativo' | 'pendente' | 'inativo';
export type Tipo = 'pj' | 'pf';

export interface Cidade {
  value: string;
  label: string;
  uf: string;
}

export interface Documento {
  nome: string;
  tamanho: string;
}

export interface Evento {
  titulo: string;
  data: string;
  hora: string;
  autor: string;
  tom?: 'info' | 'success';
}

export interface Fornecedor {
  id: string;
  tipo: Tipo;
  razao: string;
  fantasia: string;
  documento: string;
  categoria: string;
  situacao: Situacao;
  motivo?: string;
  cidade: string;
  cidadeNome: string;
  uf: string;
  email: string;
  emailAlt?: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  limite: number;
  contratoEm: string;
  obs?: string;
  documentos: Documento[];
  historico: Evento[];
}

export const cidades: Cidade[] = [
  { value: 'poa', label: 'Porto Alegre', uf: 'RS' },
  { value: 'pel', label: 'Pelotas', uf: 'RS' },
  { value: 'pf', label: 'Passo Fundo', uf: 'RS' },
  { value: 'cax', label: 'Caxias do Sul', uf: 'RS' },
  { value: 'sm', label: 'Santa Maria', uf: 'RS' },
  { value: 'flo', label: 'Florianópolis', uf: 'SC' },
  { value: 'joi', label: 'Joinville', uf: 'SC' },
  { value: 'cwb', label: 'Curitiba', uf: 'PR' },
  { value: 'lon', label: 'Londrina', uf: 'PR' },
  { value: 'spo', label: 'São Paulo', uf: 'SP' },
];

export const categorias = ['Materiais', 'Serviços', 'Tecnologia', 'Transporte', 'Manutenção'];

export const situacoes: Record<
  Situacao,
  { label: string; badge: 'success' | 'warning' | 'neutral' }
> = {
  ativo: { label: 'Ativo', badge: 'success' },
  pendente: { label: 'Em análise', badge: 'warning' },
  inativo: { label: 'Inativo', badge: 'neutral' },
};

export const ufs =
  'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');

/** CEPs fictícios do serviço local (mock): 90010100 e 88010000 existem; 99999999 simula falha de rede. */
export const ceps: Record<string, Record<string, string>> = {
  '90010100': {
    logradouro: 'Rua dos Exemplos',
    bairro: 'Centro Histórico',
    localidade: 'Porto Alegre',
    uf: 'RS',
  },
  '88010000': {
    logradouro: 'Avenida Modelo',
    bairro: 'Centro',
    localidade: 'Florianópolis',
    uf: 'SC',
  },
};

// [fantasia, razão social, categoria, cidade, situação, tipo]
type Base = [string, string, string, string, Situacao, Tipo];
const BASE: Base[] = [
  ['Aurora Papelaria', 'Aurora Papelaria Exemplo Ltda.', 'Materiais', 'poa', 'ativo', 'pj'],
  ['Boreal Serviços', 'Boreal Serviços Gerais Ltda.', 'Serviços', 'pel', 'ativo', 'pj'],
  ['Cedro Alimentos', 'Cedro Alimentos Modelo S.A.', 'Materiais', 'pf', 'ativo', 'pj'],
  ['Delta Transportes', 'Delta Transportes Fictícios Ltda.', 'Transporte', 'cax', 'pendente', 'pj'],
  ['Estrela Informática', 'Estrela Informática Exemplo Ltda.', 'Tecnologia', 'sm', 'ativo', 'pj'],
  ['Faróis Manutenção', 'Faróis Manutenção Predial Ltda.', 'Manutenção', 'flo', 'inativo', 'pj'],
  ['Girassol Gráfica', 'Girassol Gráfica Modelo Ltda.', 'Serviços', 'joi', 'ativo', 'pj'],
  ['Horizonte Software', 'Horizonte Software Exemplo Ltda.', 'Tecnologia', 'cwb', 'ativo', 'pj'],
  ['Ipê Mobiliário', 'Ipê Mobiliário Fictício Ltda.', 'Materiais', 'lon', 'pendente', 'pj'],
  ['Jacarandá Logística', 'Jacarandá Logística Teste S.A.', 'Transporte', 'spo', 'ativo', 'pj'],
  ['Kappa Limpeza', 'Kappa Limpeza e Conservação Ltda.', 'Serviços', 'poa', 'ativo', 'pj'],
  ['Lumen Elétrica', 'Lumen Instalações Elétricas Ltda.', 'Manutenção', 'pel', 'inativo', 'pj'],
  ['Mirante Consultoria', 'Mirante Consultoria Exemplo S/S', 'Serviços', 'pf', 'ativo', 'pj'],
  ['Nimbus Cloud', 'Nimbus Serviços em Nuvem Ltda.', 'Tecnologia', 'cax', 'ativo', 'pj'],
  ['Ouro Verde Jardinagem', 'Ouro Verde Jardinagem Ltda.', 'Serviços', 'sm', 'pendente', 'pj'],
  ['Pampa Suprimentos', 'Pampa Suprimentos Modelo Ltda.', 'Materiais', 'flo', 'ativo', 'pj'],
  ['Quartzo Engenharia', 'Quartzo Engenharia Fictícia Ltda.', 'Manutenção', 'joi', 'ativo', 'pj'],
  ['Rio Claro Fretes', 'Rio Claro Fretes Exemplo Ltda.', 'Transporte', 'cwb', 'inativo', 'pj'],
  ['Safira Uniformes', 'Safira Uniformes Teste Ltda.', 'Materiais', 'lon', 'ativo', 'pj'],
  ['Tupã Sistemas', 'Tupã Sistemas Modelo Ltda.', 'Tecnologia', 'spo', 'ativo', 'pj'],
  ['Ana Exemplo Fotografia', 'Ana Exemplo (autônoma)', 'Serviços', 'poa', 'ativo', 'pf'],
  ['Bruno Modelo Reparos', 'Bruno Modelo (autônomo)', 'Manutenção', 'pel', 'pendente', 'pf'],
  ['Clara Teste Tradução', 'Clara Teste (autônoma)', 'Serviços', 'pf', 'ativo', 'pf'],
  ['Diego Fictício Transportes', 'Diego Fictício (autônomo)', 'Transporte', 'cax', 'inativo', 'pf'],
];

const pad = (n: number, size: number) => String(n).padStart(size, '0');

export const seed: Fornecedor[] = BASE.map(
  ([fantasia, razao, categoria, cidade, situacao, tipo], i) => {
    const c = cidades.find((x) => x.value === cidade) ?? cidades[0]!;
    const dv = pad((i * 7 + 13) % 100, 2);
    const documento =
      tipo === 'pj'
        ? `${pad(10 + i, 2)}.000.${pad(100 + i, 3)}/0001-${dv}`
        : `000.000.${pad(100 + i, 3)}-${dv}`;
    const dia = pad((i % 27) + 1, 2);
    const mes = pad((i % 12) + 1, 2);
    return {
      id: `FOR-${pad(i + 1, 4)}`,
      tipo,
      razao,
      fantasia,
      documento,
      categoria,
      situacao,
      cidade,
      cidadeNome: c.label,
      uf: c.uf,
      email: `contato${i + 1}@example.com`,
      telefone: `(51) 3000-${pad(1000 + i, 4)}`,
      cep: '90010-100',
      logradouro: 'Rua dos Exemplos',
      numero: String(100 + i),
      bairro: 'Centro',
      limite: 5000 + i * 2500,
      contratoEm: `2025-${mes}-${dia}`,
      documentos: [
        { nome: 'Contrato de fornecimento.pdf', tamanho: '184 kB' },
        { nome: 'Certidão negativa.pdf', tamanho: '92 kB' },
      ],
      historico: [
        {
          titulo: 'Cadastro atualizado',
          data: `2026-10-${dia}`,
          hora: '14:20',
          autor: 'Maria Exemplo',
          tom: 'info',
        },
        {
          titulo: 'Documentos conferidos',
          data: `2026-09-${dia}`,
          hora: '09:05',
          autor: 'João Exemplo',
          tom: 'success',
        },
        {
          titulo: 'Fornecedor cadastrado',
          data: `2025-${mes}-${dia}`,
          hora: '16:40',
          autor: 'Maria Exemplo',
        },
      ],
    };
  },
);

export const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const dataBr = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** CNPJ/CPF mascarado: tudo vira asterisco, menos os dois últimos caracteres. */
export const maskDoc = (doc: string) =>
  doc.slice(0, -2).replace(/[0-9A-Za-z]/g, '*') + doc.slice(-2);
