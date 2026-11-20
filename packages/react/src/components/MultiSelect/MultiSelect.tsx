import {
  forwardRef,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { FieldContext, useControlAttrs } from '../../internal/field-context';
import {
  LOADING_STATUS_DELAY_MS,
  STATUS_DELAY_MS,
  defaultStatus,
  filterOptions,
  usePopupPosition,
  useScrollActiveIntoView,
  type ComboboxFilter,
  type ComboboxOption,
} from '../../internal/combobox-shared';
import { CloseGlyph } from '../../internal/glyphs';
import { useAnnouncer } from '../../internal/announcer';
import { mergeRefs } from '../../internal/refs-d';
import { useControllable } from '../../internal/useControllable';
import { Spinner } from '../Spinner';

export type MultiSelectSize = 'sm' | 'md' | 'lg';

export interface MultiSelectProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'size'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'type'
  | 'role'
  | 'children'
  | 'list'
  | 'required'
> {
  /** Opções disponíveis (já filtradas, se `filter={false}`). */
  options: ComboboxOption[];
  /** Valores escolhidos (controlado), na ordem de escolha. */
  value?: string[];
  /** Valores iniciais (não controlado). */
  defaultValue?: string[];
  /** Escolha ou remoção: recebe os valores e as opções correspondentes (na ordem de escolha). */
  onChange?: (values: string[], options: ComboboxOption[]) => void;
  /** Texto digitado mudou: use para buscar opções no servidor (combine com `loading`). */
  onInputChange?: (text: string) => void;
  /** Filtro local ("contém", sem acento/caixa). `false` se o consumidor já filtra. Padrão: `true`. */
  filter?: ComboboxFilter;
  /** Busca em andamento: mostra o texto de carregamento e `aria-busy` no popup. */
  loading?: boolean;
  /** Erro de carregamento: aparece no popup e é anunciado. */
  error?: ReactNode;
  /** Limite de escolhas: ao atingi-lo as demais opções ficam `aria-disabled` e o status avisa. */
  maxSelected?: number;
  /**
   * Rótulos de valores controlados cuja opção ainda não está em `options` (ex.: edição com busca
   * remota), por valor.
   */
  selectedLabels?: Record<string, string>;
  /**
   * Nome dos campos `hidden` enviados no formulário (um por escolha, na ordem de escolha).
   * Use o nome com colchetes se o servidor espera lista (ex.: `cidades[]`).
   */
  name?: string;
  /** Obrigatório: `aria-required` e validade nativa enquanto não houver escolha. */
  required?: boolean;
  /** Padrão: `md`. */
  size?: MultiSelectSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid="true"`. */
  valid?: boolean;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<MultiSelectTexts>;
}

const countText = (n: number) => `${n} ${n === 1 ? 'item selecionado' : 'itens selecionados'}.`;

export interface MultiSelectTexts {
  /** Lista sem resultado. Padrão: "Nenhum resultado". */
  empty: ReactNode;
  /** Busca em andamento. Padrão: "Carregando…". */
  loading: ReactNode;
  /** Nome acessível da lista de opções. Padrão: o `aria-label` do campo ou o rótulo do Field. */
  list?: string;
  /** Nome acessível da lista de etiquetas. Padrão: "Selecionados". */
  tags: string;
  /** Nome do botão de remover a etiqueta. Padrão: "Remover {rótulo}". */
  remove: (label: string) => string;
  /** Texto do status conforme a quantidade de resultados. */
  status: (count: number) => string;
  /** Status anunciado após ~400 ms de `loading`. Padrão: "Carregando…". */
  loadingStatus: string;
  /** Status ao escolher. Padrão: "{rótulo}: selecionado. {n} itens selecionados.". */
  selected: (label: string, count: number) => string;
  /** Status ao remover. Padrão: "{rótulo}: removido. {n} itens selecionados.". */
  removed: (label: string, count: number) => string;
  /** Status ao atingir `maxSelected`. Padrão: "Limite de {n} itens atingido.". */
  max: (max: number) => string;
  /** Mensagem de validade de `required`. Padrão: "Escolha ao menos uma opção.". */
  required: string;
}

const defaultTexts: MultiSelectTexts = {
  empty: 'Nenhum resultado',
  loading: 'Carregando…',
  tags: 'Selecionados',
  remove: (label) => `Remover ${label}`,
  status: defaultStatus,
  loadingStatus: 'Carregando…',
  selected: (label, count) => `${label}: selecionado. ${countText(count)}`,
  removed: (label, count) => `${label}: removido. ${countText(count)}`,
  max: (max) => `Limite de ${max} ${max === 1 ? 'item' : 'itens'} atingido.`,
  required: 'Escolha ao menos uma opção.',
};

/**
 * Seleção múltipla (Combobox com etiquetas). Foco sempre no `<input>`; o destaque do teclado é
 * `data-active` e `aria-selected` marca as opções escolhidas (`aria-multiselectable`). Enter ou
 * clique alterna a opção e a lista continua aberta. O `ref` vai para o `<input>`.
 */
export const MultiSelect = forwardRef<HTMLInputElement, MultiSelectProps>(function MultiSelect(
  {
    options,
    value: valueProp,
    defaultValue,
    onChange,
    onInputChange,
    filter = true,
    loading = false,
    error,
    maxSelected,
    selectedLabels,
    name,
    required: requiredProp,
    size = 'md',
    invalid,
    valid,
    disabled,
    readOnly,
    texts,
    className,
    onKeyDown,
    onBlur,
    onClick,
    ...rest
  },
  ref,
) {
  const {
    empty: emptyMessage,
    loading: loadingMessage,
    list: listLabel,
    tags: tagsLabel,
    remove: removeLabel,
    status: statusMessage,
    loadingStatus,
    selected: selectedStatus,
    removed: removedStatus,
    max: maxStatus,
    required: requiredMessage,
  } = mergeTexts(defaultTexts, texts);
  const { required, ...attrs } = useControlAttrs({
    id: rest.id,
    describedBy: rest['aria-describedby'],
    ariaInvalid: rest['aria-invalid'],
    required: requiredProp,
    invalid,
    valid,
  });
  const field = useContext(FieldContext);
  const generated = useId();
  const listId = `${generated}-list`;
  const optionId = (i: number) => `${generated}-opt-${i}`;

  // Opções já vistas: mantêm o rótulo de uma escolha cuja opção saiu da lista (busca remota).
  const knownRef = useRef(new Map<string, ComboboxOption>());
  for (const o of options) knownRef.current.set(o.value, o);

  const [values, setValues] = useControllable<string[]>(valueProp, defaultValue ?? []);
  const optionOf = (v: string): ComboboxOption =>
    options.find((o) => o.value === v) ??
    knownRef.current.get(v) ?? { value: v, label: selectedLabels?.[v] ?? v };
  const selectedOptions = values.map(optionOf);

  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { text: status, announce: say, set: setStatus } = useAnnouncer();
  const [announce, setAnnounce] = useState<{ msg: string } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const tagsRef = useRef<HTMLUListElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  // Foco após remover: valor do próximo botão, ou null = input.
  const pendingFocus = useRef<string | null | undefined>(undefined);

  const visible = useMemo(
    () => filterOptions(options, filter, text, true),
    [options, filter, text],
  );

  const atMax = maxSelected != null && values.length >= maxSelected;
  const isBlocked = (o: ComboboxOption) => o.disabled || (atMax && !values.includes(o.value));

  const hasError = error != null && error !== false;
  const showError = open && !loading && hasError;
  const showEmpty = open && !loading && !hasError && visible.length === 0;
  const showLoading = open && loading;
  const expanded = open && (visible.length > 0 || showEmpty || showLoading || showError);
  const activeIndex = active >= 0 && active < visible.length ? active : -1;

  const closeList = () => {
    setOpen(false);
    setActive(-1);
  };

  const firstEnabled = (from: number, dir: 1 | -1) => {
    for (let i = from; i >= 0 && i < visible.length; i += dir) {
      const o = visible[i];
      if (o && !isBlocked(o)) return i;
    }
    return -1;
  };

  const commit = (next: string[]) => {
    setValues(next);
    onChange?.(next, next.map(optionOf));
  };

  const clearText = () => {
    if (text === '') return;
    setText('');
    onInputChange?.('');
  };

  const toggle = (option: ComboboxOption) => {
    if (isBlocked(option)) {
      if (!option.disabled && maxSelected != null) setAnnounce({ msg: maxStatus(maxSelected) });
      return;
    }
    const selected = values.includes(option.value);
    const next = selected ? values.filter((v) => v !== option.value) : [...values, option.value];
    commit(next);
    clearText();
    // Com o texto limpo a lista volta inteira: o destaque segue a opção alternada.
    setActive(options.findIndex((o) => o.value === option.value));
    const base = selected
      ? removedStatus(option.label, next.length)
      : selectedStatus(option.label, next.length);
    const limit = !selected && maxSelected != null && next.length >= maxSelected;
    setAnnounce({ msg: limit ? `${base} ${maxStatus(maxSelected)}` : base });
  };

  const removeAt = (index: number, focusNext: boolean) => {
    const v = values[index];
    if (v === undefined) return;
    const label = optionOf(v).label;
    const next = values.filter((_, i) => i !== index);
    if (focusNext) pendingFocus.current = values[index + 1] ?? null;
    commit(next);
    setAnnounce({ msg: removedStatus(label, next.length) });
  };

  // Depois de remover pela etiqueta: foco no próximo botão de remover, senão no input.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === undefined) return;
    pendingFocus.current = undefined;
    const button =
      target === null
        ? null
        : Array.from(tagsRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
            (b) => b.dataset.value === target,
          );
    (button ?? inputRef.current)?.focus();
  });

  usePopupPosition(popupRef, controlRef, expanded, `${visible.length}-${loading}-${values.length}`);
  useScrollActiveIntoView(activeIndex >= 0 ? optionId(activeIndex) : undefined);

  // Status para leitor de tela: escolha/remoção na hora; resultados só ao abrir/filtrar, com
  // debounce (setas não anunciam).
  const count = visible.length;
  const statusRef = useRef(statusMessage);
  statusRef.current = statusMessage;
  const loadingStatusRef = useRef(loadingStatus);
  loadingStatusRef.current = loadingStatus;
  const handled = useRef<{ msg: string } | null>(null);
  useEffect(() => {
    if (announce && announce !== handled.current) {
      handled.current = announce;
      say(announce.msg);
      return;
    }
    if (!open) return;
    setStatus('');
    if (loading) {
      const timer = setTimeout(() => setStatus(loadingStatusRef.current), LOADING_STATUS_DELAY_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setStatus(statusRef.current(count)), STATUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [announce, say, setStatus, open, loading, count, text]);

  // Obrigatório sem escolha: o formulário não envia e o navegador mostra a mensagem.
  const missing = required === true && values.length === 0;
  useEffect(() => {
    inputRef.current?.setCustomValidity(missing ? requiredMessage : '');
  }, [missing, requiredMessage]);

  const openFromArrow = (highlight: 'first' | 'last' | 'none') => {
    setOpen(true);
    if (highlight === 'first') setActive(firstEnabled(0, 1));
    else if (highlight === 'last') setActive(firstEnabled(visible.length - 1, -1));
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setText(next);
    setActive(-1);
    setOpen(true);
    onInputChange?.(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // Somente leitura: o campo continua focável e lido; a lista não abre e as escolhas não mudam.
    if (readOnly) return;
    if (loading && open && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) && !event.altKey) {
      event.preventDefault();
      return;
    }
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!open) {
          openFromArrow(event.altKey ? 'none' : 'first');
        } else if (!event.altKey) {
          const next = firstEnabled(activeIndex + 1, 1);
          if (next >= 0) setActive(next);
        }
        break;
      }
      case 'ArrowUp': {
        if (event.altKey) {
          event.preventDefault();
          closeList();
        } else if (!open) {
          event.preventDefault();
          openFromArrow('last');
        } else {
          event.preventDefault();
          const prev = activeIndex > 0 ? firstEnabled(activeIndex - 1, -1) : -1;
          if (prev >= 0) setActive(prev);
        }
        break;
      }
      case 'Enter': {
        if (open && activeIndex >= 0) {
          event.preventDefault();
          const option = visible[activeIndex];
          if (option) toggle(option);
        } else if (open) {
          closeList();
        }
        break;
      }
      case 'Backspace': {
        if (text === '' && values.length > 0 && !readOnly) {
          event.preventDefault();
          removeAt(values.length - 1, false);
        }
        break;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          closeList();
        } else if (text !== '') {
          event.preventDefault();
          event.stopPropagation();
          clearText();
        }
        break;
      }
      default:
    }
  };

  const labelledBy =
    listLabel || rest['aria-label'] ? undefined : (rest['aria-labelledby'] ?? field.labelId);

  return (
    <div
      className={cx('eds-combobox eds-combobox-multiple', size !== 'md' && `eds-combobox-${size}`)}
    >
      {/* Clique no vazio do controle leva o foco ao input; o teclado já age direto no input. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={controlRef}
        className="eds-combobox-control"
        onClick={(event) => {
          if (event.target === event.currentTarget && !disabled) inputRef.current?.focus();
        }}
      >
        <ul
          ref={tagsRef}
          className="eds-combobox-tags"
          aria-label={tagsLabel}
          hidden={selectedOptions.length === 0}
        >
          {selectedOptions.map((option, i) => (
            <li key={option.value} className="eds-combobox-tag">
              <span>{option.label}</span>
              <button
                type="button"
                className="eds-combobox-tag-remove"
                aria-label={removeLabel(option.label)}
                data-value={option.value}
                disabled={disabled || readOnly}
                onClick={() => removeAt(i, true)}
              >
                <CloseGlyph />
              </button>
            </li>
          ))}
        </ul>
        <input
          autoComplete="off"
          {...rest}
          {...attrs}
          ref={mergeRefs(ref, inputRef)}
          type="text"
          role="combobox"
          className={cx('eds-combobox-input', className)}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-required={required || undefined}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          disabled={disabled}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented && !disabled && !readOnly && !open) openFromArrow('none');
          }}
          onBlur={(event) => {
            closeList();
            onBlur?.(event);
          }}
        />
      </div>
      {name
        ? values.map((v) => (
            <input key={v} type="hidden" name={name} value={v} disabled={disabled} />
          ))
        : null}
      <div
        ref={popupRef}
        className="eds-combobox-popup"
        popover="manual"
        aria-busy={loading || undefined}
      >
        <ul
          id={listId}
          className="eds-combobox-listbox"
          role="listbox"
          aria-multiselectable="true"
          aria-label={listLabel ?? rest['aria-label']}
          aria-labelledby={labelledBy}
          hidden={visible.length === 0}
        >
          {visible.map((option, i) => (
            // Teclado: tratado no input (aria-activedescendant); a opção só recebe o clique.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={option.value}
              id={optionId(i)}
              className="eds-combobox-option"
              role="option"
              aria-selected={values.includes(option.value)}
              aria-disabled={isBlocked(option) || undefined}
              data-eds-max={!option.disabled && isBlocked(option) ? '' : undefined}
              data-value={option.value}
              data-active={i === activeIndex ? '' : undefined}
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => {
                if (!isBlocked(option) && active !== i) setActive(i);
              }}
              onClick={() => toggle(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
        <p className="eds-combobox-empty" hidden={!(showEmpty || showError)}>
          {showError ? error : emptyMessage}
        </p>
        <p className="eds-combobox-loading" hidden={!showLoading}>
          <Spinner size="sm" decorative /> {loadingMessage}
        </p>
      </div>
      <span className="eds-visually-hidden" role="status">
        {showError ? error : status}
      </span>
    </div>
  );
});
MultiSelect.displayName = 'MultiSelect';
