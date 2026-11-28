import { forwardRef, useRef, type MouseEvent, type Ref } from 'react';
import { isFormValid, isValidating } from '@efds-ui/behavior/internal';
import { Button, type ButtonAsButtonProps, type ButtonAsLinkProps } from '../Button';
import { useDialog, type DialogOptions } from './Dialog';

interface ConfirmOwnProps {
  /** Pergunta do diálogo de confirmação. Só quando o usuário confirma, a ação segue. */
  confirm: string;
  /** Opções do diálogo: `title`, `tone` (padrão `question`), `okText`, `cancelText`. */
  confirmOptions?: DialogOptions;
}

export type ConfirmButtonProps =
  (ButtonAsButtonProps & ConfirmOwnProps) | (ButtonAsLinkProps & ConfirmOwnProps);

/** Envio que a validação (nativa ou do `useFormValidation`) vai recusar: não vale perguntar. */
function willBeRejected(element: HTMLElement): boolean {
  if (!(element instanceof HTMLButtonElement) || element.type !== 'submit') return false;
  const form = element.form;
  if (!form || element.formNoValidate) return false;
  if (form.noValidate && !isValidating(form)) return false;
  return !isFormValid(form);
}

/**
 * Equivalente em React do `data-eds-confirm` do behavior: botão (ou link, com `href`) que pergunta
 * antes de agir. Cancelar, Esc ou o fundo abortam sem efeito; confirmar repete o clique, então um
 * botão `type="submit"` envia o formulário, um link navega e o `onClick` roda só depois do "sim".
 * Botão de envio valida antes de perguntar: com o formulário inválido, o clique segue sem
 * pergunta para a validação nativa ou a do `useFormValidation` mostrar os erros
 * (`formNoValidate` pergunta sem validar).
 * Exige um `<DialogProvider>` acima.
 */
export const ConfirmButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, ConfirmButtonProps>(
  function ConfirmButton({ confirm: text, confirmOptions, onClick, ...rest }, ref) {
    const dialog = useDialog();
    const approved = useRef(false);
    const pending = useRef(false);

    const handleClick = (event: MouseEvent<HTMLElement>) => {
      if (approved.current) {
        // O clique repetido depois do "sim": segue o caminho normal (envio, navegação, onClick).
        approved.current = false;
        (onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
        return;
      }
      const element = event.currentTarget;
      // Sem pergunta e sem `onClick`: o envio só serve para a validação mostrar os erros.
      if (willBeRejected(element)) return;
      event.preventDefault();
      if (pending.current) return;
      pending.current = true;
      void dialog.confirm(text, confirmOptions).then((ok) => {
        pending.current = false;
        if (!ok || !element.isConnected) return;
        approved.current = true;
        try {
          element.click();
        } finally {
          approved.current = false;
        }
      });
    };

    const props = { ...rest, onClick: handleClick } as ButtonAsButtonProps;
    return <Button {...props} ref={ref as Ref<HTMLButtonElement>} />;
  },
);
ConfirmButton.displayName = 'ConfirmButton';
