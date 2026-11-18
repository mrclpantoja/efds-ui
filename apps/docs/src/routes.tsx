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
import Instalacao from './pages/comecar/Instalacao';
import Introducao from './pages/comecar/Introducao';
import UsoComHtml from './pages/comecar/UsoComHtml';
import UsoComReact from './pages/comecar/UsoComReact';
import TemasEEixos from './pages/fundamentos/TemasEEixos';
import Tokens from './pages/fundamentos/Tokens';
import Tipografia from './pages/fundamentos/Tipografia';
import LayoutPage from './pages/fundamentos/Layout';
import AlertPage from './pages/componentes/Alert';
import AppShellPage from './pages/componentes/AppShell';
import BadgePage from './pages/componentes/Badge';
import BreadcrumbPage from './pages/componentes/Breadcrumb';
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
import SkeletonPage from './pages/componentes/Skeleton';
import SpinnerPage from './pages/componentes/Spinner';
import SwitchPage from './pages/componentes/Switch';
import TablePage from './pages/componentes/Table';
import TextareaPage from './pages/componentes/Textarea';
import ToastPage from './pages/componentes/Toast';

export type SectionId = 'comecar' | 'fundamentos' | 'componentes';

export interface DocRoute {
  /** Caminho do hash, com barra inicial (`/componentes/button`). */
  path: string;
  /** Texto do menu, do h1, do breadcrumb e do `document.title`. */
  title: string;
  section: SectionId;
  /** Corpo da página. Ausente: a rota mostra a página "Em breve". */
  page?: ComponentType;
}

export const sections: readonly { id: SectionId; title: string }[] = [
  { id: 'comecar', title: 'Começar' },
  { id: 'fundamentos', title: 'Fundamentos' },
  { id: 'componentes', title: 'Componentes' },
];

export const routes: readonly DocRoute[] = [
  // Começar
  { path: '/', title: 'Introdução', section: 'comecar', page: Introducao },
  { path: '/comecar/instalacao', title: 'Instalação', section: 'comecar', page: Instalacao },
  { path: '/comecar/uso-com-html', title: 'Uso com HTML', section: 'comecar', page: UsoComHtml },
  { path: '/comecar/uso-com-react', title: 'Uso com React', section: 'comecar', page: UsoComReact },

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

  // Componentes (ordem alfabética; Pagination e Empty State são partes do Table)
  { path: '/componentes/alert', title: 'Alert', section: 'componentes', page: AlertPage },
  {
    path: '/componentes/app-shell',
    title: 'App Shell',
    section: 'componentes',
    page: AppShellPage,
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
  { path: '/componentes/checkbox', title: 'Checkbox', section: 'componentes', page: CheckboxPage },
  { path: '/componentes/drawer', title: 'Drawer', section: 'componentes', page: DrawerPage },
  { path: '/componentes/dropdown', title: 'Dropdown', section: 'componentes', page: DropdownPage },
  { path: '/componentes/field', title: 'Field', section: 'componentes', page: FieldPage },
  { path: '/componentes/fieldset', title: 'Fieldset', section: 'componentes', page: FieldsetPage },
  { path: '/componentes/input', title: 'Input', section: 'componentes', page: InputPage },
  { path: '/componentes/modal', title: 'Modal', section: 'componentes', page: ModalPage },
  { path: '/componentes/navbar', title: 'Navbar', section: 'componentes', page: NavbarPage },
  { path: '/componentes/radio', title: 'Radio', section: 'componentes', page: RadioPage },
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
  { path: '/componentes/tabs', title: 'Tabs', section: 'componentes', page: TabsPage },
  { path: '/componentes/textarea', title: 'Textarea', section: 'componentes', page: TextareaPage },
  { path: '/componentes/toast', title: 'Toast', section: 'componentes', page: ToastPage },
];

export function findRoute(path: string): DocRoute | undefined {
  return routes.find((route) => route.path === path);
}
