import { useState } from 'react';
import { createPortal } from 'react-dom';
import { IconDisc, Stat, type StatProps } from '@efds-ui/react';

/**
 * Indicador (Stat) com disco de ícone no canto. O Stat do efDS.ui ainda não tem um espaço para o
 * ícone, então o disco entra dentro do card por um portal (no HTML ele é só um filho do
 * `.eds-stat`). Decorativo: o rótulo diz o que o indicador mede.
 */
export function StatComIcone({ icone, className, ...rest }: StatProps & { icone: string }) {
  const [card, setCard] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <Stat {...rest} ref={setCard} className={className ? `pn-stat ${className}` : 'pn-stat'} />
      {card &&
        createPortal(
          <IconDisc className="pn-stat-icon">
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
              <path d={icone} />
            </svg>
          </IconDisc>,
          card,
        )}
    </>
  );
}
