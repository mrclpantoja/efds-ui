import { forwardRef, type HTMLAttributes } from 'react';

export interface SkeletonRegionProps extends HTMLAttributes<HTMLDivElement> {
  /** Em carregamento: `aria-busy="true"` e o `label` é anunciado. */
  loading: boolean;
  /** Texto anunciado ao começar a carregar. Padrão: "Carregando". */
  label?: string;
}

/**
 * Contêiner `aria-busy` + região `role="status"` (irmã dele) montada vazia desde o início (só assim o texto é
 * anunciado). Renderize Skeletons enquanto `loading` e o conteúdo real depois, em um bloco de
 * mesmo tamanho para não haver layout shift.
 */
export const SkeletonRegion = forwardRef<HTMLDivElement, SkeletonRegionProps>(
  function SkeletonRegion({ loading, label = 'Carregando', children, ...rest }, ref) {
    return (
      <>
        {/* Irmão do contêiner busy: dentro de um ancestral aria-busy o anúncio seria suprimido. */}
        <span className="eds-visually-hidden" role="status">
          {loading ? label : ''}
        </span>
        <div {...rest} ref={ref} aria-busy={loading}>
          {children}
        </div>
      </>
    );
  },
);
SkeletonRegion.displayName = 'SkeletonRegion';
