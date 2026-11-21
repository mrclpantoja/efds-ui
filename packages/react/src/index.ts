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
} from './components/Button';
export { ButtonGroup } from './components/ButtonGroup';
export type { ButtonGroupProps } from './components/ButtonGroup';

// Forms
export { Field } from './components/Field';
export type { FieldProps } from './components/Field';
export { Fieldset } from './components/Fieldset';
export type { FieldsetProps } from './components/Fieldset';
export { Input } from './components/Input';
export type { InputMaskName, InputMaskOptions, InputProps, InputSize } from './components/Input';
export { Textarea } from './components/Textarea';
export type { TextareaProps, TextareaSize } from './components/Textarea';
export { Select } from './components/Select';
export type { SelectProps, SelectSize } from './components/Select';
export { Combobox } from './components/Combobox';
export type {
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
export type { DatePickerProps, DatePickerSize, DatePickerTexts } from './components/DatePicker';
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
export type { AlertProps, AlertTexts, AlertVariant } from './components/Alert';
export { Badge } from './components/Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './components/Badge';
export { Spinner } from './components/Spinner';
export type { SpinnerProps, SpinnerSize } from './components/Spinner';
export { PageLoader, PageLoaderProvider, usePageLoader } from './components/PageLoader';
export type {
  PageLoaderProps,
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
export type { BreadcrumbProps, BreadcrumbItemProps } from './components/Breadcrumb';
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
  TableSort,
  TableSortDirection,
  TableSortState,
  TableTexts,
  TableColumnKind,
  SortTableDataOptions,
  FilterTableDataOptions,
  TableFilterTexts,
  UseTableFilterOptions,
  UseTableFilterResult,
} from './components/Table';
export { Pagination } from './components/Pagination';
export type { PaginationProps, PaginationTexts } from './components/Pagination';
export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

// Onda B
export { Accordion, AccordionItem } from './components/Accordion';
export type { AccordionProps, AccordionItemProps } from './components/Accordion';
export { Tooltip } from './components/Tooltip';
export type { TooltipProps, TooltipPlacement } from './components/Tooltip';
export { Popover } from './components/Popover';
export type { PopoverProps, PopoverPlacement } from './components/Popover';
export { Stepper } from './components/Stepper';
export type { StepperProps, StepperStep, StepperTexts, StepState } from './components/Stepper';
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
export type { FilterBarProps, FilterBarTexts, ActiveFilter } from './components/FilterBar';
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
export type { ModalProps, ModalSize, ModalTexts } from './components/Modal';
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
  DialogVariant,
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
  ToastVariant,
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

// Onda C: campos
export { InputGroup } from './components/InputGroup';
export type { InputGroupProps, InputGroupSize } from './components/InputGroup';
export { PasswordInput } from './components/PasswordInput';
export type { PasswordInputProps, PasswordRule, PasswordTexts } from './components/PasswordInput';
export { OtpInput } from './components/OtpInput';
export type { OtpInputProps, OtpTexts } from './components/OtpInput';
export { NumberInput } from './components/NumberInput';
export type { NumberInputProps, NumberInputTexts } from './components/NumberInput';
export { Lookup } from './components/Lookup';
export type { LookupColumn, LookupItem, LookupProps, LookupTexts } from './components/Lookup';
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

// Onda C: página e feedback
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
  SessionTimeoutOptions,
  SessionTimeoutState,
} from './components/SessionTimeout';
export { useUnsavedChanges } from './components/UnsavedChanges';
export type { UnsavedChangesOptions, UnsavedChangesTexts } from './components/UnsavedChanges';

// Onda D
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
  SegmentedOption,
  SegmentedSize,
} from './components/SegmentedControl';
export { DescriptionList } from './components/DescriptionList';
export type {
  DescriptionItem,
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
