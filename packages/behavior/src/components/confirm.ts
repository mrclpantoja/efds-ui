import { confirm, type DialogTone } from './dialogs';

const TONES: readonly DialogTone[] = ['info', 'success', 'warning', 'danger', 'question'];
const TRIGGER = 'button[data-eds-confirm], a[data-eds-confirm]';
const FORM = 'form[data-eds-confirm]';

function ask(el: HTMLElement): Promise<boolean> {
  const text = el.getAttribute('data-eds-confirm') ?? '';
  const title = el.getAttribute('data-eds-confirm-title') || undefined;
  const raw = el.getAttribute('data-eds-confirm-tone');
  const tone = TONES.find((t) => t === raw);
  const okText = el.getAttribute('data-eds-confirm-ok');
  return confirm(text, title, tone, okText ? { okText } : undefined);
}

/**
 * Confirmação declarativa: `data-eds-confirm="Excluir o pedido?"` em `button`, `a` ou `form`
 * intercepta o clique (ou o envio), pergunta com `confirm` e, só se o usuário confirmar,
 * prossegue: o link navega, o botão age (um botão de envio envia o formulário com ele como
 * `submitter`) e o formulário é enviado. Opcionais: `data-eds-confirm-title`,
 * `-tone` (`info|success|warning|danger|question`) e `-ok` (texto do botão principal).
 * Ouvintes de captura em `root`; devolve a limpeza.
 */
export function initConfirm(root: ParentNode = document): () => void {
  const target = root as unknown as EventTarget;
  /** Elementos já confirmados: a repetição do evento passa sem perguntar de novo. */
  const approved = new WeakSet<Element>();
  /** Elementos com a pergunta aberta: cliques repetidos são ignorados. */
  const pending = new WeakSet<Element>();

  const onClick = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const el = event.target.closest<HTMLElement>(TRIGGER);
    if (!el || !(root as Node).contains(el)) return;
    if (approved.has(el)) return;
    if (el instanceof HTMLButtonElement && el.disabled) return;
    if (el.getAttribute('aria-busy') === 'true') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending.has(el)) return;
    pending.add(el);
    void ask(el)
      .then((ok) => {
        if (!ok || !el.isConnected) return;
        const form = el instanceof HTMLButtonElement ? el.form : null;
        if (form && el instanceof HTMLButtonElement && el.type === 'submit') {
          // O envio já foi confirmado aqui: o `submit` do form não pergunta de novo.
          approved.add(form);
          try {
            form.requestSubmit(el);
          } finally {
            approved.delete(form);
          }
          return;
        }
        approved.add(el);
        try {
          el.click();
        } finally {
          approved.delete(el);
        }
      })
      .finally(() => {
        pending.delete(el);
      });
  };

  const onSubmit = (event: Event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches(FORM)) return;
    if (!(root as Node).contains(form)) return;
    if (approved.has(form)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending.has(form)) return;
    pending.add(form);
    const submitter = (event as SubmitEvent).submitter;
    void ask(form)
      .then((ok) => {
        if (!ok || !form.isConnected) return;
        approved.add(form);
        try {
          form.requestSubmit(submitter instanceof HTMLElement ? submitter : undefined);
        } finally {
          approved.delete(form);
        }
      })
      .finally(() => {
        pending.delete(form);
      });
  };

  target.addEventListener('click', onClick, true);
  target.addEventListener('submit', onSubmit, true);
  return () => {
    target.removeEventListener('click', onClick, true);
    target.removeEventListener('submit', onSubmit, true);
  };
}
