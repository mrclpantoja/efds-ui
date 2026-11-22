import { createEditor, getEditor, type CreateEditorOptions } from './bind';

const SELECTOR = 'textarea[data-eds-editor]';

/**
 * Liga todo `textarea[data-eds-editor]` de `root` (e dos que entrarem depois). Devolve
 * `destroy()`: desliga os editores criados por esta chamada e para o observador.
 */
export function initEditors(
  root: ParentNode = document,
  options: CreateEditorOptions = {},
): () => void {
  const mine = new Set<HTMLTextAreaElement>();

  const bind = (textarea: HTMLTextAreaElement) => {
    if (getEditor(textarea)) return;
    createEditor(textarea, options);
    mine.add(textarea);
  };
  const scan = (node: ParentNode) => {
    if (node instanceof HTMLTextAreaElement && node.matches(SELECTOR)) bind(node);
    for (const el of node.querySelectorAll<HTMLTextAreaElement>(SELECTOR)) bind(el);
  };
  scan(root);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const added of record.addedNodes) {
        if (added instanceof Element) scan(added);
      }
    }
    // Textarea removido do documento: libera o editor.
    for (const textarea of mine) {
      if (!textarea.isConnected) {
        getEditor(textarea)?.destroy();
        mine.delete(textarea);
      }
    }
  });
  const base = root instanceof Document ? root.documentElement : (root as Node);
  observer.observe(base, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    for (const textarea of mine) getEditor(textarea)?.destroy();
    mine.clear();
  };
}
