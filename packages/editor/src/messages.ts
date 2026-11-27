/** Textos do editor (pt-BR por padrão). Sem efeitos colaterais: só estado de módulo. */

export interface EditorTexts {
  /** Nome do conteúdo quando o textarea não tem rótulo. */
  contentLabel: string;
  toolbarLabel: string;
  groupHistory: string;
  groupText: string;
  groupAlign: string;
  groupLists: string;
  groupInsert: string;
  undo: string;
  redo: string;
  blockStyle: string;
  paragraph: string;
  heading2: string;
  heading3: string;
  heading4: string;
  font: string;
  fontSans: string;
  fontSerif: string;
  fontMono: string;
  bold: string;
  italic: string;
  underline: string;
  strike: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  bulletList: string;
  orderedList: string;
  link: string;
  clearFormat: string;
  table: string;
  tableInsert: string;
  tableRowBefore: string;
  tableRowAfter: string;
  tableColBefore: string;
  tableColAfter: string;
  tableDeleteRow: string;
  tableDeleteCol: string;
  tableDelete: string;
  /** Anúncios curtos (região `role=status`). */
  tableInserted: string;
  tableDeleted: string;
  rowInserted: string;
  rowDeleted: string;
  colInserted: string;
  colDeleted: string;
  formatCleared: string;
  linkApplied: string;
  linkRemoved: string;
  /** Diálogo do link. */
  linkDialogTitle: string;
  linkAddress: string;
  linkText: string;
  linkApply: string;
  linkCancel: string;
  linkRemove: string;
  linkRequired: string;
  linkInvalid: string;
  /** Campo obrigatório vazio no envio. */
  required: string;
}

export const defaultMessages: EditorTexts = {
  contentLabel: 'Conteúdo',
  toolbarLabel: 'Formatação',
  groupHistory: 'Desfazer',
  groupText: 'Estilo do texto',
  groupAlign: 'Alinhamento',
  groupLists: 'Listas',
  groupInsert: 'Inserir',
  undo: 'Desfazer',
  redo: 'Refazer',
  blockStyle: 'Estilo do bloco',
  paragraph: 'Parágrafo',
  heading2: 'Título 2',
  heading3: 'Título 3',
  heading4: 'Título 4',
  font: 'Fonte',
  fontSans: 'Sem serifa',
  fontSerif: 'Com serifa',
  fontMono: 'Monoespaçada',
  bold: 'Negrito',
  italic: 'Itálico',
  underline: 'Sublinhado',
  strike: 'Tachado',
  alignLeft: 'Alinhar à esquerda',
  alignCenter: 'Centralizar',
  alignRight: 'Alinhar à direita',
  alignJustify: 'Justificar',
  bulletList: 'Lista com marcadores',
  orderedList: 'Lista numerada',
  link: 'Link',
  clearFormat: 'Limpar formatação',
  table: 'Tabela',
  tableInsert: 'Inserir tabela 3×3',
  tableRowBefore: 'Inserir linha acima',
  tableRowAfter: 'Inserir linha abaixo',
  tableColBefore: 'Inserir coluna à esquerda',
  tableColAfter: 'Inserir coluna à direita',
  tableDeleteRow: 'Excluir linha',
  tableDeleteCol: 'Excluir coluna',
  tableDelete: 'Excluir tabela',
  tableInserted: 'Tabela inserida.',
  tableDeleted: 'Tabela excluída.',
  rowInserted: 'Linha inserida.',
  rowDeleted: 'Linha removida.',
  colInserted: 'Coluna inserida.',
  colDeleted: 'Coluna removida.',
  formatCleared: 'Formatação removida.',
  linkApplied: 'Link aplicado.',
  linkRemoved: 'Link removido.',
  linkDialogTitle: 'Link',
  linkAddress: 'Endereço',
  linkText: 'Texto',
  linkApply: 'Aplicar',
  linkCancel: 'Cancelar',
  linkRemove: 'Remover link',
  linkRequired: 'Informe o endereço do link.',
  linkInvalid: 'Endereço inválido. Use http, https, mailto, tel ou um caminho do próprio site.',
  required: 'Preencha o conteúdo.',
};

let current: EditorTexts = { ...defaultMessages };

/** Troca textos de forma global (vale para os editores criados depois). */
export function configure(options: { messages?: Partial<EditorTexts> }): void {
  if (options.messages) current = { ...current, ...definedOnly(options.messages) };
}

export function resetMessages(): void {
  current = { ...defaultMessages };
}

export function getMessages(extra?: Partial<EditorTexts>): EditorTexts {
  return extra ? { ...current, ...definedOnly(extra) } : current;
}

function definedOnly(messages: Partial<EditorTexts>): Partial<EditorTexts> {
  const out: Partial<EditorTexts> = {};
  for (const key of Object.keys(messages) as (keyof EditorTexts)[]) {
    const value = messages[key];
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}
