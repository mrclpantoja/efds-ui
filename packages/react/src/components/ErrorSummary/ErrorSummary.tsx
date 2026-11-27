import {
  createElement,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { composeErrorText, summaryTitle, validationMessages } from '@efds-ui/behavior/validate';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { mergeRefs } from '../../internal/refs-d';
import { useAnnouncer } from '../../internal/announcer';

export interface ErrorSummaryTexts {
  /** Título com 1 erro. */
  titleOne: string;
  /** Título com vários erros; `{count}` é a quantidade. */
  titleMany: string;
  /** Anúncio discreto quando o último erro é corrigido. */
  fixed: string;
}

const defaultTexts: ErrorSummaryTexts = {
  titleOne: validationMessages.errorSummaryTitleOne,
  titleMany: validationMessages.errorSummaryTitleMany,
  fixed: validationMessages.errorSummaryFixed,
};

export interface ErrorSummaryItem {
  /** `id` do campo: o link leva o foco a ele. */
  id: string;
  /** Texto do erro (o mesmo que aparece junto do campo). */
  message: string;
  /** Rótulo do campo: o item vira "Rótulo: mensagem". */
  label?: string;
  /** Nome do campo (chave do item; padrão: `id`). */
  name?: string;
}

export interface ErrorSummaryProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'children'
> {
  /** Erros a listar. Lista vazia: o resumo fica oculto. */
  errors: readonly ErrorSummaryItem[];
  /** Troca o título padrão ("Corrija N campos"). */
  title?: ReactNode;
  /** Nível do título conforme a hierarquia da página. Padrão: 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * Muda a cada envio recusado (o `useFormValidation` fornece): o resumo recebe o foco quando o
   * valor muda e há erros. Sem ele, recebe o foco quando passa de nenhum a algum erro.
   */
  focusKey?: number;
  /** `false`: o resumo nunca move o foco (padrão `true`). Na primeira renderização ele também não move. */
  moveFocus?: boolean;
  texts?: Partial<ErrorSummaryTexts>;
}

/**
 * Resumo de erros no topo do formulário (padrão GOV.UK; WCAG 3.3.1 e 3.3.3): título com a contagem
 * e um link por campo, que leva o foco ao campo. Recebe o foco ao aparecer; ao zerar, avisa por uma
 * região de status discreta. Use com `useFormValidation` ou alimente `errors` por conta própria.
 */
export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary(
  { errors, title, headingLevel = 2, focusKey, moveFocus = true, texts, className, id, ...rest },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const generated = useId();
  const titleId = `${id ?? generated}-title`;
  const innerRef = useRef<HTMLDivElement>(null);
  const merged = useMemo(() => mergeRefs(ref, innerRef), [ref]);
  const { text: status, announce } = useAnnouncer();
  const count = errors.length;
  const previous = useRef(0);
  const lastKey = useRef(focusKey);
  const mounted = useRef(false);

  useEffect(() => {
    const before = previous.current;
    previous.current = count;
    const keyChanged = focusKey !== undefined && focusKey !== lastKey.current;
    lastKey.current = focusKey;
    const first = !mounted.current;
    mounted.current = true;
    if (count === 0) {
      if (before > 0) announce(t.fixed);
      return;
    }
    if (first || !moveFocus) return;
    if (focusKey === undefined ? before === 0 : keyChanged) innerRef.current?.focus();
    // `t.fixed` e `announce` não devem reexecutar o foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, focusKey]);

  const goTo = (event: MouseEvent<HTMLAnchorElement>, fieldId: string) => {
    const target = innerRef.current?.ownerDocument.getElementById(fieldId);
    if (!target) return;
    event.preventDefault();
    const focusable = target.matches('input, select, textarea, button, a[href], [tabindex]')
      ? target
      : (target.querySelector<HTMLElement>('input, select, textarea, button') ?? target);
    focusable.focus();
  };

  return (
    <>
      <div
        {...rest}
        id={id}
        ref={merged}
        tabIndex={-1}
        hidden={count === 0}
        aria-labelledby={titleId}
        className={cx('eds-error-summary', className)}
      >
        {createElement(
          `h${headingLevel}`,
          { className: 'eds-error-summary-title', id: titleId },
          title ??
            summaryTitle(count, {
              errorSummaryTitleOne: t.titleOne,
              errorSummaryTitleMany: t.titleMany,
            }),
        )}
        <ul className="eds-error-summary-list">
          {errors.map((error) => (
            <li key={error.name ?? error.id}>
              <a href={`#${error.id}`} onClick={(event) => goTo(event, error.id)}>
                {composeErrorText(error.label ?? '', error.message)}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <span className="eds-visually-hidden" role="status">
        {status}
      </span>
    </>
  );
});
ErrorSummary.displayName = 'ErrorSummary';
