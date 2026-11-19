import { resetMessages, setMessages, type Messages } from './core/config';
import { bindAll } from './core/registry';
import { alertDismissBehavior, initAlert } from './components/alert';
import { comboboxBehavior, initCombobox } from './components/combobox';
import { datepickerBehavior, daterangeBehavior, initDatepicker } from './components/datepicker';
import { dropdownBehavior, initDropdown } from './components/dropdown';
import { initLoader, loader, setLoaderConfig, type LoaderOptions } from './components/loader';
import { dialogBehavior, initModal, modalTriggerBehavior } from './components/modal';
import { initSidebar, sidebarBehavior, sidebarCollapseBehavior } from './components/sidebar';
import { initTable, tableBehavior } from './components/table';
import { initTabs, tabsBehavior } from './components/tabs';
import { initToast, toast } from './components/toast';
import { initUpload, uploadBehavior } from './components/upload';

export interface BehaviorOptions {
  /** Textos (pt-BR por padrão) trocados por idioma. */
  messages?: Partial<Messages>;
  /** Configuração do PageLoader. */
  loader?: LoaderOptions;
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
      sidebarBehavior,
      sidebarCollapseBehavior,
      comboboxBehavior,
      datepickerBehavior,
      daterangeBehavior,
      uploadBehavior,
    ]),
    initToast(),
    initLoader(),
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
export type { ComboboxOption } from './components/combobox';
export type { SortDirection } from './components/table';
export {
  initAlert,
  initCombobox,
  initDatepicker,
  initDropdown,
  initLoader,
  initModal,
  initSidebar,
  initTable,
  initTabs,
  initToast,
  initUpload,
  loader,
  toast,
};
