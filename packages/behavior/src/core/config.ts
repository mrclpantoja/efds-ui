/** Textos e configuração global. Sem efeitos colaterais: só estado de módulo. */

export interface Messages {
  /** Botão de fechar do toast. */
  toastClose: string;
  /** Prefixos ocultos de severidade do toast sem `title`. */
  severityInfo: string;
  severitySuccess: string;
  severityWarning: string;
  severityDanger: string;
  /** Anúncio da ordenação: `{column}` e `{direction}`. */
  sortedBy: string;
  sortAscending: string;
  sortDescending: string;
  /** Anúncio da seleção: `{count}`. */
  selectedNone: string;
  selectedOne: string;
  selectedMany: string;
  /** Há linhas marcadas ocultas pelo filtro: `{count}` na busca e `{total}` no total. */
  selectedInSearchNone: string;
  selectedInSearchOne: string;
  selectedInSearchMany: string;
  /** Filtro da Table: `{count}` e `{query}`. */
  tableFilterMany: string;
  tableFilterOne: string;
  tableFilterNone: string;
  tableFilterCleared: string;
  tableFilterClearedOne: string;
  tableFilterEmpty: string;
  /** Ao limpar o filtro com seleção: `{count}` marcadas. */
  tableFilterSelectedOne: string;
  tableFilterSelectedMany: string;
  /** Combobox: `{count}`. */
  comboResultsMany: string;
  comboResultsOne: string;
  comboNoResults: string;
  comboError: string;
  /** PageLoader: título e texto padrão, e a saída quando demora demais. */
  loaderTitle: string;
  loaderText: string;
  loaderSlowText: string;
  loaderClose: string;
  loaderContinue: string;
  /** Combobox: texto sem escolha (validação), carregando e escolha (`{label}`). */
  comboboxInvalid: string;
  comboLoading: string;
  comboSelected: string;
  /** MultiSelect: `{label}` e `{max}`; o resumo reutiliza `selectedNone/One/Many`. */
  comboMultiSelected: string;
  comboMultiRemoved: string;
  comboMultiRequired: string;
  comboMaxReached: string;
  comboMaxReachedOne: string;
  comboTagRemove: string;
  /** FileUpload: `{name}`, `{size}`, `{count}`, `{max}`, `{reason}`. */
  uploadAddedOne: string;
  uploadAddedMany: string;
  uploadRemoved: string;
  uploadSent: string;
  uploadRejected: string;
  uploadMaxFiles: string;
  uploadMaxFilesOne: string;
  uploadTooLarge: string;
  uploadBadType: string;
  uploadFailed: string;
  uploadSending: string;
  uploadDone: string;
  uploadRemove: string;
  uploadRetry: string;
  uploadRetryLabel: string;
  uploadDuplicate: string;
  uploadNotAddedOne: string;
  uploadNotAddedMany: string;
  uploadSingleOnly: string;
  uploadFailedPending: string;
  uploadSendingLabel: string;
  uploadBusy: string;
  uploadRequired: string;
  /** DatePicker e DateRangePicker: textos (`{date}`, `{min}`, `{max}`, `{start}`, `{end}`). */
  dateChoose: string;
  rangeChoose: string;
  datePrevMonth: string;
  dateNextMonth: string;
  dateMonth: string;
  dateYear: string;
  dateToday: string;
  dateClose: string;
  dateInvalid: string;
  dateBetween: string;
  dateFrom: string;
  dateUntil: string;
  dateBlocked: string;
  dateUnavailable: string;
  dateSelected: string;
  rangeStart: string;
  rangePeriod: string;
  rangeEndBeforeStart: string;
  rangeMaxDays: string;
  rangeMaxDaysOne: string;
  rangeNeedStart: string;
  rangeNeedEnd: string;
  dateInvalidShortYear: string;
  dateCurrent: string;
  rangeCurrent: string;
  rangeStartLabel: string;
  rangeEndLabel: string;
  // Diálogos rápidos
  dialogOk: string;
  dialogCancel: string;
  dialogConfirm: string;
  dialogRequired: string;
  // Sortable: `{label}`, `{pos}`, `{total}`, `{list}`
  sortableHelp: string;
  sortableListDefault: string;
  sortableGrabbed: string;
  sortablePosition: string;
  sortableMovedList: string;
  sortableDropped: string;
  sortableCancelled: string;
  sortableNoList: string;
  // Tree: `{label}`, `{level}`, `{pos}`, `{size}`, `{parent}`, `{count}`
  treeLoading: string;
  treeLoadError: string;
  treeNodeLoadError: string;
  treeNodeLoadErrorInline: string;
  treeNewItem: string;
  treeRenameLabel: string;
  treeRenamed: string;
  treeNameEmpty: string;
  treeAdded: string;
  treeDeleteTitle: string;
  treeDeleteConfirmOne: string;
  treeDeleteConfirmMany: string;
  treeDeleted: string;
  treeDeletedOneChild: string;
  treeDeletedChildren: string;
  treeUndoHint: string;
  treeAddedNamed: string;
  treeUndo: string;
  treeRestored: string;
  treeMoved: string;
  treeMovedIn: string;
  treeCannotMove: string;
  treeDropInvalid: string;
  treeActions: string;
  treeMenuAddChild: string;
  treeMenuAddSibling: string;
  treeMenuAddParent: string;
  treeMenuRename: string;
  treeMenuMoveUp: string;
  treeMenuMoveDown: string;
  treeMenuIndent: string;
  treeMenuOutdent: string;
  treeMenuDelete: string;
  // Exportação
  /** Nome padrão do arquivo e da planilha; `Sim`/`Não` dos valores lógicos. */
  exportFilename: string;
  exportSheet: string;
  exportYes: string;
  exportNo: string;
  /** PDF: `{date}`, `{page}`, `{total}`. */
  exportGeneratedAt: string;
  exportPage: string;
  exportNoRows: string;
  /** Status: `{name}` e `{count}`. */
  exportDone: string;
  exportDoneOne: string;
  exportEmpty: string;
  exportFailed: string;
  // Wizard: `{current}`, `{total}`, `{title}`; sufixos ocultos das etapas do Stepper
  wizardStep: string;
  wizardStepComplete: string;
  wizardStepError: string;
  wizardStepUntitled: string;
  wizardSummary: string;
  // Barra de filtros: `{label}`, `{count}`
  filterChips: string;
  filterRemove: string;
  filterRemoved: string;
  filterCleared: string;
  filterCountNone: string;
  filterCountOne: string;
  filterCountMany: string;
  filterMoreCount: string;
  // Senha: `{level}`
  passwordShow: string;
  passwordStrength: string;
  passwordStrengthEmpty: string;
  passwordStrengthAnnounce: string;
  passwordLevel1: string;
  passwordLevel2: string;
  passwordLevel3: string;
  passwordLevel4: string;
  passwordRuleMet: string;
  passwordRuleUnmet: string;
  // Código de verificação (OTP): `{n}`, `{total}`
  otpCell: string;
  otpCellChar: string;
  // NumberInput: `{value}`
  numberDecrement: string;
  numberIncrement: string;
  numberAdjusted: string;
  // Lookup: `{code}`, `{description}`
  lookupSearch: string;
  lookupCode: string;
  lookupDescription: string;
  lookupSelect: string;
  lookupSelectLabel: string;
  lookupLoading: string;
  lookupNotFound: string;
  lookupError: string;
  lookupRetry: string;
  lookupClose: string;
  lookupTitle: string;
  // Máscaras com validação opcional
  maskInvalidTime: string;
  maskInvalidCompetence: string;
  maskInvalidProcess: string;
  // CEP
  cepLoading: string;
  cepNotFound: string;
  cepError: string;
  cepRetry: string;
  cepFilled: string;
  // Página e feedback (copiar, notificações, tema, alterações não salvas, sessão)
  copyDone: string;
  copyAnnounce: string;
  copyFailed: string;
  notificationsNone: string;
  notificationsOne: string;
  notificationsMany: string;
  notificationsAllRead: string;
  themeReport: string;
  themeAdjusted: string;
  dirtyTitle: string;
  dirtyMessage: string;
  dirtyLeave: string;
  dirtyStay: string;
  sessionTitle: string;
  sessionBody: string;
  sessionContinue: string;
  sessionLeave: string;
  sessionAnnounce: string;
  sessionExpired: string;
  sessionSecond: string;
  sessionSeconds: string;
  sessionMinute: string;
  sessionMinutes: string;
  sessionAnd: string;
}

export const defaultMessages: Messages = {
  toastClose: 'Fechar notificação',
  severityInfo: 'Informação:',
  severitySuccess: 'Sucesso:',
  severityWarning: 'Atenção:',
  severityDanger: 'Erro:',
  sortedBy: 'Ordenado por {column}, {direction}.',
  sortAscending: 'crescente',
  sortDescending: 'decrescente',
  selectedNone: 'Nenhum item selecionado.',
  selectedOne: '1 item selecionado.',
  selectedMany: '{count} itens selecionados.',
  selectedInSearchNone: 'Nenhum item selecionado nesta busca, {total} no total.',
  selectedInSearchOne: '1 item selecionado nesta busca, {total} no total.',
  selectedInSearchMany: '{count} itens selecionados nesta busca, {total} no total.',
  tableFilterMany: '{count} resultados.',
  tableFilterOne: '1 resultado.',
  tableFilterNone: 'Nenhum resultado.',
  tableFilterCleared: 'Filtro removido. {count} linhas.',
  tableFilterClearedOne: 'Filtro removido. 1 linha.',
  tableFilterEmpty: 'Nenhum resultado para "{query}".',
  tableFilterSelectedOne: '1 selecionado.',
  tableFilterSelectedMany: '{count} selecionados.',
  comboResultsMany: '{count} resultados disponíveis.',
  comboResultsOne: '1 resultado disponível.',
  comboNoResults: 'Nenhum resultado.',
  comboError: 'Não foi possível carregar as opções.',
  loaderTitle: 'Carregando…',
  loaderText: 'Aguarde um instante.',
  loaderSlowText: 'Está demorando mais que o esperado.',
  loaderClose: 'Fechar',
  loaderContinue: 'Continuar aguardando',
  comboboxInvalid: 'Escolha uma das opções da lista.',
  comboLoading: 'Carregando…',
  comboSelected: '{label} selecionado.',
  comboMultiSelected: '{label}: selecionado.',
  comboMultiRemoved: '{label}: removido.',
  comboMultiRequired: 'Escolha ao menos uma opção.',
  comboMaxReached: 'Limite de {max} itens atingido.',
  comboMaxReachedOne: 'Limite de 1 item atingido.',
  comboTagRemove: 'Remover {label}',
  uploadAddedOne: '{name} adicionado.',
  uploadAddedMany: '{count} arquivos adicionados.',
  uploadRemoved: '{name} removido.',
  uploadSent: '{name} enviado.',
  uploadRejected: '{name}: {reason}.',
  uploadMaxFiles: 'Limite de {max} arquivos atingido.',
  uploadMaxFilesOne: 'Limite de 1 arquivo atingido.',
  uploadTooLarge: 'Arquivo maior que {size}',
  uploadBadType: 'Tipo não permitido',
  uploadFailed: 'Falha no envio',
  uploadSending: 'Enviando {percent}%',
  uploadDone: 'Enviado',
  uploadRemove: 'Remover {name}',
  uploadRetry: 'Tentar de novo',
  uploadRetryLabel: 'Tentar de novo {name}',
  uploadDuplicate: '{name} já foi adicionado.',
  uploadNotAddedOne: '1 arquivo não adicionado.',
  uploadNotAddedMany: '{count} arquivos não adicionados.',
  uploadSingleOnly: 'Só um arquivo é aceito.',
  uploadFailedPending: 'Há arquivos com falha no envio. Tente de novo ou remova.',
  uploadSendingLabel: 'Enviando {name}',
  uploadBusy: 'Aguarde o envio dos arquivos.',
  uploadRequired: 'Envie ao menos um arquivo.',
  dateChoose: 'Escolher data',
  rangeChoose: 'Escolher período',
  datePrevMonth: 'Mês anterior',
  dateNextMonth: 'Próximo mês',
  dateMonth: 'Mês',
  dateYear: 'Ano',
  dateToday: 'Hoje',
  dateClose: 'Fechar',
  dateInvalid: 'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
  dateBetween: 'Escolha uma data entre {min} e {max}.',
  dateFrom: 'Escolha uma data a partir de {min}.',
  dateUntil: 'Escolha uma data até {max}.',
  dateBlocked: 'Data indisponível.',
  dateUnavailable: '{date}: data indisponível.',
  dateSelected: 'Data selecionada: {date}.',
  rangeStart: 'Início: {start}. Escolha a data final.',
  rangePeriod: 'Período: {start} a {end}.',
  rangeEndBeforeStart: 'A data final deve ser igual ou posterior à inicial.',
  rangeMaxDays: 'O período pode ter no máximo {max} dias.',
  rangeMaxDaysOne: 'O período pode ter no máximo 1 dia.',
  rangeNeedStart: 'Informe também a data inicial.',
  rangeNeedEnd: 'Informe também a data final.',
  dateInvalidShortYear: 'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
  dateCurrent: '{label}. Atual: {value}',
  rangeCurrent: '{label}. Atual: {start} a {end}',
  rangeStartLabel: 'início do período',
  rangeEndLabel: 'fim do período',
  // Diálogos rápidos
  dialogOk: 'OK',
  dialogCancel: 'Cancelar',
  dialogConfirm: 'Confirmar',
  dialogRequired: 'Preencha este campo.',
  // Sortable
  sortableHelp: 'Espaço pega o item; setas movem; Espaço solta; Esc cancela.',
  sortableListDefault: 'esta lista',
  sortableGrabbed:
    '{label} pego. Posição {pos} de {total} em {list}. Use as setas para mover, Espaço para soltar, Esc para cancelar.',
  sortablePosition: 'Posição {pos} de {total}.',
  sortableMovedList: 'Em {list}, posição {pos} de {total}.',
  sortableDropped: '{label} solto na posição {pos} de {total} em {list}.',
  sortableCancelled: 'Movimento cancelado.',
  sortableNoList: 'Não há outra lista nessa direção.',
  // Tree
  treeLoading: 'Carregando…',
  treeLoadError: 'Não foi possível carregar a árvore.',
  treeNodeLoadError:
    'Não foi possível carregar os itens de {label}. Pressione → para tentar de novo.',
  treeNodeLoadErrorInline: 'Não foi possível carregar. → tenta de novo.',
  treeNewItem: 'Novo item',
  treeRenameLabel: 'Renomear {label}',
  treeRenamed: 'Item renomeado: {label}.',
  treeNameEmpty: 'O nome não pode ficar vazio. Mantido: {label}.',
  treeAdded: 'Item adicionado: {label}. Nível {level}, posição {pos} de {size}.',
  treeAddedNamed: 'Item adicionado: {label}.',
  treeDeleteTitle: 'Excluir',
  treeDeleteConfirmOne: 'Excluir "{label}" e 1 subitem?',
  treeDeleteConfirmMany: 'Excluir "{label}" e {count} subitens?',
  treeDeleted: 'Item excluído: {label}.',
  treeDeletedOneChild: 'Item excluído: {label} e 1 subitem.',
  treeDeletedChildren: 'Item excluído: {label} e {count} subitens.',
  treeUndoHint: 'Ctrl+Z desfaz.',
  treeUndo: 'Desfazer',
  treeRestored: 'Item restaurado: {label}.',
  treeMoved: '{label}: nível {level}, posição {pos} de {size}.',
  treeMovedIn: '{label}: nível {level}, posição {pos} de {size}, dentro de {parent}.',
  treeCannotMove: 'Não é possível mover nessa direção.',
  treeDropInvalid: 'Não é possível soltar um item dentro dele mesmo ou de um subitem.',
  treeActions: 'Ações de {label}',
  treeMenuAddChild: 'Adicionar filho',
  treeMenuAddSibling: 'Adicionar irmão',
  treeMenuAddParent: 'Adicionar pai',
  treeMenuRename: 'Renomear',
  treeMenuMoveUp: 'Mover para cima',
  treeMenuMoveDown: 'Mover para baixo',
  treeMenuIndent: 'Avançar nível',
  treeMenuOutdent: 'Recuar nível',
  treeMenuDelete: 'Excluir',
  // Exportação
  exportFilename: 'tabela',
  exportSheet: 'Dados',
  exportYes: 'Sim',
  exportNo: 'Não',
  exportGeneratedAt: 'Gerado em {date}',
  exportPage: 'Página {page} de {total}',
  exportNoRows: 'Nenhum registro.',
  exportDone: 'Arquivo {name} gerado ({count} linhas).',
  exportDoneOne: 'Arquivo {name} gerado (1 linha).',
  exportEmpty: 'Não há linhas para exportar.',
  exportFailed: 'Não foi possível gerar o arquivo.',
  // Wizard
  wizardStep: 'Etapa {current} de {total}: {title}.',
  wizardStepComplete: ' (concluída)',
  wizardStepError: ' (com erro)',
  wizardStepUntitled: 'sem título',
  wizardSummary: 'Etapa {current} de {total}',
  // Barra de filtros
  filterChips: 'Filtros ativos',
  filterRemove: ' — remover',
  filterRemoved: 'Filtro removido: {label}.',
  filterCleared: 'Filtros removidos.',
  filterCountNone: 'Nenhum filtro ativo.',
  filterCountOne: '1 filtro ativo.',
  filterCountMany: '{count} filtros ativos.',
  filterMoreCount: '({count})',
  // Senha
  passwordShow: 'Mostrar senha',
  passwordStrength: 'Força: {level}',
  passwordStrengthEmpty: 'Força: não avaliada',
  passwordStrengthAnnounce: 'Força da senha: {level}.',
  passwordLevel1: 'fraca',
  passwordLevel2: 'razoável',
  passwordLevel3: 'boa',
  passwordLevel4: 'forte',
  passwordRuleMet: 'Atendida: ',
  passwordRuleUnmet: 'Pendente: ',
  // Código de verificação
  otpCell: 'Dígito {n} de {total}',
  otpCellChar: 'Caractere {n} de {total}',
  // NumberInput
  numberDecrement: 'Diminuir',
  numberIncrement: 'Aumentar',
  numberAdjusted: 'Valor ajustado para {value}.',
  // Lookup
  lookupSearch: 'Buscar',
  lookupCode: 'Código',
  lookupDescription: 'Descrição',
  lookupSelect: 'Selecionar',
  lookupSelectLabel: 'Selecionar {code}, {description}',
  lookupLoading: 'Buscando…',
  lookupNotFound: 'Código não encontrado.',
  lookupError: 'Não foi possível buscar. Tente de novo.',
  lookupRetry: 'Tentar de novo',
  lookupClose: 'Fechar',
  lookupTitle: 'Buscar',
  // Máscaras com validação opcional
  maskInvalidTime: 'Hora inválida. Use hh:mm, de 00:00 a 23:59.',
  maskInvalidCompetence: 'Competência inválida. Use mm/aaaa, com o mês de 01 a 12.',
  maskInvalidProcess: 'Número de processo inválido. Confira o número e o dígito verificador.',
  // CEP
  cepLoading: 'Buscando CEP…',
  cepNotFound: 'CEP não encontrado.',
  cepError: 'Não foi possível consultar o CEP.',
  cepRetry: 'Tentar de novo',
  cepFilled: 'Endereço preenchido.',
  // Página e feedback
  copyDone: 'Copiado',
  copyAnnounce: 'Copiado para a área de transferência.',
  copyFailed: 'Não foi possível copiar. Selecione o texto e use Ctrl+C.',
  notificationsNone: 'Notificações, nenhuma não lida',
  notificationsOne: 'Notificações, 1 não lida',
  notificationsMany: 'Notificações, {count} não lidas',
  notificationsAllRead: 'Todas as notificações marcadas como lidas.',
  themeReport: 'Contraste do texto sobre a ação: {ratio}:1 (mínimo 4,5:1).',
  themeAdjusted: 'A cor foi ajustada para atingir o contraste.',
  dirtyTitle: 'Alterações não salvas',
  dirtyMessage: 'Há alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.',
  dirtyLeave: 'Sair sem salvar',
  dirtyStay: 'Continuar editando',
  sessionTitle: 'Sua sessão vai expirar',
  sessionBody:
    'Por inatividade, você será desconectado em {time}. Alterações não salvas serão perdidas.',
  sessionContinue: 'Continuar conectado',
  sessionLeave: 'Sair',
  sessionAnnounce: 'A sessão expira em {time}.',
  sessionExpired: 'Sessão encerrada por inatividade.',
  sessionSecond: '{count} segundo',
  sessionSeconds: '{count} segundos',
  sessionMinute: '{count} minuto',
  sessionMinutes: '{count} minutos',
  sessionAnd: ' e ',
};

export const DEFAULT_LOCALE = 'pt-BR';
let locale = DEFAULT_LOCALE;

/** Locale BCP 47 do `Intl`: collator da Table, nomes de mês e dia do DatePicker, formatos da exportação. */
export function getLocale(): string {
  return locale;
}

/** Troca o locale; um valor inválido para o `Intl` é ignorado. Sem argumento, volta ao padrão. */
export function setLocale(value: string | undefined): void {
  if (value === undefined) return;
  try {
    locale = Intl.getCanonicalLocales(value)[0] ?? DEFAULT_LOCALE;
  } catch {
    /* tag inválida: mantém o locale atual */
  }
}

export function resetLocale(): void {
  locale = DEFAULT_LOCALE;
}

/**
 * Serviço de consulta de CEP, com `{cep}` no lugar dos 8 dígitos. **Vazio por padrão**: sem URL
 * configurada nenhuma chamada externa é feita (o autor escolhe o serviço e responde pela LGPD).
 */
let cepUrl = '';

export function getCepUrl(): string {
  return cepUrl;
}

export function setCepUrl(value: string | undefined): void {
  if (value !== undefined) cepUrl = value;
}

export function resetCepUrl(): void {
  cepUrl = '';
}

let messages: Messages = { ...defaultMessages };

export function getMessages(): Messages {
  return messages;
}

export function setMessages(partial: Partial<Messages> | undefined): void {
  if (partial) messages = { ...messages, ...partial };
}

export function resetMessages(): void {
  messages = { ...defaultMessages };
}

/** Substitui `{chave}` pelos valores. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
