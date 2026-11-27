/** Dados fictícios do template (os mesmos da versão HTML). */

export const usuario = {
  nome: 'Ana Exemplo',
  cargo: 'Administradora do sistema',
  email: 'ana.exemplo@exemplo.com.br',
  telefone: '(11) 90000-0000',
  unidade: 'tecnologia',
} as const;

export const unidades = [
  { value: 'tecnologia', label: 'Departamento de Tecnologia' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'compras', label: 'Compras' },
  { value: 'planejamento', label: 'Planejamento' },
] as const;

export const indicadores = [
  {
    label: 'Usuários ativos',
    value: '1.284',
    delta: '4,2%',
    trend: 'up',
    tone: 'success',
    meta: 'vs. outubro',
  },
  {
    label: 'Chamados abertos',
    value: '37',
    delta: '12%',
    trend: 'down',
    tone: 'success',
    meta: 'vs. outubro',
  },
  {
    label: 'Tempo médio de resposta',
    value: '2 h 14 min',
    delta: '8%',
    trend: 'up',
    tone: 'danger',
    meta: 'vs. outubro',
  },
  {
    label: 'Satisfação',
    value: '92%',
    delta: '0 ponto',
    trend: 'flat',
    tone: 'neutral',
    meta: 'vs. outubro',
  },
] as const;

export const situacoes = {
  atendimento: { label: 'Em atendimento', badge: 'info' },
  concluido: { label: 'Concluído', badge: 'success' },
  aguardando: { label: 'Aguardando', badge: 'warning' },
  atrasado: { label: 'Atrasado', badge: 'danger' },
} as const;

export const chamados = [
  {
    protocolo: 'CH-2026-0418',
    assunto: 'Acesso ao sistema de protocolo',
    situacao: 'atendimento',
    unidade: 'Financeiro',
    abertura: '20/11/2026',
  },
  {
    protocolo: 'CH-2026-0417',
    assunto: 'Troca de senha de rede',
    situacao: 'concluido',
    unidade: 'Recursos Humanos',
    abertura: '20/11/2026',
  },
  {
    protocolo: 'CH-2026-0415',
    assunto: 'Impressora sem conexão',
    situacao: 'aguardando',
    unidade: 'Almoxarifado',
    abertura: '19/11/2026',
  },
  {
    protocolo: 'CH-2026-0412',
    assunto: 'Falha no envio de relatório',
    situacao: 'atrasado',
    unidade: 'Planejamento',
    abertura: '18/11/2026',
  },
  {
    protocolo: 'CH-2026-0409',
    assunto: 'Novo usuário no módulo de compras',
    situacao: 'concluido',
    unidade: 'Compras',
    abertura: '17/11/2026',
  },
] as const;

export const metas = [
  { id: 'meta-prazo', label: 'Chamados atendidos no prazo', value: 86, tone: 'success' },
  { id: 'meta-cadastros', label: 'Cadastros revisados', value: 64, tone: undefined },
  { id: 'meta-treinamento', label: 'Equipe treinada no novo módulo', value: 41, tone: undefined },
  { id: 'meta-armazenamento', label: 'Armazenamento usado', value: 78, tone: 'warning' },
] as const;

export const acessos = [
  { unidade: 'Departamento de Tecnologia', usuarios: 48, hoje: 312 },
  { unidade: 'Financeiro', usuarios: 126, hoje: 498 },
  { unidade: 'Recursos Humanos', usuarios: 64, hoje: 201 },
  { unidade: 'Compras', usuarios: 39, hoje: 157 },
  { unidade: 'Planejamento', usuarios: 22, hoje: 64 },
] as const;

export const atividades = [
  {
    id: 'a1',
    title: 'Permissão concedida',
    text: 'Perfil "Gestor" atribuído a Bruno Exemplo.',
    actor: 'por Ana Exemplo',
    time: '22/11/2026 09:40',
    dateTime: '2026-11-22T09:40',
    tone: 'success',
  },
  {
    id: 'a2',
    title: 'Tentativas de acesso bloqueadas',
    text: 'Cinco tentativas seguidas com senha incorreta na conta carla.exemplo.',
    actor: 'por Sistema',
    time: '22/11/2026 08:15',
    dateTime: '2026-11-22T08:15',
    tone: 'warning',
  },
  {
    id: 'a3',
    title: 'Relatório mensal gerado',
    actor: 'por Sistema',
    time: '21/11/2026 18:00',
    dateTime: '2026-11-21T18:00',
    tone: undefined,
  },
  {
    id: 'a4',
    title: 'Unidade cadastrada',
    text: 'Almoxarifado passou a ter painel próprio.',
    actor: 'por Diego Exemplo',
    time: '21/11/2026 11:20',
    dateTime: '2026-11-21T11:20',
    tone: undefined,
  },
] as const;

export interface Notificacao {
  id: string;
  title: string;
  text?: string;
  time: string;
  dateTime: string;
  unread: boolean;
}

export const notificacoesIniciais: Notificacao[] = [
  {
    id: 'n1',
    title: 'Chamado CH-2026-0418 atribuído a você',
    text: 'Acesso ao sistema de protocolo, unidade Financeiro.',
    time: 'há 10 minutos',
    dateTime: '2026-11-22T09:50',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Relatório mensal de acessos disponível',
    text: 'O arquivo fica disponível por 7 dias.',
    time: 'há 1 hora',
    dateTime: '2026-11-22T09:00',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Manutenção programada no sábado',
    text: 'O sistema ficará indisponível das 22h às 23h.',
    time: 'há 3 horas',
    dateTime: '2026-11-22T07:00',
    unread: true,
  },
  {
    id: 'n4',
    title: 'Senha alterada',
    text: 'Se não foi você, avise a equipe de suporte.',
    time: 'ontem',
    dateTime: '2026-11-21T16:30',
    unread: false,
  },
  {
    id: 'n5',
    title: 'Novo usuário cadastrado: Bruno Exemplo',
    text: 'Unidade Compras.',
    time: '20/11/2026',
    dateTime: '2026-11-20T10:05',
    unread: false,
  },
  {
    id: 'n6',
    title: 'Cópia de segurança semanal concluída',
    time: '19/11/2026',
    dateTime: '2026-11-19T03:00',
    unread: false,
  },
];

export const ultimoAcesso = [
  { label: 'Último acesso', value: '22/11/2026 08:12' },
  { label: 'Perfil de acesso', value: 'Administrador' },
  { label: 'Unidade', value: 'Departamento de Tecnologia' },
  { label: 'Conta criada em', value: '03/02/2025' },
] as const;
