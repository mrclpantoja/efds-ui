# efDS.ui

**Empresarial Framework Design System UI**: design system leve, gratuito (MIT) e em português para aplicações empresariais (SaaS, ERP, CRM, painéis e sistemas de governo). Começa pelo HTML e pelo CSS; o JavaScript e o React são camadas opcionais por cima. Documentação: https://efds-ui.com.br

## O conjunto

O efDS.ui não é só CSS. São seis pacotes npm, publicados juntos com a mesma versão:

| Pacote                                   | O que é                                                             | Use quando                               |
| ---------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| [`@efds-ui/core`](packages/core)         | CSS puro: tokens, base, layout e mais de 60 componentes             | sempre                                   |
| [`@efds-ui/themes`](packages/themes)     | Temas, modo claro/escuro, densidade e forma, por atributos `data-*` | quando quiser trocar a aparência         |
| [`@efds-ui/behavior`](packages/behavior) | JavaScript puro, sem dependência, ligado por `data-*`               | HTML puro, PHP, Java, .NET, Vue, Angular |
| [`@efds-ui/react`](packages/react)       | Componentes React em TypeScript sobre as classes do core            | apps React 18 ou 19                      |
| [`@efds-ui/icons`](packages/icons)       | Ícones SVG como componentes React                                   | apps React                               |
| [`@efds-ui/editor`](packages/editor)     | Editor de conteúdo (ProseMirror), em HTML e React                   | campos de texto rico                     |

Dependências: `core` <- `themes`, `core` <- `react` <- `icons`; `behavior` não depende de ninguém.

## Início rápido

HTML, sem build (veja os hashes de integridade em [Instalação](https://efds-ui.com.br/comecar/instalacao)):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/core@0.1.2/dist/index.css" />
<script
  src="https://cdn.jsdelivr.net/npm/@efds-ui/behavior@0.1.2/dist/eds-behavior.js"
  defer
></script>

<button type="button" class="eds-button eds-button-primary" data-eds-open="aviso">Abrir</button>

<dialog class="eds-modal eds-modal-sm" id="aviso" aria-labelledby="aviso-t">
  <header class="eds-modal-header">
    <h2 class="eds-modal-title" id="aviso-t">Pedido salvo</h2>
  </header>
  <footer class="eds-modal-footer">
    <form method="dialog">
      <button class="eds-button eds-button-primary" data-autofocus>Fechar</button>
    </form>
  </footer>
</dialog>
```

React:

```sh
npm install @efds-ui/react @efds-ui/core
```

```tsx
import '@efds-ui/core/index.css';
import { Button } from '@efds-ui/react';

export const App = () => <Button variant="primary">Salvar</Button>;
```

## O que o projeto garante

- **Acessibilidade WCAG 2.2 AA** como requisito: HTML semântico antes de ARIA, teclado completo, foco visível, cor nunca sozinha, contraste calculado em todos os temas, `prefers-contrast`, `forced-colors`. O React força as exigências nos tipos (por exemplo, botão só de ícone exige `aria-label`).
- **Testes automatizados** com Vitest e Testing Library nos pacotes `react`, `behavior`, `icons` e `editor` (mais de 1.700 testes), e CI no GitHub Actions com formatação, lint, tipos, testes e verificação dos tarballs. A rodada de validação em Chrome, Edge e Firefox reais, com NVDA e em toque, está documentada.
- **Adaptive Surface:** tema, modo, densidade e forma mudam por atributos, nunca por arquivo ou componente por combinação.
- **Poucas dependências:** `core`, `behavior` e `icons` não têm dependência de runtime.
- **Políticas públicas:** versionamento semântico, depreciação, navegadores suportados e selo de estabilidade por componente, em [Políticas](https://efds-ui.com.br/comecar/politicas).
- **Dados fictícios** em todos os exemplos e testes (LGPD).

## Participar

- Problemas e propostas: [issues](https://github.com/mrclpantoja/efds-ui/issues)
- Como contribuir: [CONTRIBUTING.md](CONTRIBUTING.md)
- Falhas de segurança (em particular): [SECURITY.md](SECURITY.md)

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

Os pacotes `@efds-ui/core`, `themes`, `react`, `icons`, `behavior` e `editor` estão **publicados no npm (versão atual 0.1.2)** (organização [`efds-ui`](https://www.npmjs.com/org/efds-ui)) e disponíveis no jsDelivr/unpkg. Documentação: https://efds-ui.com.br. Para publicar uma versão nova, ver [`docs/publicacao.md`](docs/publicacao.md) (GitHub Actions com proveniência e aprovação em etapas no npm). Licença: [MIT](LICENSE); o texto da documentação está sob CC BY 4.0 ([`apps/docs/LICENSE.md`](apps/docs/LICENSE.md)). `pnpm pack:check` garante que cada tarball é consumível (alvos de `exports` existem, sem testes, `src` ou `workspace:` dentro).

Nos pacotes de CSS (`core`, `themes`), o `package.json` do repositório mantém a condição `development` (aponta para `src`, útil no monorepo); o tarball a remove via `publishConfig.exports` e leva só `dist/`. O `@efds-ui/react` não importa CSS: o consumidor importa o do core.

Dependências: `core` <- `themes`, `core` <- `react` <- `icons`, `behavior` (só `@efds-ui/behavior/export`) <- `react`; `behavior` não depende de nenhum pacote.

## Código-fonte

Código aberto sob a licença MIT em [github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues).

## Quem mantém

Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/), consultoria em tecnologia da informação e transformação digital que atua com órgãos públicos e empresas privadas.
