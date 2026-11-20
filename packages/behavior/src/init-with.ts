import { bindAll, type Behavior } from './core/registry';
import { alertDismissBehavior } from './components/alert';
import { initButtonBusy } from './components/button-busy';
import { initConfirm } from './components/confirm';
import { comboboxBehavior } from './components/combobox';
import { datepickerBehavior, daterangeBehavior } from './components/datepicker';
import { initNativeAlert } from './components/dialogs';
import { dropdownBehavior } from './components/dropdown';
import { initLoader } from './components/loader';
import { dialogBehavior, modalTriggerBehavior } from './components/modal';
import { initSelectReadonly } from './components/select-readonly';
import { sidebarBehavior, sidebarCollapseBehavior } from './components/sidebar';
import { tableBehavior } from './components/table';
import { tableFilterBehavior } from './components/table-filter';
import { tabsBehavior } from './components/tabs';
import { initToast } from './components/toast';
import { uploadBehavior } from './components/upload';
import { sortableBehavior } from './components/sortable';
import { treeBehavior } from './components/tree';
import { accordionBehavior } from './components/accordion';
import { filterBarBehavior } from './components/filter-bar';
import { popoverBehavior } from './components/popover';
import { tooltipBehavior } from './components/tooltip';
import { wizardBehavior } from './components/wizard';
import { configure, type BehaviorOptions } from './setup';

/**
 * Base de `init` (pacote completo e "core"): liga os componentes comuns mais os `extra`.
 * Liga todos os componentes encontrados em `root` (e os que aparecerem depois nele) e o
 * PageLoader. Devolve `destroy()`. Nada fora de `root` é ligado.
 */
export function initWith(
  root: ParentNode,
  options: BehaviorOptions | undefined,
  extra: readonly Behavior[],
): () => void {
  if (options) configure(options);
  const stops = [
    bindAll(root, [
      tabsBehavior,
      modalTriggerBehavior,
      dialogBehavior,
      dropdownBehavior,
      alertDismissBehavior,
      tableBehavior,
      tableFilterBehavior,
      sidebarBehavior,
      sidebarCollapseBehavior,
      comboboxBehavior,
      datepickerBehavior,
      daterangeBehavior,
      uploadBehavior,
      // Sortable e Tree
      sortableBehavior,
      treeBehavior,
      // Onda B
      accordionBehavior,
      tooltipBehavior,
      popoverBehavior,
      wizardBehavior,
      filterBarBehavior,
      // Os que só entram na compilação completa (exportação e máscara)
      ...extra,
    ]),
    initButtonBusy(root),
    // Select com aria-readonly="true"
    initSelectReadonly(root),
    // Confirmação declarativa
    initConfirm(root),
    initToast(),
    initLoader(),
    ...(options?.nativeAlert ? [initNativeAlert()] : []),
  ];
  let destroyed = false;
  return () => {
    if (destroyed) return;
    destroyed = true;
    for (const stop of stops) stop();
  };
}
