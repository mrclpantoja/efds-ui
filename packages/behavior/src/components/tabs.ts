import { emit } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';

const isDisabled = (tab: HTMLElement) =>
  tab.getAttribute('aria-disabled') === 'true' || (tab as HTMLButtonElement).disabled === true;

/**
 * Abas: `.eds-tabs > .eds-tablist[role=tablist] > .eds-tab[role=tab][aria-controls]`.
 * `tabindex=0` só na aba selecionada, setas (com volta), Home/End, aba indisponível alcançável por seta mas não
 * ativa, painéis inativos com `hidden`. Ativação automática.
 */
export const tabsBehavior: Behavior = {
  name: 'tabs',
  selector: '.eds-tabs',
  bind(root) {
    const list = root.querySelector<HTMLElement>('.eds-tablist[role="tablist"]');
    if (!list) return;
    const ac = new AbortController();
    const { signal } = ac;

    const tabs = () =>
      Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]')).filter(
        (tab) => tab.closest('.eds-tabs') === root,
      );
    const panelOf = (tab: HTMLElement) => {
      const id = tab.getAttribute('aria-controls');
      return id ? root.ownerDocument.getElementById(id) : null;
    };

    const activeTab = (): HTMLElement | undefined => {
      const all = tabs();
      return (
        all.find((tab) => tab.getAttribute('aria-selected') === 'true') ??
        all.find((tab) => !isDisabled(tab))
      );
    };

    const sync = () => {
      const active = activeTab();
      for (const tab of tabs()) {
        const selected = tab === active;
        tab.setAttribute('aria-selected', String(selected));
        // Parada de Tab: sempre a aba selecionada (a desabilitada recebe foco por seta, não por Tab).
        tab.tabIndex = selected ? 0 : -1;
        const panel = panelOf(tab);
        if (panel) panel.hidden = !selected;
      }
    };

    const select = (tab: HTMLElement) => {
      if (isDisabled(tab) || tab.getAttribute('aria-selected') === 'true') return;
      for (const other of tabs()) other.setAttribute('aria-selected', String(other === tab));
      sync();
      emit(root, 'tabs-change', { tab, panel: panelOf(tab), id: tab.id || null });
    };

    list.addEventListener(
      'click',
      (event) => {
        const tab = (event.target as Element).closest<HTMLElement>('[role="tab"]');
        if (tab && tabs().includes(tab)) select(tab);
      },
      { signal },
    );

    list.addEventListener(
      'keydown',
      (event) => {
        if (event.defaultPrevented) return;
        const all = tabs();
        const current = (event.target as Element).closest<HTMLElement>('[role="tab"]');
        const index = current ? all.indexOf(current) : -1;
        if (index < 0) return;
        const rtl = getComputedStyle(list).direction === 'rtl';
        const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
        const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
        let next: number;
        if (event.key === forward) next = (index + 1) % all.length;
        else if (event.key === backward) next = (index - 1 + all.length) % all.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = all.length - 1;
        else return;
        event.preventDefault();
        const target = all[next];
        if (!target) return;
        target.focus();
        // Aba indisponível recebe foco (alcançável por setas), mas não é ativada.
        select(target);
      },
      { signal },
    );

    // Abas acrescentadas ou removidas depois.
    const observer = new MutationObserver(sync);
    observer.observe(list, { childList: true, subtree: true });

    sync();

    return () => {
      ac.abort();
      observer.disconnect();
    };
  },
};

export function initTabs(root: ParentNode = document): () => void {
  return bindAll(root, [tabsBehavior]);
}
