/**
 * Registro único de rotas do site. Para adicionar uma página:
 *
 *  1. crie `src/pages/<secao>/<Nome>.tsx` com `export default function Nome() { ... }`
 *     (copie `pages/componentes/Button.tsx` como molde; o h1, o título da aba e o foco
 *     vêm do Layout, a partir do `title` abaixo — a página só escreve o corpo);
 *  2. importe a página aqui e preencha o campo `page` da entrada correspondente
 *     (as entradas de todas as páginas já existem: sem `page`, a rota mostra "Em breve").
 *
 * Exemplos vivos ficam em `src/examples/<componente>/` (ver `components/Example.tsx`).
 */
import type { ComponentType } from 'react';
import ButtonPage from './pages/componentes/Button';
import TabsPage from './pages/componentes/Tabs';
import EditorPage from './pages/componentes/Editor';
import TemplatesPage from './pages/templates/Templates';
import QuemUsaPage from './pages/comecar/QuemUsa';
import PoliticasPage from './pages/comecar/Politicas';
import LicencaTemplatesPage from './pages/templates/Licenca';
import AcessibilidadePage from './pages/comecar/Acessibilidade';
import EventosPage from './pages/comecar/Eventos';
import ExportacaoPage from './pages/comecar/Exportacao';
import MascaraPage from './pages/comecar/Mascara';
import FormatadoresPage from './pages/comecar/Formatadores';
import AccordionPage from './pages/componentes/Accordion';
import FilterBarPage from './pages/componentes/FilterBar';
import PageHeaderPage from './pages/componentes/PageHeader';
import PopoverPage from './pages/componentes/Popover';
import StatPage from './pages/componentes/Stat';
import StepperPage from './pages/componentes/Stepper';
import TooltipPage from './pages/componentes/Tooltip';
import Comportamento from './pages/comecar/Comportamento';
import Instalacao from './pages/comecar/Instalacao';
import Introducao from './pages/comecar/Introducao';
import UsoComHtml from './pages/comecar/UsoComHtml';
import UsoComReact from './pages/comecar/UsoComReact';
import TemasEEixos from './pages/fundamentos/TemasEEixos';
import Tokens from './pages/fundamentos/Tokens';
import Tipografia from './pages/fundamentos/Tipografia';
import LayoutPage from './pages/fundamentos/Layout';
import Icones from './pages/fundamentos/Icones';
import AlertPage from './pages/componentes/Alert';
import AppShellPage from './pages/componentes/AppShell';
import BadgePage from './pages/componentes/Badge';
import BreadcrumbPage from './pages/componentes/Breadcrumb';
import ComboboxPage from './pages/componentes/Combobox';
import DateInputPage from './pages/componentes/DateInput';
import DatePickerPage from './pages/componentes/DatePicker';
import DateRangePickerPage from './pages/componentes/DateRangePicker';
import DialogsPage from './pages/componentes/Dialogs';
import FileInputPage from './pages/componentes/FileInput';
import FileUploadPage from './pages/componentes/FileUpload';
import MultiSelectPage from './pages/componentes/MultiSelect';
import PageLoaderPage from './pages/componentes/PageLoader';
import ButtonGroupPage from './pages/componentes/ButtonGroup';
import CardPage from './pages/componentes/Card';
import CheckboxPage from './pages/componentes/Checkbox';
import DrawerPage from './pages/componentes/Drawer';
import DropdownPage from './pages/componentes/Dropdown';
import EmptyStatePage from './pages/componentes/EmptyState';
import FieldPage from './pages/componentes/Field';
import FieldsetPage from './pages/componentes/Fieldset';
import InputPage from './pages/componentes/Input';
import ModalPage from './pages/componentes/Modal';
import NavbarPage from './pages/componentes/Navbar';
import PaginationPage from './pages/componentes/Pagination';
import RadioPage from './pages/componentes/Radio';
import SelectPage from './pages/componentes/Select';
import SidebarPage from './pages/componentes/Sidebar';
import SortablePage from './pages/componentes/Sortable';
import SkeletonPage from './pages/componentes/Skeleton';
import SpinnerPage from './pages/componentes/Spinner';
import SwitchPage from './pages/componentes/Switch';
import TablePage from './pages/componentes/Table';
import TextareaPage from './pages/componentes/Textarea';
import ToastPage from './pages/componentes/Toast';
import TreePage from './pages/componentes/Tree';
// Onda C: campos
import ProgressPage from './pages/componentes/Progress';
import ErrorStatePage from './pages/componentes/ErrorState';
import CopyPage from './pages/componentes/Copy';
import TimelinePage from './pages/componentes/Timeline';
import NotificationsPage from './pages/componentes/Notifications';
import DirtyGuardPage from './pages/componentes/DirtyGuard';
import SessionTimeoutPage from './pages/componentes/SessionTimeout';
import ConditionalPage from './pages/componentes/Conditional';
import CepPage from './pages/componentes/Cep';
import InputGroupPage from './pages/componentes/InputGroup';
import LookupPage from './pages/componentes/Lookup';
import OtpPage from './pages/componentes/Otp';
import PasswordPage from './pages/componentes/Password';
// Onda D
import AgendaPage from './pages/componentes/Agenda';
import AvatarPage from './pages/componentes/Avatar';
import BannerPage from './pages/componentes/Banner';
import CommandPage from './pages/componentes/Command';
import DescriptionListPage from './pages/componentes/DescriptionList';
import DividerPage from './pages/componentes/Divider';
import SegmentedPage from './pages/componentes/Segmented';
import TagPage from './pages/componentes/Tag';
import TimePickerPage from './pages/componentes/TimePicker';
import IdiomasPage from './pages/comecar/Idiomas';
// Imagem
import GalleryPage from './pages/componentes/Gallery';
import ImagePage from './pages/componentes/Image';
import ImageCropperPage from './pages/componentes/ImageCropper';

export type SectionId =
  | 'comecar'
  | 'fundamentos'
  | 'templates'
  | 'acoes'
  | 'formularios'
  | 'datas'
  | 'navegacao'
  | 'superficies'
  | 'feedback'
  | 'dados'
  | 'midia'
  | 'pagina'
  | 'componentes';

export interface DocRoute {
  /** Caminho do hash, com barra inicial (`/componentes/button`). */
  path: string;
  /** Texto do menu, do h1, do breadcrumb e do `document.title`. */
  title: string;
  section: SectionId;
  /** Corpo da página. Ausente: a rota mostra a página "Em breve". */
  page?: ComponentType;
  /**
   * Só nas páginas de componente: `stable` segue o SemVer; `experimental` pode mudar a API numa
   * versão menor (ver a página Políticas). Preenchido por `experimentalComponents` abaixo.
   */
  stability?: 'stable' | 'experimental';
}

export const sections: readonly { id: SectionId; title: string }[] = [
  { id: 'comecar', title: 'Começar' },
  { id: 'fundamentos', title: 'Fundamentos' },
  { id: 'templates', title: 'Templates' },
  { id: 'acoes', title: 'Ações' },
  { id: 'formularios', title: 'Formulários' },
  { id: 'datas', title: 'Datas e horários' },
  { id: 'navegacao', title: 'Navegação e estrutura' },
  { id: 'superficies', title: 'Superfícies e camadas' },
  { id: 'feedback', title: 'Feedback' },
  { id: 'dados', title: 'Dados e exibição' },
  { id: 'midia', title: 'Imagem' },
  { id: 'pagina', title: 'Recursos de página' },
];

/** Categoria de cada página de componente (o caminho continua em /componentes/...). */
const componentCategory: Record<string, SectionId> = {
  ...Object.fromEntries(['button', 'button-group', 'dropdown', 'copy'].map((s) => [s, 'acoes'])),
  ...Object.fromEntries(
    [
      'field',
      'fieldset',
      'input',
      'textarea',
      'select',
      'checkbox',
      'radio',
      'switch',
      'segmented',
      'input-group',
      'password',
      'otp',
      'combobox',
      'multi-select',
      'lookup',
      'cep',
      'file-input',
      'file-upload',
      'editor',
    ].map((s) => [s, 'formularios']),
  ),
  ...Object.fromEntries(
    ['date-input', 'date-picker', 'date-range-picker', 'time-picker', 'agenda'].map((s) => [
      s,
      'datas',
    ]),
  ),
  ...Object.fromEntries(
    [
      'app-shell',
      'sidebar',
      'navbar',
      'page-header',
      'breadcrumb',
      'tabs',
      'pagination',
      'stepper',
      'command',
    ].map((s) => [s, 'navegacao']),
  ),
  ...Object.fromEntries(
    ['card', 'accordion', 'divider', 'modal', 'drawer', 'popover', 'tooltip'].map((s) => [
      s,
      'superficies',
    ]),
  ),
  ...Object.fromEntries(
    [
      'alert',
      'banner',
      'toast',
      'dialogos',
      'page-loader',
      'spinner',
      'skeleton',
      'progress',
      'empty-state',
      'error-state',
      'notifications',
    ].map((s) => [s, 'feedback']),
  ),
  ...Object.fromEntries(
    [
      'table',
      'filter-bar',
      'stat',
      'description-list',
      'timeline',
      'badge',
      'tag',
      'avatar',
      'tree',
      'sortable',
    ].map((s) => [s, 'dados']),
  ),
  ...Object.fromEntries(['image', 'gallery', 'image-cropper'].map((s) => [s, 'midia'])),
  ...Object.fromEntries(
    ['dirty-guard', 'session-timeout', 'conditional'].map((s) => [s, 'pagina']),
  ),
};

/** Componentes (pelo fim do caminho) cuja API ainda pode mudar numa versão menor. */
const experimentalComponents: ReadonlySet<string> = new Set([
  'editor',
  'agenda',
  'command',
  'gallery',
  'image-cropper',
  'tree',
  'sortable',
  'lookup',
]);

const allRoutes: readonly DocRoute[] = [
  // Começar
  { path: '/', title: 'Introdução', section: 'comecar', page: Introducao },
  { path: '/comecar/instalacao', title: 'Instalação', section: 'comecar', page: Instalacao },
  { path: '/comecar/uso-com-html', title: 'Uso com HTML', section: 'comecar', page: UsoComHtml },
  { path: '/comecar/uso-com-react', title: 'Uso com React', section: 'comecar', page: UsoComReact },
  {
    path: '/comecar/comportamento',
    title: 'Comportamento (JS)',
    section: 'comecar',
    page: Comportamento,
  },
  {
    path: '/comecar/eventos',
    title: 'Referência de eventos',
    section: 'comecar',
    page: EventosPage,
  },
  { path: '/comecar/mascara', title: 'Máscara de entrada', section: 'comecar', page: MascaraPage },
  {
    path: '/comecar/formatadores',
    title: 'Formatadores',
    section: 'comecar',
    page: FormatadoresPage,
  },
  {
    path: '/comecar/exportacao',
    title: 'Exportação de tabelas',
    section: 'comecar',
    page: ExportacaoPage,
  },
  { path: '/comecar/idiomas', title: 'Idiomas e textos', section: 'comecar', page: IdiomasPage },
  {
    path: '/comecar/acessibilidade',
    title: 'Acessibilidade',
    section: 'comecar',
    page: AcessibilidadePage,
  },
  { path: '/comecar/politicas', title: 'Políticas', section: 'comecar', page: PoliticasPage },
  { path: '/comecar/quem-usa', title: 'Quem usa', section: 'comecar', page: QuemUsaPage },

  // Fundamentos
  { path: '/fundamentos/tokens', title: 'Tokens', section: 'fundamentos', page: Tokens },
  {
    path: '/fundamentos/temas-e-eixos',
    title: 'Temas e eixos',
    section: 'fundamentos',
    page: TemasEEixos,
  },
  {
    path: '/fundamentos/tipografia',
    title: 'Tipografia',
    section: 'fundamentos',
    page: Tipografia,
  },
  { path: '/fundamentos/layout', title: 'Layout', section: 'fundamentos', page: LayoutPage },
  { path: '/fundamentos/icones', title: 'Ícones', section: 'fundamentos', page: Icones },

  // Componentes (ordem alfabética; Pagination e Empty State são partes do Table)
  {
    path: '/componentes/accordion',
    title: 'Accordion',
    section: 'componentes',
    page: AccordionPage,
  },
  { path: '/componentes/alert', title: 'Alert', section: 'componentes', page: AlertPage },
  {
    path: '/componentes/app-shell',
    title: 'App Shell',
    section: 'componentes',
    page: AppShellPage,
  },
  {
    path: '/componentes/sortable',
    title: 'Arrastar e soltar (Sortable)',
    section: 'componentes',
    page: SortablePage,
  },
  {
    path: '/componentes/tree',
    title: 'Árvore (Tree)',
    section: 'componentes',
    page: TreePage,
  },
  {
    path: '/componentes/filter-bar',
    title: 'Barra de filtros',
    section: 'componentes',
    page: FilterBarPage,
  },
  { path: '/componentes/badge', title: 'Badge', section: 'componentes', page: BadgePage },
  {
    path: '/componentes/breadcrumb',
    title: 'Breadcrumb',
    section: 'componentes',
    page: BreadcrumbPage,
  },
  { path: '/componentes/button', title: 'Button', section: 'componentes', page: ButtonPage },
  {
    path: '/componentes/button-group',
    title: 'Button Group',
    section: 'componentes',
    page: ButtonGroupPage,
  },
  { path: '/componentes/card', title: 'Card', section: 'componentes', page: CardPage },
  {
    path: '/componentes/page-header',
    title: 'Cabeçalho de página',
    section: 'componentes',
    page: PageHeaderPage,
  },
  {
    path: '/componentes/cep',
    title: 'CEP (consulta de endereço)',
    section: 'componentes',
    page: CepPage,
  },
  { path: '/componentes/checkbox', title: 'Checkbox', section: 'componentes', page: CheckboxPage },
  {
    path: '/componentes/otp',
    title: 'Código de verificação (OTP)',
    section: 'componentes',
    page: OtpPage,
  },
  {
    path: '/componentes/combobox',
    title: 'Combobox (autocomplete)',
    section: 'componentes',
    page: ComboboxPage,
  },
  {
    path: '/componentes/date-input',
    title: 'Date Input',
    section: 'componentes',
    page: DateInputPage,
  },
  {
    path: '/componentes/date-picker',
    title: 'Date Picker',
    section: 'componentes',
    page: DatePickerPage,
  },
  {
    path: '/componentes/date-range-picker',
    title: 'Date Range Picker',
    section: 'componentes',
    page: DateRangePickerPage,
  },
  {
    path: '/componentes/dialogos',
    title: 'Diálogos (alert, confirm, prompt)',
    section: 'componentes',
    page: DialogsPage,
  },
  { path: '/componentes/drawer', title: 'Drawer', section: 'componentes', page: DrawerPage },
  { path: '/componentes/dropdown', title: 'Dropdown', section: 'componentes', page: DropdownPage },
  { path: '/componentes/field', title: 'Field', section: 'componentes', page: FieldPage },
  { path: '/componentes/fieldset', title: 'Fieldset', section: 'componentes', page: FieldsetPage },
  {
    path: '/componentes/file-input',
    title: 'File Input',
    section: 'componentes',
    page: FileInputPage,
  },
  {
    path: '/componentes/file-upload',
    title: 'File Upload',
    section: 'componentes',
    page: FileUploadPage,
  },
  {
    path: '/componentes/input-group',
    title: 'Grupo de campo e número',
    section: 'componentes',
    page: InputGroupPage,
  },
  { path: '/componentes/stat', title: 'Indicador (Stat)', section: 'componentes', page: StatPage },
  { path: '/componentes/input', title: 'Input', section: 'componentes', page: InputPage },
  {
    path: '/componentes/lookup',
    title: 'Lookup (busca por código)',
    section: 'componentes',
    page: LookupPage,
  },
  { path: '/componentes/modal', title: 'Modal', section: 'componentes', page: ModalPage },
  {
    path: '/componentes/multi-select',
    title: 'Multi Select',
    section: 'componentes',
    page: MultiSelectPage,
  },
  { path: '/componentes/navbar', title: 'Navbar', section: 'componentes', page: NavbarPage },
  {
    path: '/componentes/page-loader',
    title: 'Page Loader',
    section: 'componentes',
    page: PageLoaderPage,
  },
  { path: '/componentes/popover', title: 'Popover', section: 'componentes', page: PopoverPage },
  { path: '/componentes/radio', title: 'Radio', section: 'componentes', page: RadioPage },
  { path: '/componentes/password', title: 'Senha', section: 'componentes', page: PasswordPage },
  { path: '/componentes/select', title: 'Select', section: 'componentes', page: SelectPage },
  { path: '/componentes/sidebar', title: 'Sidebar', section: 'componentes', page: SidebarPage },
  { path: '/componentes/skeleton', title: 'Skeleton', section: 'componentes', page: SkeletonPage },
  { path: '/componentes/spinner', title: 'Spinner', section: 'componentes', page: SpinnerPage },
  { path: '/componentes/switch', title: 'Switch', section: 'componentes', page: SwitchPage },
  { path: '/componentes/table', title: 'Table', section: 'componentes', page: TablePage },
  {
    path: '/componentes/pagination',
    title: 'Pagination',
    section: 'componentes',
    page: PaginationPage,
  },
  {
    path: '/componentes/empty-state',
    title: 'Empty State',
    section: 'componentes',
    page: EmptyStatePage,
  },
  {
    path: '/componentes/stepper',
    title: 'Stepper e Wizard',
    section: 'componentes',
    page: StepperPage,
  },
  { path: '/componentes/progress', title: 'Progress', section: 'componentes', page: ProgressPage },
  {
    path: '/componentes/error-state',
    title: 'Estado de erro',
    section: 'componentes',
    page: ErrorStatePage,
  },
  { path: '/componentes/copy', title: 'Copiar e segredo', section: 'componentes', page: CopyPage },
  { path: '/componentes/timeline', title: 'Timeline', section: 'componentes', page: TimelinePage },
  {
    path: '/componentes/notifications',
    title: 'Notificações',
    section: 'componentes',
    page: NotificationsPage,
  },
  {
    path: '/componentes/dirty-guard',
    title: 'Alterações não salvas',
    section: 'componentes',
    page: DirtyGuardPage,
  },
  {
    path: '/componentes/session-timeout',
    title: 'Sessão por inatividade',
    section: 'componentes',
    page: SessionTimeoutPage,
  },
  {
    path: '/componentes/conditional',
    title: 'Campos condicionais',
    section: 'componentes',
    page: ConditionalPage,
  },
  // Onda D
  { path: '/componentes/avatar', title: 'Avatar', section: 'componentes', page: AvatarPage },
  { path: '/componentes/tag', title: 'Tag', section: 'componentes', page: TagPage },
  { path: '/componentes/divider', title: 'Divider', section: 'componentes', page: DividerPage },
  {
    path: '/componentes/command',
    title: 'Paleta de comandos',
    section: 'componentes',
    page: CommandPage,
  },
  { path: '/componentes/agenda', title: 'Agenda', section: 'componentes', page: AgendaPage },
  {
    path: '/componentes/time-picker',
    title: 'Time Picker',
    section: 'componentes',
    page: TimePickerPage,
  },
  {
    path: '/componentes/segmented',
    title: 'Controle segmentado',
    section: 'componentes',
    page: SegmentedPage,
  },
  {
    path: '/componentes/description-list',
    title: 'Lista de descrição',
    section: 'componentes',
    page: DescriptionListPage,
  },
  { path: '/componentes/banner', title: 'Banner', section: 'componentes', page: BannerPage },
  // Imagem
  { path: '/componentes/image', title: 'Imagem', section: 'componentes', page: ImagePage },
  { path: '/componentes/gallery', title: 'Galeria', section: 'componentes', page: GalleryPage },
  {
    path: '/componentes/image-cropper',
    title: 'Corte de imagem',
    section: 'componentes',
    page: ImageCropperPage,
  },
  {
    path: '/componentes/editor',
    title: 'Editor de conteúdo',
    section: 'componentes',
    page: EditorPage,
  },
  { path: '/componentes/tabs', title: 'Tabs', section: 'componentes', page: TabsPage },
  { path: '/componentes/textarea', title: 'Textarea', section: 'componentes', page: TextareaPage },
  { path: '/componentes/tooltip', title: 'Tooltip', section: 'componentes', page: TooltipPage },
  { path: '/componentes/toast', title: 'Toast', section: 'componentes', page: ToastPage },
  // Templates
  { path: '/templates', title: 'Templates', section: 'templates', page: TemplatesPage },
  {
    path: '/templates/licenca',
    title: 'Licença dos templates',
    section: 'templates',
    page: LicencaTemplatesPage,
  },
];

const collator = new Intl.Collator('pt-BR');

/** Componentes vão para a sua categoria, em ordem alfabética dentro dela. */
export const routes: readonly DocRoute[] = allRoutes
  .map((r): DocRoute => {
    if (!r.path.startsWith('/componentes/')) return r;
    const slug = r.path.slice('/componentes/'.length);
    return {
      ...r,
      section: componentCategory[slug] ?? r.section,
      stability: experimentalComponents.has(slug) ? 'experimental' : 'stable',
    };
  })
  .sort((a, b) => {
    const sa = sections.findIndex((s) => s.id === a.section);
    const sb = sections.findIndex((s) => s.id === b.section);
    if (sa !== sb) return sa - sb;
    return a.section === 'comecar' || a.section === 'fundamentos' || a.section === 'templates'
      ? 0
      : collator.compare(a.title, b.title);
  });

export function findRoute(path: string): DocRoute | undefined {
  return routes.find((route) => route.path === path);
}
