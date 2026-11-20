import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type RefObject,
} from 'react';
import { formatBR, isoToBRIfPasted, maskBR, parseBR, toIso } from './calendar-shared';

export interface DateFieldOptions {
  /** ISO atual ('' = sem data). */
  iso: string;
  inputRef: RefObject<HTMLInputElement | null>;
  invalidText: string;
  /** Mensagem de erro para uma data real ('' = ok): min/max, bloqueios, relação com outro campo. */
  check: (date: Date) => string;
  /** Digitação produziu (ou esvaziou) uma data válida. */
  commit: (iso: string) => void;
  /** Erro quando o campo está vazio (ex.: período incompleto). Vazio = sem erro. */
  missing?: string;
  /** Mostra os erros mesmo sem blur no próprio campo (ex.: o foco saiu do grupo). */
  forceTouched?: boolean;
}

/** Posição no texto mascarado logo depois do n-ésimo dígito. */
function caretAfterDigits(masked: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked.charAt(i)) && ++seen === digits) return i + 1;
  }
  return masked.length;
}

/**
 * Campo de texto de data (dd/mm/aaaa): máscara, colar ISO, validação por `setCustomValidity` e
 * `aria-invalid` depois do blur. O valor só vira ISO quando a data é real e permitida.
 */
export function useDateField({
  iso,
  inputRef,
  invalidText,
  check,
  commit,
  missing = '',
  forceTouched = false,
}: DateFieldOptions) {
  const [text, setText] = useState(() => formatBR(iso));
  const [touched, setTouched] = useState(false);
  const lastIso = useRef(iso);
  const caret = useRef<number | null>(null);
  const [caretTick, setCaretTick] = useState(0);

  // O valor mudou de fora (ou pelo calendário): o texto acompanha.
  useEffect(() => {
    if (iso === lastIso.current) return;
    lastIso.current = iso;
    setText(formatBR(iso));
  }, [iso]);

  const parsed = parseBR(text);
  const error = text === '' ? missing : !parsed ? invalidText : check(parsed);

  useEffect(() => {
    inputRef.current?.setCustomValidity(error);
  }, [error, inputRef]);

  // Mantém o cursor onde o usuário editou (a máscara reescreve o texto e o cursor iria ao fim).
  useLayoutEffect(() => {
    const input = inputRef.current;
    const pos = caret.current;
    caret.current = null;
    if (input && pos !== null && document.activeElement === input)
      input.setSelectionRange(pos, pos);
  }, [caretTick, inputRef]);

  const apply = (masked: string) => {
    setText(masked);
    const date = parseBR(masked);
    const next = date && !check(date) ? toIso(date) : '';
    if (next !== iso) {
      lastIso.current = next;
      commit(next);
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = isoToBRIfPasted(event.target.value);
    const masked = maskBR(raw);
    const cursor = event.target.selectionStart ?? raw.length;
    if (cursor < raw.length) {
      caret.current = caretAfterDigits(masked, raw.slice(0, cursor).replace(/\D/g, '').length);
      setCaretTick((n) => n + 1);
    }
    apply(masked);
  };

  // Colar uma data reconhecível (dd/mm/aaaa ou ISO, com espaços em volta) substitui o campo
  // inteiro sem passar pelo maxlength, que cortaria o texto antes da máscara. Igual ao behavior.
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    // Somente leitura: o valor não muda, nem por colagem.
    if (event.defaultPrevented || event.currentTarget.readOnly) return;
    const pasted = isoToBRIfPasted(event.clipboardData.getData('text')).trim();
    if (!parseBR(pasted)) return;
    event.preventDefault();
    apply(pasted);
  };

  return {
    text,
    error,
    /** Erro a mostrar: só depois de o usuário sair do campo ou confirmar. */
    shownError: touched || forceTouched ? error : '',
    touch: () => setTouched(true),
    /** Atualiza só o texto (valor escolhido no calendário; o chamador grava o valor). */
    syncText: (nextIso: string) => {
      lastIso.current = nextIso;
      setText(formatBR(nextIso));
    },
    inputProps: {
      value: text,
      onChange,
      onPaste,
      onBlur: () => setTouched(true),
    },
  };
}
