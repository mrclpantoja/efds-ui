import { createContext, useContext } from 'react';

/** Ligação automática entre Field/Fieldset e o controle (privado, nunca exportado). */
export interface FieldContextValue {
  /** id do controle (só o Field define; Fieldset limpa). */
  id?: string;
  /** id do rótulo (nomeia popups, ex.: a lista do Combobox). */
  labelId?: string;
  /** ids das mensagens (ajuda, erro, sucesso) que descrevem o controle. */
  describedBy?: string;
  invalid?: boolean;
  valid?: boolean;
  required?: boolean;
}

export const FieldContext = createContext<FieldContextValue>({});

export interface ControlOwn {
  id?: string;
  describedBy?: string;
  ariaInvalid?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  required?: boolean;
  invalid?: boolean;
  valid?: boolean;
}

/** Une a props do próprio controle com o que o Field/Fieldset ao redor fornece. */
export function useControlAttrs(own: ControlOwn, { useId = true }: { useId?: boolean } = {}) {
  const ctx = useContext(FieldContext);
  const invalid = own.invalid === true || ctx.invalid === true;
  const valid = !invalid && (own.valid === true || ctx.valid === true);
  const describedBy = [own.describedBy, ctx.describedBy].filter(Boolean).join(' ') || undefined;
  return {
    id: own.id ?? (useId ? ctx.id : undefined),
    'aria-describedby': describedBy,
    'aria-invalid': invalid ? (true as const) : own.ariaInvalid,
    required: own.required ?? ctx.required,
    'data-valid': valid ? ('' as const) : undefined,
  };
}
