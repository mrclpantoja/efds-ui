import { forwardRef, type KeyboardEvent, type MouseEvent, type SelectHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';

export type SelectSize = 'sm' | 'md' | 'lg';

/** `<select>` nativo: passe `<option>`/`<optgroup>` como filhos. */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Padrão: `md`. */
  size?: SelectSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid="true"`. */
  valid?: boolean;
  /**
   * Somente leitura (o `<select>` não tem o atributo): a lista não abre e o valor não muda, mas o
   * campo continua focável, é lido (`aria-readonly`) e vai no envio do formulário.
   */
  readOnly?: boolean;
}

// Teclas que mudam a escolha ou abrem a lista. Tab, Enter (envia o formulário) e atalhos seguem.
const BLOCKED_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  ' ',
]);

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', invalid, valid, readOnly, className, onMouseDown, onKeyDown, ...rest },
  ref,
) {
  const attrs = useControlAttrs({
    id: rest.id,
    describedBy: rest['aria-describedby'],
    ariaInvalid: rest['aria-invalid'],
    required: rest.required,
    invalid,
    valid,
  });
  const handleMouseDown = (event: MouseEvent<HTMLSelectElement>) => {
    onMouseDown?.(event);
    // Sem abrir a lista, mas com foco (o preventDefault do mousedown tira o foco: devolve-o).
    if (readOnly && !event.defaultPrevented) {
      event.preventDefault();
      event.currentTarget.focus();
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLSelectElement>) => {
    onKeyDown?.(event);
    if (!readOnly || event.defaultPrevented) return;
    const typeahead =
      event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey;
    if (BLOCKED_KEYS.has(event.key) || typeahead) event.preventDefault();
  };
  return (
    <select
      {...rest}
      ref={ref}
      className={cx('eds-select', size !== 'md' && `eds-select-${size}`, className)}
      {...attrs}
      aria-readonly={readOnly || undefined}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    />
  );
});
Select.displayName = 'Select';
