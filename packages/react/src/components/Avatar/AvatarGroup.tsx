import { Children, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { AvatarGroupSizeProvider, type AvatarSize } from './Avatar';

export interface AvatarGroupTexts {
  /** Nome do "+N" (recebe a quantidade omitida). Padrão: "Mais 3 pessoas". */
  more: (count: number) => string;
}

const defaultTexts: AvatarGroupTexts = {
  more: (count) => (count === 1 ? 'Mais 1 pessoa' : `Mais ${count} pessoas`),
};

export interface AvatarGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Nome do grupo (obrigatório): "Responsáveis", "Participantes". */
  'aria-label': string;
  /** Quantos avatares mostrar; o resto vira "+N". Sem limite, mostra todos. */
  max?: number;
  /** Tamanho dos avatares sem `size` próprio. Padrão: `md`. */
  size?: AvatarSize;
  /** Os `<Avatar>`. */
  children?: ReactNode;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<AvatarGroupTexts>;
}

/** Avatares sobrepostos; com `max`, o excedente vira "+N" com nome acessível. */
export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { max, size = 'md', texts, className, children, ...rest },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const all = Children.toArray(children);
  const limit = max !== undefined && max >= 0 ? Math.floor(max) : all.length;
  const shown = all.slice(0, limit);
  const hidden = all.length - shown.length;
  return (
    <div {...rest} ref={ref} role="group" className={cx('eds-avatar-group', className)}>
      <AvatarGroupSizeProvider value={size}>{shown}</AvatarGroupSizeProvider>
      {hidden > 0 ? (
        <span
          className={cx('eds-avatar', 'eds-avatar-more', size !== 'md' && `eds-avatar-${size}`)}
          role="img"
          aria-label={t.more(hidden)}
        >
          +{hidden}
        </span>
      ) : null}
    </div>
  );
});
AvatarGroup.displayName = 'AvatarGroup';
