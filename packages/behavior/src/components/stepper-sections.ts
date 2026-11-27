import { format, getMessages } from '../core/config';
import { emit } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { announce } from './status-region';

const CONTROLS = 'input, select, textarea';
const TITLES = 'h1, h2, h3, h4, h5, h6, legend, [data-eds-section-title]';
/** Faixa do topo da janela em que a seção "está sendo lida" (os 40% de cima). */
const READING_LINE = 0.4;
/** Depois de um clique, a seção clicada vale até a rolagem assentar. */
const CLICK_LOCK_MS = 700;

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface Section {
  link: HTMLAnchorElement;
  item: HTMLElement;
  target: HTMLElement;
  label: string;
  suffix: HTMLElement | null;
  announced: boolean;
  done: boolean;
}

/** Controles que contam: habilitados, não ocultos e fora de trechos `hidden`/`inert`. */
function controlsOf(section: HTMLElement): Control[] {
  return Array.from(section.querySelectorAll<Control>(CONTROLS)).filter(
    (el) => !el.disabled && el.type !== 'hidden' && !el.closest('[hidden], [inert]'),
  );
}

/** Há valor preenchido (texto, opção marcada ou escolhida). */
function hasValue(el: Control): boolean {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
    return el.checked;
  if (el instanceof HTMLInputElement && el.type === 'file') return (el.files?.length ?? 0) > 0;
  return el.value.trim() !== '';
}

/**
 * Seção concluída: tem controles, nenhum é inválido (`validity.valid`, que não dispara `invalid`
 * nem mostra erro) e há o que contar: ao menos um `required` (já válido) ou algum campo
 * preenchido. Seção só com campos opcionais e vazios não é concluída.
 */
export function isSectionComplete(section: HTMLElement): boolean {
  const controls = controlsOf(section);
  if (controls.length === 0) return false;
  if (!controls.every((c) => c.validity.valid)) return false;
  return (
    controls.some((c) => c.required || c.getAttribute('aria-required') === 'true') ||
    controls.some(hasValue)
  );
}

/** O título da seção (cabeçalho, `legend` ou o que o autor marcar) ou a própria seção. */
function titleOf(target: HTMLElement): HTMLElement {
  if (target.matches(TITLES)) return target;
  return target.querySelector<HTMLElement>(TITLES) ?? target;
}

/**
 * Stepper como indicador de seções de uma página longa (`nav[data-eds-stepper-sections]` ou o
 * atributo no próprio `ol.eds-stepper`): cada `.eds-stepper-item` tem um `a.eds-stepper-link` com
 * `href="#id-da-secao"`.
 * - `aria-current="step"` no link da seção que está sendo lida (IntersectionObserver, nada de
 *   rolagem automática); a lida é a última cujo topo passou dos 40% superiores da janela.
 * - `data-state="done"` no item quando a seção está concluída (`isSectionComplete`), atualizado em
 *   `input`/`change`; senão `current` ou `upcoming`. Acrescenta o texto oculto " (concluída)".
 * - Anuncia "Seção X concluída." uma única vez por seção, pela região de status comum.
 * - Clique no link leva o foco ao título da seção. Evento `eds:stepper-section-change`
 *   (`{ id, index, label }`) quando a seção lida muda.
 */
export const stepperSectionsBehavior: Behavior = {
  name: 'stepper-sections',
  selector: '[data-eds-stepper-sections]',
  bind(root) {
    const doc = root.ownerDocument;
    const ac = new AbortController();
    const { signal } = ac;
    const sections: Section[] = [];
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      const id = decodeURIComponent((link.getAttribute('href') ?? '').slice(1));
      const target = id ? doc.getElementById(id) : null;
      if (!target) continue;
      const item = link.closest<HTMLElement>('.eds-stepper-item') ?? link.parentElement ?? link;
      sections.push({
        link,
        item,
        target,
        label: (link.textContent ?? '').trim(),
        suffix: null,
        announced: false,
        done: false,
      });
    }
    if (sections.length === 0) return;

    let current = -1;
    let locked = false;
    let lockTimer: ReturnType<typeof setTimeout> | null = null;

    const paint = () => {
      // Resumo do contêiner estreito: só no item atual.
      for (const old of root.querySelectorAll('.eds-stepper-summary[data-eds-generated]'))
        old.remove();
      const cur = sections[current];
      if (cur && !cur.item.querySelector('.eds-stepper-summary')) {
        const summary = doc.createElement('span');
        summary.className = 'eds-stepper-summary';
        summary.setAttribute('data-eds-generated', '');
        summary.textContent = format(getMessages().stepperSectionSummary, {
          current: current + 1,
          total: sections.length,
        });
        cur.item.append(summary);
      }
      sections.forEach((s, i) => {
        const state = s.done ? 'done' : i === current ? 'current' : 'upcoming';
        if (s.item.getAttribute('data-state') !== state) s.item.setAttribute('data-state', state);
        if (i === current) s.link.setAttribute('aria-current', 'step');
        else s.link.removeAttribute('aria-current');
        if (s.done && !s.suffix) {
          s.suffix = doc.createElement('span');
          s.suffix.className = 'eds-visually-hidden';
          s.suffix.textContent = getMessages().stepperDone;
          s.link.append(s.suffix);
        } else if (!s.done && s.suffix) {
          s.suffix.remove();
          s.suffix = null;
        }
      });
    };

    const setCurrent = (index: number, notify: boolean) => {
      if (index === current) return;
      current = index;
      paint();
      const s = sections[index];
      if (notify && s)
        emit(root, 'stepper-section-change', { id: s.target.id, index, label: s.label });
    };

    const updateDone = (silent: boolean) => {
      for (const s of sections) {
        const done = isSectionComplete(s.target);
        if (done === s.done) continue;
        s.done = done;
        if (done && !silent && !s.announced) {
          s.announced = true;
          announce(format(getMessages().stepperSectionDone, { label: s.label }));
        }
      }
      paint();
    };

    // A seção lida: a última cujo topo já passou da linha de leitura; no fim da página, a última.
    const recompute = () => {
      if (locked) return;
      const line = window.innerHeight * READING_LINE;
      let index = 0;
      sections.forEach((s, i) => {
        if (s.target.getBoundingClientRect().top <= line) index = i;
      });
      const doc2 = doc.documentElement;
      if (
        window.innerHeight + window.scrollY >= doc2.scrollHeight - 2 &&
        doc2.scrollHeight > window.innerHeight
      )
        index = sections.length - 1;
      setCurrent(index, true);
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(recompute, {
        rootMargin: `0px 0px -${Math.round((1 - READING_LINE) * 100)}% 0px`,
        threshold: [0, 1],
      });
      for (const s of sections) io.observe(s.target);
    }
    // No fim da página a última seção pode ser curta demais para cruzar a linha: um ouvinte
    // passivo e limitado a um quadro cobre esse caso (e a falta de IntersectionObserver).
    let frame = 0;
    const onScroll = () => {
      if (frame || typeof requestAnimationFrame !== 'function') return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        recompute();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true, signal });

    for (const s of sections) {
      s.link.addEventListener(
        'click',
        () => {
          // O foco vai ao título; a navegação por fragmento rola até a seção em seguida.
          const title = titleOf(s.target);
          if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
          // A navegação por fragmento tira o foco de quem não é focável: o foco vem depois dela.
          setTimeout(() => title.focus({ preventScroll: true }), 0);
          locked = true;
          if (lockTimer) clearTimeout(lockTimer);
          lockTimer = setTimeout(() => {
            locked = false;
            lockTimer = null;
          }, CLICK_LOCK_MS);
          setCurrent(sections.indexOf(s), true);
        },
        { signal },
      );
      const refresh = () => queueMicrotask(() => updateDone(false));
      s.target.addEventListener('input', refresh, { signal });
      s.target.addEventListener('change', refresh, { signal });
    }

    // Estado inicial sem anunciar nada e sem avisar quem escuta.
    updateDone(true);
    recompute();
    if (current < 0) setCurrent(0, false);

    return () => {
      ac.abort();
      io?.disconnect();
      if (lockTimer) clearTimeout(lockTimer);
      if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
      for (const s of sections) {
        s.suffix?.remove();
        s.item.querySelector('.eds-stepper-summary[data-eds-generated]')?.remove();
        s.link.removeAttribute('aria-current');
        s.item.removeAttribute('data-state');
      }
    };
  },
};

export function initStepperSections(root: ParentNode = document): () => void {
  return bindAll(root, [stepperSectionsBehavior]);
}
