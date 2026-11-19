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
};

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
