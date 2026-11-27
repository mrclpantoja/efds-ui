import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { useAnnouncer } from '../../internal/announcer';
import {
  LOADING_STATUS_DELAY_MS,
  STATUS_DELAY_MS,
  usePopupPosition,
  useScrollActiveIntoView,
} from '../../internal/combobox-shared';
import { SearchGlyph } from '../../internal/glyphs-c1';
import { mergeRefs } from '../../internal/refs-d';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { Input, type InputProps, type InputSize } from '../Input';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';

export interface LookupItem {
  code: string;
  description: string;
  [key: string]: unknown;
}

export type LookupSize = InputSize;

export interface LookupColumn {
  /** Propriedade do item (`code` e `description` já existem). */
  key: string;
  label: string;
  /** Coluna secundária: some (`.eds-table-hide-narrow`) quando a tabela do diálogo fica estreita. */
  hideNarrow?: boolean;
}

/** Textos internos do Lookup (padrões em pt-BR). */
export interface LookupTexts {
  /** Nome do botão que abre a busca. */
  open: string;
  /** Título do diálogo. Padrão: o nome do botão. */
  title: string;
  searchLabel: string;
  code: string;
  description: string;
  select: string;
  /** Nome do botão de cada linha. */
  selectLabel: (item: LookupItem) => string;
  loading: string;
  notFound: string;
  error: string;
  retry: string;
  none: string;
  results: (count: number) => string;
  close: string;
  /** Opção final do autocompletar quando há `onCreate`. */
  create: string;
}

const defaultTexts: LookupTexts = {
  open: 'Buscar',
  title: 'Buscar',
  searchLabel: 'Buscar',
  code: 'Código',
  description: 'Descrição',
  select: 'Selecionar',
  selectLabel: (item) => `Selecionar ${item.code}, ${item.description}`,
  loading: 'Buscando…',
  notFound: 'Código não encontrado.',
  error: 'Não foi possível buscar. Tente de novo.',
  retry: 'Tentar de novo',
  none: 'Nenhum resultado.',
  results: (count) =>
    count === 1 ? '1 resultado disponível.' : `${count} resultados disponíveis.`,
  close: 'Fechar',
  create: 'Cadastrar novo…',
};

export interface LookupProps extends Omit<
  InputProps,
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'size'
  | 'mask'
  | 'maskOptions'
  | 'unmask'
  | 'texts'
  | 'onValueChange'
> {
  /** Código (controlado). */
  value?: string;
  defaultValue?: string;
  /**
   * Depois de resolver o código ou escolher na busca: `item` é o registro, ou `null` quando o código
   * foi apagado ou não existe.
   */
  onValueChange?: (code: string, item: LookupItem | null) => void;
  /** Busca (diálogo): devolve os itens que combinam com o texto. */
  search: (query: string, signal: AbortSignal) => Promise<LookupItem[]>;
  /**
   * Descrição de um código. Sem ela, usa `search(código)` e confere o código exato. `null` = não existe.
   */
  resolve?: (code: string, signal: AbortSignal) => Promise<LookupItem | null>;
  /** Colunas da tabela do diálogo. Padrão: código e descrição. */
  columns?: readonly LookupColumn[];
  size?: InputSize;
  texts?: Partial<LookupTexts>;
  /**
   * Autocompletar por código ou nome no próprio campo (APG combobox "list autocomplete"), usando
   * a mesma `search` do diálogo, que segue para a busca avançada. Padrão: `true`.
   */
  autocomplete?: boolean;
  /**
   * Liga a opção final "Cadastrar novo…" do autocompletar (quando nada é encontrado). Recebe o
   * texto digitado; abra o seu cadastro e devolva o resultado em `value`/`onValueChange`.
   */
  onCreate?: (text: string) => void;
  /** Mostra a opção de cadastrar também quando há resultados. */
  createAlways?: boolean;
}

const SEARCH_DEBOUNCE_MS = 250;
/** Teto de opções no autocompletar (a busca avançada do diálogo não tem teto). */
const MAX_SUGGESTIONS = 50;

/**
 * Campo de código com a descrição ao lado e a busca num modal. Ao sair do campo o código é
 * resolvido; um código inexistente mostra o erro visível, ligado ao campo; escolher na busca devolve
 * código e descrição e o foco ao campo. As funções `search` e `resolve` são suas (nenhuma chamada
 * de rede é feita pelo componente).
 */
export const Lookup = forwardRef<HTMLInputElement, LookupProps>(function Lookup(
  {
    value,
    defaultValue,
    onValueChange,
    search,
    resolve,
    columns: columnsProp,
    size = 'md',
    texts: textsProp,
    autocomplete = true,
    onCreate,
    createAlways = false,
    className,
    disabled,
    readOnly,
    onBlur,
    onKeyDown,
    'aria-describedby': describedByProp,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, textsProp);
  const uid = useId();
  const descId = `${uid}-desc`;
  const errId = `${uid}-err`;
  const [code, setCode] = useState(value ?? defaultValue ?? '');
  const [description, setDescription] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const merged = useMemo(() => mergeRefs(ref, inputRef), [ref]);
  const resolvedFor = useRef<string | null>(null);
  const run = useRef<AbortController | null>(null);

  const findOne = useCallback(
    async (wanted: string, signal: AbortSignal): Promise<LookupItem | null> => {
      if (resolve) return resolve(wanted, signal);
      const items = await search(wanted, signal);
      const w = wanted.toLowerCase();
      return items.find((i) => i.code.toLowerCase() === w) ?? null;
    },
    [resolve, search],
  );

  // ---- Autocompletar ------------------------------------------------------------------------
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<LookupItem[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acActive, setAcActive] = useState(-1);
  const [acLoading, setAcLoading] = useState(false);
  const [acError, setAcError] = useState(false);
  const [acStatus, setAcStatus] = useState('');
  const acRun = useRef<AbortController | null>(null);
  const acTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchLatest = useRef(search);
  searchLatest.current = search;

  const stopAuto = useCallback(() => {
    if (acTimer.current) clearTimeout(acTimer.current);
    acTimer.current = null;
    acRun.current?.abort();
    acRun.current = null;
    setAcLoading(false);
    setAcOpen(false);
    setAcActive(-1);
  }, []);

  const applyCode = useCallback(
    async (next: string, notify: boolean) => {
      run.current?.abort();
      resolvedFor.current = next;
      const trimmed = next.trim();
      if (trimmed === '') {
        setErrorText(null);
        setDescription('');
        setBusy(false);
        if (notify) onValueChange?.('', null);
        return;
      }
      const controller = new AbortController();
      run.current = controller;
      setBusy(true);
      try {
        const item = await findOne(trimmed, controller.signal);
        if (controller.signal.aborted) return;
        setBusy(false);
        setDescription(item?.description ?? '');
        setErrorText(item ? null : t.notFound);
        if (notify) onValueChange?.(item?.code ?? trimmed, item);
      } catch {
        if (controller.signal.aborted) return;
        setBusy(false);
        setDescription('');
        setErrorText(t.error);
      }
    },
    [findOne, onValueChange, t.notFound, t.error],
  );

  // Controlado: o código de fora manda; descreve sem avisar.
  useEffect(() => {
    if (value === undefined || value === resolvedFor.current) return;
    setCode(value);
    void applyCode(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  // Valor inicial não controlado.
  useEffect(() => {
    if (value === undefined && defaultValue) void applyCode(defaultValue, false);
    return () => run.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAuto = (text: string) => {
    if (acTimer.current) clearTimeout(acTimer.current);
    acRun.current?.abort();
    if (!autocomplete || text.trim() === '') {
      stopAuto();
      return;
    }
    acTimer.current = setTimeout(() => {
      acTimer.current = null;
      const controller = new AbortController();
      acRun.current = controller;
      setAcError(false);
      // Resposta lenta: mostra "Buscando…" no popup (a rápida não pisca).
      const slow = setTimeout(() => {
        if (acRun.current === controller) {
          setAcLoading(true);
          setAcOpen(true);
        }
      }, LOADING_STATUS_DELAY_MS);
      searchLatest
        .current(text.trim(), controller.signal)
        .then((found) => {
          if (controller.signal.aborted) return;
          setSuggestions(found.slice(0, MAX_SUGGESTIONS));
          setAcOpen(true);
          setAcActive(-1);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setAcError(true);
          setAcOpen(true);
        })
        .finally(() => {
          clearTimeout(slow);
          if (acRun.current === controller) {
            acRun.current = null;
            setAcLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
  };

  const showCreate =
    onCreate != null && code.trim() !== '' && (createAlways || suggestions.length === 0);
  const optionCount = suggestions.length + (showCreate ? 1 : 0);
  const showEmpty = acOpen && !acLoading && !acError && optionCount === 0;
  const expanded = acOpen && (optionCount > 0 || acLoading || acError || showEmpty);
  const optionId = (i: number) => `${uid}-opt-${i}`;
  const activeIndex = acActive >= 0 && acActive < optionCount ? acActive : -1;
  usePopupPosition(popupRef, rootRef, expanded, `${optionCount}-${acLoading}`);
  useScrollActiveIntoView(activeIndex >= 0 ? optionId(activeIndex) : undefined);
  useEffect(() => () => stopAuto(), [stopAuto]);

  // Status para leitor de tela: depois de uma pausa, com a contagem (setas não anunciam).
  useEffect(() => {
    if (!expanded || acLoading) {
      setAcStatus(acLoading ? t.loading : '');
      return undefined;
    }
    const timer = setTimeout(
      () =>
        setAcStatus(
          acError ? t.error : suggestions.length === 0 ? t.none : t.results(suggestions.length),
        ),
      STATUS_DELAY_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, acLoading, acError, suggestions]);

  const chooseSuggestion = (index: number) => {
    const item = suggestions[index];
    if (!item) {
      // Última posição: a opção de cadastrar.
      if (showCreate) {
        const text = code.trim();
        stopAuto();
        // O texto vai ao cadastro: sair do campo não deve acusar "código não encontrado".
        resolvedFor.current = code;
        onCreate?.(text);
      }
      return;
    }
    stopAuto();
    setCode(item.code);
    resolvedFor.current = item.code;
    setDescription(item.description);
    setErrorText(null);
    onValueChange?.(item.code, item);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value);
    startAuto(event.target.value);
  };
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    stopAuto();
    if (code !== resolvedFor.current && (resolvedFor.current !== null || code !== '')) {
      void applyCode(code, true);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (autocomplete && !readOnly && !event.nativeEvent.isComposing) {
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault();
          const down = event.key === 'ArrowDown';
          if (!expanded) {
            if (code.trim() !== '' && !acLoading) startAuto(code);
          } else if (event.altKey && !down) stopAuto();
          else if (!event.altKey && !acLoading && optionCount > 0)
            setAcActive(
              down
                ? Math.min(activeIndex + 1, optionCount - 1)
                : activeIndex <= 0
                  ? 0
                  : activeIndex - 1,
            );
          return;
        }
        case 'Enter':
          if (expanded && acLoading) {
            event.preventDefault();
            return;
          }
          if (expanded && activeIndex >= 0) {
            event.preventDefault();
            chooseSuggestion(activeIndex);
            return;
          }
          if (expanded) stopAuto();
          break;
        case 'Escape':
          if (expanded) {
            event.preventDefault();
            event.stopPropagation();
            stopAuto();
          }
          return;
        default:
      }
    }
    // Enter confirma o código (e só envia o formulário quando já está resolvido).
    if (event.key === 'Enter' && !event.defaultPrevented && code !== resolvedFor.current) {
      event.preventDefault();
      void applyCode(code, true);
    }
  };

  // ---- Diálogo de busca -------------------------------------------------------------------
  const columns: readonly LookupColumn[] = columnsProp ?? [
    { key: 'code', label: t.code },
    { key: 'description', label: t.description },
  ];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [searchError, setSearchError] = useState(false);
  const [searching, setSearching] = useState(false);
  const { text: said, announce, set: setSaid } = useAnnouncer();
  const searchRef = useRef<AbortController | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const searchId = `${uid}-q`;
  const title = t.title;

  const runSearch = useCallback(
    async (q: string) => {
      searchRef.current?.abort();
      const controller = new AbortController();
      searchRef.current = controller;
      setSearchError(false);
      setSearching(true);
      announce(t.loading);
      try {
        const found = await search(q, controller.signal);
        if (controller.signal.aborted) return;
        setItems(found);
        setSearching(false);
        announce(found.length === 0 ? t.none : t.results(found.length));
      } catch {
        if (controller.signal.aborted) return;
        setItems([]);
        setSearching(false);
        setSearchError(true);
        announce(t.error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, t.loading, t.none, t.error],
  );

  const runRef = useRef(runSearch);
  runRef.current = runSearch;
  // Abre: lista inicial. Digitar: busca depois de uma pausa.
  useEffect(() => {
    if (!open) {
      searchRef.current?.abort();
      setSaid('');
      return undefined;
    }
    const timer = setTimeout(
      () => void runRef.current(query),
      query === '' ? 0 : SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const pick = (item: LookupItem) => {
    setOpen(false);
    setCode(item.code);
    resolvedFor.current = item.code;
    setDescription(item.description);
    setErrorText(null);
    onValueChange?.(item.code, item);
    // O diálogo devolve o foco ao botão ao fechar; o campo o recebe em seguida.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const describedBy =
    [describedByProp, description !== '' && !busy && descId, errorText && errId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <>
      <div
        ref={rootRef}
        className={cx('eds-lookup', size !== 'md' && `eds-lookup-${size}`, className)}
      >
        <Input
          {...rest}
          {...(autocomplete
            ? {
                role: 'combobox',
                'aria-autocomplete': 'list' as const,
                'aria-expanded': expanded,
                'aria-controls': `${uid}-list`,
                'aria-activedescendant':
                  expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined,
              }
            : null)}
          ref={merged}
          className="eds-lookup-code"
          autoComplete="off"
          value={code}
          disabled={disabled}
          readOnly={readOnly}
          invalid={errorText !== null || rest.invalid}
          aria-describedby={describedBy}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          variant="secondary"
          iconOnly
          aria-label={t.open}
          disabled={disabled || readOnly}
          onClick={() => {
            setQuery('');
            setItems([]);
            setOpen(true);
          }}
        >
          <SearchGlyph />
        </Button>
        <output
          className="eds-lookup-description"
          id={descId}
          aria-live="polite"
          aria-busy={busy || undefined}
          data-empty={description === '' ? '' : undefined}
        >
          {busy ? t.loading : description === '' ? '—' : description}
        </output>
        {autocomplete && (
          <>
            <div
              ref={popupRef}
              className="eds-combobox-popup"
              popover="manual"
              aria-busy={acLoading || undefined}
            >
              <ul
                id={`${uid}-list`}
                className="eds-combobox-listbox"
                role="listbox"
                aria-label={rest['aria-label'] ?? t.title}
                hidden={optionCount === 0}
              >
                {suggestions.map((item, i) => (
                  // Teclado: tratado no input (aria-activedescendant); a opção só recebe o clique.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li
                    key={item.code}
                    id={optionId(i)}
                    className="eds-combobox-option"
                    role="option"
                    aria-selected={i === activeIndex}
                    data-value={item.code}
                    onPointerDown={(event) => event.preventDefault()}
                    onPointerMove={() => {
                      if (acActive !== i) setAcActive(i);
                    }}
                    onClick={() => chooseSuggestion(i)}
                  >
                    <span className="eds-combobox-option-code">{item.code}</span>
                    <span className="eds-combobox-option-text">{item.description}</span>
                  </li>
                ))}
                {showCreate && (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li
                    id={optionId(suggestions.length)}
                    className="eds-combobox-option eds-combobox-option-create"
                    role="option"
                    aria-selected={suggestions.length === activeIndex}
                    onPointerDown={(event) => event.preventDefault()}
                    onPointerMove={() => {
                      if (acActive !== suggestions.length) setAcActive(suggestions.length);
                    }}
                    onClick={() => chooseSuggestion(suggestions.length)}
                  >
                    {t.create}
                  </li>
                )}
              </ul>
              <p className="eds-combobox-empty" hidden={!(showEmpty || acError)}>
                {acError ? t.error : t.none}
              </p>
              <p className="eds-combobox-loading" hidden={!acLoading}>
                <Spinner size="sm" decorative /> {t.loading}
              </p>
            </div>
            <span className="eds-visually-hidden" role="status">
              {acStatus}
            </span>
          </>
        )}
      </div>
      {errorText !== null && (
        <p className="eds-error" id={errId}>
          {errorText}
        </p>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="lg"
        texts={{ close: t.close }}
        initialFocus={searchInput}
      >
        <div className="eds-stack eds-gap-4">
          <div className="eds-field">
            <label className="eds-label" htmlFor={searchId}>
              {t.searchLabel}
            </label>
            <input
              ref={searchInput}
              id={searchId}
              className="eds-input"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void runSearch(query);
                }
              }}
            />
          </div>
          <span className="eds-visually-hidden" role="status">
            {said}
          </span>
          {searchError && (
            <p className="eds-error">
              {t.error}{' '}
              <button
                type="button"
                className="eds-button eds-button-ghost eds-button-sm"
                onClick={() => void runSearch(query)}
              >
                {t.retry}
              </button>
            </p>
          )}
          <div className="eds-table-wrap eds-lookup-results" aria-busy={searching || undefined}>
            <table className="eds-table">
              <caption className="eds-table-caption eds-visually-hidden">{title}</caption>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={c.hideNarrow ? 'eds-table-hide-narrow' : undefined}
                    >
                      {c.label}
                    </th>
                  ))}
                  <th scope="col" className="eds-table-actions">
                    <span className="eds-visually-hidden">{t.select}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.code} data-code={item.code}>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={
                          cx(
                            c.key !== 'code' && 'eds-table-wrap-text',
                            c.hideNarrow && 'eds-table-hide-narrow',
                          ) || undefined
                        }
                      >
                        {item[c.key] == null ? '' : String(item[c.key])}
                      </td>
                    ))}
                    <td className="eds-table-actions">
                      <Button
                        type="button"
                        size="sm"
                        aria-label={t.selectLabel(item)}
                        onClick={() => pick(item)}
                      >
                        {t.select}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </>
  );
});
Lookup.displayName = 'Lookup';
