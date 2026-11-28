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
import { resetViewerConfig, setViewerConfig } from './core/viewer-config';
import type { ViewerOptions } from './core/viewer-logic';
import { resetFilesConfig, setFilesConfig, type FilesConfig } from './files/config';
import { initAlert } from './components/alert';
import { initButtonBusy } from './components/button-busy';
import { initSelectReadonly } from './components/select-readonly';
// Confirmação declarativa
import { initConfirm } from './components/confirm';
import { initCombobox } from './components/combobox';
import { initDatepicker } from './components/datepicker';
import { initNativeAlert } from './components/dialogs';
import { initDropdown } from './components/dropdown';
import {
  initLoader,
  loader,
  resetLoaderConfig,
  setLoaderConfig,
  type LoaderOptions,
} from './components/loader';
import { initModal } from './components/modal';
import { initSidebar } from './components/sidebar';
import { initTable, tableController } from './components/table';
import { initTableBulk } from './components/table-bulk';
import { initTableColumnFilter } from './components/table-column-filter';
import { initTableRemote } from './components/table-remote';
import { initTableFilter } from './components/table-filter';
import { initTabs } from './components/tabs';
import { initToast, toast } from './components/toast';
import { initUpload } from './components/upload';
// Sortable e Tree
import { initSortable } from './components/sortable';
import { initTree } from './components/tree';
// Accordion, filtros, popover, tooltip, wizard e stepper
import { initAccordion } from './components/accordion';
import { initConditional } from './components/conditional';
import { initCopy } from './components/copy';
import { initDirtyGuard } from './components/dirty-guard';
import { initNotifications } from './components/notifications';
import { initFilterBar } from './components/filter-bar';
import { initPopover } from './components/popover';
import { initTooltip } from './components/tooltip';
import { initWizard } from './components/wizard';
import { initStepperSections } from './components/stepper-sections';
import { lookupController } from './components/lookup';
// Estado de envio de formulário
import {
  initFormSubmit,
  resetSubmitConfig,
  setSubmitConfig,
  submit,
  type SubmitOptions,
} from './components/form-submit';
// Campos
import { initNumber } from './components/number';
import { initLookup } from './components/lookup';
import { initOtp } from './components/otp';
import { initPassword } from './components/password';
// Avatar, imagem, banner e hora
import { initAvatar } from './components/avatar';
import { initImage } from './components/image';
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
  /** Estado de envio de formulário (`data-eds-submit`): tempo do resultado no botão. */
  submit?: SubmitOptions;
  /**
   * Visualizador de arquivos (`EDS.viewer`): PDF embutido ou em link, tempo limite, limite do texto
   * e se Baixar e Abrir em nova aba aparecem. Só vale na compilação completa.
   */
  viewer?: ViewerOptions;
  /**
   * Gerenciador de arquivos (`data-eds-files`): cabeçalhos de toda requisição (CSRF, token),
   * credenciais e adaptador próprio. Só vale na compilação completa.
   */
  files?: FilesConfig;
}

/** Configura locale, textos e loader. Pode ser chamado antes ou depois de `init`. */
export function configure(options: BehaviorOptions): void {
  setLocale(options.locale);
  setMessages(options.messages);
  setLoaderConfig(options.loader);
  setCepUrl(options.cepUrl);
  setSubmitConfig(options.submit);
  setViewerConfig(options.viewer);
  setFilesConfig(options.files);
}

export { defaultMessages, resetCepUrl, resetLocale, resetMessages };
export { resetLoaderConfig, resetSubmitConfig, resetViewerConfig, resetFilesConfig };
export type { ViewerOptions };
// Página e feedback
export { session, initSession } from './components/session';
export type { SessionHandle, SessionOptions } from './components/session';
export { markClean } from './components/dirty-guard';
// Estado de envio de formulário: `EDS.submit(form)`
export { submit };
export type {
  SubmitController,
  SubmitMode,
  SubmitOptions,
  SubmitStatus,
} from './components/form-submit';
export { copyText } from './components/copy';
export type { Messages, LoaderOptions };
export type {
  LoaderHideReason,
  LoaderMode,
  LoaderRequestOptions,
  LoaderTrigger,
} from './components/loader';
export type { ToastOptions, ToastTone } from './components/toast';
// Diálogos rápidos
export { alert, confirm, prompt } from './components/dialogs';
export type { DialogInputType, DialogOptions, DialogTone } from './components/dialogs';
export type { ComboboxOption } from './components/combobox';
// Avatar
export { avatarInitials, avatarTone } from './components/avatar';
export type { SortCriterion, SortDirection } from './components/table';
// Table avançada: controlador (`EDS.table(el)`) e consulta
export { tableController as table };
// Lookup: controle programático (`EDS.lookup(el).setValue(...)`)
export { lookupController as lookup };
export type { LookupController } from './components/lookup';
export type {
  TableController,
  TableState,
  TableColumnState,
  TableSelection,
} from './core/table-hub';
export type { TableQueryDetail } from './components/table-remote';
export type { FilterValue } from './core/data';
export type { TableQuery } from './core/table-query';
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
  initTableBulk,
  initTableColumnFilter,
  initTableFilter,
  initTableRemote,
  initTabs,
  initToast,
  initUpload,
  // Sortable e Tree
  initSortable,
  initTree,
  // Accordion, filtros, popover, tooltip, wizard e stepper
  initAccordion,
  initFilterBar,
  initFormSubmit,
  initPopover,
  initTooltip,
  initWizard,
  initStepperSections,
  // Campos
  initCopy,
  initConditional,
  initDirtyGuard,
  initNotifications,
  initLookup,
  initNumber,
  initOtp,
  initPassword,
  // Avatar, imagem, banner e hora
  initAvatar,
  initImage,
  initBanner,
  initTimepicker,
  loader,
  toast,
};
