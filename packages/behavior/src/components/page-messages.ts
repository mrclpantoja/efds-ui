import { format, getMessages } from '../core/config';

/**
 * Textos (pt-BR) dos módulos de página e feedback: copiar, notificações, alterações não salvas e
 * sessão. Moram aqui para os módulos compilarem sozinhos; os mesmos nomes são chaves de
 * `Messages` (`configure({ messages })`): se o autor trocar uma, a troca vale.
 */
export const pageMessageDefaults = {
  /** Copiar. */
  copyDone: 'Copiado',
  copyAnnounce: 'Copiado para a área de transferência.',
  copyFailed: 'Não foi possível copiar. Selecione o texto e use Ctrl+C.',
  /** Notificações: nome do botão com a contagem (`{count}`). */
  notificationsNone: 'Notificações, nenhuma não lida',
  notificationsOne: 'Notificações, 1 não lida',
  notificationsMany: 'Notificações, {count} não lidas',
  notificationsAllRead: 'Todas as notificações marcadas como lidas.',
  /** Tema por cor (demonstração): `{ratio}`. */
  themeReport: 'Contraste do texto sobre a ação: {ratio}:1 (mínimo 4,5:1).',
  themeAdjusted: 'A cor foi ajustada para atingir o contraste.',
  /** Alterações não salvas. */
  dirtyTitle: 'Alterações não salvas',
  dirtyMessage: 'Há alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.',
  dirtyLeave: 'Sair sem salvar',
  dirtyStay: 'Continuar editando',
  /** Sessão por inatividade: `{time}` é a duração falada ("1 minuto e 5 segundos"). */
  sessionTitle: 'Sua sessão vai expirar',
  sessionBody:
    'Por inatividade, você será desconectado em {time}. Alterações não salvas serão perdidas.',
  sessionContinue: 'Continuar conectado',
  sessionLeave: 'Sair',
  sessionAnnounce: 'A sessão expira em {time}.',
  sessionExpired: 'Sessão encerrada por inatividade.',
  sessionSecondOne: '{count} segundo',
  sessionSecondMany: '{count} segundos',
  sessionMinuteOne: '{count} minuto',
  sessionMinuteMany: '{count} minutos',
  sessionAnd: ' e ',
  /** Envio de formulário. */
  submitBusy: 'Enviando…',
  submitSuccess: 'Salvo',
  submitError: 'Não foi possível salvar',
} as const;

export type PageMessageKey = keyof typeof pageMessageDefaults;

/** Texto configurado (`configure({ messages })`) ou o padrão deste módulo, com `{chave}` trocado. */
export function pm(key: PageMessageKey, values: Record<string, string | number> = {}): string {
  const configured = (getMessages() as unknown as Record<string, string | undefined>)[key];
  return format(configured ?? pageMessageDefaults[key], values);
}
