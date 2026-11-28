/**
 * Textos do Gerenciador de arquivos (pt-BR). Modelos com `{chave}`; plural por par `...One`/`...Many`.
 * No HTML entram em `configure({ messages })`; no React, em `texts`.
 */
export interface FilesTexts {
  filesLabel: string;
  filesRootLabel: string;
  filesPathLabel: string;
  filesTreeLabel: string;
  filesTreeOpen: string;
  filesTreeExpand: string;
  filesTreeCollapse: string;
  filesSearchLabel: string;
  filesSearchAll: string;
  filesNewFolder: string;
  filesUpload: string;
  filesViewLabel: string;
  filesViewList: string;
  filesViewGrid: string;
  filesTrash: string;
  filesBackToFiles: string;
  filesPaste: string;
  filesClose: string;
  filesCancel: string;
  filesLoading: string;
  filesLoadMore: string;
  // Colunas e cabeçalhos
  filesColName: string;
  filesColSize: string;
  filesColModified: string;
  filesColType: string;
  filesColDeleted: string;
  filesColOrigin: string;
  filesColActions: string;
  filesTableCaption: string;
  filesTrashCaption: string;
  filesSelectAll: string;
  filesSelectItem: string;
  filesActionsFor: string;
  filesTypeFolder: string;
  filesTypePdf: string;
  filesTypeImage: string;
  filesTypeVideo: string;
  filesTypeAudio: string;
  filesTypeText: string;
  filesTypeOther: string;
  // Ações
  filesOpen: string;
  filesDownload: string;
  filesRename: string;
  filesCut: string;
  filesCopy: string;
  filesMoveTo: string;
  filesCopyTo: string;
  filesVersions: string;
  filesDelete: string;
  filesRestore: string;
  filesDeleteForever: string;
  filesEmptyTrash: string;
  // Lote
  filesBulkLabel: string;
  filesBulkCountOne: string;
  filesBulkCountMany: string;
  filesBulkClear: string;
  // Estados
  filesEmptyTitle: string;
  filesEmptyText: string;
  filesEmptySearchTitle: string;
  filesEmptySearchText: string;
  filesTrashEmptyTitle: string;
  filesTrashEmptyText: string;
  filesErrorTitle: string;
  filesErrorText: string;
  filesRetry: string;
  filesForbiddenTitle: string;
  filesForbiddenText: string;
  // Anúncios
  filesFolderStatusOne: string;
  filesFolderStatusMany: string;
  filesFolderStatusEmpty: string;
  filesTrashStatusOne: string;
  filesTrashStatusMany: string;
  filesTrashStatusEmpty: string;
  filesSearchStatusOne: string;
  filesSearchStatusMany: string;
  filesSearchStatusNone: string;
  filesMovedOne: string;
  filesMovedMany: string;
  filesCopiedOne: string;
  filesCopiedMany: string;
  filesSkipped: string;
  filesCutOne: string;
  filesCutMany: string;
  filesClipboardCopiedOne: string;
  filesClipboardCopiedMany: string;
  filesDeletedOne: string;
  filesDeletedMany: string;
  filesDeletedForeverOne: string;
  filesDeletedForeverMany: string;
  filesTrashEmptied: string;
  filesUndo: string;
  filesRestoredOne: string;
  filesRestoredMany: string;
  filesRenamed: string;
  filesFolderCreated: string;
  filesUploadingOne: string;
  filesUploadingMany: string;
  filesUploadedOne: string;
  filesUploadedMany: string;
  filesUploadFailedOne: string;
  filesUploadFailedMany: string;
  filesSortedBy: string;
  filesSortAscending: string;
  filesSortDescending: string;
  // Diálogos
  filesNameLabel: string;
  filesNewFolderTitle: string;
  filesRenameTitle: string;
  filesCreate: string;
  filesSave: string;
  filesNameEmpty: string;
  filesNameChars: string;
  filesNameDots: string;
  filesNameLong: string;
  filesConflictTitle: string;
  filesConflictText: string;
  filesConflictReplace: string;
  filesConflictKeepBoth: string;
  filesConflictSkip: string;
  filesConflictAll: string;
  filesPickTitleMove: string;
  filesPickTitleCopy: string;
  filesPickText: string;
  filesPickMove: string;
  filesPickCopy: string;
  filesPickCurrent: string;
  filesInvalidTarget: string;
  filesConfirmDeleteTitle: string;
  filesConfirmDeleteOne: string;
  filesConfirmDeleteMany: string;
  filesConfirmEmptyTitle: string;
  filesConfirmEmptyText: string;
  // Versões
  filesVersionsTitle: string;
  filesVersionsLoading: string;
  filesVersionsEmpty: string;
  filesVersionCurrent: string;
  filesVersionBy: string;
  filesVersionPreview: string;
  filesVersionDownload: string;
  filesVersionRestore: string;
  filesVersionRestored: string;
  // Envio
  filesDropHint: string;
  filesDropInto: string;
  filesUploadsTitle: string;
  filesUploadWaiting: string;
  filesUploadDone: string;
  filesUploadCancel: string;
  filesUploadDismiss: string;
  filesUploadTooLarge: string;
  filesUploadTypeNotAllowed: string;
  // Erros por código
  filesErrNotFound: string;
  filesErrForbidden: string;
  filesErrConflict: string;
  filesErrInvalidName: string;
  filesErrTooLarge: string;
  filesErrTypeNotAllowed: string;
  filesErrQuota: string;
  filesErrUnsupported: string;
  filesErrInternal: string;
  filesErrNetwork: string;
  filesErrAborted: string;
}

export const defaultFilesTexts: FilesTexts = {
  filesLabel: 'Gerenciador de arquivos',
  filesRootLabel: 'Arquivos',
  filesPathLabel: 'Local',
  filesTreeLabel: 'Pastas',
  filesTreeOpen: 'Pastas',
  filesTreeExpand: 'Expandir {name}',
  filesTreeCollapse: 'Recolher {name}',
  filesSearchLabel: 'Buscar nesta pasta',
  filesSearchAll: 'Em todas as pastas',
  filesNewFolder: 'Nova pasta',
  filesUpload: 'Enviar',
  filesViewLabel: 'Modo de exibição',
  filesViewList: 'Lista',
  filesViewGrid: 'Grade',
  filesTrash: 'Lixeira',
  filesBackToFiles: 'Voltar aos arquivos',
  filesPaste: 'Colar aqui',
  filesClose: 'Fechar',
  filesCancel: 'Cancelar',
  filesLoading: 'Carregando arquivos',
  filesLoadMore: 'Carregar mais',
  filesColName: 'Nome',
  filesColSize: 'Tamanho',
  filesColModified: 'Modificado',
  filesColType: 'Tipo',
  filesColDeleted: 'Excluído em',
  filesColOrigin: 'Local de origem',
  filesColActions: 'Ações',
  filesTableCaption: 'Conteúdo da pasta {name}',
  filesTrashCaption: 'Itens da lixeira',
  filesSelectAll: 'Selecionar todos',
  filesSelectItem: 'Selecionar {name}',
  filesActionsFor: 'Ações de {name}',
  filesTypeFolder: 'Pasta',
  filesTypePdf: 'PDF',
  filesTypeImage: 'Imagem',
  filesTypeVideo: 'Vídeo',
  filesTypeAudio: 'Áudio',
  filesTypeText: 'Texto',
  filesTypeOther: 'Arquivo',
  filesOpen: 'Abrir',
  filesDownload: 'Baixar',
  filesRename: 'Renomear',
  filesCut: 'Recortar',
  filesCopy: 'Copiar',
  filesMoveTo: 'Mover para…',
  filesCopyTo: 'Copiar para…',
  filesVersions: 'Versões',
  filesDelete: 'Excluir',
  filesRestore: 'Restaurar',
  filesDeleteForever: 'Excluir definitivamente',
  filesEmptyTrash: 'Esvaziar lixeira',
  filesBulkLabel: 'Ações da seleção',
  filesBulkCountOne: '1 selecionado',
  filesBulkCountMany: '{count} selecionados',
  filesBulkClear: 'Limpar seleção',
  filesEmptyTitle: 'Esta pasta está vazia',
  filesEmptyText: 'Envie arquivos ou crie uma pasta.',
  filesEmptySearchTitle: 'Nada encontrado',
  filesEmptySearchText: 'Nenhum item corresponde a "{query}".',
  filesTrashEmptyTitle: 'A lixeira está vazia',
  filesTrashEmptyText: 'Os itens excluídos aparecem aqui.',
  filesErrorTitle: 'Não foi possível carregar os arquivos',
  filesErrorText: 'Verifique a conexão e tente novamente.',
  filesRetry: 'Tentar de novo',
  filesForbiddenTitle: 'Sem permissão para ver esta pasta',
  filesForbiddenText: 'Peça acesso a quem administra os arquivos.',
  filesFolderStatusOne: 'Pasta {name}: 1 item.',
  filesFolderStatusMany: 'Pasta {name}: {count} itens.',
  filesFolderStatusEmpty: 'Pasta {name}: vazia.',
  filesTrashStatusOne: 'Lixeira: 1 item.',
  filesTrashStatusMany: 'Lixeira: {count} itens.',
  filesTrashStatusEmpty: 'Lixeira: vazia.',
  filesSearchStatusOne: '1 resultado.',
  filesSearchStatusMany: '{count} resultados.',
  filesSearchStatusNone: 'Nenhum resultado.',
  filesMovedOne: '1 item movido para {target}.',
  filesMovedMany: '{count} itens movidos para {target}.',
  filesCopiedOne: '1 item copiado para {target}.',
  filesCopiedMany: '{count} itens copiados para {target}.',
  filesSkipped: '{count} ignorados por já existirem.',
  filesCutOne: '1 item recortado. Vá à pasta de destino e use Colar.',
  filesCutMany: '{count} itens recortados. Vá à pasta de destino e use Colar.',
  filesClipboardCopiedOne: '1 item copiado. Vá à pasta de destino e use Colar.',
  filesClipboardCopiedMany: '{count} itens copiados. Vá à pasta de destino e use Colar.',
  filesDeletedOne: 'Item excluído: {name}. Desfazer disponível.',
  filesDeletedMany: '{count} itens excluídos. Desfazer disponível.',
  filesDeletedForeverOne: 'Item excluído definitivamente: {name}.',
  filesDeletedForeverMany: '{count} itens excluídos definitivamente.',
  filesTrashEmptied: 'Lixeira esvaziada.',
  filesUndo: 'Desfazer',
  filesRestoredOne: '1 item restaurado.',
  filesRestoredMany: '{count} itens restaurados.',
  filesRenamed: '{old} renomeado para {name}.',
  filesFolderCreated: 'Pasta {name} criada.',
  filesUploadingOne: 'Enviando 1 arquivo.',
  filesUploadingMany: 'Enviando {count} arquivos.',
  filesUploadedOne: '1 arquivo enviado.',
  filesUploadedMany: '{count} arquivos enviados.',
  filesUploadFailedOne: '1 arquivo não foi enviado.',
  filesUploadFailedMany: '{count} arquivos não foram enviados.',
  filesSortedBy: 'Ordenado por {column}, {direction}.',
  filesSortAscending: 'crescente',
  filesSortDescending: 'decrescente',
  filesNameLabel: 'Nome',
  filesNewFolderTitle: 'Nova pasta',
  filesRenameTitle: 'Renomear',
  filesCreate: 'Criar',
  filesSave: 'Salvar',
  filesNameEmpty: 'Informe um nome.',
  filesNameChars: 'O nome não pode ter barras nem caracteres de controle.',
  filesNameDots: 'O nome não pode começar com ponto.',
  filesNameLong: 'O nome tem mais de 255 caracteres.',
  filesConflictTitle: 'Já existe um item com este nome',
  filesConflictText: '"{name}" já existe no destino. O que fazer?',
  filesConflictReplace: 'Substituir',
  filesConflictKeepBoth: 'Manter os dois',
  filesConflictSkip: 'Pular',
  filesConflictAll: 'Aplicar a todos os {count} restantes',
  filesPickTitleMove: 'Mover para…',
  filesPickTitleCopy: 'Copiar para…',
  filesPickText: 'Escolha a pasta de destino.',
  filesPickMove: 'Mover para cá',
  filesPickCopy: 'Copiar para cá',
  filesPickCurrent: 'Destino: {name}',
  filesInvalidTarget: 'Não é possível colocar uma pasta dentro dela mesma.',
  filesConfirmDeleteTitle: 'Excluir definitivamente?',
  filesConfirmDeleteOne: '"{name}" será excluído para sempre. Esta ação não pode ser desfeita.',
  filesConfirmDeleteMany:
    '{count} itens serão excluídos para sempre. Esta ação não pode ser desfeita.',
  filesConfirmEmptyTitle: 'Esvaziar a lixeira?',
  filesConfirmEmptyText: 'Todos os itens da lixeira serão excluídos para sempre.',
  filesVersionsTitle: 'Versões de {name}',
  filesVersionsLoading: 'Carregando versões',
  filesVersionsEmpty: 'Este arquivo não tem versões anteriores.',
  filesVersionCurrent: 'Atual',
  filesVersionBy: 'por {author}',
  filesVersionPreview: 'Visualizar',
  filesVersionDownload: 'Baixar',
  filesVersionRestore: 'Restaurar esta versão',
  filesVersionRestored: 'Versão de {date} restaurada.',
  filesDropHint: 'Solte os arquivos para enviar',
  filesDropInto: 'Solte para enviar para {name}',
  filesUploadsTitle: 'Envios',
  filesUploadWaiting: 'Na fila',
  filesUploadDone: 'Enviado',
  filesUploadCancel: 'Cancelar envio de {name}',
  filesUploadDismiss: 'Limpar lista de envios',
  filesUploadTooLarge: 'Maior que o limite de {size}.',
  filesUploadTypeNotAllowed: 'Tipo de arquivo não permitido.',
  filesErrNotFound: 'Item não encontrado.',
  filesErrForbidden: 'Você não tem permissão para isso.',
  filesErrConflict: 'Já existe um item com este nome.',
  filesErrInvalidName: 'Nome inválido.',
  filesErrTooLarge: 'O arquivo é maior que o permitido.',
  filesErrTypeNotAllowed: 'Tipo de arquivo não permitido.',
  filesErrQuota: 'O espaço de armazenamento acabou.',
  filesErrUnsupported: 'O servidor não oferece esta operação.',
  filesErrInternal: 'Erro no servidor. Tente de novo em instantes.',
  filesErrNetwork: 'Sem conexão com o servidor.',
  filesErrAborted: 'Operação cancelada.',
};

/** Substitui `{chave}`. */
export function fill(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? String(values[key]) : m,
  );
}

/** `One`/`Many` pela contagem: `plural(t, 'filesMoved', 3, { target })`. */
export function plural(
  texts: FilesTexts,
  base: string,
  count: number,
  values: Record<string, string | number> = {},
): string {
  const key = `${base}${count === 1 ? 'One' : 'Many'}`;
  const template = (texts as unknown as Record<string, string>)[key] ?? '';
  return fill(template, { count, ...values });
}
