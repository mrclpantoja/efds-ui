import { emit, focusEl } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Campo montado por um widget do eDS.ui (Combobox, MultiSelect, DatePicker, DateRangePicker). */
const WIDGET = '.eds-combobox, .eds-datepicker, .eds-daterange';
const SKIP_TYPES = new Set(['submit', 'reset', 'button', 'image', 'file', 'password']);

/** Filtro ativo: um chip. */
interface ActiveFilter {
  /** `name` do campo (a chave do chip). */
  key: string;
  /** Valor quando o campo repete o nome (checkbox, multisseleção); vazio nos demais. */
  value: string;
  label: string;
  text: string;
  /** Campo (ou, nos widgets, o hidden) que carrega o valor. */
  controls: Control[];
}

export interface FilterChange {
  reason: 'submit' | 'remove' | 'clear';
  /** Valores do formulário não vazios, por `name` (lista quando o nome se repete). */
  values: Record<string, string | string[]>;
  filters: { key: string; value: string; label: string; text: string }[];
  count: number;
}

const cleanText = (el: Element): string => {
  const clone = el.cloneNode(true) as Element;
  clone
    .querySelectorAll(
      '.eds-visually-hidden, .eds-required, [aria-hidden="true"], svg, input, select',
    )
    .forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
};

function labelOf(control: Control, wrapper: Element | null): string {
  const override =
    control.getAttribute('data-eds-filter-label') ??
    wrapper?.getAttribute('data-eds-filter-label') ??
    control.closest('[data-eds-filter-label]')?.getAttribute('data-eds-filter-label');
  if (override) return override;
  const visible = wrapper?.querySelector<HTMLInputElement>('input:not([type="hidden"])');
  const source = visible ?? control;
  const fromLabel = source.labels?.[0];
  if (fromLabel) {
    const text = cleanText(fromLabel);
    if (text) return text;
  }
  const aria = source.getAttribute('aria-label');
  if (aria) return aria;
  const legend = source.closest('fieldset')?.querySelector(':scope > legend');
  if (legend) return cleanText(legend);
  return control.name;
}

/** Rótulo de um grupo de opções: o `legend` do fieldset (checkbox e radio têm rótulo próprio). */
function groupLabel(control: HTMLInputElement): string {
  const override = control
    .closest('[data-eds-filter-label]')
    ?.getAttribute('data-eds-filter-label');
  if (override) return override;
  const legend = control.closest('fieldset')?.querySelector(':scope > legend');
  return legend ? cleanText(legend) : '';
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Ícone "remover" do chip (o mesmo do HTML do servidor: 16x16, cor e traço pelo CSS). */
function chipIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M4 4l8 8M12 4l-8 8');
  svg.append(path);
  return svg;
}

function isoToBr(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/** Controles que participam dos filtros (sem botões, sem os visíveis dos widgets). */
function filterControls(form: HTMLFormElement): Control[] {
  const result: Control[] = [];
  for (const el of Array.from(form.querySelectorAll<Control>('input, select, textarea'))) {
    if (el.disabled || el.closest('.eds-filter-chips') || el.closest('[data-eds-filter-ignore]'))
      continue;
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) continue;
    const widget = el.closest(WIDGET);
    if (el instanceof HTMLInputElement && el.type === 'hidden') {
      // Hidden só conta dentro de um widget (o resto são parâmetros da página).
      if (!widget || !el.name) continue;
    } else if (widget && widget.querySelector('input[type="hidden"][name]')) {
      // O valor do widget está no hidden.
      continue;
    } else if (!el.name) continue;
    result.push(el);
  }
  return result;
}

function optionLabel(control: HTMLInputElement): string {
  const own = control.labels?.[0];
  return own ? cleanText(own) : control.value;
}

/** Filtros ativos (um por campo preenchido; um por valor em checkbox e multisseleção). */
function activeFilters(form: HTMLFormElement): ActiveFilter[] {
  const list: ActiveFilter[] = [];
  const radiosDone = new Set<string>();
  const controls = filterControls(form);
  for (const control of controls) {
    const widget = control.closest(WIDGET);
    if (control instanceof HTMLSelectElement) {
      const chosen = Array.from(control.selectedOptions).filter((o) => o.value !== '');
      if (control.multiple) {
        for (const option of chosen) {
          list.push({
            key: control.name,
            value: option.value,
            label: labelOf(control, null),
            text: option.textContent?.trim() ?? option.value,
            controls: [control],
          });
        }
      } else if (chosen[0]) {
        list.push({
          key: control.name,
          value: '',
          label: labelOf(control, null),
          text: chosen[0].textContent?.trim() ?? chosen[0].value,
          controls: [control],
        });
      }
      continue;
    }
    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
      if (!control.checked) continue;
      const group = controls.filter((c) => c.name === control.name).length > 1;
      list.push({
        key: control.name,
        value: control.value,
        label: group ? groupLabel(control) : '',
        text: optionLabel(control),
        controls: [control],
      });
      continue;
    }
    if (control instanceof HTMLInputElement && control.type === 'radio') {
      if (radiosDone.has(control.name)) continue;
      radiosDone.add(control.name);
      const checked = controls.find(
        (c): c is HTMLInputElement =>
          c instanceof HTMLInputElement &&
          c.type === 'radio' &&
          c.name === control.name &&
          c.checked,
      );
      if (!checked || checked.value === '') continue;
      list.push({
        key: control.name,
        value: '',
        label: groupLabel(checked),
        text: optionLabel(checked),
        controls: [checked],
      });
      continue;
    }
    const raw = control.value.trim();
    if (raw === '') continue;
    let text = raw;
    if (widget) {
      const option = Array.from(widget.querySelectorAll<HTMLElement>('[role="option"]')).find(
        (o) => o.getAttribute('data-value') === control.value,
      );
      const visibles = widget.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])');
      if (option?.textContent?.trim()) text = option.textContent.trim();
      else if (visibles.length === 1 && visibles[0]?.value.trim()) text = visibles[0].value.trim();
      else text = isoToBr(raw);
    } else if (control instanceof HTMLInputElement && control.type === 'date') {
      text = isoToBr(raw);
    }
    const multi = control.name.endsWith('[]');
    list.push({
      key: control.name,
      value: multi ? control.value : '',
      label: labelOf(control, widget),
      text,
      controls: [control],
    });
  }
  return list;
}

function valuesOf(form: HTMLFormElement): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [name, value] of new FormData(form)) {
    if (typeof value !== 'string' || value === '') continue;
    const current = out[name];
    if (current === undefined) out[name] = value;
    else out[name] = Array.isArray(current) ? [...current, value] : [current, value];
  }
  return out;
}

function setNativeValue(control: Control, value: string) {
  control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Zera um campo e avisa os widgets com `input`/`change`. */
function clearControl(control: Control, only?: string): void {
  if (control instanceof HTMLSelectElement) {
    if (control.multiple) {
      for (const option of Array.from(control.options)) {
        if (only === undefined || option.value === only) option.selected = false;
      }
    } else {
      const empty = Array.from(control.options).findIndex((o) => o.value === '');
      control.selectedIndex = empty >= 0 ? empty : 0;
    }
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (
    control instanceof HTMLInputElement &&
    (control.type === 'checkbox' || control.type === 'radio')
  ) {
    if (only !== undefined && control.value !== only) return;
    control.checked = false;
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const widget = control.closest(WIDGET);
  if (control instanceof HTMLInputElement && control.type === 'hidden' && widget) {
    if (only !== undefined && control.value !== only) {
      return;
    }
    const multi = control.name.endsWith('[]');
    if (multi) {
      // MultiSelect: o widget recria os hidden a partir das etiquetas; remove a escolhida.
      const tag = Array.from(widget.querySelectorAll<HTMLElement>('.eds-combobox-tag')).find(
        (t) => t.getAttribute('data-value') === control.value,
      );
      const remove = tag?.querySelector<HTMLButtonElement>('.eds-combobox-tag-remove');
      if (remove) {
        remove.click();
        return;
      }
      control.remove();
      return;
    }
    control.value = '';
    control.removeAttribute('data-value');
    const visibles = Array.from(
      widget.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
    );
    const hiddens = Array.from(
      widget.querySelectorAll<HTMLInputElement>('input[type="hidden"][name]'),
    );
    // Um visível por hidden (período) ou um só visível para o widget inteiro.
    const visible =
      visibles.length === hiddens.length ? visibles[hiddens.indexOf(control)] : visibles[0];
    if (visible) setNativeValue(visible, '');
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  setNativeValue(control, '');
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Barra de filtros (`<form data-eds-filter-bar>`): monta os chips "Rótulo: valor" dos campos
 * preenchidos, remove um (limpa o campo e envia) ou todos (`reset` limpa de verdade e envia),
 * mostra no "Mais filtros" quantos filtros ocultos estão preenchidos e devolve o foco ao
 * próximo chip (ou ao primeiro campo). O envio é o normal do formulário (GET sem JS continua
 * valendo). `eds:filter-change` no formulário a cada envio (`detail`: `reason`, `values`,
 * `filters`, `count`). Campo fora da barra: `data-eds-filter-ignore`; rótulo do chip:
 * `data-eds-filter-label`.
 */
export const filterBarBehavior: Behavior = {
  name: 'filter-bar',
  selector: 'form[data-eds-filter-bar]',
  bind(form) {
    const doc = form.ownerDocument;
    const f = form as HTMLFormElement;
    const ac = new AbortController();
    const { signal } = ac;

    let list = f.querySelector<HTMLElement>('.eds-filter-chips');
    let ownList = false;
    if (!list) {
      list = doc.createElement('ul');
      list.className = 'eds-filter-chips';
      f.append(list);
      ownList = true;
    }
    const chips = list;
    if (!chips.hasAttribute('aria-label') && !chips.hasAttribute('aria-labelledby')) {
      chips.setAttribute('aria-label', getMessages().filterChips);
    }
    let status = f.querySelector<HTMLElement>('[data-eds-filter-status]');
    let ownStatus = false;
    if (!status) {
      status = doc.createElement('div');
      status.className = 'eds-visually-hidden';
      status.setAttribute('role', 'status');
      status.setAttribute('data-eds-filter-status', '');
      f.append(status);
      ownStatus = true;
    }
    const announcer = createAnnouncer(status);

    const more = f.querySelector<HTMLDetailsElement>('details.eds-filter-bar-more');
    const summary = more?.querySelector<HTMLElement>(':scope > summary') ?? null;
    let counter: HTMLElement | null = null;
    let ownCounter = false;

    const countText = (count: number): string => {
      const m = getMessages();
      if (count === 0) return m.filterCountNone;
      return count === 1 ? m.filterCountOne : format(m.filterCountMany, { count });
    };

    const chipText = (item: ActiveFilter): string =>
      item.label && item.label !== item.text ? `${item.label}: ${item.text}` : item.text;

    const renderChips = (): ActiveFilter[] => {
      const active = activeFilters(f);
      const m = getMessages();
      chips.replaceChildren(
        ...active.map((item) => {
          const li = doc.createElement('li');
          const button = doc.createElement('button');
          button.type = 'button';
          button.className = 'eds-chip';
          button.setAttribute('data-eds-filter-remove', item.key);
          if (item.value) button.setAttribute('data-eds-filter-value', item.value);
          const hidden = doc.createElement('span');
          hidden.className = 'eds-visually-hidden';
          hidden.textContent = m.filterRemove;
          button.append(`${chipText(item)} `, chipIcon(), hidden);
          li.append(button);
          return li;
        }),
      );
      chips.hidden = active.length === 0;
      return active;
    };

    const renderCounter = () => {
      if (!more || !summary) return;
      const inMore = activeFilters(f).filter((item) => item.controls.some((c) => more.contains(c)));
      if (inMore.length === 0) {
        if (ownCounter) counter?.remove();
        else if (counter) counter.textContent = '';
        counter = null;
        ownCounter = false;
        return;
      }
      if (!counter) {
        counter = summary.querySelector<HTMLElement>('.eds-filter-bar-count');
        if (!counter) {
          counter = doc.createElement('span');
          counter.className = 'eds-filter-bar-count';
          summary.append(' ', counter);
          ownCounter = true;
        }
      }
      counter.textContent = format(getMessages().filterMoreCount, { count: inMore.length });
    };

    let reason: FilterChange['reason'] = 'submit';
    let focusIndex: number | null = null;

    const onSubmit = () => {
      const active = renderChips();
      renderCounter();
      const detail: FilterChange = {
        reason,
        values: valuesOf(f),
        filters: active.map(({ key, value, label, text }) => ({ key, value, label, text })),
        count: active.length,
      };
      emit(f, 'filter-change', detail);
      const done = reason;
      reason = 'submit';
      if (done === 'remove' && focusIndex !== null) {
        const buttons = Array.from(chips.querySelectorAll<HTMLElement>('button'));
        const next = buttons[Math.min(focusIndex, buttons.length - 1)];
        if (!focusEl(next)) {
          focusEl(
            f.querySelector<HTMLElement>(
              '.eds-filter-bar-fields input, .eds-filter-bar-fields select',
            ),
          );
        }
      }
      focusIndex = null;
    };

    const submit = () => {
      if (typeof f.requestSubmit === 'function') f.requestSubmit();
      else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };

    const onClick = (event: Event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-eds-filter-remove]');
      if (!button || !chips.contains(button)) return;
      const key = button.getAttribute('data-eds-filter-remove') ?? '';
      const only = button.getAttribute('data-eds-filter-value');
      const buttons = Array.from(chips.querySelectorAll<HTMLElement>('button'));
      focusIndex = buttons.indexOf(button);
      const label = button.firstChild?.textContent?.trim() ?? key;
      for (const control of filterControls(f)) {
        if (control.name === key) clearControl(control, only ?? undefined);
      }
      announcer.say(format(getMessages().filterRemoved, { label }));
      reason = 'remove';
      submit();
      // Sem preventDefault do aplicativo o formulário navega; senão o status já foi dito.
      announcer.say(countText(chips.querySelectorAll('button').length));
    };

    const onReset = (event: Event) => {
      event.preventDefault();
      for (const control of filterControls(f)) clearControl(control);
      announcer.say(getMessages().filterCleared);
      reason = 'clear';
      submit();
      announcer.say(countText(chips.querySelectorAll('button').length));
    };

    const onFieldChange = () => renderCounter();

    f.addEventListener('submit', onSubmit, { signal });
    f.addEventListener('reset', onReset, { signal });
    chips.addEventListener('click', onClick, { signal });
    f.addEventListener('input', onFieldChange, { signal });
    f.addEventListener('change', onFieldChange, { signal });
    renderChips();
    renderCounter();

    return () => {
      ac.abort();
      announcer.dispose();
      if (ownCounter) counter?.remove();
      if (ownStatus) status?.remove();
      if (ownList) chips.remove();
    };
  },
};

export function initFilterBar(root: ParentNode = document): () => void {
  return bindAll(root, [filterBarBehavior]);
}
