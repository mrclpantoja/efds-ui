import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

export interface DescriptionItem {
  /** Rótulo (o `<dt>`). */
  label: ReactNode;
  /** Valor (o `<dd>`). Vazio (`null`, `undefined`, `''`) mostra "—" e diz "não informado". */
  value?: ReactNode;
  /** Chave estável da linha. Padrão: o índice. */
  id?: string;
}

export interface DescriptionListTexts {
  /** Texto oculto do valor vazio. Padrão: "não informado". */
  empty: string;
}

const defaultTexts: DescriptionListTexts = { empty: 'não informado' };

export interface DescriptionListProps extends Omit<HTMLAttributes<HTMLDListElement>, 'children'> {
  items: readonly DescriptionItem[];
  /**
   * Máximo de colunas. A lista usa menos quando o contêiner é estreito (cada coluna tem largura
   * mínima), sem media query. Padrão: `1`.
   */
  columns?: 1 | 2 | 3;
  /** Rótulo à esquerda e valor à direita em cada linha (pensada para 1 coluna). */
  horizontal?: boolean;
  /** Linha separadora entre os itens (1 coluna). */
  divided?: boolean;
  /** Listras alternadas (1 coluna). */
  striped?: boolean;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<DescriptionListTexts>;
}

const isEmpty = (value: ReactNode) =>
  value === undefined || value === null || value === '' || value === false;

/** Pares rótulo/valor de um registro: `<dl>` com `<div>` agrupando `<dt>` e `<dd>`. */
export const DescriptionList = forwardRef<HTMLDListElement, DescriptionListProps>(
  function DescriptionList(
    {
      items,
      columns = 1,
      horizontal = false,
      divided = false,
      striped = false,
      texts,
      className,
      ...rest
    },
    ref,
  ) {
    const t = mergeTexts(defaultTexts, texts);
    return (
      <dl
        {...rest}
        ref={ref}
        className={cx(
          'eds-description-list',
          columns > 1 && `eds-description-list-cols-${columns}`,
          horizontal && 'eds-description-list-horizontal',
          divided && 'eds-description-list-divided',
          striped && 'eds-description-list-striped',
          className,
        )}
      >
        {items.map((item, index) => (
          <div key={item.id ?? index}>
            <dt>{item.label}</dt>
            <dd>
              {isEmpty(item.value) ? (
                <>
                  <span className="eds-description-empty" aria-hidden="true">
                    —
                  </span>
                  <span className="eds-visually-hidden">{t.empty}</span>
                </>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  },
);
DescriptionList.displayName = 'DescriptionList';
