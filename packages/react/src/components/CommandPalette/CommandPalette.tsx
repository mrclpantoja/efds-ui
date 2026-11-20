import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAnnouncer } from '../../internal/announcer';
import { SearchGlyph } from '../../internal/glyphs-c1';
import { normalize } from '../../internal/combobox-shared';
import { mergeRefs } from '../../internal/refs-d';
import { useControllable } from '../../internal/useControllable';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

export interface CommandPaletteItem {
  /** Identificador estável (guardado nos Recentes). */
  value: string;
  label: string;
  description?: string;
  /** Título do grupo; itens sem grupo ficam num bloco sem título. */
  group?: string;
  /** Ícone (um `<svg>`): decorativo, recebe `.eds-command-icon`. */
  icon?: ReactElement<{ className?: string }>;
  /** Atalho mostrado à direita (só texto: "G P"). */
  shortcut?: string;
  /** Palavras extras que a busca também procura. */
  keywords?: string;
  /** Destino: navega ao escolher, se `onSelect` não chamar `preventDefault()`. */
  href?: string;
  disabled?: boolean;
}

export interface CommandPaletteTexts {
  /** Nome do diálogo. Padrão: "Paleta de comandos". */
  title: string;
  /** Nome do campo de busca. Padrão: "Buscar comandos e páginas". */
  search: string;
  /** Título do grupo dos itens usados há pouco. Padrão: "Recentes". */
  recent: string;
  /** Sem resultado (recebe a busca). */
  empty: (query: string) => string;
  /** Falha da fonte remota. */
  error: string;
  /** Contagem anunciada depois de uma pausa na digitação. */
  results: (count: number) => string;
}

const defaultTexts: CommandPaletteTexts = {
  title: 'Paleta de comandos',
  search: 'Buscar comandos e páginas',
  recent: 'Recentes',
  empty: (query) => `Nenhum resultado para "${query}".`,
  error: 'Não foi possível carregar os comandos.',
  results: (count) =>
    count === 0
      ? 'Nenhum resultado.'
      : count === 1
        ? '1 resultado disponível.'
        : `${count} resultados disponíveis.`,
};

const DEFAULT_SHORTCUT = 'mod+k';
const DEBOUNCE_MS = 250;
const STATUS_MS = 400;
const RECENT_KEY = 'eds:command-recent';
const RECENT_DEFAULT = 5;
const RECENT_MAX = 10;

/** `mod+k`, `ctrl+k`, `/`: o último termo é a tecla; `mod` aceita Ctrl ou Cmd. */
function matchesShortcut(event: globalThis.KeyboardEvent, spec: string): boolean {
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts.pop();
  if (!key || event.key.toLowerCase() !== key) return false;
  const want = (name: string) => parts.includes(name);
  if (want('mod')) {
    if (!event.ctrlKey && !event.metaKey) return false;
  } else if (event.ctrlKey !== want('ctrl') || event.metaKey !== (want('meta') || want('cmd'))) {
    return false;
  }
  return event.altKey === want('alt') && event.shiftKey === want('shift');
}

function readRecent(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(key: string, ids: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* armazenamento indisponível: segue sem lembrar */
  }
}

interface Row {
  item: CommandPaletteItem;
  /** Linha dos Recentes (mesmo item, outro lugar na lista). */
  recent: boolean;
}

export interface CommandPaletteProps {
  /** Itens locais (filtrados sem acento nem caixa, por texto, descrição e palavras-chave). */
  items?: readonly CommandPaletteItem[];
  /**
   * Fonte remota: chamada com a busca depois de uma pausa e com um `AbortSignal` (cancelado
   * quando a busca muda). Sem ela, vale `items`.
   */
  loadItems?: (query: string, signal: AbortSignal) => Promise<readonly CommandPaletteItem[]>;
  /** Mínimo de caracteres para consultar `loadItems`. Padrão: `0`. */
  minChars?: number;
  /**
   * Um item foi escolhido (o diálogo já fechou). `event.preventDefault()` impede a navegação
   * por `href` (use com roteadores).
   */
  onSelect?: (item: CommandPaletteItem, event: { preventDefault: () => void }) => void;
  /** Aberta (controlado). */
  open?: boolean;
  /** Aberta ao montar (não controlado). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Atalho global para abrir e fechar: `mod+k` (Ctrl ou Cmd), `ctrl+shift+p`, `/`. `false`
   * desliga. Padrão: `mod+k`.
   */
  shortcut?: string | false;
  /**
   * Itens usados há pouco, no topo com a busca vazia. Só os ids ficam no `localStorage`.
   * `true` mostra 5; um número, até 10. Padrão: desligado.
   */
  recent?: boolean | number;
  /** Chave do `localStorage` dos Recentes. Padrão: `eds:command-recent`. */
  recentStorageKey?: string;
  /** Dicas de teclado no rodapé (`<kbd>`). */
  footer?: ReactNode;
  className?: string;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<CommandPaletteTexts>;
}

/**
 * Paleta de comandos e busca global: um Modal (`<dialog>`) com campo de busca e lista de
 * resultados (APG: combobox com listbox, o foco fica sempre no campo; setas movem, Enter
 * escolhe, Esc fecha). Abre com Ctrl/Cmd+K, ou pela prop `open`. O `ref` vai para o `<dialog>`.
 */
export const CommandPalette = forwardRef<HTMLDialogElement, CommandPaletteProps>(
  function CommandPalette(
    {
      items = [],
      loadItems,
      minChars = 0,
      onSelect,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      shortcut = DEFAULT_SHORTCUT,
      recent = false,
      recentStorageKey = RECENT_KEY,
      footer,
      className,
      texts,
    },
    ref,
  ) {
    const t = mergeTexts(defaultTexts, texts);
    const id = useId();
    const listId = `${id}-list`;
    const optionId = (i: number) => `${id}-opt-${i}`;
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = useControllable<boolean>(openProp, defaultOpen, onOpenChange);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(-1);
    const [remote, setRemote] = useState<readonly CommandPaletteItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const [recentIds, setRecentIds] = useState<string[]>([]);
    const { text: status, announce } = useAnnouncer();
    const openRef = useRef(open);
    const setOpenRef = useRef(setOpen);
    useEffect(() => {
      openRef.current = open;
      setOpenRef.current = setOpen;
    });

    const recentMax =
      recent === false || recent === 0
        ? 0
        : Math.min(RECENT_MAX, recent === true ? RECENT_DEFAULT : Math.max(1, Math.floor(recent)));

    // ---- Abrir e fechar (a prop manda; Esc e backdrop viram o pedido de fechamento) -------
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (open && !dialog.open) {
        setQuery('');
        setRemote([]);
        setFailed(false);
        setRecentIds(recentMax > 0 ? readRecent(recentStorageKey) : []);
        dialog.showModal();
        inputRef.current?.focus();
      } else if (!open && dialog.open) dialog.close();
    }, [open, recentMax, recentStorageKey]);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return undefined;
      const onClose = () => {
        if (openRef.current) setOpenRef.current(false);
      };
      let downOnDialog = false;
      const onDown = (event: Event) => {
        downOnDialog = event.target === dialog;
      };
      const onClick = (event: Event) => {
        if (downOnDialog && event.target === dialog) dialog.close();
        downOnDialog = false;
      };
      dialog.addEventListener('close', onClose);
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('click', onClick);
      return () => {
        dialog.removeEventListener('close', onClose);
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('click', onClick);
      };
    }, []);

    // Atalho global.
    useEffect(() => {
      if (shortcut === false || shortcut === '') return undefined;
      const onKey = (event: globalThis.KeyboardEvent) => {
        if (event.defaultPrevented || event.isComposing || !matchesShortcut(event, shortcut))
          return;
        const target = event.target;
        if (
          !shortcut.includes('+') &&
          target instanceof HTMLElement &&
          (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
        ) {
          return;
        }
        // Outro diálogo modal aberto não é interrompido.
        const other = document.querySelector('dialog[open]');
        if (other && other !== dialogRef.current) return;
        event.preventDefault();
        setOpenRef.current(!openRef.current);
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [shortcut]);

    // ---- Fonte remota ----------------------------------------------------------------------
    useEffect(() => {
      if (!open || !loadItems) return undefined;
      if (query.trim().length < minChars) {
        setRemote([]);
        setFailed(false);
        return undefined;
      }
      const controller = new AbortController();
      const timer = setTimeout(
        () => {
          setBusy(true);
          setFailed(false);
          loadItems(query, controller.signal)
            .then((list) => {
              if (controller.signal.aborted) return;
              setRemote(list);
              setBusy(false);
            })
            .catch(() => {
              if (controller.signal.aborted) return;
              setRemote([]);
              setFailed(true);
              setBusy(false);
            });
        },
        query === '' ? 0 : DEBOUNCE_MS,
      );
      return () => {
        clearTimeout(timer);
        controller.abort();
        setBusy(false);
      };
    }, [open, query, loadItems, minChars]);

    // ---- Linhas ----------------------------------------------------------------------------
    const source = loadItems ? remote : items;
    const rows = useMemo(() => {
      const needle = normalize(query.trim());
      const matches = (item: CommandPaletteItem) =>
        needle === '' ||
        needle
          .split(/\s+/)
          .every((word) =>
            normalize(
              `${item.label} ${item.description ?? ''} ${item.keywords ?? ''} ${item.group ?? ''}`,
            ).includes(word),
          );
      const shown = loadItems ? source : source.filter(matches);
      const result: { group?: string; rows: Row[] }[] = [];
      if (needle === '' && recentMax > 0) {
        const list = recentIds
          .map((rid) => source.find((item) => item.value === rid))
          .filter((item): item is CommandPaletteItem => item !== undefined && !item.disabled)
          .slice(0, recentMax);
        if (list.length > 0) {
          result.push({ group: t.recent, rows: list.map((item) => ({ item, recent: true })) });
        }
      }
      const order: (string | undefined)[] = [];
      const byGroup = new Map<string | undefined, Row[]>();
      for (const item of shown) {
        if (!byGroup.has(item.group)) {
          byGroup.set(item.group, []);
          order.push(item.group);
        }
        byGroup.get(item.group)?.push({ item, recent: false });
      }
      for (const group of order) result.push({ group, rows: byGroup.get(group) ?? [] });
      return result;
    }, [source, query, loadItems, recentIds, recentMax, t.recent]);

    const flat = useMemo(() => rows.flatMap((block) => block.rows), [rows]);
    const enabledCount = flat.filter((row) => !row.item.disabled).length;

    // O primeiro item habilitado fica ativo sempre que a lista muda.
    const firstEnabled = flat.findIndex((row) => !row.item.disabled);
    useEffect(() => {
      setActive(firstEnabled);
    }, [firstEnabled, flat]);

    useEffect(() => {
      if (!open || busy) return undefined;
      const timer = setTimeout(
        () => announce(failed ? t.error : t.results(enabledCount)),
        STATUS_MS,
      );
      return () => clearTimeout(timer);
      // Anuncia a contagem depois de uma pausa; `announce` e os textos são estáveis por render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, query, enabledCount, busy, failed]);

    useEffect(() => {
      if (active < 0) return;
      document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const choose = useCallback(
      (row: Row) => {
        if (row.item.disabled) return;
        if (recentMax > 0) {
          writeRecent(
            recentStorageKey,
            [
              row.item.value,
              ...readRecent(recentStorageKey).filter((v) => v !== row.item.value),
            ].slice(0, recentMax),
          );
        }
        let prevented = false;
        dialogRef.current?.close();
        onSelect?.(row.item, {
          preventDefault: () => {
            prevented = true;
          },
        });
        if (!prevented && row.item.href) window.location.assign(row.item.href);
      },
      [onSelect, recentMax, recentStorageKey],
    );

    const move = (step: number) => {
      const enabled = flat.map((row, i) => (row.item.disabled ? -1 : i)).filter((i) => i >= 0);
      if (enabled.length === 0) return;
      const at = enabled.indexOf(active);
      const next =
        at === -1
          ? step > 0
            ? 0
            : enabled.length - 1
          : (at + step + enabled.length) % enabled.length;
      setActive(enabled[next] ?? -1);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          move(-1);
          break;
        case 'Home':
        case 'End': {
          if (!event.ctrlKey && !event.metaKey) break;
          event.preventDefault();
          const enabled = flat.map((row, i) => (row.item.disabled ? -1 : i)).filter((i) => i >= 0);
          setActive((event.key === 'Home' ? enabled[0] : enabled[enabled.length - 1]) ?? -1);
          break;
        }
        case 'Enter': {
          event.preventDefault();
          const row = flat[active];
          if (row) choose(row);
          break;
        }
        default:
      }
    };

    // Índice da primeira linha de cada bloco na lista plana (ids e `aria-activedescendant`).
    const starts = rows.map((_, b) =>
      rows.slice(0, b).reduce((sum, block) => sum + block.rows.length, 0),
    );
    return (
      <dialog
        ref={mergeRefs(ref, dialogRef)}
        className={cx('eds-modal', 'eds-command', className)}
        aria-label={t.title}
        aria-busy={busy || undefined}
      >
        <div className="eds-command-search">
          <SearchGlyph />
          <input
            ref={inputRef}
            className="eds-command-input"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            aria-label={t.search}
            placeholder={t.search}
            autoComplete="off"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div
          id={listId}
          className="eds-command-list"
          role="listbox"
          aria-label={t.title}
          // O foco fica no campo: apertar numa opção não o tira dali.
          onPointerDown={(event) => event.preventDefault()}
        >
          {rows.map((block, b) => {
            const items = block.rows.map((row, r) => {
              const index = (starts[b] ?? 0) + r;
              const { item } = row;
              return (
                // Teclado: tratado no campo (aria-activedescendant); a opção só recebe o clique.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                <div
                  key={`${row.recent ? 'r-' : ''}${item.value}`}
                  id={optionId(index)}
                  className="eds-command-item"
                  role="option"
                  aria-selected={index === active}
                  aria-disabled={item.disabled || undefined}
                  data-value={item.value}
                  data-href={item.href}
                  onPointerMove={() => {
                    if (!item.disabled && active !== index) setActive(index);
                  }}
                  onClick={() => choose(row)}
                >
                  {item.icon
                    ? cloneElement(item.icon, {
                        className: cx('eds-command-icon', item.icon.props.className),
                        'aria-hidden': true,
                        focusable: 'false',
                      } as Record<string, unknown>)
                    : null}
                  <span className="eds-command-label">{item.label}</span>
                  {item.description ? (
                    <span className="eds-command-description">{item.description}</span>
                  ) : null}
                  {item.shortcut ? (
                    <kbd className="eds-command-shortcut">{item.shortcut}</kbd>
                  ) : null}
                </div>
              );
            });
            if (!block.group) {
              return (
                <div key={`b-${b}`} className="eds-command-group">
                  {items}
                </div>
              );
            }
            const labelId = `${id}-g-${b}`;
            return (
              <div
                key={`b-${b}`}
                className="eds-command-group"
                role="group"
                aria-labelledby={labelId}
              >
                <div className="eds-command-group-label" id={labelId}>
                  {block.group}
                </div>
                {items}
              </div>
            );
          })}
        </div>
        <p className="eds-command-empty" hidden={flat.length > 0 && !failed}>
          {failed ? t.error : t.empty(query.trim())}
        </p>
        {footer ? <footer className="eds-command-footer">{footer}</footer> : null}
        <span className="eds-visually-hidden" role="status">
          {status}
        </span>
      </dialog>
    );
  },
);
CommandPalette.displayName = 'CommandPalette';
