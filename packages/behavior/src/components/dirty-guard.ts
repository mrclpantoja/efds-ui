import { emit } from '../core/dom';
import { bindAll, refCounted, type Behavior } from '../core/registry';
import { confirm } from './dialogs';
import { pm } from './page-messages';

/** Formulários com alterações e formulários em envio (a página está saindo por causa deles). */
const dirty = new Set<HTMLFormElement>();
const sending = new WeakSet<HTMLFormElement>();
/** Controles do formulário e suas ações por formulário, para `markClean`. */
const cleaners = new WeakMap<HTMLFormElement, () => void>();

const SKIP_INPUT = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

/** Estado dos campos como texto: igual antes e depois = sem alterações. */
function snapshot(form: HTMLFormElement): string {
  const parts: string[] = [];
  [...form.elements].forEach((el, index) => {
    if (el.closest('[data-eds-dirty-ignore]')) return;
    if (el instanceof HTMLInputElement) {
      if (SKIP_INPUT.has(el.type)) return;
      if (el.type === 'checkbox' || el.type === 'radio') parts.push(`${index}:${el.checked}`);
      else if (el.type === 'file') {
        parts.push(`${index}:${[...(el.files ?? [])].map((f) => `${f.name}/${f.size}`).join(',')}`);
      } else parts.push(`${index}:${el.value}`);
    } else if (el instanceof HTMLSelectElement) {
      parts.push(`${index}:${[...el.selectedOptions].map((o) => o.value).join(',')}`);
    } else if (el instanceof HTMLTextAreaElement) {
      parts.push(`${index}:${el.value}`);
    }
  });
  return JSON.stringify(parts);
}

/** Há formulário com alterações não enviadas? */
function pending(): HTMLFormElement[] {
  return [...dirty].filter((form) => form.isConnected && !sending.has(form));
}

/** Link comum que leva a outra página do mesmo site (hash na mesma página não conta). */
function isInternalNavigation(a: HTMLAnchorElement, event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (a.hasAttribute('download')) return false;
  const target = a.getAttribute('target');
  if (target && target !== '_self') return false;
  let url: URL;
  try {
    url = new URL(a.href, location.href);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.origin !== location.origin) return false;
  const samePage = url.pathname === location.pathname && url.search === location.search;
  // Âncora na mesma página não sai dela; rota por hash (`#/lista`, `#!/lista`) sai.
  return !(samePage && url.hash !== '' && !/^#!?[/]/.test(url.hash));
}

/** Ouvintes globais (um conjunto só para todos os formulários). */
const acquireGlobal = refCounted(() => {
  const bypass = new WeakSet<Element>();
  let asking = false;

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (pending().length === 0) return;
    event.preventDefault();
    // Alguns navegadores só mostram o aviso se `returnValue` for preenchido.
    event.returnValue = '';
  };

  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const a = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!a || bypass.has(a) || event.defaultPrevented) return;
    const forms = pending();
    if (forms.length === 0 || !isInternalNavigation(a, event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (asking) return;
    asking = true;
    const custom = forms.find((f) => f.hasAttribute('data-eds-dirty-message'));
    const message = custom?.getAttribute('data-eds-dirty-message') || pm('dirtyMessage');
    void confirm(message, pm('dirtyTitle'), 'danger', {
      okText: pm('dirtyLeave'),
      cancelText: pm('dirtyStay'),
    })
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

  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('click', onClick, true);
  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('click', onClick, true);
  };
});

/**
 * Alterações não salvas: `form[data-eds-dirty-guard]` compara os campos com o estado inicial.
 * Com alterações, fechar a aba ou recarregar mostra o aviso nativo (`beforeunload`) e clicar num
 * link interno pergunta com `confirm` ("Sair sem salvar" / "Continuar editando"); a pergunta
 * usa `data-eds-dirty-message` do formulário quando existe. Enviar o formulário (envio comum) ou
 * voltar ao estado inicial tira o aviso. Para envio por fetch, depois do sucesso dispare
 * `eds:dirty-reset` no formulário (ou chame `markClean(form)`): o estado atual vira o inicial.
 * `data-eds-dirty-ignore` num campo ou bloco o tira da comparação. O formulário recebe
 * `data-dirty="true"` enquanto há alterações e o evento `eds:dirty-change` (`detail.dirty`).
 */
export const dirtyGuardBehavior: Behavior = {
  name: 'dirty-guard',
  selector: 'form[data-eds-dirty-guard]',
  bind(el) {
    const form = el as HTMLFormElement;
    const releaseGlobal = acquireGlobal();
    let initial = snapshot(form);
    let isDirty = false;
    // Outros comportamentos (máscara, OTP, número) normalizam os valores logo depois do bind
    // ("1234.5" vira "R$ 1.234,50"): a base é lida de novo antes de qualquer ação do usuário.
    queueMicrotask(() => {
      if (!isDirty) initial = snapshot(form);
    });

    const evaluate = () => {
      const next = snapshot(form) !== initial;
      if (next === isDirty) return;
      isDirty = next;
      if (next) {
        dirty.add(form);
        form.setAttribute('data-dirty', 'true');
      } else {
        dirty.delete(form);
        form.removeAttribute('data-dirty');
      }
      emit(form, 'dirty-change', { dirty: next });
    };

    const rebase = () => {
      initial = snapshot(form);
      sending.delete(form);
      evaluate();
    };

    const onSubmit = (event: Event) => {
      sending.add(form);
      // Se o envio foi barrado (validação própria, fetch), a página não vai sair.
      setTimeout(() => {
        if (event.defaultPrevented) sending.delete(form);
      }, 0);
    };
    // Volta de bfcache ou cancelamento do envio pelo navegador: volta a valer o aviso.
    const onPageShow = () => sending.delete(form);
    const onReset = () => setTimeout(evaluate, 0);

    cleaners.set(form, rebase);
    form.addEventListener('input', evaluate);
    form.addEventListener('change', evaluate);
    form.addEventListener('submit', onSubmit);
    form.addEventListener('reset', onReset);
    form.addEventListener('eds:dirty-reset', rebase);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      form.removeEventListener('input', evaluate);
      form.removeEventListener('change', evaluate);
      form.removeEventListener('submit', onSubmit);
      form.removeEventListener('reset', onReset);
      form.removeEventListener('eds:dirty-reset', rebase);
      window.removeEventListener('pageshow', onPageShow);
      dirty.delete(form);
      cleaners.delete(form);
      form.removeAttribute('data-dirty');
      releaseGlobal();
    };
  },
};

/** O estado atual do formulário passa a ser o "sem alterações" (depois de um envio por fetch). */
export function markClean(form: HTMLFormElement): void {
  cleaners.get(form)?.();
}

export function initDirtyGuard(root: ParentNode = document): () => void {
  return bindAll(root, [dirtyGuardBehavior]);
}
