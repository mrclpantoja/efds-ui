/**
 * Metadados de busca de cada página (título da aba, descrição, link canônico). Usados pelo
 * Layout na navegação e pela pré-renderização (`scripts/prerender.ts`), que grava um HTML por rota
 * com estes valores, Open Graph, sitemap e dados estruturados.
 *
 * Descrição: até ~160 caracteres, em português, dizendo o que a página resolve com as palavras que
 * as pessoas buscam (componente, HTML, CSS, React, acessível, pt-BR).
 */
import type { DocRoute } from './routes';

export const SITE_NAME = 'efDS.ui';
export const SITE_URL = 'https://efds-ui.com.br';
export const SITE_DESCRIPTION =
  'Design system gratuito (MIT) em português para ERPs, painéis e sistemas de governo: componentes em HTML e CSS, JavaScript sem dependência e React, com acessibilidade WCAG 2.2 AA. Alternativa ao Bootstrap.';
export const OG_IMAGE = `${SITE_URL}/og.png`;

const descriptions: Record<string, string> = {
  '/': SITE_DESCRIPTION,
  '/comecar/instalacao':
    'Como instalar o efDS.ui pelo npm, pnpm ou CDN (jsDelivr com SRI): CSS do core, temas, JavaScript para HTML e componentes React.',
  '/comecar/uso-com-html':
    'Use o efDS.ui só com HTML e CSS, em PHP, Java, .NET ou qualquer backend: classes .eds-*, sem build e sem framework JavaScript.',
  '/comecar/uso-com-react':
    'Componentes React do efDS.ui (@efds-ui/react) com TypeScript: instalação, providers, temas e acessibilidade garantida pelos tipos.',
  '/comecar/comportamento':
    'JavaScript puro e sem dependência para páginas HTML: modal, abas, toast, tabela, autocomplete, datas e upload ligados por atributos data-*.',
  '/comecar/eventos':
    'Referência dos eventos eds:* do efDS.ui (CustomEvent): abrir e fechar modal, ordenar tabela, mudar aba, escolher data e mais.',
  '/comecar/mascara':
    'Máscara de entrada para CPF, CNPJ alfanumérico, telefone, CEP, moeda e número, em HTML (data-eds-mask) e React, sem dependência.',
  '/comecar/formatadores':
    'Formatadores em pt-BR para moeda, número, data, CPF, CNPJ, telefone e CEP, com mascaramento de CPF para LGPD.',
  '/comecar/exportacao':
    'Exporte tabelas HTML e dados React para CSV, Excel (XLSX real), JSON e PDF no navegador, sem biblioteca e com mascaramento de dados pessoais.',
  '/comecar/idiomas':
    'Textos e idioma dos componentes do efDS.ui: mensagens pt-BR configuráveis, locale de datas e números e como traduzir.',
  '/comecar/acessibilidade':
    'Acessibilidade no efDS.ui: WCAG 2.2 AA, teclado, foco visível, leitores de tela, contraste e o que cabe a quem usa os componentes.',
  '/comecar/quem-usa': 'Sistemas e organizações que usam o efDS.ui em produção.',
  '/fundamentos/tokens':
    'Design tokens do efDS.ui em CSS custom properties: cores, espaçamento, raio, tipografia e sombras em três níveis.',
  '/fundamentos/temas-e-eixos':
    'Temas de cor, modo escuro, densidade e forma por atributo HTML, sem JavaScript; crie um tema a partir da cor da sua marca com contraste AA.',
  '/fundamentos/tipografia':
    'Escala tipográfica do efDS.ui com a fonte Inter: classes .eds-text-* para títulos, corpo, rótulos e textos pequenos.',
  '/fundamentos/layout':
    'Container, grid responsivo por container queries e stack em CSS puro para montar telas de sistema e painéis administrativos.',
  '/fundamentos/icones':
    'Ícones SVG próprios do efDS.ui para React e HTML: catálogo com busca e cópia do código.',
  '/templates':
    'Templates HTML e React prontos para sistemas: painel administrativo, cadastro (CRUD) e portal de serviços gratuitos, com demonstração.',
  '/templates/licenca':
    'Licença dos templates do efDS.ui: uso gratuito, chave de ativação e termos.',
};

/** Descrição de página de componente: o que é + o que o efDS.ui oferece. */
const componentDescriptions: Record<string, string> = {
  accordion:
    'Accordion (sanfona) acessível com <details> nativo, em HTML, CSS e React, com modo exclusivo.',
  alert:
    'Alerta de sucesso, aviso, erro e informação acessível, em HTML, CSS e React, com fechar opcional.',
  'app-shell':
    'App shell de sistema: menu lateral, cabeçalho e conteúdo responsivos em HTML, CSS e React.',
  sortable:
    'Arrastar e soltar (drag and drop) acessível por teclado e toque em listas, grades e quadros, em HTML e React.',
  tree: 'Árvore (tree view) editável e acessível no padrão APG: expandir, renomear, mover e excluir com desfazer, em HTML e React.',
  'filter-bar':
    'Barra de filtros para listagens com chips dos filtros aplicados, que funciona até sem JavaScript.',
  badge: 'Badge (selo) de status e contagem em HTML, CSS e React, com cores acessíveis.',
  breadcrumb: 'Breadcrumb (trilha de navegação) acessível em HTML, CSS e React.',
  button:
    'Botão primário, secundário, terciário, ghost e perigo, com ícone e carregando, em HTML, CSS e React acessível.',
  'button-group': 'Grupo de botões (button group) em HTML, CSS e React.',
  card: 'Card (cartão) em HTML, CSS e React, com cabeçalho, rodapé e cartão clicável acessível.',
  'page-header':
    'Cabeçalho de página com título, breadcrumb e ações, fixo ao rolar, em HTML, CSS e React.',
  cep: 'Campo de CEP com consulta de endereço e preenchimento automático, configurável e sem chamada externa por padrão.',
  checkbox:
    'Checkbox (caixa de seleção) acessível, com estado indeterminado, em HTML, CSS e React.',
  otp: 'Campo de código de verificação (OTP) de uso único, com colar e teclado, em HTML e React.',
  combobox:
    'Combobox com autocomplete acessível (padrão APG), filtro sem acento e busca remota, em HTML e React.',
  'date-input':
    'Campo de data nativo (input type="date") estilizado, sem JavaScript, em HTML, CSS e React.',
  'date-picker':
    'Date picker (seletor de data) em português com calendário acessível, máscara dd/mm/aaaa, em HTML e React.',
  'date-range-picker':
    'Seletor de período (date range picker) em português com calendário acessível, em HTML e React.',
  dialogos:
    'Diálogos rápidos alert, confirm e prompt com Promise, alternativa ao SweetAlert, em JavaScript e React.',
  drawer: 'Drawer (painel lateral) acessível com <dialog> nativo, em HTML, CSS e React.',
  dropdown: 'Dropdown (menu suspenso) acessível por teclado, em HTML, CSS e React.',
  field: 'Field: rótulo, ajuda e mensagem de erro ligados ao campo de formulário, em HTML e React.',
  fieldset: 'Fieldset para agrupar campos de formulário com legenda acessível, em HTML e React.',
  'file-input':
    'Campo de arquivo (input file) nativo estilizado, sem JavaScript, em HTML, CSS e React.',
  'file-upload':
    'Upload de arquivos com arrastar e soltar, lista e barra de progresso, em HTML e React.',
  'input-group':
    'Grupo de campo com prefixo e sufixo e campo numérico (spinbutton) acessível, em HTML e React.',
  stat: 'Indicador (card de KPI) para dashboards, com tendência e status, em HTML, CSS e React.',
  input:
    'Campo de texto (input) com estados de erro, sucesso e somente leitura, em HTML, CSS e React.',
  lookup: 'Lookup: campo de código com descrição e busca em modal, comum em ERPs, em HTML e React.',
  modal:
    'Modal (janela de diálogo) acessível com <dialog> nativo, foco preso e Esc, em HTML, CSS e React.',
  'multi-select':
    'Multi select: seleção múltipla com busca e etiquetas, acessível, em HTML e React.',
  navbar: 'Navbar (barra de navegação superior) responsiva em HTML, CSS e React.',
  'page-loader':
    'Carregamento de página bloqueante automático em fetch, envio de formulário e navegação, em HTML e React.',
  popover: 'Popover acessível com a API popover nativa, em HTML, CSS e React.',
  radio: 'Radio (botão de opção) acessível em HTML, CSS e React.',
  password:
    'Campo de senha com mostrar e ocultar, força da senha e regras em texto, em HTML e React.',
  select: 'Select (lista de opções) nativo estilizado em HTML, CSS e React.',
  sidebar: 'Sidebar (menu lateral) recolhível e responsiva para sistemas, em HTML, CSS e React.',
  skeleton: 'Skeleton (esqueleto de carregamento) em HTML, CSS e React.',
  spinner: 'Spinner (indicador de carregamento) acessível em HTML, CSS e React.',
  switch: 'Switch (interruptor liga e desliga) acessível em HTML, CSS e React.',
  table:
    'Tabela de dados com ordenação, seleção, filtro e exportação para Excel e PDF, em HTML, CSS e React.',
  pagination: 'Paginação acessível para tabelas e listas, em HTML, CSS e React.',
  'empty-state':
    'Estado vazio (empty state) para tabelas e listas sem resultado, em HTML, CSS e React.',
  stepper: 'Stepper (etapas) e wizard de formulário com validação por etapa, em HTML e React.',
  progress: 'Barra de progresso acessível com <progress> nativo, em HTML, CSS e React.',
  'error-state': 'Estado de erro com botão de tentar de novo, em HTML, CSS e React.',
  copy: 'Botão de copiar para a área de transferência e campo de segredo (mostrar e ocultar), em HTML e React.',
  timeline: 'Timeline (linha do tempo) de eventos e histórico, em HTML, CSS e React.',
  notifications: 'Sino de notificações com contador e lista em popover, em HTML e React.',
  'dirty-guard':
    'Aviso de alterações não salvas ao sair da página ou do formulário, em HTML e React.',
  'session-timeout':
    'Aviso de sessão expirando por inatividade, sincronizado entre abas, em HTML e React.',
  conditional:
    'Campos condicionais: mostrar, esconder e exigir campos conforme outro campo, sem código, em HTML e React.',
  avatar: 'Avatar com foto ou iniciais, grupo de avatares e status, em HTML, CSS e React.',
  tag: 'Tag (etiqueta) para categorias em HTML, CSS e React.',
  divider: 'Divider (separador) horizontal e vertical em HTML, CSS e React.',
  command: 'Paleta de comandos (Ctrl+K) com busca, grupos e atalhos, acessível, em HTML e React.',
  agenda: 'Agenda e calendário mensal de eventos, responsivo, em HTML e React.',
  'time-picker': 'Seletor de hora (time picker) com máscara e lista, acessível, em HTML e React.',
  segmented: 'Controle segmentado (segmented control) com rádios nativos, em HTML, CSS e React.',
  'description-list':
    'Lista de descrição (rótulo e valor) para telas de detalhe, em HTML, CSS e React.',
  banner: 'Banner de aviso no topo do sistema, com fechar e lembrança, em HTML, CSS e React.',
  image:
    'Imagem responsiva com proporção fixa, estados de carregamento e erro, em HTML, CSS e React.',
  gallery: 'Galeria de imagens com lightbox acessível, em HTML, CSS e React.',
  'image-cropper':
    'Corte de imagem e foto de perfil (avatar) no navegador, redimensionada e comprimida, em HTML e React.',
  editor:
    'Editor de texto rico (WYSIWYG) acessível com ProseMirror, em HTML e React, gratuito e MIT.',
  tabs: 'Tabs (abas) acessíveis no padrão APG, em HTML, CSS e React.',
  textarea: 'Textarea (campo de texto longo) com contador, em HTML, CSS e React.',
  tooltip: 'Tooltip (dica) acessível conforme a WCAG 1.4.13, em HTML, CSS e React.',
  toast: 'Toast (notificação temporária) acessível, com ação e tempo, em HTML, CSS e React.',
};

export function isComponentPage(path: string) {
  return path.startsWith('/componentes/');
}

/** Título da aba e dos resultados de busca. */
export function pageTitle(route: Pick<DocRoute, 'path' | 'title'> | undefined): string {
  if (!route) return `Página não encontrada · ${SITE_NAME}`;
  if (route.path === '/') return `${SITE_NAME}: design system em português (HTML, CSS e React)`;
  if (isComponentPage(route.path))
    return `${route.title}: componente HTML, CSS e React · ${SITE_NAME}`;
  return `${route.title} · ${SITE_NAME}`;
}

export function pageDescription(route: Pick<DocRoute, 'path' | 'title'> | undefined): string {
  if (!route) return SITE_DESCRIPTION;
  const own = descriptions[route.path];
  if (own) return own;
  if (isComponentPage(route.path)) {
    const slug = route.path.slice('/componentes/'.length);
    const text = componentDescriptions[slug];
    if (text) return `${text} Design system efDS.ui, gratuito e em português.`;
  }
  return `${route.title} no efDS.ui, design system em português para sistemas web.`;
}

export const canonicalUrl = (path: string) =>
  path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
