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

  // Um único seletor combinado: uma varredura por nó em vez de uma por comportamento.
  const combined = behaviors.map((b) => b.selector).join(',');

  const scan = (node: ParentNode) => {
    const found: HTMLElement[] = [];
    if (node instanceof HTMLElement) found.push(node);
    try {
      for (const el of node.querySelectorAll<HTMLElement>(combined)) found.push(el);
    } catch {
      // Seletor combinado inválido: cai na varredura por comportamento.
      for (const behavior of behaviors) {
        for (const el of node.querySelectorAll<HTMLElement>(behavior.selector)) found.push(el);
      }
    }
    for (const el of found) {
      for (const behavior of behaviors) {
        if (safeMatches(el, behavior.selector)) bindOne(behavior, el);
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
  // O MutationObserver já entrega os registros em lote (um callback por microtask); não adiamos
  // para rAF para que o comportamento esteja ligado antes da primeira pintura.
  const observer = new MutationObserver((records) => {
    const added = new Set<HTMLElement>();
    const removedRoots: Node[] = [];
    for (const record of records) {
      for (const node of record.removedNodes) removedRoots.push(node);
      for (const node of record.addedNodes) if (node instanceof HTMLElement) added.add(node);
    }
    // Descarta nós cujo ancestral também está no lote (a varredura do ancestral já os cobre).
    for (const node of added) {
      for (let p = node.parentElement; p; p = p.parentElement) {
        if (added.has(p)) {
          added.delete(node);
          break;
        }
      }
    }
    for (const node of added) if (node.isConnected) scan(node);
    if (removedRoots.length > 0 && owned.size > 0) {
      // Só desliga o que de fato saiu do `root` (mover um nó = remover + inserir), olhando
      // apenas os elementos ligados contidos nos nós removidos.
      for (const node of removedRoots) {
        if (!(node instanceof HTMLElement)) continue;
        const candidates: HTMLElement[] = [node];
        try {
          for (const el of node.querySelectorAll<HTMLElement>(combined)) candidates.push(el);
        } catch {
          for (const el of owned.keys()) if (node.contains(el)) candidates.push(el);
        }
        for (const el of candidates) {
          if (owned.has(el) && !container.contains(el)) unbind(el);
        }
      }
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
