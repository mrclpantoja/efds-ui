import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Definição de uma coluna para `useTableColumns`. `id` é único e estável (kebab/minúsculas). */
export interface TableColumnDef {
  id: string;
  /** Nome da coluna (painel "Colunas", alça, filtro e anúncios). */
  label: string;
  /** Coluna fixa no início ou no fim; não sai do próprio grupo ao reordenar. */
  pin?: 'start' | 'end';
  /** Seleção, ações e afins: não se move, não se oculta, não se redimensiona. */
  locked?: boolean;
  /** Largura inicial, em px. */
  defaultWidth?: number;
  /** Limites ao redimensionar, em px (padrão 64 e 640). */
  minWidth?: number;
  maxWidth?: number;
  defaultHidden?: boolean;
}

/** Estado das colunas: ordem (todas, ocultas incluídas), ocultas e larguras (px). */
export interface TableColumnState {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
}

export type TableColumnsReason = 'move' | 'resize' | 'visibility' | 'reset' | 'prefs';

export interface UseTableColumnsOptions {
  /**
   * Chave das preferências em `localStorage` (`eds:table:<chave>`; ordem, ocultas e larguras).
   * Use uma chave estática e sem dado pessoal (nunca id de usuário, e-mail, CPF): para guardar por
   * usuário, ouça `onStateChange` e restaure no servidor.
   */
  prefsKey?: string;
  /** Estado controlado. */
  state?: TableColumnState;
  onStateChange?: (state: TableColumnState, reason: TableColumnsReason) => void;
}

export interface TableColumnsController {
  /** Colunas visíveis, na ordem: é o que a tabela renderiza. */
  columns: TableColumnDef[];
  /** Todas as colunas (ocultas incluídas), na ordem. */
  all: TableColumnDef[];
  state: TableColumnState;
  /** Move a coluna para o índice (de `state.order`); não sai do grupo fixo nem move `locked`. */
  move: (id: string, toIndex: number) => void;
  /** Largura em px, dentro dos limites. */
  resize: (id: string, px: number) => void;
  /** Mostra ou oculta (`visible` ausente alterna). A última coluna visível não se oculta. */
  toggle: (id: string, visible?: boolean) => void;
  /** Padrão do autor; apaga as preferências salvas. */
  reset: () => void;
  /** Troca o estado inteiro (ex.: cancelar um ajuste). */
  setState: (state: TableColumnState, reason?: TableColumnsReason) => void;
  /** Dá para ocultar (ou já está oculta)? Falso para `locked` e para a última visível. */
  canHide: (id: string) => boolean;
  /** Posição (base 1) e total entre as colunas visíveis e móveis. */
  position: (id: string) => { pos: number; total: number };
  /** Anuncia na região de status da tabela. */
  announce: (text: string) => void;
  /** Último anúncio (a `<Table columnsController>` lê). */
  message: { text: string; seq: number };
}

export const DEFAULT_MIN_WIDTH = 64;
export const DEFAULT_MAX_WIDTH = 640;
const PREFS_VERSION = 1;
const SAVE_DELAY_MS = 300;

const storageKey = (key: string) => `eds:table:${key}`;

function defaultState(columns: readonly TableColumnDef[]): TableColumnState {
  const widths: Record<string, number> = {};
  for (const c of columns) if (c.defaultWidth !== undefined) widths[c.id] = c.defaultWidth;
  return {
    order: columns.map((c) => c.id),
    hidden: columns.filter((c) => c.defaultHidden && !c.locked).map((c) => c.id),
    widths,
  };
}

/** Ignora ids desconhecidos, acrescenta colunas novas ao fim e nunca oculta `locked`. */
function normalize(columns: readonly TableColumnDef[], raw: Partial<TableColumnState>) {
  const ids = new Set(columns.map((c) => c.id));
  const locked = new Set(columns.filter((c) => c.locked).map((c) => c.id));
  const order = (raw.order ?? []).filter((id, i, all) => ids.has(id) && all.indexOf(id) === i);
  for (const c of columns) if (!order.includes(c.id)) order.push(c.id);
  const widths: Record<string, number> = {};
  for (const [id, px] of Object.entries(raw.widths ?? {})) {
    if (ids.has(id) && !locked.has(id) && Number.isFinite(px)) widths[id] = px;
  }
  return {
    order,
    hidden: (raw.hidden ?? []).filter((id) => ids.has(id) && !locked.has(id)),
    widths,
  } satisfies TableColumnState;
}

function readPrefs(key: string, columns: readonly TableColumnDef[]): TableColumnState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<TableColumnState> & { v?: number };
    if (data.v !== PREFS_VERSION) return null;
    return normalize(columns, data);
  } catch {
    return null;
  }
}

/**
 * Estado das colunas de uma `<Table>`: ordem, visibilidade e largura, com preferências opcionais em
 * `localStorage`. Reordenar e ocultar são re-renderização: a tabela mapeia `controller.columns`.
 * Passe o resultado em `<Table columnsController>` e em `<TableColumnsMenu controller>`.
 */
export function useTableColumns(
  columns: readonly TableColumnDef[],
  options: UseTableColumnsOptions = {},
): TableColumnsController {
  const { prefsKey, state: controlled, onStateChange } = options;
  const [loadedPrefs] = useState(() => (prefsKey ? readPrefs(prefsKey, columns) : null));
  const [internal, setInternal] = useState<TableColumnState>(
    () => controlled ?? loadedPrefs ?? defaultState(columns),
  );
  const [message, setMessage] = useState({ text: '', seq: 0 });
  const current = useMemo(
    () => normalize(columns, controlled ?? internal),
    [columns, controlled, internal],
  );
  const latest = useRef({ columns, state: current, onStateChange, prefsKey });
  useEffect(() => {
    latest.current = { columns, state: current, onStateChange, prefsKey };
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Preferências carregadas: avisa o app uma vez.
  useEffect(() => {
    if (loadedPrefs) latest.current.onStateChange?.(loadedPrefs, 'prefs');
  }, [loadedPrefs]);

  const commit = useCallback((next: Partial<TableColumnState>, reason: TableColumnsReason) => {
    const { columns: defs, onStateChange: notify, prefsKey: key } = latest.current;
    const state = normalize(defs, next);
    latest.current = { ...latest.current, state };
    setInternal(state);
    notify?.(state, reason);
    if (key) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          if (reason === 'reset') window.localStorage.removeItem(storageKey(key));
          else {
            window.localStorage.setItem(
              storageKey(key),
              JSON.stringify({ v: PREFS_VERSION, ...state }),
            );
          }
        } catch {
          /* localStorage indisponível: sem preferências, sem erro */
        }
      }, SAVE_DELAY_MS);
    }
  }, []);

  return useMemo<TableColumnsController>(() => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    const all = current.order.map((id) => byId.get(id)).filter((c): c is TableColumnDef => !!c);
    const visible = all.filter((c) => !current.hidden.includes(c.id));
    const movable = visible.filter((c) => !c.locked);
    const group = (c: TableColumnDef) => c.pin ?? 'free';

    const canHide = (id: string) => {
      const def = byId.get(id);
      if (!def || def.locked) return false;
      if (current.hidden.includes(id)) return true;
      return movable.length > 1;
    };

    return {
      columns: visible,
      all,
      state: current,
      move(id, toIndex) {
        const def = byId.get(id);
        const { state } = latest.current;
        if (!def || def.locked) return;
        const slots: number[] = [];
        state.order.forEach((other, i) => {
          const d = byId.get(other);
          if (d && !d.locked && group(d) === group(def)) slots.push(i);
        });
        if (slots.length === 0) return;
        const first = slots[0] as number;
        const last = slots[slots.length - 1] as number;
        const target = Math.min(Math.max(toIndex, first), last);
        if (state.order.indexOf(id) === target) return;
        const order = state.order.filter((other) => other !== id);
        order.splice(target, 0, id);
        commit({ ...state, order }, 'move');
      },
      resize(id, px) {
        const def = byId.get(id);
        if (!def || def.locked || !Number.isFinite(px)) return;
        const min = def.minWidth ?? DEFAULT_MIN_WIDTH;
        const max = def.maxWidth ?? DEFAULT_MAX_WIDTH;
        const width = Math.round(Math.min(Math.max(px, min), max));
        const { state } = latest.current;
        if (state.widths[id] === width) return;
        commit({ ...state, widths: { ...state.widths, [id]: width } }, 'resize');
      },
      toggle(id, show) {
        const { state } = latest.current;
        const hidden = state.hidden.includes(id);
        const next = show ?? hidden;
        if (next === !hidden) return;
        if (!next && !canHide(id)) return;
        if (byId.get(id)?.locked) return;
        commit(
          {
            ...state,
            hidden: next ? state.hidden.filter((h) => h !== id) : [...state.hidden, id],
          },
          'visibility',
        );
      },
      reset() {
        commit(defaultState(columns), 'reset');
      },
      setState(next, reason = 'move') {
        commit(next, reason);
      },
      canHide,
      position(id) {
        return { pos: movable.findIndex((c) => c.id === id) + 1, total: movable.length };
      },
      announce(text) {
        setMessage((m) => ({ text, seq: m.seq + 1 }));
      },
      message,
    };
  }, [columns, current, commit, message]);
}
