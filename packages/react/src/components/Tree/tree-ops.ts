import type { ReactNode } from 'react';

export interface TreeNodeData {
  id: string;
  label: string;
  children?: TreeNodeData[];
  /** Ícone opcional (decorativo) antes do rótulo. */
  icon?: ReactNode;
  /** Tem filhos que ainda não foram carregados (use com `loadChildren` da Tree). */
  hasChildren?: boolean;
}

export interface Located {
  node: TreeNodeData;
  parent: TreeNodeData | null;
  siblings: TreeNodeData[];
  index: number;
  level: number;
}

export function locate(
  items: TreeNodeData[],
  id: string,
  parent: TreeNodeData | null = null,
  level = 1,
): Located | null {
  for (let index = 0; index < items.length; index += 1) {
    const node = items[index]!;
    if (node.id === id) return { node, parent, siblings: items, index, level };
    if (node.children?.length) {
      const found = locate(node.children, id, node, level + 1);
      if (found) return found;
    }
  }
  return null;
}

export function descendantCount(node: TreeNodeData): number {
  return (node.children ?? []).reduce((sum, child) => sum + 1 + descendantCount(child), 0);
}

/** `node` ou algum descendente dele tem esse id? */
export function containsId(node: TreeNodeData, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((child) => containsId(child, id));
}

function withChildren(node: TreeNodeData, children: TreeNodeData[]): TreeNodeData {
  const next: TreeNodeData = { ...node, children };
  if (children.length === 0) {
    delete next.children;
    delete next.hasChildren;
  }
  return next;
}

export function mapNode(
  items: TreeNodeData[],
  id: string,
  fn: (node: TreeNodeData) => TreeNodeData,
): TreeNodeData[] {
  return items.map((node) => {
    if (node.id === id) return fn(node);
    if (!node.children?.length) return node;
    const children = mapNode(node.children, id, fn);
    return children === node.children ? node : { ...node, children };
  });
}

export function removeNode(items: TreeNodeData[], id: string): TreeNodeData[] {
  const out: TreeNodeData[] = [];
  for (const node of items) {
    if (node.id === id) continue;
    if (node.children?.length) {
      const children = removeNode(node.children, id);
      out.push(children === node.children ? node : withChildren(node, children));
    } else {
      out.push(node);
    }
  }
  return out;
}

/** Insere `node` em `index` dos filhos de `parentId` (`null` = raiz). */
export function insertNode(
  items: TreeNodeData[],
  parentId: string | null,
  index: number,
  node: TreeNodeData,
): TreeNodeData[] {
  const put = (list: TreeNodeData[]) => {
    const copy = [...list];
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, node);
    return copy;
  };
  if (parentId === null) return put(items);
  return mapNode(items, parentId, (parent) => ({
    ...parent,
    children: put(parent.children ?? []),
  }));
}

export interface FlatNode {
  node: TreeNodeData;
  parent: TreeNodeData | null;
  level: number;
}

/** Nós visíveis, em ordem de documento (filhos só dos expandidos). */
export function flatten(
  items: TreeNodeData[],
  expanded: ReadonlySet<string>,
  parent: TreeNodeData | null = null,
  level = 1,
): FlatNode[] {
  const out: FlatNode[] = [];
  for (const node of items) {
    out.push({ node, parent, level });
    if (node.children?.length && expanded.has(node.id)) {
      out.push(...flatten(node.children, expanded, node, level + 1));
    }
  }
  return out;
}

export function idsWithChildren(items: TreeNodeData[]): string[] {
  return items.flatMap((node) =>
    node.children?.length ? [node.id, ...idsWithChildren(node.children)] : [],
  );
}

/** Estrutura em JSON puro (sem ícones), para o campo oculto do formulário. */
export function toJson(
  items: TreeNodeData[],
): { id: string; label: string; children?: unknown[] }[] {
  return items.map((node) => ({
    id: node.id,
    label: node.label,
    ...(node.children?.length ? { children: toJson(node.children) } : {}),
  }));
}

/** Tem filhos (carregados ou ainda por carregar)? */
export function isParent(node: TreeNodeData): boolean {
  return (node.children?.length ?? 0) > 0 || (node.hasChildren === true && !node.children);
}

/** Filhos ainda não carregados. */
export function isLazy(node: TreeNodeData): boolean {
  return node.hasChildren === true && !node.children;
}

/** Sobrepõe os filhos já carregados (por id) aos nós preguiçosos. */
export function applyLoaded(
  items: TreeNodeData[],
  loaded: Readonly<Record<string, TreeNodeData[]>>,
): TreeNodeData[] {
  if (Object.keys(loaded).length === 0) return items;
  return items.map((node) => {
    if (isLazy(node) && loaded[node.id]) {
      return { ...node, children: applyLoaded(loaded[node.id]!, loaded) };
    }
    if (!node.children?.length) return node;
    return { ...node, children: applyLoaded(node.children, loaded) };
  });
}
