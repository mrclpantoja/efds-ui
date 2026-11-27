import { describeBy, emit, ensureId, focusEl } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

type StepState = 'done' | 'current' | 'upcoming' | 'error';

const CONTROLS = 'input, select, textarea';

function controlsOf(
  panel: HTMLElement,
): (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[] {
  return Array.from(
    panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(CONTROLS),
  ).filter((el) => !el.disabled && el.type !== 'hidden');
}

type Control = ReturnType<typeof controlsOf>[number];

/** Campos que já mostram o próprio erro visível (Combobox, DatePicker, DateRangePicker). */
const SELF_REPORTING = '.eds-combobox, .eds-datepicker, .eds-daterange';

interface FieldError {
  el: HTMLElement;
  /** `false`: o `p.eds-error` é do autor (reaproveitado), então só se restaura o estado anterior. */
  created: boolean;
  hidden: boolean;
  text: string;
}

/**
 * Erro visível e associado (3.3.1/3.3.3): `p.eds-error` ligado por `aria-describedby`, com
 * `aria-invalid`. Mensagem: `data-eds-error-message` do campo (texto do autor) ou a nativa. Reaproveita o
 * `p.eds-error` do `.eds-field` quando existe. Não chama `reportValidity` (sem balão duplicado).
 */
function createFieldErrors() {
  const errors = new Map<Control, FieldError>();

  const messageOf = (control: Control): string =>
    control.getAttribute('data-eds-error-message') || control.validationMessage;

  const show = (control: Control) => {
    const message = messageOf(control);
    let entry = errors.get(control);
    if (!entry) {
      const own = control.closest('.eds-field')?.querySelector<HTMLElement>(':scope p.eds-error');
      if (own) {
        entry = {
          el: own,
          created: false,
          hidden: own.hidden as boolean,
          text: own.textContent ?? '',
        };
      } else {
        const el = control.ownerDocument.createElement('p');
        el.className = 'eds-error';
        el.id = `${ensureId(control, 'wizard')}-err`;
        (control.closest('label') ?? control).after(el);
        entry = { el, created: true, hidden: false, text: '' };
      }
      errors.set(control, entry);
    }
    ensureId(entry.el, 'wizard-err');
    entry.el.hidden = false;
    if (entry.el.textContent !== message) entry.el.textContent = message;
    control.setAttribute('aria-invalid', 'true');
    describeBy(control, entry.el.id, true);
  };

  const clear = (control: Control) => {
    const entry = errors.get(control);
    if (!entry) return;
    errors.delete(control);
    describeBy(control, entry.el.id, false);
    control.removeAttribute('aria-invalid');
    if (entry.created) entry.el.remove();
    else {
      entry.el.hidden = entry.hidden;
      entry.el.textContent = entry.text;
    }
  };

  /** Valida o painel: erro visível em cada campo inválido e foco no primeiro. */
  const validatePanel = (panel: HTMLElement): boolean => {
    const seenGroups = new Set<string>();
    const invalid: Control[] = [];
    for (const control of controlsOf(panel)) {
      if (control.checkValidity()) {
        clear(control);
        continue;
      }
      if (control.closest(SELF_REPORTING)) {
        invalid.push(control);
        continue;
      }
      // Grupo de rádios: um erro só, no primeiro.
      if (control instanceof HTMLInputElement && control.type === 'radio' && control.name) {
        if (seenGroups.has(control.name)) continue;
        seenGroups.add(control.name);
      }
      show(control);
      invalid.push(control);
    }
    const first = invalid[0];
    if (!first) return true;
    first.focus();
    return false;
  };

  /** Ao editar: o erro some quando o campo fica válido; senão o texto acompanha o motivo. */
  const refresh = (control: Control) => {
    if (!errors.has(control)) return;
    if (control.checkValidity()) clear(control);
    else show(control);
  };

  const clearAll = () => {
    for (const control of Array.from(errors.keys())) clear(control);
  };

  return { validatePanel, refresh, clearAll };
}

/**
 * Wizard em um `<form data-eds-wizard>`: painéis `[data-eds-wizard-step]` (só o atual visível),
 * botões `[data-eds-wizard-prev]`, `[data-eds-wizard-next]` e (opcional) `[data-eds-wizard-finish]`,
 * que só aparece na última etapa. Avançar valida os campos do painel atual (cada inválido ganha
 * `aria-invalid` e um `p.eds-error` ligado por `aria-describedby`; o foco vai ao primeiro; o erro some
 * quando o campo fica válido; `data-eds-error-message` no campo troca a mensagem nativa); Enter avança; o envio final valida todos os painéis e leva ao primeiro
 * inválido. O `.eds-stepper` do formulário (ou o de `data-eds-wizard-stepper="id"`) acompanha:
 * estados, `aria-current`, marcador e texto oculto; etapas concluídas voltam por clique.
 * Etapa concluída vira botão no rótulo (`.eds-stepper-label`). Sem `[data-eds-wizard-finish]`, o
 * "avançar" da última etapa envia o formulário. Eventos no formulário: `eds:wizard-beforechange` (cancelável; `detail {from, to, direction}`) e
 * `eds:wizard-change` (`detail {from, to, step, total}`).
 */
export const wizardBehavior: Behavior = {
  name: 'wizard',
  selector: 'form[data-eds-wizard]',
  bind(form) {
    const doc = form.ownerDocument;
    const panels = Array.from(form.querySelectorAll<HTMLElement>('[data-eds-wizard-step]'));
    if (panels.length === 0) return;
    const ownerId = form.getAttribute('data-eds-wizard-stepper');
    const stepper =
      (ownerId ? doc.getElementById(ownerId) : null) ??
      form.querySelector<HTMLElement>('.eds-stepper');
    const items = stepper
      ? Array.from(stepper.querySelectorAll<HTMLElement>(':scope > .eds-stepper-item'))
      : [];
    const prevButtons = Array.from(form.querySelectorAll<HTMLElement>('[data-eds-wizard-prev]'));
    const nextButtons = Array.from(form.querySelectorAll<HTMLElement>('[data-eds-wizard-next]'));
    const finishButtons = Array.from(
      form.querySelectorAll<HTMLElement>('[data-eds-wizard-finish]'),
    );
    const total = panels.length;

    let status = form.querySelector<HTMLElement>('[data-eds-wizard-status]');
    let ownStatus = false;
    if (!status) {
      status = doc.createElement('div');
      status.className = 'eds-visually-hidden';
      status.setAttribute('role', 'status');
      status.setAttribute('data-eds-wizard-status', '');
      form.append(status);
      ownStatus = true;
    }
    const announcer = createAnnouncer(status);
    const fieldErrors = createFieldErrors();
    const { validatePanel } = fieldErrors;

    const hadNoValidate = (form as HTMLFormElement).noValidate;
    (form as HTMLFormElement).noValidate = true;

    const completed = new Set<number>();
    const errored = new Set<number>();

    const initial = (): number => {
      const byStepper = items.findIndex(
        (item) => item.getAttribute('aria-current') === 'step' || item.dataset.state === 'current',
      );
      if (byStepper >= 0 && byStepper < total) return byStepper;
      const visible = panels.findIndex((panel) => !panel.hidden);
      return visible >= 0 ? visible : 0;
    };
    let current = initial();
    // Etapas antes da inicial contam como concluídas (o servidor pode reabrir o formulário no meio).
    for (let i = 0; i < current; i += 1) completed.add(i);
    items.forEach((item, i) => {
      if (item.dataset.state === 'done') completed.add(i);
      if (item.dataset.state === 'error') errored.add(i);
    });

    const titleOf = (index: number): string => {
      const panel = panels[index];
      if (!panel) return '';
      const named = panel.getAttribute('data-eds-wizard-step');
      if (named) return named;
      const heading = panel.querySelector<HTMLElement>(
        '[data-eds-wizard-title], h1, h2, h3, h4, h5, h6',
      );
      if (heading?.textContent?.trim()) return heading.textContent.trim();
      const label = items[index]?.querySelector<HTMLElement>('.eds-stepper-label');
      if (label) {
        const clone = label.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.eds-visually-hidden').forEach((el) => el.remove());
        if (clone.textContent?.trim()) return clone.textContent.trim();
      }
      return getMessages().wizardStepUntitled;
    };

    const focusTargetOf = (index: number): HTMLElement | null => {
      const panel = panels[index];
      if (!panel) return null;
      const heading =
        panel.querySelector<HTMLElement>('[data-eds-wizard-title]') ??
        panel.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6');
      const target = heading ?? panel;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      return target;
    };

    const stateOf = (index: number): StepState => {
      if (index === current) return 'current';
      if (errored.has(index)) return 'error';
      return completed.has(index) ? 'done' : 'upcoming';
    };

    const renderStepperItem = (item: HTMLElement, index: number) => {
      const state = stateOf(index);
      const m = getMessages();
      item.dataset.state = state;
      if (state === 'current') item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');

      // Marcador (número, check, "!") é CSS; só o texto oculto e o resumo mudam.
      let label = item.querySelector<HTMLElement>('.eds-stepper-label');
      if (label) {
        // Etapa concluída vira botão (volta por clique); as demais, texto.
        const wantButton = state === 'done';
        const isButton = label instanceof HTMLButtonElement;
        if (wantButton !== isButton) {
          const swap = doc.createElement(wantButton ? 'button' : 'span');
          if (swap instanceof HTMLButtonElement) swap.type = 'button';
          swap.className = label.className;
          swap.append(...Array.from(label.childNodes));
          label.replaceWith(swap);
          label = swap;
        }
        let hidden = label.querySelector<HTMLElement>(':scope > .eds-visually-hidden');
        const text =
          state === 'done' ? m.wizardStepComplete : state === 'error' ? m.wizardStepError : '';
        if (text) {
          if (!hidden) {
            hidden = doc.createElement('span');
            hidden.className = 'eds-visually-hidden';
            label.append(hidden);
          }
          hidden.textContent = text;
        } else hidden?.remove();
      }
      // Resumo do contêiner estreito ("Etapa 2 de 4"): só na etapa atual.
      const summary = item.querySelector<HTMLElement>(':scope > .eds-stepper-summary');
      if (state === 'current') {
        const node = summary ?? doc.createElement('span');
        node.className = 'eds-stepper-summary';
        node.textContent = format(m.wizardSummary, { current: index + 1, total });
        if (!summary) item.append(node);
      } else summary?.remove();
    };

    const render = () => {
      panels.forEach((panel, i) => {
        panel.hidden = i !== current;
      });
      items.forEach(renderStepperItem);
      for (const el of prevButtons) el.hidden = current === 0;
      for (const el of nextButtons) el.hidden = current === total - 1 && finishButtons.length > 0;
      for (const el of finishButtons) el.hidden = current !== total - 1;
    };

    const goTo = (to: number, direction: 'next' | 'prev' | 'jump', moveFocus = true): boolean => {
      if (to < 0 || to >= total || to === current) return false;
      const from = current;
      if (!emit(form, 'wizard-beforechange', { from, to, direction }, true)) return false;
      current = to;
      render();
      if (moveFocus) focusEl(focusTargetOf(to));
      announcer.say(
        format(getMessages().wizardStep, {
          current: to + 1,
          total,
          title: titleOf(to),
        }),
      );
      emit(form, 'wizard-change', { from, to, step: panels[to], total });
      return true;
    };

    const advance = () => {
      const panel = panels[current];
      if (!panel) return;
      if (!validatePanel(panel)) return;
      completed.add(current);
      errored.delete(current);
      if (current < total - 1) goTo(current + 1, 'next');
      // Sem botão de concluir próprio, o "avançar" da última etapa envia o formulário.
      else (form as HTMLFormElement).requestSubmit?.();
    };

    const onClick = (event: Event) => {
      const target = (event.target as Element).closest<HTMLElement>(
        '[data-eds-wizard-prev], [data-eds-wizard-next], .eds-stepper-item > button.eds-stepper-label',
      );
      if (!target || !form.contains(target)) return;
      if (target.hasAttribute('data-eds-wizard-next')) {
        event.preventDefault();
        advance();
      } else if (target.hasAttribute('data-eds-wizard-prev')) {
        event.preventDefault();
        goTo(current - 1, 'prev');
      } else {
        const item = target.closest<HTMLElement>('.eds-stepper-item');
        const index = item ? items.indexOf(item) : -1;
        if (index >= 0 && index !== current) {
          event.preventDefault();
          goTo(index, index > current ? 'jump' : 'prev');
        }
      }
    };

    const onSubmit = (event: Event) => {
      // Enter em um campo antes da última etapa avança em vez de enviar.
      if (current < total - 1) {
        event.preventDefault();
        // Os ouvintes do aplicativo só veem o envio final.
        event.stopImmediatePropagation();
        advance();
        return;
      }
      for (let i = 0; i < total; i += 1) {
        const panel = panels[i];
        if (!panel) continue;
        if (controlsOf(panel).every((el) => el.checkValidity())) {
          completed.add(i);
          errored.delete(i);
          continue;
        }
        // Um painel anterior ficou inválido: o envio para e leva a ele.
        event.preventDefault();
        event.stopImmediatePropagation();
        errored.add(i);
        if (i === current) validatePanel(panel);
        else if (goTo(i, 'jump')) validatePanel(panel);
        render();
        return;
      }
      render();
    };

    // Enter em um campo: um formulário sem botão de envio (os botões são `type="button"`) não
    // faz o envio implícito do navegador, então o Enter avança aqui.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (['button', 'submit', 'reset', 'checkbox', 'radio', 'file'].includes(target.type)) return;
      if (target.closest('.eds-combobox, .eds-datepicker, .eds-daterange')) return;
      event.preventDefault();
      advance();
    };

    const onEdit = (event: Event) => {
      const t = event.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLSelectElement ||
        t instanceof HTMLTextAreaElement
      )
        fieldErrors.refresh(t);
    };

    form.addEventListener('input', onEdit);
    form.addEventListener('change', onEdit);
    form.addEventListener('keydown', onKeyDown);
    form.addEventListener('click', onClick);
    form.addEventListener('submit', onSubmit, true);
    render();

    return () => {
      form.removeEventListener('input', onEdit);
      form.removeEventListener('change', onEdit);
      form.removeEventListener('keydown', onKeyDown);
      form.removeEventListener('click', onClick);
      fieldErrors.clearAll();
      form.removeEventListener('submit', onSubmit, true);
      announcer.dispose();
      if (ownStatus) status?.remove();
      (form as HTMLFormElement).noValidate = hadNoValidate;
    };
  },
};

export function initWizard(root: ParentNode = document): () => void {
  return bindAll(root, [wizardBehavior]);
}
