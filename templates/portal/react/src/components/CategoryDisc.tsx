import { IconDisc, type IconDiscSize } from '@efds-ui/react';
import type { Category } from '../data';

/** Disco com o ícone da categoria de serviço. Decorativo: o nome da categoria vem ao lado. */
export function CategoryDisc({ category, size }: { category: Category; size?: IconDiscSize }) {
  return (
    <IconDisc size={size}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        aria-hidden="true"
      >
        <path d={category.icon} />
      </svg>
    </IconDisc>
  );
}
