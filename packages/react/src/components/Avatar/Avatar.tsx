import { createContext, forwardRef, useContext, type HTMLAttributes, type ReactNode } from 'react';
import { avatarInitials, avatarTone } from '../../internal/avatar-tone';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline';
export type AvatarTone = 1 | 2 | 3 | 4 | 5 | 6;

export interface AvatarTexts {
  /** Texto do status no nome acessível ("Ana Souza, online"). */
  online: string;
  busy: string;
  away: string;
  offline: string;
}

const defaultTexts: AvatarTexts = {
  online: 'online',
  busy: 'ocupado',
  away: 'ausente',
  offline: 'offline',
};

/** Tamanho padrão dos avatares de um `AvatarGroup`. */
const GroupSizeContext = createContext<AvatarSize | undefined>(undefined);
export const AvatarGroupSizeProvider = GroupSizeContext.Provider;

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Nome da pessoa: vira as iniciais, o nome acessível e a cor (o mesmo nome dá sempre o mesmo tom). */
  name: string;
  /** Foto. É decorativa (`alt=""`): o nome está no avatar. Sem carregar, valem as iniciais. */
  src?: string;
  /** Padrão: `md` (ou o do `AvatarGroup`). */
  size?: AvatarSize;
  /** Situação (online, ocupado, ausente, offline): vai também no nome acessível. */
  status?: AvatarStatus;
  /** Círculo, em vez da forma do tema (`data-shape`). */
  circle?: boolean;
  /** Força um dos 6 tons; sem isso o tom vem do nome. */
  tone?: AvatarTone;
  /**
   * Decorativo: o nome já está escrito ao lado. O avatar sai da árvore de acessibilidade
   * (`aria-hidden`), e o status deixa de ser dito.
   */
  decorative?: boolean;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<AvatarTexts>;
  children?: ReactNode;
}

/**
 * Monograma ou foto de uma pessoa. O nome é obrigatório: gera as iniciais, o `aria-label` e o
 * tom. A aparência (tamanho, forma, cor) é do core; aqui só se escolhem as classes.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    name,
    src,
    size,
    status,
    tone,
    circle = false,
    decorative = false,
    texts,
    className,
    children,
    ...rest
  },
  ref,
) {
  const groupSize = useContext(GroupSizeContext);
  const effective = size ?? groupSize ?? 'md';
  const t = mergeTexts(defaultTexts, texts);
  const label = status && !decorative ? `${name}, ${t[status]}` : name;
  return (
    <span
      {...rest}
      ref={ref}
      className={cx(
        'eds-avatar',
        effective !== 'md' && `eds-avatar-${effective}`,
        circle && 'eds-avatar-circle',
        `eds-avatar-tone-${tone ?? avatarTone(name)}`,
        className,
      )}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      {avatarInitials(name)}
      {src ? <img src={src} alt="" /> : null}
      {status ? <span className="eds-avatar-status" data-status={status} /> : null}
      {children}
    </span>
  );
});
Avatar.displayName = 'Avatar';
