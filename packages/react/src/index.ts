export { cx } from './utils/cx';
export type { ClassValue } from './utils/cx';

export { Container } from './components/Container';
export type { ContainerProps, ContainerSize } from './components/Container';
export { Grid, GridItem } from './components/Grid';
export type { GridProps, GridItemProps } from './components/Grid';
export { Stack } from './components/Stack';
export type { StackProps, StackDirection, StackAlign, StackJustify } from './components/Stack';
export type { Gap, Span, LayoutElement } from './internal/layout';

export { Button } from './components/Button';
export type {
  ButtonProps,
  ButtonAsButtonProps,
  ButtonAsLinkProps,
  ButtonVariant,
  ButtonSize,
  ButtonResult,
  ButtonTexts,
} from './components/Button';
export { ButtonGroup } from './components/ButtonGroup';
export type { ButtonGroupProps } from './components/ButtonGroup';

// Forms
export { Field } from './components/Field';
export type { FieldProps } from './components/Field';
export { Fieldset } from './components/Fieldset';
export type { FieldsetProps } from './components/Fieldset';
export { Input } from './components/Input';
export type {
  InputMaskName,
  InputMaskOptions,
  InputProps,
  InputSize,
  InputTexts,
} from './components/Input';
export { Textarea } from './components/Textarea';
export type { TextareaProps, TextareaSize } from './components/Textarea';
export { Select } from './components/Select';
export type { SelectProps, SelectSize } from './components/Select';
export { Combobox } from './components/Combobox';
export type {
  ComboboxFilter,
  ComboboxProps,
  ComboboxOption,
  ComboboxSize,
  ComboboxTexts,
} from './components/Combobox';
export { MultiSelect } from './components/MultiSelect';
export type { MultiSelectProps, MultiSelectSize, MultiSelectTexts } from './components/MultiSelect';
export { FileInput } from './components/FileInput';
export type { FileInputProps, FileInputSize } from './components/FileInput';
export { FileUpload } from './components/FileUpload';
export type {
  FileUploadProps,
  FileUploadTexts,
  FileUploadUploadOptions,
} from './components/FileUpload';
export { DatePicker } from './components/DatePicker';
export type {
  CalendarTexts,
  DatePickerProps,
  DatePickerSize,
  DatePickerTexts,
} from './components/DatePicker';
export { DateRangePicker } from './components/DateRangePicker';
export type {
  DateRangePickerProps,
  DateRangePickerSize,
  DateRangePickerTexts,
  DateRangeValue,
} from './components/DateRangePicker';
export { Checkbox } from './components/Checkbox';
export type { CheckboxProps, CheckboxSize } from './components/Checkbox';
export { Radio } from './components/Radio';
export type { RadioProps, RadioSize } from './components/Radio';
export { RadioGroup } from './components/RadioGroup';
export type { RadioGroupProps } from './components/RadioGroup';
export { Switch } from './components/Switch';
export type { SwitchProps, SwitchSize } from './components/Switch';

// Feedback
export { Alert } from './components/Alert';
export type { AlertProps, AlertTexts, AlertTone } from './components/Alert';
export { Badge } from './components/Badge';
export type { BadgeProps, BadgeTone, BadgeSize } from './components/Badge';
export { Spinner } from './components/Spinner';
export type { SpinnerProps, SpinnerSize } from './components/Spinner';
export { PageLoader, PageLoaderProvider, usePageLoader } from './components/PageLoader';
export type {
  PageLoaderProps,
  PageLoaderDialogTexts,
  PageLoaderProviderProps,
  PageLoaderTexts,
  PageLoaderApi,
  PageLoaderOptions,
} from './components/PageLoader';
export { Skeleton, SkeletonRegion } from './components/Skeleton';
export type { SkeletonProps, SkeletonVariant, SkeletonRegionProps } from './components/Skeleton';

// Navigation e Surfaces
export { AppShell, AppShellHeader, AppShellNavToggle, useAppShell } from './components/AppShell';
export type {
  AppShellProps,
  AppShellHeaderProps,
  AppShellNavToggleProps,
  AppShellNavToggleTexts,
  AppShellState,
  AppShellTexts,
} from './components/AppShell';
export { Navbar, NavbarBrand, NavbarNav, NavbarLink, NavbarActions } from './components/Navbar';
export type {
  NavbarProps,
  NavbarBrandProps,
  NavbarNavProps,
  NavbarLinkProps,
  NavbarActionsProps,
} from './components/Navbar';
export { Sidebar, SidebarSection, SidebarItem } from './components/Sidebar';
export type {
  SidebarProps,
  SidebarTexts,
  SidebarSectionProps,
  SidebarItemProps,
  SidebarItemAsLinkProps,
  SidebarItemAsButtonProps,
} from './components/Sidebar';
export { Breadcrumb, BreadcrumbItem } from './components/Breadcrumb';
export type {
  BreadcrumbProps,
  BreadcrumbItemProps,
  BreadcrumbTexts,
} from './components/Breadcrumb';
export {
  Card,
  CardHeader,
  CardTitle,
  CardLink,
  CardActions,
  CardBody,
  CardFooter,
} from './components/Card';
export type {
  CardProps,
  CardVariant,
  CardHeaderProps,
  CardTitleProps,
  CardLinkProps,
  CardActionsProps,
  CardBodyProps,
  CardFooterProps,
} from './components/Card';

// Data
export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  TableEmpty,
  TableToolbar,
  TableFooter,
  TableLoadingRows,
  sortTableData,
  filterTableData,
  useTableFilter,
  useTableColumns,
  useTableQuery,
  TableColumnsMenu,
  TableColumnFilter,
  TableBulkBar,
  TableEditableCell,
} from './components/Table';
export type {
  TableProps,
  TableHeadProps,
  TableBodyProps,
  TableRowProps,
  TableCellProps,
  TableHeaderCellProps,
  TableEmptyProps,
  TableToolbarProps,
  TableFooterProps,
  TableLoadingRowsProps,
  TableAriaSort,
  TableSortDirection,
  TableSortState,
  TableTexts,
  TableColumnKind,
  SortTableDataOptions,
  FilterTableDataOptions,
  TableFilterTexts,
  UseTableFilterOptions,
  UseTableFilterResult,
  TableColumnDef,
  TableColumnState,
  TableColumnsController,
  TableColumnsReason,
  UseTableColumnsOptions,
  TableColumnsMenuProps,
  TableColumnsMenuTexts,
  FilterValue,
  TableColumnFilterOption,
  TableColumnFilterProps,
  TableColumnFilterTexts,
  TableColumnFilterType,
  TableBulkBarProps,
  TableBulkBarTexts,
  TableEditableCellProps,
  TableEditableCellTexts,
  TableEditCommitResult,
  UseTableQueryOptions,
  UseTableQueryResult,
} from './components/Table';
export { Pagination } from './components/Pagination';
export type { PaginationProps, PaginationTexts } from './components/Pagination';
export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

// Accordion, Tooltip, Popover, Stepper, Wizard e página
export { Accordion, AccordionItem } from './components/Accordion';
export type { AccordionProps, AccordionItemProps } from './components/Accordion';
export { Tooltip } from './components/Tooltip';
export type { TooltipProps, TooltipPlacement } from './components/Tooltip';
export { Popover } from './components/Popover';
export type { PopoverProps, PopoverPlacement, Placement } from './components/Popover';
export { Stepper, useSectionProgress } from './components/Stepper';
export type {
  UseSectionProgressResult,
  UseSectionProgressOptions,
  SectionProgressSection,
  StepperProps,
  StepperStep,
  StepperTexts,
  StepperStepState,
  StepperOrientation,
} from './components/Stepper';
export { OptionCard, OptionCardGroup } from './components/OptionCard';
export type { OptionCardGroupProps, OptionCardProps } from './components/OptionCard';
export { IconDisc } from './components/IconDisc';
export type { IconDiscProps, IconDiscSize, IconDiscTone } from './components/IconDisc';
export { Wizard } from './components/Wizard';
export type { WizardProps, WizardStep, WizardTexts } from './components/Wizard';
export { Stat, StatGrid } from './components/Stat';
export type {
  StatProps,
  StatGridProps,
  StatTrend,
  StatTone,
  StatTexts,
  StatGridTexts,
} from './components/Stat';
export { FilterBar } from './components/FilterBar';
export type { FilterBarProps, FilterBarTexts, FilterBarActiveFilter } from './components/FilterBar';
export { Page, PageHeader, PageToolbar, PageBody, PageFooter } from './components/Page';
export type {
  PageProps,
  PageHeaderProps,
  PageToolbarProps,
  PageBodyProps,
  PageFooterProps,
} from './components/Page';

// Overlays e interativos
export { Modal } from './components/Modal';
export type { ModalProps, ModalSize, ModalTexts, DialogShellTexts } from './components/Modal';
export { Drawer } from './components/Drawer';
export type { DrawerProps, DrawerPlacement, DrawerTexts } from './components/Drawer';
export { Dropdown, DropdownItem, DropdownSeparator } from './components/Dropdown';
export type {
  DropdownProps,
  DropdownItemProps,
  DropdownItemAsButtonProps,
  DropdownItemAsLinkProps,
  DropdownItemVariant,
  DropdownSeparatorProps,
} from './components/Dropdown';
export { Tabs, TabList, Tab, TabPanel } from './components/Tabs';
export type { TabsProps, TabListProps, TabProps, TabPanelProps } from './components/Tabs';
export { ConfirmButton, DialogProvider, useDialog } from './components/Dialog';
export type { ConfirmButtonProps } from './components/Dialog';
export type {
  DialogApi,
  DialogInputType,
  DialogOptions,
  DialogProviderProps,
  DialogTexts,
  DialogTone,
  DialogAlert,
  DialogConfirm,
  DialogPrompt,
} from './components/Dialog';
export { Sortable, SortableGroup } from './components/Sortable';
export type {
  SortableProps,
  SortableGroupProps,
  SortableHandleProps,
  SortableRenderState,
  SortableChange,
  SortableItemData,
  SortableOrientation,
  SortableTexts,
} from './components/Sortable';
export { Tree } from './components/Tree';
export type { TreeProps, TreeNodeData, TreeChange, TreeAction, TreeTexts } from './components/Tree';
export { ToastProvider, useToast } from './components/Toast';
export type {
  ToastProviderProps,
  ToastTexts,
  ToastOptions,
  ToastApi,
  ToastTone,
} from './components/Toast';

// Exportação de tabelas (geradores do @efds-ui/behavior, sem o init)
export { TableExport } from './components/TableExport';
export type {
  TableExportProps,
  TableExportTexts,
  TableExportBeforeInfo,
  TableExportDoneInfo,
} from './components/TableExport';
export { exportData, toCsv, toJson, toPdf, toXlsx } from '@efds-ui/behavior/export';
export type {
  ExportColumn,
  ExportColumnType,
  ExportData,
  ExportFormat,
  ExportOptions,
} from '@efds-ui/behavior/export';

// Locale
export { LocaleProvider, useLocale } from './components/Locale';
export type { LocaleProviderProps } from './components/Locale';

// Campos: InputGroup, senha, OTP, número, lookup
export { InputGroup } from './components/InputGroup';
export type { InputGroupProps, InputGroupSize } from './components/InputGroup';
export { PasswordInput } from './components/PasswordInput';
export type {
  PasswordInputProps,
  PasswordLevel,
  PasswordRule,
  PasswordInputTexts,
} from './components/PasswordInput';
export { OtpInput } from './components/OtpInput';
export type { OtpInputProps, OtpInputTexts, OtpKind } from './components/OtpInput';
export { NumberInput } from './components/NumberInput';
export type { NumberInputProps, NumberInputSize, NumberInputTexts } from './components/NumberInput';
export { Lookup } from './components/Lookup';
export type {
  LookupColumn,
  LookupItem,
  LookupProps,
  LookupSize,
  LookupTexts,
} from './components/Lookup';
// Validação de formulários
export { ErrorSummary } from './components/ErrorSummary';
export type {
  ErrorSummaryItem,
  ErrorSummaryProps,
  ErrorSummaryTexts,
} from './components/ErrorSummary';
export { useFormValidation } from './components/FormValidation';
export type {
  FormValidationError,
  FormValidationFormProps,
  UseFormValidationOptions,
  UseFormValidationResult,
} from './components/FormValidation';
export {
  isCep,
  isCnpj,
  isCpf,
  isCpfCnpj,
  isDate,
  isEmail,
  isDateRange,
  isPis,
  isPlate,
  isPhone,
  isVoterId,
  validateBy,
} from '@efds-ui/behavior/validate';
export type { ValidationMessages, ValidatorName } from '@efds-ui/behavior/validate';
export { useCep } from './components/Cep';
export type { CepStatus, UseCepOptions, UseCepResult } from './components/Cep';
export type { CepAddress } from '@efds-ui/behavior/fields';
// Formatadores (funções puras do @efds-ui/behavior/format, sem componente)
export {
  formatCep,
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhone,
  formatRelative,
  maskCpf,
  parseDate,
  parseNumber,
} from '@efds-ui/behavior/format';
export type {
  CurrencyFormatOptions,
  DateFormatOptions,
  DateStyle,
  FormatOptions,
  NumberFormatOptions,
  RelativeFormatOptions,
} from '@efds-ui/behavior/format';

// Página e feedback: Progress, erro, cópia, notificações, sessão
export { Progress } from './components/Progress';
export type { ProgressProps, ProgressTone, ProgressSize } from './components/Progress';
export { ErrorState } from './components/ErrorState';
export type { ErrorStateProps, ErrorStateTexts } from './components/ErrorState';
export { CopyButton, copyToClipboard } from './components/CopyButton';
export type { CopyButtonProps, CopyButtonTexts } from './components/CopyButton';
export { SecretField } from './components/SecretField';
export type { SecretFieldProps, SecretFieldTexts } from './components/SecretField';
export { Timeline } from './components/Timeline';
export type {
  TimelineProps,
  TimelineItem,
  TimelineGroup,
  TimelineState,
  TimelineTexts,
  TimelineTone,
} from './components/Timeline';
export { NotificationBell } from './components/NotificationBell';
export type {
  NotificationBellProps,
  NotificationBellTexts,
  NotificationItem,
} from './components/NotificationBell';
export { SessionTimeout, useSessionTimeout } from './components/SessionTimeout';
export type {
  SessionTimeoutProps,
  SessionTimeoutTexts,
  UseSessionTimeoutOptions,
  UseSessionTimeoutResult,
} from './components/SessionTimeout';
export { useUnsavedChanges } from './components/UnsavedChanges';
export type { UseUnsavedChangesOptions, UnsavedChangesTexts } from './components/UnsavedChanges';
// Estado de envio de formulário
export { useSubmit } from './components/Submit';
export type {
  SubmitState,
  SubmitTexts,
  UseSubmitOptions,
  UseSubmitResult,
} from './components/Submit';

// Avatar, Tag, Divider, busca, agenda, hora, banner
export { Avatar, AvatarGroup } from './components/Avatar';
export type {
  AvatarProps,
  AvatarSize,
  AvatarStatus,
  AvatarTexts,
  AvatarTone,
  AvatarGroupProps,
  AvatarGroupTexts,
} from './components/Avatar';
export { Tag } from './components/Tag';
export type { TagProps, TagTexts, TagTone } from './components/Tag';
export { Divider } from './components/Divider';
export type { DividerProps } from './components/Divider';
export { SegmentedControl } from './components/SegmentedControl';
export type {
  SegmentedControlProps,
  SegmentedControlOption,
  SegmentedControlSize,
} from './components/SegmentedControl';
export { DescriptionList } from './components/DescriptionList';
export type {
  DescriptionListItem,
  DescriptionListProps,
  DescriptionListTexts,
} from './components/DescriptionList';
export { Banner } from './components/Banner';
export type { BannerProps, BannerTexts, BannerTone } from './components/Banner';
export { TimePicker } from './components/TimePicker';
export type { TimePickerProps, TimePickerSize, TimePickerTexts } from './components/TimePicker';
export { CommandPalette } from './components/CommandPalette';
export type {
  CommandPaletteItem,
  CommandPaletteProps,
  CommandPaletteTexts,
} from './components/CommandPalette';
export { Agenda } from './components/Agenda';
export type { AgendaEvent, AgendaProps, AgendaTexts, AgendaTone } from './components/Agenda';
export { Image, Figure } from './components/Image';
export type {
  FigureProps,
  ImageFit,
  ImageProps,
  ImageRatio,
  ImageSourceProp,
  ImageTexts,
} from './components/Image';
export { Gallery } from './components/Gallery';
export type { GalleryItem, GalleryProps, GalleryTexts } from './components/Gallery';
export { ImageCropper, ImageCropperDialog, AvatarUpload } from './components/ImageCropper';
export type {
  AvatarUploadProps,
  AvatarUploadSize,
  AvatarUploadTexts,
  ImageCropperDialogProps,
  ImageCropperDialogTexts,
  ImageCropperHandle,
  ImageCropperOutput,
  ImageCropperProps,
  ImageCropperShape,
  ImageCropperTexts,
} from './components/ImageCropper';
export type { Crop as ImageCrop, CropState as ImageCropState } from '@efds-ui/behavior/image';
