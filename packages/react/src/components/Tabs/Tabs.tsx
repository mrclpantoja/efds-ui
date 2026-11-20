import {
  createContext,
  forwardRef,
  useContext,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { cx } from '../../utils/cx';
import { useControllable } from '../../internal/useControllable';

interface TabsContextValue {
  baseId: string;
  active: string;
  /** Aba com foco (pode ser uma desabilitada); `null` quando o foco está fora da lista. */
  focused: string | null;
  setFocused: (value: string | null) => void;
  select: (value: string) => void;
  /** Aba que é o tab stop do roving tabindex (a focada, a ativa ou, na falta, a 1ª habilitada). */
  stop: string | undefined;
  register: (value: string, disabled: boolean) => () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(part: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${part}> deve ficar dentro de <Tabs>.`);
  return ctx;
}

/** `value` livre (com espaços, acentos) vira id válido; `_<hex>_` é reversível (ver decodeValue). */
const encodeValue = (value: string) =>
  value.replace(/[^A-Za-z0-9-]/g, (c) => `_${c.charCodeAt(0).toString(16)}_`);
const decodeValue = (encoded: string) =>
  encoded.replace(/_([0-9a-f]+)_/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));

const tabId = (baseId: string, value: string) => `${baseId}-tab-${encodeValue(value)}`;
const panelId = (baseId: string, value: string) => `${baseId}-panel-${encodeValue(value)}`;

type TabsValueProps =
  { value: string; defaultValue?: undefined } | { defaultValue: string; value?: undefined };

export type TabsProps = TabsValueProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> & {
    /** Chamado ao ativar uma aba (clique, setas, Home/End). */
    onValueChange?: (value: string) => void;
    /** As abas dividem a largura da lista. */
    fill?: boolean;
  };

/** Abas com ativação automática. Controlado (`value`) ou não (`defaultValue`). */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { value, defaultValue, onValueChange, fill = false, className, children, ...rest },
  ref,
) {
  const baseId = useId();
  const [active, select] = useControllable<string>(value, defaultValue ?? '', onValueChange);
  const [focused, setFocused] = useState<string | null>(null);
  const [registry, setRegistry] = useState<{ value: string; disabled: boolean }[]>([]);
  const register = useCallback((tabValue: string, disabled: boolean) => {
    setRegistry((list) =>
      list.some((t) => t.value === tabValue)
        ? list.map((t) => (t.value === tabValue ? { value: tabValue, disabled } : t))
        : [...list, { value: tabValue, disabled }],
    );
    return () => setRegistry((list) => list.filter((t) => t.value !== tabValue));
  }, []);
  // Valor sem aba correspondente: o teclado ainda precisa de um tab stop (1ª aba habilitada).
  // Aba desabilitada focada por setas não vira tab stop: ele fica na selecionada.
  const base = registry.some((t) => t.value === active)
    ? active
    : registry.find((t) => !t.disabled)?.value;
  const stop =
    focused !== null && registry.some((t) => t.value === focused && !t.disabled) ? focused : base;
  const ctx = useMemo(
    () => ({ baseId, active, focused, setFocused, select, stop, register }),
    [baseId, active, focused, select, stop, register],
  );
  return (
    <TabsContext.Provider value={ctx}>
      <div {...rest} ref={ref} className={cx('eds-tabs', fill && 'eds-tabs-fill', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = 'Tabs';

export type TabListProps = Omit<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'aria-labelledby'> &
  (
    | { 'aria-label': string; 'aria-labelledby'?: string }
    | { 'aria-labelledby': string; 'aria-label'?: string }
  );

/** `role="tablist"` com roving tabindex: ←/→ (com volta), Home e End. */
export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { className, onKeyDown, onBlur, ...rest },
  ref,
) {
  const { baseId, select, setFocused } = useTabs('TabList');

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const current = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
    const index = current ? tabs.indexOf(current) : -1;
    if (index < 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next: number;
    if (event.key === forward) next = (index + 1) % tabs.length;
    else if (event.key === backward) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    target.focus();
    // Aba indisponível recebe foco (alcançável por setas), mas não é ativada.
    if (target.getAttribute('aria-disabled') !== 'true') {
      select(decodeValue(target.id.slice(tabId(baseId, '').length)));
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null);
  };

  return (
    // O foco fica nas abas (roving tabindex); a lista só delega o teclado (padrão APG).
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      {...rest}
      ref={ref}
      className={cx('eds-tablist', className)}
      role="tablist"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
});
TabList.displayName = 'TabList';

export interface TabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Identifica a aba e o painel correspondente. */
  value: string;
}

/** Aba. `disabled` vira `aria-disabled` (focável por setas, não ativa). */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, disabled = false, className, onClick, onFocus, ...rest },
  ref,
) {
  const { baseId, active, setFocused, select, stop, register } = useTabs('Tab');
  useLayoutEffect(() => register(value, disabled), [register, value, disabled]);
  const tabStop = stop === value;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!disabled && !event.defaultPrevented) select(value);
  };
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={cx('eds-tab', className)}
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={active === value}
      aria-controls={panelId(baseId, value)}
      aria-disabled={disabled || undefined}
      tabIndex={tabStop ? 0 : -1}
      onFocus={(event) => {
        onFocus?.(event);
        setFocused(value);
      }}
      onClick={handleClick}
    />
  );
});
Tab.displayName = 'Tab';

export interface TabPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Mesmo `value` da aba que controla este painel. */
  value: string;
}

/**
 * Painel: todos ficam montados; os inativos recebem `hidden`. `tabIndex=0` por padrão (padrão
 * APG): painel sem nenhum controle focável continua alcançável por teclado; se o conteúdo já
 * tem um primeiro elemento focável, passe `tabIndex={-1}` para não duplicar a parada.
 */
export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, className, ...rest },
  ref,
) {
  const { baseId, active } = useTabs('TabPanel');
  return (
    <div
      tabIndex={0}
      {...rest}
      ref={ref}
      className={cx('eds-tabpanel', className)}
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      hidden={active !== value}
    />
  );
});
TabPanel.displayName = 'TabPanel';
