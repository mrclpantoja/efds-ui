import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';

export interface AppShellState {
  /** id da sidebar (alvo do gatilho `popovertarget`). */
  navId: string;
  /** id do `<main>` (alvo do skip link e do foco após navegar). */
  mainId: string;
  /** Sidebar off-canvas aberta (só muda no mobile). */
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  /** Marcado quando um item da sidebar foi acionado com o off-canvas aberto: o foco vai ao conteúdo. */
  navigatedRef: MutableRefObject<boolean>;
  /** Fecha o off-canvas (no-op quando já está fechado). Chame ao navegar em SPA. */
  closeNav: () => void;
  /** Uso da Sidebar: adota o `id` que o consumidor deu a ela como `navId` do shell. */
  setNavId?: (id: string) => void;
}

export const AppShellContext = createContext<AppShellState | null>(null);

/** Estado do shell: usado pelo AppShell e, como reserva local, pela Sidebar avulsa. */
export function useShellState(navId: string, mainId: string): AppShellState {
  const [navOpen, setNavOpen] = useState(false);
  const navigatedRef = useRef(false);
  const closeNav = useCallback(() => {
    try {
      document.getElementById(navId)?.hidePopover();
    } catch {
      /* já fechado ou sem suporte */
    }
  }, [navId]);
  return { navId, mainId, navOpen, setNavOpen, navigatedRef, closeNav };
}

/** Acesso ao estado do shell: `navOpen`, `closeNav()` (chame ao navegar em SPA) e ids. */
export function useAppShell(): AppShellState {
  const value = useContext(AppShellContext);
  if (!value) throw new Error('useAppShell deve ser usado dentro de <AppShell>.');
  return value;
}

const useIsoLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** Atributo `inert` por DOM (o React 18 não o reconhece como booleano). */
export function useInert(ref: RefObject<HTMLElement | null>, inert: boolean) {
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (inert) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [ref, inert]);
}
