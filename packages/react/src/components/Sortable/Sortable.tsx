import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from '../../utils/cx';
import { GripGlyph } from '../../internal/glyphs-g';
import {
  SortableContext,
  useSortableContext,
  useSortableCore,
  type SortableChange,
  type SortableCore,
  type SortableItemData,
  type SortableOrientation,
  type SortableTexts,
} from './core';

export type { SortableChange, SortableItemData, SortableOrientation, SortableTexts };

/** Props do botão pegador (para quem desenha o próprio; o `handle` já vem pronto). */
export type SortableHandleProps = ButtonHTMLAttributes<HTMLButtonElement>;

export interface SortableRenderState {
  /** Botão pegador pronto (`null` quando `handle={false}`). */
  handle: ReactNode;
  /** Props do pegador, para montar o próprio botão. */
  handleProps: SortableHandleProps;
  /** Posição atual na lista (0 = primeiro). */
  index: number;
  /** Chave da lista que contém o item. */
  listId: string;
  /** Arrastado agora (ponteiro) ou pego (teclado). */
  dragging: boolean;
}

export interface SortableProps<T extends SortableItemData = SortableItemData> extends Omit<
  HTMLAttributes<HTMLElement>,
  'onChange' | 'children'
> {
  /** Itens. Dentro de um `SortableGroup` vêm do grupo e esta prop é ignorada. */
  items?: T[];
  /** Nova ordem, quando o usuário solta (só uma lista; no grupo use `SortableGroup`). */
  onChange?: (items: T[], change: SortableChange) => void;
  /** Conteúdo do item; o pegador vem em `state.handle`. */
  renderItem: (item: T, state: SortableRenderState) => ReactNode;
  /** Nome da lista falado nas instruções (vira o `aria-label`). */
  label: string;
  /** Chave da lista. Obrigatória dentro de um `SortableGroup`. */
  id?: string;
  /** `vertical` (padrão), `horizontal` (←/→) ou `grid` (as quatro setas). */
  orientation?: SortableOrientation;
  disabled?: boolean;
  /** Com `name`, um `<input type="hidden">` por item, na ordem, para envio de formulário. */
  name?: string;
  /** Sem pegador, o próprio item é focável e arrastável. Padrão: `true`. */
  handle?: boolean;
  /** Nome falado do item. Padrão: `item.label ?? item.id`. */
  getLabel?: (item: T) => string;
  /** `ul`/`ol` geram `li` nos itens. Padrão: `div`. */
  as?: 'div' | 'ul' | 'ol';
  texts?: Partial<SortableTexts>;
}

interface ListProps<T extends SortableItemData> extends Omit<
  SortableProps<T>,
  'id' | 'items' | 'onChange' | 'texts'
> {
  listKey: string;
  core: SortableCore;
  group: string | undefined;
  items: T[];
  listRef: Ref<HTMLElement>;
}

const labelOf = (item: SortableItemData) => item.label ?? item.id;

function SortableList<T extends SortableItemData>({
  listKey,
  listRef: ref,
  core,
  group,
  items: itemsIn,
  renderItem,
  label,
  orientation = 'vertical',
  disabled = false,
  name,
  handle = true,
  getLabel,
  as = 'div',
  className,
  ...rest
}: ListProps<T>) {
  const el = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => core.register(listKey, { el: el.current, label, orientation, disabled }));
  useImperativeHandle(ref, () => el.current as HTMLElement);

  const { ui } = core;
  const items = core.itemsOf(listKey, itemsIn) as T[];
  const active = ui.active;
  const Tag = as;
  const ItemTag = as === 'div' ? 'div' : 'li';
  const showPlaceholder = active?.mode === 'pointer' && ui.placeholder?.key === listKey;

  const nodes: ReactNode[] = [];
  let othersSeen = 0;
  let placed = false;
  const placeholder = (
    <ItemTag
      key="__placeholder"
      className="eds-sortable-placeholder"
      aria-hidden="true"
      ref={(node: HTMLElement | null) => {
        if (!node || !ui.placeholder) return;
        node.style.blockSize = `${ui.placeholder.height}px`;
        if (orientation === 'horizontal') node.style.inlineSize = `${ui.placeholder.width}px`;
      }}
    />
  );

  items.forEach((item, index) => {
    const text = getLabel ? getLabel(item) : labelOf(item);
    const off = disabled || item.disabled === true;
    const dragging = active?.id === item.id;
    const grabbed = dragging && active?.mode === 'keyboard';
    if (showPlaceholder && !placed && !dragging) {
      if (othersSeen === ui.placeholder!.index) {
        nodes.push(placeholder);
        placed = true;
      }
    }
    if (!dragging) othersSeen += 1;

    const events = {
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        if (!handle && event.target !== event.currentTarget) return;
        core.onKeyDown(event, listKey, item, text);
      },
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        const itemEl = event.currentTarget.closest<HTMLElement>('.eds-sortable-item');
        if (itemEl) core.onPointerDown(event, listKey, item, text, itemEl, !handle);
      },
      onBlur: (event: ReactFocusEvent<HTMLElement>) => core.onBlur(event, item),
    };
    const handleProps: SortableHandleProps = {
      type: 'button',
      className: 'eds-sortable-handle',
      'aria-label': core.texts.handleLabel(text),
      'aria-describedby': core.helpId,
      'aria-pressed': grabbed,
      'aria-disabled': off || undefined,
      ...events,
      // Espaço no botão dispara `click` ao soltar a tecla: não pode vazar para o formulário.
      onKeyUp: (event) => {
        if (event.key === ' ') event.preventDefault();
      },
      onClick: (event) => event.preventDefault(),
    };
    const content = renderItem(item, {
      handle: handle ? (
        <button {...handleProps}>
          <GripGlyph />
        </button>
      ) : null,
      handleProps,
      index,
      listId: listKey,
      dragging,
    });
    const itemProps = handle
      ? {}
      : {
          ...events,
          tabIndex: off ? undefined : 0,
          'aria-describedby': core.helpId,
          'data-grabbed': grabbed ? '' : undefined,
        };
    nodes.push(
      <ItemTag
        key={item.id}
        {...itemProps}
        className="eds-sortable-item"
        data-id={item.id}
        data-dragging={dragging && active?.mode === 'pointer' ? '' : undefined}
        data-eds-disabled={off ? '' : undefined}
        role={as === 'div' ? 'listitem' : undefined}
      >
        {content}
        {name ? <input type="hidden" name={name} value={item.id} /> : null}
      </ItemTag>,
    );
  });
  if (showPlaceholder && !placed) nodes.push(placeholder);

  return (
    <Tag
      {...rest}
      ref={el as Ref<never>}
      className={cx('eds-sortable', className)}
      role={as === 'div' ? 'list' : undefined}
      aria-label={label}
      data-eds-group={group}
      data-eds-orientation={orientation === 'vertical' ? undefined : orientation}
      data-eds-disabled={disabled ? '' : undefined}
      data-drop-target={ui.dropKey === listKey ? '' : undefined}
    >
      {nodes}
    </Tag>
  );
}

/** Ajuda (oculta) e região viva de uma instância do motor. */
export function SortableAnnouncements({ core }: { core: SortableCore }): ReactElement {
  return (
    <>
      <p id={core.helpId} hidden>
        {core.texts.help}
      </p>
      <span className="eds-visually-hidden" role="status">
        {core.status}
      </span>
    </>
  );
}

type SortableImplProps = SortableProps<SortableItemData>;
type ListOwn = Omit<SortableImplProps, 'id' | 'items' | 'onChange' | 'texts'>;

/** Props que vão ao elemento da lista (sem as que o componente consome). */
function ownProps(props: SortableImplProps & { fwdRef?: Ref<HTMLElement> }): ListOwn {
  const own: Partial<SortableImplProps> & { fwdRef?: unknown } = { ...props };
  delete own.id;
  delete own.items;
  delete own.onChange;
  delete own.texts;
  delete own.fwdRef;
  return own as ListOwn;
}

function Standalone(props: SortableImplProps & { fwdRef: Ref<HTMLElement> }) {
  const { fwdRef, items = [], onChange, texts, id } = props;
  const own = ownProps(props);
  const generated = useId();
  const key = id ?? generated;
  const core = useSortableCore({ [key]: items }, texts, (next, change) =>
    onChange?.(next[key] ?? [], change),
  );
  return (
    <SortableContext.Provider value={{ core, lists: null, group: key }}>
      <SortableList
        {...own}
        listRef={fwdRef}
        listKey={key}
        core={core}
        group={undefined}
        items={items}
      />
      <SortableAnnouncements core={core} />
    </SortableContext.Provider>
  );
}

function Inner(props: SortableImplProps, ref: Ref<HTMLElement>) {
  const ctx = useSortableContext();
  if (!ctx?.lists) return <Standalone {...props} fwdRef={ref} />;
  const key = props.id;
  const own = ownProps(props);
  if (key === undefined) throw new Error('<Sortable> dentro de <SortableGroup> exige a prop `id`.');
  return (
    <SortableList
      {...own}
      listRef={ref}
      listKey={key}
      core={ctx.core}
      group={ctx.group}
      items={ctx.lists[key] ?? []}
    />
  );
}

/**
 * Lista reordenável por arrasto (Pointer Events) e por teclado (pegar com Espaço, setas movem,
 * Espaço solta, Esc cancela). Controlada: `items` + `onChange`. Para trocar itens entre listas,
 * ponha vários `Sortable` dentro de um `SortableGroup`.
 */
export const Sortable = forwardRef(Inner) as unknown as (<T extends SortableItemData>(
  props: SortableProps<T> & { ref?: Ref<HTMLElement> },
) => ReactElement | null) & { displayName?: string };
Sortable.displayName = 'Sortable';
