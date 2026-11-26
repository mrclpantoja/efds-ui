# Testes automatizados

Três camadas, da mais barata para a mais cara. Todas usam só dados fictícios.

| Camada               | Onde                                         | Roda em           | Comando           |
| -------------------- | -------------------------------------------- | ----------------- | ----------------- |
| Unitários (jsdom)    | `packages/*`, `scripts/`                     | job `check` do CI | `pnpm test`       |
| Orçamento de tamanho | `scripts/check-size.ts` + `size-limits.json` | job `check` do CI | `pnpm size:check` |
| E2E, axe, visual     | `tests/e2e` (`@efds-ui/e2e`, privado)        | job `e2e` do CI   | `pnpm e2e`        |

## E2E com Playwright

`tests/e2e` roda contra o **site de documentação já construído** (`apps/docs/dist`), servido por
`tests/e2e/support/serve.ts`: um servidor estático sem dependência. Ele existe porque o
`vite preview` não serve as rotas aninhadas sem a barra final, e o build pré-renderiza um
`index.html` por rota. Antes de rodar, construa:

```
pnpm build            # pacotes + site (suficiente, menos o cenário de Sidebar em HTML)
pnpm site:build       # pacotes + site + demonstrações dos templates (/demos): o CI usa este
pnpm e2e              # projeto chromium (Chrome instalado) + visual (pulado sem capturas)
pnpm e2e --project=chromium specs/modal.spec.ts   # um arquivo só
```

### Navegadores

- **Local:** usa o **Chrome instalado** (`channel: 'chrome'`). Nunca rode `playwright install` na
  máquina de desenvolvimento: o CI instala os navegadores (`playwright install --with-deps`).
- **CI:** matriz `chromium`, `firefox`, `webkit` (projetos definidos quando `CI=true` ou
  `E2E_ALL=1`). A regressão visual roda só no chromium.
- Relatórios e anexos ficam em `tests/e2e/node_modules/.e2e/` (fora do Git, Prettier e ESLint);
  o CI os publica como artefato quando algo falha.

### Cenários

Os cenários usam os **exemplos vivos da documentação**, nas duas camadas quando existem (HTML com
`@efds-ui/behavior` e React): o helper `abrirExemplo(page, rota, título, camada)` abre a rota,
escolhe a aba HTML ou React e devolve a área do preview. Seletores por papel e rótulo, sem
`data-testid` e sem `waitForTimeout`: a espera é sempre por estado (`expect` com retentativa).

| Arquivo                        | Cobre                                                                   |
| ------------------------------ | ----------------------------------------------------------------------- |
| `modal.spec.ts`                | foco inicial, foco preso, Esc, clique no fundo, backdrop estático       |
| `drawer-dropdown.spec.ts`      | Drawer e Dropdown: foco, Esc, retorno do foco, itens indisponíveis      |
| `tabs-toast.spec.ts`           | Tabs (setas, Home/End, aba indisponível), Toast (região viva, Desfazer) |
| `combobox-multiselect.spec.ts` | Combobox e MultiSelect pelo teclado, filtro, etiquetas                  |
| `date-picker.spec.ts`          | grade do calendário, PageDown, Enter, Esc, máscara (relógio fixo)       |
| `table.spec.ts`                | ordenação, seleção (indeterminado), filtro local, linha de vazio        |
| `tree-sortable.spec.ts`        | Tree (teclado APG) e Sortable (Espaço, setas, Esc)                      |
| `editor.spec.ts`               | `@efds-ui/editor`: digitar, negrito, link, recusa de `javascript:`      |
| `imagem.spec.ts`               | galeria e visualizador, cortador de imagem (PNG sintético em memória)   |
| `page-loader-sidebar.spec.ts`  | PageLoader; Sidebar off-canvas no celular (React no site, HTML na demo) |
| `a11y.spec.ts`                 | axe-core em todas as rotas (ver abaixo)                                 |
| `visual.spec.ts`               | regressão visual (ver abaixo)                                           |

Cenário que depende da data usa `page.clock.setFixedTime`. Arquivo de imagem é gerado em memória
(`support/png.ts`), nunca versionado.

**Defeitos conhecidos documentados com `test.fail`:** quando um teste descreve o comportamento
correto mas o defeito está no código (não no teste), ele é marcado com `test.fail(motivo)`. O CI
fica verde e, ao corrigir o defeito, o teste "passa inesperadamente" e falha, lembrando de remover
a marca. Hoje: os botões de rodapé do Modal no preview HTML da documentação
(`Example.tsx` bloqueia o `submit`).

### axe-core

`specs/a11y.spec.ts` lê as rotas do `sitemap.xml` gerado pelo build (uma por rota registrada em
`apps/docs/src/routes.tsx`), mais a página 404, e roda o axe com as tags
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`:

- modo claro em todos os navegadores;
- modo escuro só no chromium (o contraste muda com o modo).

Qualquer violação nova reprova o teste. Violações **já encontradas e à espera de decisão** ficam em
`tests/e2e/axe-conhecidas.json` (rota, modo, regra, alvo, motivo): o teste as tolera, mas **falha
se uma delas deixar de ocorrer** (remova a entrada) — a lista vazia é o estado desejado. Quem acha
uma violação não corrige o componente por conta própria: registra ali e leva ao responsável.

### Regressão visual

`specs/visual.spec.ts` fotografa cinco grupos de componentes (ações, formulários, feedback, dados,
navegação) da página estática `tests/e2e/visual/fixture/index.html` — CSS do core e temas, sem JS,
sem rede, animações desligadas, fonte do sistema (o core não carrega fonte) e viewport fixo:

- 5 temas (`blue`, `green`, `purple`, `orange`, `neutral`) × 2 modos, na densidade padrão (10);
- densidades `compact` e `spacious` só no tema `blue` claro (2).

São 12 capturas por grupo, 60 no total, comparadas com `maxDiffPixelRatio: 0.002`. Para mudar o
que se fotografa, edite o fixture (copie o markup dos exemplos da doc).

**Só o Linux do CI gera e confere as capturas** (rasterização e fontes mudam por sistema). Elas
ficam em `tests/e2e/__screenshots__/linux/visual/`. Em qualquer outra plataforma, e enquanto não
houver captura, os testes são **pulados** (não falham).

#### Gerar ou atualizar a linha de base

1. GitHub → Actions → **Atualizar capturas da regressão visual** → _Run workflow_ (no ramo da mudança).
2. Baixe o artefato `capturas-visuais` e extraia o conteúdo em `tests/e2e/__screenshots__/linux/`.
3. Revise as imagens (são o contrato visual) e faça o commit junto da mudança que as motivou.
4. O job `e2e` passa a comparar o chromium com essas capturas.

Uma diferença legítima (mudança intencional de tema ou de componente) segue o mesmo caminho: rode o
workflow no ramo, baixe, substitua e commite. Diferença **não** intencional é regressão: corrija o
CSS, não a captura. No CI, uma falha anexa as imagens esperada, obtida e diferença ao artefato
`e2e-chromium`.

Localmente, `VISUAL_UPDATE=1 pnpm e2e --project=visual --update-snapshots=all` grava capturas em
`__screenshots__/<plataforma>/` só para você inspecionar o fixture; **não** as commite (só `linux`
é versionado).

## Orçamento de tamanho

`pnpm size:check` (depois de `pnpm build`) mede o **gzip** dos arquivos de `dist/` e compara com
`size-limits.json`: os arquivos que o consumidor carrega direto (`core/index.css`,
`themes/index.css`, `behavior/eds-behavior.js`, `eds-behavior-core.js`, `index.js` de cada pacote,
`editor/eds-editor.js`) e o **total** de cada pacote (soma do gzip de cada `.js`/`.css`).

- Os limites são o tamanho de referência **+ 10%**.
- Estourou? Reduza o bundle. Se o crescimento é intencional, `pnpm size:write` regrava os limites
  (tamanho atual + 10%) e o PR explica o motivo: subir limite é decisão de revisão.
- Arquivo medido que sumiu do build, ou limite sem arquivo, também reprova (o script avisa qual).

## No CI

- Job `check`: `pnpm size:check` ao lado de `pack:check`.
- Job `e2e` (matriz chromium/firefox/webkit): `pnpm site:build`, instala o navegador com
  dependências do sistema, roda `pnpm e2e --project=<navegador>`; no chromium roda também
  `--project=visual`. `fail-fast` desligado, uma tentativa extra (`retries: 1`) só no CI.
