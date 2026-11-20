import { forwardRef, type HTMLAttributes, type MouseEventHandler, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button/Button';
import { CloseGlyph } from '../../internal/glyphs';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const severityDefault: Record<AlertVariant, string> = {
  info: 'Informação:',
  success: 'Sucesso:',
  warning: 'Atenção:',
  danger: 'Erro:',
};

export interface AlertTexts {
  /**
   * Severidade para leitores de tela, antes do título (a cor e o ícone não bastam). Padrão por
   * variante: "Informação:", "Sucesso:", "Atenção:", "Erro:". Passe `false` quando o título já
   * diz a severidade.
   */
  severity: string | false;
  /** Nome acessível do botão de fechar. */
  close: string;
}

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Padrão: `info`. O ícone vem do core (decorativo): diga a severidade no texto ("Erro:"). */
  variant?: AlertVariant;
  /** Textos internos (padrões em pt-BR): `severity` (prefixo oculto) e `close`. */
  texts?: Partial<AlertTexts>;
  /** Título opcional, em linha própria acima do conteúdo. */
  title?: ReactNode;
  /** Botões de ação (ex.: `<Button size="sm">`), à direita do conteúdo. */
  actions?: ReactNode;
  /**
   * Mostra o botão de fechar. O Alert NÃO se remove: o consumidor desmonta o aviso e, como o botão
   * (que tinha o foco) sai do DOM, deve mover o foco para um elemento lógico seguinte
   * (ex.: o gatilho que reabre o aviso ou o próximo campo).
   */
  onClose?: MouseEventHandler<HTMLButtonElement>;
}

/**
 * Aviso persistente e estático (sem `role`). Ao inseri-lo dinamicamente, passe `role="alert"`
 * (urgente) ou `role="status"` (informativo).
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant = 'info', texts, title, actions, onClose, className, children, ...rest },
  ref,
) {
  const hasTitle = title != null && title !== false;
  const t = mergeTexts(
    { severity: severityDefault[variant], close: 'Fechar aviso' } as AlertTexts,
    texts,
  );
  const severity = t.severity === false ? null : t.severity;
  const hidden = severity ? <span className="eds-visually-hidden">{severity} </span> : null;
  return (
    <div {...rest} ref={ref} className={cx('eds-alert', `eds-alert-${variant}`, className)}>
      <div className="eds-alert-content">
        {hasTitle ? (
          <p className="eds-alert-title">
            {hidden}
            {title}
          </p>
        ) : (
          hidden
        )}
        {children}
      </div>
      {actions != null && actions !== false && <div className="eds-alert-actions">{actions}</div>}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          className="eds-alert-close"
          aria-label={t.close}
          onClick={onClose}
        >
          <CloseGlyph />
        </Button>
      )}
    </div>
  );
});
Alert.displayName = 'Alert';
