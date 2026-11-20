/**
 * Núcleo comum das duas compilações do pacote: a completa (`index.ts`) e a "core" sem
 * exportador e sem máscara (`index-core.ts`, `dist/eds-behavior-core.js`).
 */
import {
  resetCepUrl,
  resetLocale,
  resetMessages,
  defaultMessages,
  setCepUrl,
  setLocale,
  setMessages,
  type Messages,
} from './core/config';
import { initAlert } from './components/alert';
import { initButtonBusy } from './components/button-busy';
import { initSelectReadonly } from './components/select-readonly';
// Confirmação declarativa
import { initConfirm } from './components/confirm';
import { initCombobox } from './components/combobox';
import { initDatepicker } from './components/datepicker';
import { initNativeAlert } from './components/dialogs';
import { initDropdown } from './components/dropdown';
import { initLoader, loader, setLoaderConfig, type LoaderOptions } from './components/loader';
import { initModal } from './components/modal';
import { initSidebar } from './components/sidebar';
import { initTable } from './components/table';
import { initTableFilter } from './components/table-filter';
import { initTabs } from './components/tabs';
import { initToast, toast } from './components/toast';
import { initUpload } from './components/upload';
// Sortable e Tree
import { initSortable } from './components/sortable';
import { initTree } from './components/tree';
// Onda B
import { initAccordion } from './components/accordion';
import { initFilterBar } from './components/filter-bar';
import { initPopover } from './components/popover';
import { initTooltip } from './components/tooltip';
import { initWizard } from './components/wizard';
// Onda C (campos)
import { initNumber } from './components/number';
import { initLookup } from './components/lookup';
import { initOtp } from './components/otp';
import { initPassword } from './components/password';
// Onda D
import { initAvatar } from './components/avatar';
import { initBanner } from './components/banner';
import { initTimepicker } from './components/timepicker';

export interface BehaviorOptions {
  /**
   * Locale BCP 47 (padrão `pt-BR`): ordem de texto da Table, nomes de mês e dia do DatePicker e
   * formato de datas e números do exportador (e o `/Lang` do PDF). Os textos seguem em `messages`.
   */
  locale?: string;

  /** Textos (pt-BR por padrão) trocados por idioma. */
  messages?: Partial<Messages>;
  /** Configuração do PageLoader. */
  loader?: LoaderOptions;
  /**
   * Só em `init`: troca `window.alert` por `EDS.alert` (não bloqueia) até o `destroy`.
   * `confirm` e `prompt` nativos nunca são trocados.
   */
  nativeAlert?: boolean;
  /**
   * Serviço de consulta de CEP, com `{cep}` no lugar dos 8 dígitos (ex.:
   * `https://viacep.com.br/ws/{cep}/json/`). **Vazio por padrão: nenhuma chamada externa** sem o
   * autor escolher o serviço. Só vale na compilação completa (`data-eds-cep`).
   */
  cepUrl?: string;
}

/** Configura locale, textos e loader. Pode ser chamado antes ou depois de `init`. */
export function configure(options: BehaviorOptions): void {
  setLocale(options.locale);
  setMessages(options.messages);
  setLoaderConfig(options.loader);
  setCepUrl(options.cepUrl);
}

export { defaultMessages, resetCepUrl, resetLocale, resetMessages };
// Onda C (página e feedback)
export { session, initSession } from './components/session';
export { markClean } from './components/dirty-guard';
export { copyText } from './components/copy';
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
// Onda D
export { avatarInitials, avatarTone } from './components/avatar';
export type { SortDirection } from './components/table';
export type { TreeChangeAction, TreeNodeData } from './components/tree';
export type { FilterChange } from './components/filter-bar';
export type { Placement } from './core/position';
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
  initSelectReadonly,
  initSidebar,
  initTable,
  initTableFilter,
  initTabs,
  initToast,
  initUpload,
  // Sortable e Tree
  initSortable,
  initTree,
  // Onda B
  initAccordion,
  initFilterBar,
  initPopover,
  initTooltip,
  initWizard,
  // Onda C (campos)
  initLookup,
  initNumber,
  initOtp,
  initPassword,
  // Onda D
  initAvatar,
  initBanner,
  initTimepicker,
  loader,
  toast,
};
