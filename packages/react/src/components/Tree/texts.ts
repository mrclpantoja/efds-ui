export interface TreeTexts {
  newItem: string;
  actionsFor: (label: string) => string;
  renameLabel: (label: string) => string;
  addChild: string;
  addSibling: string;
  addParent: string;
  rename: string;
  moveUp: string;
  moveDown: string;
  outdent: string;
  indent: string;
  remove: string;
  /** Título do diálogo e texto do botão de excluir. */
  deleteTitle: string;
  confirmDelete: (label: string, descendants: number) => string;
  /** Anúncio da exclusão; `descendants` = subitens que saíram junto. */
  deleted: (label: string, descendants: number) => string;
  /** Dica anexada ao anúncio e ao toast da exclusão (atalho de desfazer). */
  undoHint: string;
  /** Falou ao dar o primeiro nome a um item recém-criado. */
  addedNamed: (label: string) => string;
  added: (label: string, level: number, position: number, size: number) => string;
  undo: string;
  restored: (label: string) => string;
  cannotMove: string;
  loading: string;
  /** Falha ao carregar filhos (anúncio): cita o nó. */
  loadError: (label: string) => string;
  /** Texto visível no nó que falhou ao carregar. */
  loadErrorInline: string;
  renamed: (label: string) => string;
  emptyName: (previous: string) => string;
  position: (
    label: string,
    level: number,
    position: number,
    size: number,
    parent?: string,
  ) => string;
  dropInvalid: string;
}

export const defaultTreeTexts: TreeTexts = {
  newItem: 'Novo item',
  actionsFor: (label) => `Ações de ${label}`,
  renameLabel: (label) => `Renomear ${label}`,
  addChild: 'Adicionar filho',
  addSibling: 'Adicionar irmão',
  addParent: 'Adicionar pai',
  rename: 'Renomear',
  moveUp: 'Mover para cima',
  moveDown: 'Mover para baixo',
  outdent: 'Recuar nível',
  indent: 'Avançar nível',
  remove: 'Excluir',
  deleteTitle: 'Excluir',
  confirmDelete: (label, n) => `Excluir "${label}" e ${n} ${n === 1 ? 'subitem' : 'subitens'}?`,
  deleted: (label, n) =>
    n === 0
      ? `Item excluído: ${label}.`
      : `Item excluído: ${label} e ${n} ${n === 1 ? 'subitem' : 'subitens'}.`,
  undoHint: 'Ctrl+Z desfaz.',
  addedNamed: (label) => `Item adicionado: ${label}.`,
  added: (label, level, position, size) =>
    `Item adicionado: ${label}. Nível ${level}, posição ${position} de ${size}.`,
  undo: 'Desfazer',
  restored: (label) => `Item restaurado: ${label}.`,
  cannotMove: 'Não é possível mover nessa direção.',
  loading: 'Carregando…',
  loadError: (label) =>
    `Não foi possível carregar os itens de ${label}. Pressione → para tentar de novo.`,
  loadErrorInline: 'Não foi possível carregar. → tenta de novo.',
  renamed: (label) => `Item renomeado: ${label}.`,
  emptyName: (previous) => `O nome não pode ficar vazio. Mantido: ${previous}.`,
  position: (label, level, position, size, parent) =>
    `${label}: nível ${level}, posição ${position} de ${size}${parent ? `, dentro de ${parent}` : ''}.`,
  dropInvalid: 'Não é possível soltar um item dentro dele mesmo ou de um subitem.',
};
