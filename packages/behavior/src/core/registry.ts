import { safeMatches } from './dom';

/** Um comportamento: liga elementos que casam com `selector` e devolve a limpeza de cada um. */
export interface Behavior {
  name: string;
  selector: string;
  bind: (el: HTMLElement) => (() => void) | void;
}

/** Elementos já ligados, por comportamento: cada elemento é ligado uma única vez. */
const claims = new WeakMap<Element, Set<string>>();

/**
 * Liga os `behaviors` em tudo que existe em `root` e observa o que entra e sai depois
 * (parciais do servidor, htmx, Turbo, Livewire). Nada fora de `root` é tocado.
 * Devolve `destroy()`: desliga tudo e para o observador.
 */
export function bindAll(root: ParentNode, behaviors: readonly Behavior[]): () => void {
  const owned = new Map<HTMLElement, Map<Behavior, () => void>>();

  const bindOne = (behavior: Behavior, el: HTMLElement) => {
    let names = claims.get(el);
    if (names?.has(behavior.name)) return;
    if (!names) {
      names = new Set();
      claims.set(el, names);
    }
    names.add(behavior.name);
    const cleanup = behavior.bind(el) ?? (() => undefined);
    let mine = owned.get(el);
    if (!mine) {
      mine = new Map();
      owned.set(el, mine);
    }
    mine.set(behavior, cleanup);
  };

  const scan = (node: ParentNode) => {
    for (const behavior of behaviors) {
      if (node instanceof HTMLElement && safeMatches(node, behavior.selector)) {
        bindOne(behavior, node);
      }
      for (const el of node.querySelectorAll<HTMLElement>(behavior.selector)) {
        bindOne(behavior, el);
      }
    }
  };

  const unbind = (el: HTMLElement) => {
    const mine = owned.get(el);
    if (!mine) return;
    for (const [behavior, cleanup] of mine) {
      cleanup();
      claims.get(el)?.delete(behavior.name);
    }
    owned.delete(el);
  };

  scan(root);

  const container = root as unknown as Node;
  const observer = new MutationObserver((records) => {
    let removed = false;
    for (const record of records) {
      if (record.removedNodes.length > 0) removed = true;
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) scan(node);
      }
    }
    if (removed) {
      // Só desliga o que de fato saiu do `root` (mover um nó = remover + inserir).
      for (const el of [...owned.keys()]) if (!container.contains(el)) unbind(el);
    }
  });
  observer.observe(container, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    for (const el of [...owned.keys()]) unbind(el);
  };
}

/** Sistema global (toast, loader): liga na primeira aquisição e desliga ao liberar a última. */
export function refCounted(setup: () => () => void): () => () => void {
  let count = 0;
  let teardown: (() => void) | null = null;
  return () => {
    if (count === 0) teardown = setup();
    count += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      count -= 1;
      if (count === 0) {
        teardown?.();
        teardown = null;
      }
    };
  };
}
