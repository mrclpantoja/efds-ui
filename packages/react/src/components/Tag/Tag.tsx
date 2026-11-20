import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { mergeTexts } from '../../utils/texts';
import { cx } from '../../utils/cx';

export type TagTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

export interface TagTexts {
  /** Nome do botão de remover (recebe o texto da tag). Padrão: "Remover {texto}". */
  remove: (label: string) => string;
}

const defaultTexts: TagTexts = { remove: (label) => `Remover ${label}` };

interface TagBase extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Padrão: `neutral`. O texto é quem informa; o tom só reforça. */
  tone?: TagTone;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<TagTexts>;
}

/**
 * Tag fixa, ou removível quando há `onRemove`. Removível precisa de um nome para o botão:
 * o próprio texto (`children` string) ou `removeLabel`.
 */
export type TagProps = TagBase &
  (
    | { onRemove?: undefined; removeLabel?: undefined; children?: ReactNode }
    | { onRemove: () => void; removeLabel?: string; children: string }
    | { onRemove: () => void; removeLabel: string; children?: ReactNode }
  );

/**
 * Rótulo de classificação (área, categoria, marcador). Não é interativo: só o botão de remover
 * recebe foco. Badge diz o estado de um registro; Tag classifica; Chip é um controle.
 */
export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { tone = 'neutral', texts, onRemove, removeLabel, className, children, ...rest },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const name = removeLabel ?? (typeof children === 'string' ? children : '');
  return (
    <span
      {...rest}
      ref={ref}
      className={cx('eds-tag', className)}
      data-tone={tone === 'neutral' ? undefined : tone}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          className="eds-tag-remove"
          aria-label={removeLabel ? removeLabel : t.remove(name)}
          onClick={onRemove}
        />
      ) : null}
    </span>
  );
});
Tag.displayName = 'Tag';
