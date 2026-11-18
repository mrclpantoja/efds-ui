# Changelog

Todas as mudanças relevantes do eDS.ui. Mantido à mão. Versão única para `@eds-ui/core`, `@eds-ui/themes`, `@eds-ui/react` e `@eds-ui/icons`.

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
