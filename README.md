# eDS.ui

Empresarial Design System UI Framework: design system leve para aplicações empresariais (SaaS, ERP, CRM, painéis). HTML/CSS primeiro, React depois.

## Comandos

Requer Node >= 20 e pnpm 12 (versão fixada em `packageManager`).

| Comando             | O que faz                             |
| ------------------- | ------------------------------------- |
| `pnpm install`      | Instala as dependências do monorepo   |
| `pnpm dev`          | Sobe o playground (Vite)              |
| `pnpm build`        | Compila todos os pacotes              |
| `pnpm typecheck`    | Verifica os tipos (TypeScript strict) |
| `pnpm lint`         | ESLint em todo o repositório          |
| `pnpm test`         | Testes (Vitest + Testing Library)     |
| `pnpm format`       | Formata com Prettier                  |
| `pnpm format:check` | Verifica a formatação                 |

## Estrutura

```
apps/
  docs/         site de documentação (Fase 6)
  playground/   página de testes dos temas e eixos
packages/
  core/         CSS puro: tokens, base, layout, componentes
  themes/       temas e eixos (theme, mode, density, shape)
  react/        wrappers React sobre as classes do core
  icons/        ícones
tooling/
  typescript-config/  eslint-config/  vitest-config/
```

Dependências: `core` <- `themes`, `core` <- `react` <- `icons`.
