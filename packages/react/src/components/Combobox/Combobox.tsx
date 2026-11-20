import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
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
import { useAnnouncer } from '../../internal/announcer';
import { mergeRefs } from '../../internal/refs-d';
import { useControllable } from '../../internal/useControllable';
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
import { Spinner } from '../Spinner';

export type ComboboxSize = 'sm' | 'md' | 'lg';

export type { ComboboxOption };

export interface ComboboxTexts {
  /** Lista sem resultado. Padrão: "Nenhum resultado". */
  empty: ReactNode;
  /** Busca em andamento. Padrão: "Carregando…". */
  loading: ReactNode;
  /** Nome acessível da lista de opções. Padrão: o `aria-label` do campo. */
  list?: string;
  /** Texto do status (live region) conforme a quantidade de resultados. */
  status: (count: number) => string;
  /** Status anunciado após ~400 ms de `loading`. Padrão: "Carregando…". */
  loadingStatus: string;
  /** Status ao escolher uma opção. Padrão: "{label} selecionado.". */
  selected: (label: string) => string;
  /** Mensagem de validade quando há texto sem opção escolhida. Padrão: "Escolha uma das opções da lista.". */
  invalidChoice: string;
}

const defaultTexts: ComboboxTexts = {
  empty: 'Nenhum resultado',
  loading: 'Carregando…',
  status: defaultStatus,
  loadingStatus: 'Carregando…',
  selected: (label) => `${label} selecionado.`,
  invalidChoice: 'Escolha uma das opções da lista.',
};

export interface ComboboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'type' | 'role' | 'children' | 'list'
> {
  /** Opções disponíveis (já filtradas, se `filter={false}`). */
  options: ComboboxOption[];
  /** Valor escolhido (controlado). `''` = nenhum. */
  value?: string;
  /** Valor inicial (não controlado). */
  defaultValue?: string;
  /** Escolha ou limpeza (`value === ''`, `option === null`) do valor. */
  onChange?: (value: string, option: ComboboxOption | null) => void;
  /** Texto digitado mudou: use para buscar opções no servidor (combine com `loading`). */
  onInputChange?: (text: string) => void;
  /**
   * Filtro local ("contém", sem diferenciar maiúsculas e acentos). `false` quando o consumidor já
   * filtra; função para filtro próprio. Padrão: `true`.
   */
  filter?: ComboboxFilter;
  /** Busca em andamento: mostra o texto de carregamento e `aria-busy` no popup. */
  loading?: boolean;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<ComboboxTexts>;
  /** Erro de carregamento: aparece no popup (`.eds-combobox-empty`) e é anunciado. */
  error?: ReactNode;
  /**
   * Rótulo do `value` controlado cuja opção ainda não está em `options` (ex.: tela de edição com
   * busca remota).
   */
  selectedLabel?: string;
  /** Texto livre: o hidden recebe o texto digitado e não há validação de escolha. */
  freeText?: boolean;
  /** Gera um `<input type="hidden">` com o valor escolhido para envio em formulário. */
  name?: string;
  /** Padrão: `md`. */
  size?: ComboboxSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid="true"`. */
  valid?: boolean;
}

/**
 * Autocomplete (APG: combobox com lista, `aria-autocomplete="list"`). O foco fica no campo; a
 * opção destacada é apontada por `aria-activedescendant`. O popup é um popover manual
 * (top layer), posicionado por `--_combobox-x/-y/-width` definidos aqui (`-y` é a borda de ancoragem do campo: `bottom`, ou `top` com
 * `data-placement="top"`, quando o CSS sobe o popup). O `ref` vai para o `<input>`.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    options,
    value: valueProp,
    defaultValue,
    onChange,
    onInputChange,
    filter = true,
    loading = false,
    texts,
    error,
    selectedLabel: selectedLabelProp,
    freeText = false,
    name,
    size = 'md',
    invalid,
    valid,
    disabled,
    readOnly,
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
    status: statusMessage,
    loadingStatus,
    selected: selectedStatus,
    invalidChoice: invalidChoiceMessage,
  } = mergeTexts(defaultTexts, texts);
  const attrs = useControlAttrs({
    id: rest.id,
    describedBy: rest['aria-describedby'],
    ariaInvalid: rest['aria-invalid'],
    required: rest.required,
    invalid,
    valid,
  });
  const field = useContext(FieldContext);
  const generated = useId();
  const listId = `${generated}-list`;
  const optionId = (i: number) => `${generated}-opt-${i}`;

  const selectedRef = useRef<ComboboxOption | null>(null);
  const [value, setValue] = useControllable<string>(valueProp, defaultValue ?? '', (next) =>
    onChange?.(next, next === '' ? null : (options.find((o) => o.value === next) ?? null)),
  );
  const known = options.find((o) => o.value === value) ?? null;
  const selected =
    known ??
    (selectedRef.current?.value === value ? selectedRef.current : null) ??
    (value !== '' && selectedLabelProp !== undefined ? { value, label: selectedLabelProp } : null);
  const selectedLabel = value === '' ? '' : (selected?.label ?? '');

  const [text, setText] = useState(selectedLabel);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { text: status, announce, set: setStatus } = useAnnouncer();

  const selectionStatus = useRef('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Valor mudou de fora (ou foi escolhido): o texto passa a ser o rótulo.
  const lastLabel = useRef(selectedLabel);
  useEffect(() => {
    if (known) selectedRef.current = known;
    if (lastLabel.current === selectedLabel) return;
    lastLabel.current = selectedLabel;
    if (selectedLabel !== '') {
      setText(selectedLabel);
      setDirty(false);
    }
  }, [selectedLabel, known]);

  const visible = useMemo(
    () => filterOptions(options, filter, text, dirty),
    [options, filter, dirty, text],
  );

  const hasError = error != null && error !== false;
  const showError = open && !loading && hasError;
  const showEmpty = open && !loading && !hasError && visible.length === 0;
  const showLoading = open && loading;
  const expanded = open && (visible.length > 0 || showEmpty || showLoading || showError);

  const activeIndex = active >= 0 && active < visible.length ? active : -1;

  const closeList = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const firstEnabled = (from: number, dir: 1 | -1) => {
    for (let i = from; i >= 0 && i < visible.length; i += dir) if (!visible[i]?.disabled) return i;
    return -1;
  };

  const choose = (option: ComboboxOption) => {
    if (option.disabled) return;
    selectedRef.current = option;
    lastLabel.current = option.label;
    setText(option.label);
    setDirty(false);
    setValue(option.value);
    selectionStatus.current = selectedStatus(option.label);
    closeList();
  };

  const clearValue = () => {
    if (value === '') return;
    lastLabel.current = '';
    setValue('');
  };

  // Popover + posição (recalculada em scroll e resize).
  usePopupPosition(popupRef, inputRef, expanded, `${visible.length}-${loading}`);

  // Rola até a opção destacada.
  useScrollActiveIntoView(activeIndex >= 0 ? optionId(activeIndex) : undefined);

  // Status para leitor de tela: só ao abrir/filtrar, com debounce (setas não anunciam).
  const count = visible.length;
  const statusRef = useRef(statusMessage);
  statusRef.current = statusMessage;
  const loadingStatusRef = useRef(loadingStatus);
  loadingStatusRef.current = loadingStatus;
  useEffect(() => {
    if (!open) {
      if (selectionStatus.current) announce(selectionStatus.current);
      else setStatus('');
      selectionStatus.current = '';
      return;
    }
    setStatus('');
    if (loading) {
      const timer = setTimeout(() => setStatus(loadingStatusRef.current), LOADING_STATUS_DELAY_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setStatus(statusRef.current(count)), STATUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, loading, count, text, announce, setStatus]);

  // Texto sem opção escolhida: o formulário não envia e o navegador mostra a mensagem.
  const unresolved = !freeText && text !== '' && value === '';
  useEffect(() => {
    inputRef.current?.setCustomValidity(unresolved ? invalidChoiceMessage : '');
  }, [unresolved, invalidChoiceMessage]);

  const openFromArrow = (highlight: 'first' | 'last' | 'none') => {
    setOpen(true);
    if (highlight === 'first') setActive(firstEnabled(0, 1));
    else if (highlight === 'last') setActive(firstEnabled(visible.length - 1, -1));
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setText(next);
    setDirty(true);
    setActive(-1);
    setOpen(true);
    clearValue();
    onInputChange?.(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // Somente leitura: o campo continua focável e lido; a lista não abre e o valor não muda.
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
          if (option) choose(option);
        } else if (open) {
          closeList();
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
          setText('');
          setDirty(false);
          clearValue();
          onInputChange?.('');
        }
        break;
      }
      default:
    }
  };

  return (
    <div className="eds-combobox">
      <input
        autoComplete="off"
        {...rest}
        {...attrs}
        ref={mergeRefs(ref, inputRef)}
        type="text"
        role="combobox"
        className={cx('eds-input', size !== 'md' && `eds-input-${size}`, className)}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
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
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value || (freeText ? text : '')}
          disabled={disabled}
        />
      ) : null}
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
          aria-label={listLabel ?? rest['aria-label']}
          aria-labelledby={
            listLabel || rest['aria-label'] ? undefined : (rest['aria-labelledby'] ?? field.labelId)
          }
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
              aria-selected={i === activeIndex}
              aria-disabled={option.disabled || undefined}
              data-value={option.value}
              data-current={option.value === value ? '' : undefined}
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => {
                if (!option.disabled && active !== i) setActive(i);
              }}
              onClick={() => choose(option)}
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
Combobox.displayName = 'Combobox';
