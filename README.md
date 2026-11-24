# efDS.ui

Empresarial Framework Design System UI: design system leve para aplicações empresariais (SaaS, ERP, CRM, painéis). HTML/CSS primeiro, React depois.

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
import '@efds-ui/core/tokens.css'; // todos os tokens
import '@efds-ui/core/base.css'; // reset, root, tipografia, acessibilidade
import '@efds-ui/core/layout/stack.css'; // um arquivo de layout
import '@efds-ui/core/components/button.css'; // um componente
import '@efds-ui/themes/theme-blue.css'; // um valor de eixo (theme, mode, density, shape)
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

Os pacotes `@efds-ui/core`, `themes`, `react`, `icons`, `behavior` e `editor` estão **publicados no npm (versão atual 0.1.1)** (organização [`efds-ui`](https://www.npmjs.com/org/efds-ui)) e disponíveis no jsDelivr/unpkg. Documentação: https://efds-ui.com.br. Para publicar uma versão nova: subir o número em todos os pacotes, diretório limpo, `pnpm -r --filter "./packages/*" publish --access public` e atualizar `apps/docs/src/cdn.ts` (versão e hashes SRI). Licença: [MIT](LICENSE); o texto da documentação está sob CC BY 4.0 ([`apps/docs/LICENSE.md`](apps/docs/LICENSE.md)). `pnpm pack:check` garante que cada tarball é consumível (alvos de `exports` existem, sem testes, `src` ou `workspace:` dentro).

Nos pacotes de CSS (`core`, `themes`), o `package.json` do repositório mantém a condição `development` (aponta para `src`, útil no monorepo); o tarball a remove via `publishConfig.exports` e leva só `dist/`. O `@efds-ui/react` não importa CSS: o consumidor importa o do core.

Dependências: `core` <- `themes`, `core` <- `react` <- `icons`, `behavior` (só `@efds-ui/behavior/export`) <- `react`; `behavior` não depende de nenhum pacote.

## Código-fonte

Código aberto sob a licença MIT em [github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues).

## Quem mantém

Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/), consultoria em tecnologia da informação e transformação digital de Macapá (AP), que atua com órgãos públicos e empresas privadas.
