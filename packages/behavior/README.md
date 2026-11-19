# @eds-ui/behavior

Comportamento interativo do eDS.ui em JavaScript puro (zero dependências), para quem usa só HTML: PHP, Java, .NET, Vue, Angular. O visual vem do `@eds-ui/core` (CSS); este pacote liga o que o CSS e a plataforma não entregam: Tabs, Modal/Drawer, Dropdown, Toast, Alert fechável, Table (ordenação e seleção), Sidebar, Combobox (simples e múltiplo), DatePicker e DateRangePicker (calendário próprio, máscara dd/mm/aaaa), FileUpload (arrastar e soltar, modo formulário e imediato) e o PageLoader automático.

> Pré-lançamento (0.1.0): `private` e `UNLICENSED` até a decisão de licença e de nome/escopo `@eds-ui`.

## Uso por `<script>` (CDN, PHP, Java, .NET)

```html
<link rel="stylesheet" href=".../@eds-ui/core/dist/index.css" />
<script src=".../@eds-ui/behavior/dist/eds-behavior.js" defer></script>
```

Liga tudo sozinho quando o DOM está pronto e expõe `window.EDS`. Opções na própria tag:

| Atributo                              | Efeito                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| `data-eds-manual`                     | Não liga sozinho: chame `EDS.init()`.                                 |
| `data-eds-loader="auto\|manual\|off"` | PageLoader. `auto` (padrão), `manual` (só `start`/`track`), `off`.    |
| `data-eds-loader-title`, `-text`      | Textos padrão do loader.                                              |
| `data-eds-loader-slow-after`          | Ms até oferecer "Fechar" / "Continuar aguardando" (padrão 20000).     |
| `data-eds-loader-trigger="all\|user"` | `all` (padrão): todo fetch/XHR; `user`: só os iniciados pelo usuário. |

```js
EDS.toast({ variant: 'success', message: 'Pedido salvo.' });
const done = EDS.loader.start({ title: 'Gerando relatório…' });
fetch('/relatorio').finally(done);
```

## Uso por módulo (Vue, Angular, bundlers)

```ts
import { init, toast, loader } from '@eds-ui/behavior';

const destroy = init(document.querySelector('#app')!, {
  loader: {
    auto: true,
    delay: 300,
    minVisible: 400,
    slowAfter: 20000,
    trigger: 'all',
    exclude: [/\/api\/poll/],
  },
});
// ao desmontar: destroy();
```

`init(root, options)` liga o que existe em `root`, observa o que entra e sai depois (htmx, Turbo, Livewire, parciais do servidor) e **não toca em nada fora do `root`**. Também há `initTabs`, `initModal`, `initDropdown`, `initAlert`, `initTable`, `initSidebar`, `initCombobox`, `initDatepicker`, `initUpload`, `initToast` e `initLoader` para importar só o que usa (tree shaking).

Referência completa (atributos, eventos, opções, configuração do loader): [`docs/architecture/behavior.md`](../../docs/architecture/behavior.md).

## O que cada componente espera

O markup é o contrato do core (`.eds-*`); o pacote detecta por classes e ARIA. Só acrescenta `data-eds-*` onde o markup não basta: `data-eds-open`, `data-eds-close`, `data-eds-backdrop="static"`, `data-eds-dismiss`, `data-eds-select-all`/`-row`, `data-eds-sidebar-collapse`, `data-eds-source`, `data-eds-min-chars`, `data-eds-free-text`, `data-eds-multiple`, `data-eds-name`, `data-eds-max-selected`, `data-eds-upload`, `data-eds-max-size`, `data-eds-max-files`, `data-eds-upload-url`, `data-eds-upload-field`, `data-eds-loader`.

## Scripts

`pnpm build` (ESM + `.d.ts` + IIFE) · `pnpm typecheck` · `pnpm test`.
