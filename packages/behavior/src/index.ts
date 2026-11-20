import { resetMessages, setMessages, type Messages } from './core/config';
import { bindAll } from './core/registry';
import { alertDismissBehavior, initAlert } from './components/alert';
import { initButtonBusy } from './components/button-busy';
// Confirmação declarativa
import { initConfirm } from './components/confirm';
import { comboboxBehavior, initCombobox } from './components/combobox';
import { datepickerBehavior, daterangeBehavior, initDatepicker } from './components/datepicker';
import { initNativeAlert } from './components/dialogs';
import { dropdownBehavior, initDropdown } from './components/dropdown';
import { initLoader, loader, setLoaderConfig, type LoaderOptions } from './components/loader';
import { dialogBehavior, initModal, modalTriggerBehavior } from './components/modal';
import { initSidebar, sidebarBehavior, sidebarCollapseBehavior } from './components/sidebar';
import { initTable, tableBehavior } from './components/table';
import { initTableFilter, tableFilterBehavior } from './components/table-filter';
// Exportação
import { initTableExport, tableExportBehavior } from './components/table-export';
import { initTabs, tabsBehavior } from './components/tabs';
import { initToast, toast } from './components/toast';
import { initUpload, uploadBehavior } from './components/upload';
// Sortable e Tree
import { initSortable, sortableBehavior } from './components/sortable';
import { initTree, treeBehavior } from './components/tree';

export interface BehaviorOptions {
  /** Textos (pt-BR por padrão) trocados por idioma. */
  messages?: Partial<Messages>;
  /** Configuração do PageLoader. */
  loader?: LoaderOptions;
  /**
   * Só em `init`: troca `window.alert` por `EDS.alert` (não bloqueia) até o `destroy`.
   * `confirm` e `prompt` nativos nunca são trocados.
   */
  nativeAlert?: boolean;
}

/** Configura textos e loader. Pode ser chamado antes ou depois de `init`. */
export function configure(options: BehaviorOptions): void {
  setMessages(options.messages);
  setLoaderConfig(options.loader);
}

/**
 * Liga todos os componentes encontrados em `root` (e os que aparecerem depois nele) e o
 * PageLoader. Devolve `destroy()`. Nada fora de `root` é ligado.
 */
export function init(root: ParentNode = document, options?: BehaviorOptions): () => void {
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
      // Exportação
      tableExportBehavior,
      sidebarBehavior,
      sidebarCollapseBehavior,
      comboboxBehavior,
      datepickerBehavior,
      daterangeBehavior,
      uploadBehavior,
      // Sortable e Tree
      sortableBehavior,
      treeBehavior,
    ]),
    initButtonBusy(root),
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

export { resetMessages };
export type { Messages, LoaderOptions };
export type {
  LoaderHideReason,
  LoaderMode,
  LoaderRequestOptions,
  LoaderTrigger,
} from './components/loader';
export type { ToastOptions, ToastVariant } from './components/toast';
// Diálogos rápidos
export { alert, confirm, prompt } from './components/dialogs';
export type { DialogInputType, DialogOptions, DialogVariant } from './components/dialogs';
export type { ComboboxOption } from './components/combobox';
export type { SortDirection } from './components/table';
// Exportação
export { exportData, toCsv, toJson, toPdf, toXlsx } from './export';
export type {
  ExportColumn,
  ExportColumnType,
  ExportData,
  ExportFormat,
  ExportOptions,
} from './export';
export type { ExportScope } from './components/table-export';
export type { TreeChangeAction, TreeNodeData } from './components/tree';
export {
  initAlert,
  initButtonBusy,
  initCombobox,
  // Confirmação declarativa
  initConfirm,
  initDatepicker,
  initDropdown,
  initLoader,
  initModal,
  initNativeAlert,
  initSidebar,
  initTable,
  initTableFilter,
  // Exportação
  initTableExport,
  initTabs,
  initToast,
  initUpload,
  // Sortable e Tree
  initSortable,
  initTree,
  loader,
  toast,
};
