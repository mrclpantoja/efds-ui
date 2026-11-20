import { bindAll, type Behavior } from '../core/registry';

/**
 * Accordion: o `<details>` nativo faz tudo; só o item indisponível precisa de ajuda. Um
 * `summary[aria-disabled="true"]` não alterna (clique, Enter e Espaço chegam como `click`).
 */
export const accordionBehavior: Behavior = {
  name: 'accordion',
  selector: '.eds-accordion',
  bind(root) {
    const onClick = (event: Event) => {
      const trigger = (event.target as Element).closest('summary[aria-disabled="true"]');
      if (trigger && root.contains(trigger)) event.preventDefault();
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};

export function initAccordion(root: ParentNode = document): () => void {
  return bindAll(root, [accordionBehavior]);
}
