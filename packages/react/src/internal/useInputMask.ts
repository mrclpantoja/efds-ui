import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type RefObject,
} from 'react';
import { createMask, type Mask, type MaskEditResult } from '@efds-ui/behavior/mask';

export interface InputMaskOptions {
  /** Casas decimais de `moeda` e `numero` (0 a 8). Padrão 2. */
  decimals?: number;
  /** Símbolo antes do valor. Padrão `"R$ "` na moeda e vazio no número. */
  prefix?: string;
  /** Aceita valor negativo (tecla "-"). */
  negative?: boolean;
}

interface UseInputMaskArgs {
  spec: string | undefined;
  options: InputMaskOptions | undefined;
  value: unknown;
  defaultValue: unknown;
  onChange: ((event: ChangeEvent<HTMLInputElement>) => void) | undefined;
  onPaste: ((event: ClipboardEvent<HTMLInputElement>) => void) | undefined;
  onValueChange: ((masked: string, raw: string) => void) | undefined;
}

interface UseInputMaskResult {
  mask: Mask | null;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Só os caracteres significativos (valor do hidden do `unmask`). */
  raw: string;
  /** Props a mesclar no `<input>`; vazio sem máscara. */
  props: {
    value?: string;
    defaultValue?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  };
}

const text = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

/** Escreve no `input` sem o rastreador do React, para ele perceber o `input` disparado em seguida. */
function setNativeValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
}

/**
 * Máscara de entrada do Input: mesma lógica do `@efds-ui/behavior` (núcleo `@efds-ui/behavior/mask`).
 * Sem `spec` não faz nada. Controlado (`value`) ou não (`defaultValue`); o `onChange` do autor
 * recebe `event.target.value` já mascarado.
 */
export function useInputMask({
  spec,
  options,
  value,
  defaultValue,
  onChange,
  onPaste,
  onValueChange,
}: UseInputMaskArgs): UseInputMaskResult {
  const decimals = options?.decimals;
  const prefix = options?.prefix;
  const negative = options?.negative;
  const mask: Mask | null = useMemo(
    () => (spec ? createMask(spec, { decimals, prefix, negative }) : null),
    [spec, decimals, prefix, negative],
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const last = useRef('');
  const caret = useRef<number | null>(null);
  const controlled = value !== undefined;

  const shownValue = mask && controlled ? mask.format(text(value)) : undefined;
  const [initial] = useState(() =>
    mask && !controlled && defaultValue !== undefined ? mask.format(text(defaultValue)) : undefined,
  );
  const [typedRaw, setTypedRaw] = useState(() =>
    mask ? mask.unmask(controlled ? text(value) : text(initial)) : '',
  );
  const raw = mask ? (controlled ? mask.unmask(text(shownValue)) : typedRaw) : '';

  // Mantém o cursor onde o usuário editou (a máscara reescreve o texto) e acompanha o valor que
  // veio de fora, para o Backspace sobre um literal ser reconhecido.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    last.current = input.value;
    const pos = caret.current;
    caret.current = null;
    if (pos !== null && document.activeElement === input && input.selectionStart !== pos) {
      input.setSelectionRange(pos, pos);
    }
  });

  // `reset` do formulário volta ao valor inicial (já mascarado).
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!mask || !form || controlled) return;
    const onReset = () => {
      setTimeout(() => {
        if (inputRef.current) setTypedRaw(mask.unmask(inputRef.current.value));
      }, 0);
    };
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, [mask, controlled]);

  if (!mask) return { mask: null, inputRef, raw, props: {} };

  const apply = (input: HTMLInputElement, result: MaskEditResult) => {
    if (input.value !== result.value) input.value = result.value;
    last.current = result.value;
    caret.current = result.caret;
    if (document.activeElement === input) input.setSelectionRange(result.caret, result.caret);
    setTypedRaw(result.raw);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const native = event.nativeEvent as InputEvent;
    if (native.isComposing) {
      onChange?.(event);
      return;
    }
    const result = mask.edit({
      text: input.value,
      caret: input.selectionStart ?? input.value.length,
      prev: last.current,
      inputType: native.inputType,
    });
    apply(input, result);
    onChange?.(event);
    onValueChange?.(result.value, result.raw);
  };

  // Colar nunca é bloqueado: o texto entra (com ou sem máscara). É tratado aqui para não passar
  // pelo corte do `maxlength`; o `input` disparado depois faz o React chamar o `onChange`.
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(event);
    const input = event.currentTarget;
    if (event.defaultPrevented || input.readOnly || input.disabled) return;
    const pasted = event.clipboardData.getData('text');
    if (pasted === '') return;
    event.preventDefault();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const result = mask.paste(input.value, start, end, pasted);
    setNativeValue(input, result.value);
    input.setSelectionRange(result.caret, result.caret);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return {
    mask,
    inputRef,
    raw,
    props: {
      value: shownValue,
      defaultValue: initial,
      onChange: handleChange,
      onPaste: handlePaste,
    },
  };
}
