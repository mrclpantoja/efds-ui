# Changelog

Todas as mudanças relevantes do eDS.ui. Mantido à mão. Versão única para `@eds-ui/core`, `@eds-ui/themes`, `@eds-ui/react`, `@eds-ui/icons` e `@eds-ui/behavior`.

## 0.1.0 (MVP, ainda não publicado)

Pré-lançamento: os pacotes seguem `private` e `UNLICENSED` até a decisão de licença e de nome/escopo `@eds-ui`.

### @eds-ui/core

- Tokens em três níveis (Primitive, Semantic, Component), gerados de JSON (`pnpm tokens`).
- Eixos do Adaptive Surface por atributo: `data-theme`, `data-mode`, `data-density`, `data-shape`.
- Base (reset, tipografia por classes `.eds-text-*`, acessibilidade) e layout (Container, Grid por container queries, Stack, app shell).
- 25 componentes do MVP, um CSS por componente: Foundation, Actions (Button), Forms, Surfaces (Card, Modal, Drawer), Navigation (Navbar, Sidebar, Tabs, Breadcrumb), Feedback (Alert, Toast, Badge, Spinner, Skeleton) e Data (Table com Pagination e Empty State).
- CSS completo (`index.css`) e importação seletiva por arquivo, cada um começando pela ordem de `@layer`.

### @eds-ui/themes

- Temas blue, green, purple, orange e neutral; modos light e dark; densidades compact, comfortable e spacious; formas sharp, soft e rounded. Cores com contraste WCAG 2.2 AA calculado.

### @eds-ui/react

- 26 componentes `forwardRef` sobre as classes do core, sem CSS próprio; peer React 18 ou 19.
- Exigências de acessibilidade no tipo (por exemplo `iconOnly` exige `aria-label`).
- Modal e Drawer sobre `<dialog>`; Dropdown como disclosure; Toast via `ToastProvider` e `useToast`.

### @eds-ui/icons

- 24 ícones como componentes React (SVG, `currentColor`), com tree shaking.

### Empacotamento

- Tarballs só com `dist/` (mais `package.json` e `README.md`); `pnpm pack:check` valida o conteúdo, os alvos de `exports` e a ausência de `workspace:`.
- A fonte Inter e o CSS do core ficam por conta do consumidor.

### @eds-ui/behavior

- Comportamento em JavaScript puro (zero dependências) para quem usa só HTML: Tabs, Modal/Drawer, Dropdown, Toast, Alert fechável, Table (ordenação e seleção), Sidebar e Combobox.
- `init(root, options)` devolve `destroy()`, observa o `root` (MutationObserver) e não liga nada fora dele. ESM tree-shakeable (`initTabs`, `initCombobox`...) e IIFE `dist/eds-behavior.js` com `window.EDS` e auto-init (`data-eds-manual` desliga).
- PageLoader automático (ligado por padrão): intercepta fetch, XHR, envio de form e navegação por link; `data-eds-loader="auto|manual|off"` na tag do script ou `loader` nas opções; exceções por atributo, opção de fetch, cabeçalho e lista `exclude`; `destroy` restaura `fetch` e XHR.
- Combobox (APG list autocomplete) com filtro local e fonte remota (`data-eds-source`).
- PageLoader: saída após demora (`slowAfter`, 20 s: "Continuar aguardando" / "Fechar"), `navigationTimeout` 10 s, navegação cancelada detectada por `beforeunload`, downloads ignorados, reabre se fechado por fora, `trigger: "all" | "user"`; Combobox com validação de escolha (`setCustomValidity`, `data-eds-free-text`), anúncios de carregando/seleção e destaque por ponteiro.
- Combobox múltiplo (`data-eds-multiple`, MultiSelect): etiquetas removíveis, Enter/clique alternam com a lista aberta, Backspace remove a última, hidden `name[]` por valor, `data-eds-max-selected`, obrigatório por `aria-required`, `eds:combobox-change` com `{ values, labels }`.
- FileUpload (`data-eds-upload`, `initUpload`): arrastar e soltar, acumula seleções, validação de `accept`/tamanho/quantidade, modo formulário (`input.files` via `DataTransfer`) e modo imediato por XHR (`data-eds-upload-url`: progresso, abortar ao remover, tentar de novo, hidden com o id, submit bloqueado durante o envio); eventos `eds:upload-*`.
- DatePicker (`data-eds-datepicker`) e DateRangePicker (`data-eds-daterange`, `initDatepicker`): calendário APG em diálogo montado pelo JS, máscara dd/mm/aaaa, colar ISO, validação nativa, min/max/datas bloqueadas/fins de semana, período com prévia e `data-eds-max-days`, `eds:date-change` e `eds:daterange-change`. Datas sem fuso.
