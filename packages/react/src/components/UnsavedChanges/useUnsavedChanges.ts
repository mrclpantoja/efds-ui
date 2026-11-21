import { useEffect, useRef } from 'react';
import { mergeTexts } from '../../utils/texts';
import { useOptionalDialog } from '../Dialog/Dialog';

export interface UnsavedChangesTexts {
  title: string;
  message: string;
  /** Botão que sai e descarta. */
  leave: string;
  /** Botão que fica na página. */
  stay: string;
}

const defaultTexts: UnsavedChangesTexts = {
  title: 'Alterações não salvas',
  message: 'Há alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.',
  leave: 'Sair sem salvar',
  stay: 'Continuar editando',
};

export interface UnsavedChangesOptions {
  /** Texto da pergunta (atalho de `texts.message`). */
  message?: string;
  /**
   * Perguntar também ao clicar em links internos (com `DialogProvider`, no diálogo do efDS.ui;
   * sem ele, em `window.confirm`). Fechar a aba sempre usa o aviso nativo. Padrão: `true`.
   */
  confirmLinks?: boolean;
  texts?: Partial<UnsavedChangesTexts>;
}

function isInternalNavigation(a: HTMLAnchorElement, event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (a.hasAttribute('download')) return false;
  const target = a.getAttribute('target');
  if (target && target !== '_self') return false;
  let url: URL;
  try {
    url = new URL(a.href, window.location.href);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.origin !== window.location.origin) return false;
  const samePage =
    url.pathname === window.location.pathname && url.search === window.location.search;
  // Âncora na mesma página não sai dela; rota por hash (`#/lista`, `#!/lista`) sai.
  return !(samePage && url.hash !== '' && !/^#!?[/]/.test(url.hash));
}

/**
 * Avisa antes de perder alterações: com `dirty` verdadeiro, fechar ou recarregar a aba mostra o
 * aviso nativo (`beforeunload`) e clicar num link interno pergunta antes ("Sair sem salvar" ou
 * "Continuar editando"). Funciona com `<a>` comuns e com links de roteadores (o clique é
 * refeito se o usuário confirmar). Navegações por código (`navigate()`) e o botão Voltar não
 * passam por aqui: confirme-as no seu roteador.
 */
export function useUnsavedChanges(dirty: boolean, options: UnsavedChangesOptions = {}): void {
  const { message, confirmLinks = true, texts } = options;
  const dialog = useOptionalDialog();
  const t = mergeTexts(defaultTexts, { ...texts, ...(message ? { message } : {}) });
  const latest = useRef({ t, dialog });
  useEffect(() => {
    latest.current = { t, dialog };
  });

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    let cleanupClick: (() => void) | null = null;
    if (confirmLinks) {
      const bypass = new WeakSet<Element>();
      let asking = false;
      const onClick = (event: MouseEvent) => {
        if (!(event.target instanceof Element)) return;
        const a = event.target.closest<HTMLAnchorElement>('a[href]');
        if (!a || bypass.has(a) || event.defaultPrevented || !isInternalNavigation(a, event)) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        if (asking) return;
        asking = true;
        const { t: texts2, dialog: api } = latest.current;
        const ask = api
          ? api.confirm(texts2.message, texts2.title, 'danger', {
              okText: texts2.leave,
              cancelText: texts2.stay,
            })
          : Promise.resolve(window.confirm(texts2.message));
        void ask
          .then((leave) => {
            if (!leave || !a.isConnected) return;
            bypass.add(a);
            try {
              a.click();
            } finally {
              bypass.delete(a);
            }
          })
          .finally(() => {
            asking = false;
          });
      };
      document.addEventListener('click', onClick, true);
      cleanupClick = () => document.removeEventListener('click', onClick, true);
    }

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      cleanupClick?.();
    };
  }, [dirty, confirmLinks]);
}
