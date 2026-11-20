import { forwardRef, useId, type HTMLAttributes, type ReactElement, type Ref } from 'react';
import { cx } from '../../utils/cx';
import {
  SortableContext,
  useSortableCore,
  type SortableChange,
  type SortableItemData,
  type SortableTexts,
} from './core';
import { SortableAnnouncements } from './Sortable';

export interface SortableGroupProps<T extends SortableItemData = SortableItemData> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange'
> {
  /** Itens de cada lista, por chave (a `id` do `Sortable` filho). */
  lists: Record<string, T[]>;
  /** Novas listas, quando o usuário solta (inclusive entre listas). */
  onChange?: (lists: Record<string, T[]>, change: SortableChange) => void;
  /** Nome do grupo (`data-eds-group`). Padrão: gerado. */
  group?: string;
  texts?: Partial<SortableTexts>;
}

/**
 * Agrupa `Sortable`s que trocam itens entre si (quadro/kanban). No teclado, ←/→ (ou ↑/↓ na
 * orientação horizontal) passam o item pego à lista vizinha. O `onChange` traz todas as listas.
 */
export const SortableGroup = forwardRef(function SortableGroup(
  {
    lists,
    onChange,
    group,
    texts,
    className,
    children,
    ...rest
  }: SortableGroupProps<SortableItemData>,
  ref: Ref<HTMLDivElement>,
) {
  const generated = useId();
  const core = useSortableCore(lists, texts, (next, change) => onChange?.(next, change));
  return (
    <SortableContext.Provider value={{ core, lists, group: group ?? generated }}>
      <div {...rest} ref={ref} className={cx(className)}>
        {children}
        <SortableAnnouncements core={core} />
      </div>
    </SortableContext.Provider>
  );
}) as unknown as (<T extends SortableItemData>(
  props: SortableGroupProps<T> & { ref?: Ref<HTMLDivElement> },
) => ReactElement | null) & { displayName?: string };
SortableGroup.displayName = 'SortableGroup';
