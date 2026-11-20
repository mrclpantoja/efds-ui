# eDS.ui

Empresarial Design System UI Framework: design system leve para aplicações empresariais (SaaS, ERP, CRM, painéis). HTML/CSS primeiro, React depois.

## Comandos

Requer Node >= 20 e pnpm 12 (versão fixada em `packageManager`).

| Comando             | O que faz                             |
| ------------------- | ------------------------------------- |
| `pnpm install`      | Instala as dependências do monorepo   |
| `pnpm dev`          | Sobe o playground (Vite)              |
| `pnpm build`        | Compila todos os pacotes              |
| `pnpm pack:check`   | Valida os tarballs (não publica)      |
| `pnpm typecheck`    | Verifica os tipos (TypeScript strict) |
| `pnpm lint`         | ESLint em todo o repositório          |
| `pnpm test`         | Testes (Vitest + Testing Library)     |
| `pnpm format`       | Formata com Prettier                  |
| `pnpm format:check` | Verifica a formatação                 |

## Importação seletiva

Além do `index.css` completo, cada pacote publica um CSS por arquivo-fonte. Cada arquivo começa com a declaração de ordem de `@layer`, então a cascata não depende da ordem dos imports.

```ts
import '@eds-ui/core/tokens.css'; // todos os tokens
import '@eds-ui/core/base.css'; // reset, root, tipografia, acessibilidade
import '@eds-ui/core/layout/stack.css'; // um arquivo de layout
import '@eds-ui/core/components/button.css'; // um componente
import '@eds-ui/themes/theme-blue.css'; // um valor de eixo (theme, mode, density, shape)
```

## Estrutura

```
apps/
  docs/         site de documentação (Fase 6)
  playground/   página de testes dos temas e eixos
packages/
  core/         CSS puro: tokens, base, layout, componentes
  themes/       temas e eixos (theme, mode, density, shape)
  react/        wrappers React sobre as classes do core
  behavior/     JS puro (sem dependência) para quem usa só HTML: ligado por atributos data-*
  icons/        ícones
tooling/
  typescript-config/  eslint-config/  vitest-config/
scripts/        gerador de tokens (build-tokens.ts) e verificação de tarballs (check-pack.ts)
docs/           documentos de arquitetura
CHANGELOG.md    histórico de versões
```

## Publicação

Os pacotes `@eds-ui/core`, `@eds-ui/themes`, `@eds-ui/react`, `@eds-ui/icons` e `@eds-ui/behavior` estão na versão 0.1.0, mas **não são publicados**: seguem `"private": true` até a verificação do nome/escopo `@eds-ui` no npm. Licença: [MIT](LICENSE); o texto da documentação está sob CC BY 4.0 ([`apps/docs/LICENSE.md`](apps/docs/LICENSE.md)). `pnpm pack:check` garante que cada tarball é consumível (alvos de `exports` existem, sem testes, `src` ou `workspace:` dentro).

Nos pacotes de CSS (`core`, `themes`), o `package.json` do repositório mantém a condição `development` (aponta para `src`, útil no monorepo); o tarball a remove via `publishConfig.exports` e leva só `dist/`. O `@eds-ui/react` não importa CSS: o consumidor importa o do core.

Dependências: `core` <- `themes`, `core` <- `react` <- `icons`, `behavior` (só `@eds-ui/behavior/export`) <- `react`; `behavior` não depende de nenhum pacote.
