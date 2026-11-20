import { useEffect, useRef, useState } from 'react';
import { Dropdown, DropdownItem, DropdownSeparator } from '../Dropdown';
import { MoreHorizontalGlyph } from '../../internal/glyphs-g';
import type { TreeTexts } from './texts';
import type { TreeNodeData } from './tree-ops';

export interface TreeActionHandlers {
  addChild: (id: string) => void;
  addSibling: (id: string) => void;
  addParent: (id: string) => void;
  rename: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  indent: (id: string) => void;
  outdent: (id: string) => void;
  remove: (id: string) => void;
}

/** Botão "⋯" e menu (disclosure do Dropdown). Os itens só existem com o menu aberto. */
export function TreeActions({
  node,
  texts,
  handlers,
  first,
  last,
  level,
  takeMenuFocus,
  onClosed,
}: {
  node: TreeNodeData;
  texts: TreeTexts;
  handlers: TreeActionHandlers;
  first: boolean;
  last: boolean;
  level: number;
  /** Id do nó cujo menu foi aberto pelo teclado (o foco vai ao primeiro item). */
  takeMenuFocus: (id: string) => boolean;
  onClosed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open || !takeMenuFocus(node.id)) return;
    menu.current?.querySelector<HTMLElement>('.eds-dropdown-item')?.focus();
  }, [open, takeMenuFocus, node.id]);

  const { id } = node;
  const item = (text: string, run: (id: string) => void, disabled = false) => (
    <DropdownItem disabled={disabled} onClick={() => run(id)}>
      {text}
    </DropdownItem>
  );
  return (
    <Dropdown
      ref={menu}
      trigger={
        <button
          type="button"
          className="eds-tree-action"
          tabIndex={-1}
          aria-label={texts.actionsFor(node.label)}
        >
          <MoreHorizontalGlyph />
        </button>
      }
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClosed();
      }}
    >
      {open ? (
        <>
          {item(texts.addChild, handlers.addChild)}
          {item(texts.addSibling, handlers.addSibling)}
          {item(texts.addParent, handlers.addParent)}
          {item(texts.rename, handlers.rename)}
          <DropdownSeparator />
          {item(texts.moveUp, handlers.moveUp, first)}
          {item(texts.moveDown, handlers.moveDown, last)}
          {item(texts.outdent, handlers.outdent, level === 1)}
          {item(texts.indent, handlers.indent, first)}
          <DropdownSeparator />
          <DropdownItem variant="danger" onClick={() => handlers.remove(id)}>
            {texts.remove}
          </DropdownItem>
        </>
      ) : null}
    </Dropdown>
  );
}
