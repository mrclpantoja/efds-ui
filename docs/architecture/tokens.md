# Arquitetura de tokens — formato e pipeline

Regras de conteúdo (níveis, nomenclatura, valores): skill `.claude/skills/eds-tokens/SKILL.md`. Este documento define **onde** os tokens vivem e **como** viram CSS.

## Fonte: JSON

Cada arquivo JSON gera **um** arquivo CSS com **um** bloco de seletor.

```json
{
  "$selector": ":where(:root)",
  "$description": "Primitivos de cor",
  "gray-900": "#0F172A",
  "color-text-primary": "{gray-900}",
  "radius-md": "8px"
}
```

- Chaves que começam com `$` são metadados. As demais viram `--eds-<chave>`.
- Chaves em kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `{nome}` em um valor vira `var(--eds-nome)` (pode aparecer mais de uma vez e dentro de outras expressões, ex.: `"color-mix(in oklch, {accent-500} 12%, transparent)"`).
- Todo `{nome}` precisa existir em algum arquivo de `packages/core/tokens/` ou `packages/themes/tokens/`; caso contrário o gerador falha.
- Demais valores são copiados literalmente.

## Onde ficam

| Pasta                                    | Seletor           | Papel                                                                                    |
| ---------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| `packages/core/tokens/primitives/*.json` | `:where(:root)`   | valores brutos                                                                           |
| `packages/core/tokens/semantic/*.json`   | `:where(:root)`   | API pública com os **padrões**: tema blue, modo light, densidade comfortable, forma soft |
| `packages/themes/tokens/*.json`          | por eixo (abaixo) | sobrescritas por eixo                                                                    |

Seletores dos eixos (um arquivo por valor, nunca por combinação):

| Arquivo                                                                                               | `$selector`                |
| ----------------------------------------------------------------------------------------------------- | -------------------------- |
| `theme-blue.json`, `theme-green.json`, `theme-purple.json`, `theme-orange.json`, `theme-neutral.json` | `[data-theme="<valor>"]`   |
| `mode-light.json`, `mode-dark.json`                                                                   | `[data-mode="<valor>"]`    |
| `density-compact.json`, `density-comfortable.json`, `density-spacious.json`                           | `[data-density="<valor>"]` |
| `shape-sharp.json`, `shape-soft.json`, `shape-rounded.json`                                           | `[data-shape="<valor>"]`   |

`:where(:root)` tem especificidade zero, então qualquer atributo de eixo vence os padrões — e eixos podem ser aplicados também em subárvores, não só no `<html>`. Os arquivos dos valores padrão (blue, light, comfortable, soft) existem para permitir voltar ao padrão dentro de uma subárvore.

## Tema × modo: escala de acento

Temas **não** definem `action-primary` diretamente. Cada tema define a escala de acento `--eds-accent-{50,100,200,300,400,500,600,700,800,900}` apontando para os seus primitivos (`{blue-500}`, `{green-500}`...). Os tokens semânticos de ação e foco (`color-action-primary`, `-hover`, `-active`, `-subtle`, `color-focus-ring`...) referenciam passos de `accent-*`, e o **modo** escolhe os passos (ex.: light usa `accent-500`; dark pode usar `accent-400`). Assim tema e modo combinam sem arquivo por combinação.

## Saída

O gerador (`scripts/build-tokens.ts`, executado com `node`, sem dependências) escreve:

- `packages/core/src/tokens/<pasta>-<nome>.css` (ex.: `primitives-colors.css`, `semantic-colors.css`)
- `packages/themes/src/tokens/<nome>.css` (ex.: `mode-dark.css`)

Cada arquivo gerado começa com um cabeçalho "Gerado por scripts/build-tokens.ts — não edite" e envolve o bloco em `@layer eds.tokens { ... }`. Os arquivos gerados **são versionados**; `pnpm tokens:check` falha se estiverem desatualizados (roda na CI).

Os `index.css` de core e themes importam os arquivos gerados (mantidos à mão pelo dono do CSS).

## Donos (Fase 1)

| Arquivos                                                                                                                                                                  | Dono                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `scripts/build-tokens.ts`, scripts do `package.json`, CI                                                                                                                  | especialista-js     |
| `primitives/colors.json`, `semantic/colors.json`, `theme-*.json`, `mode-*.json`                                                                                           | especialista-design |
| demais JSON (spacing, typography, radius, shadows, motion, control, layout), `density-*.json`, `shape-*.json`, `src/base/*`, `src/index.css` de core e themes, playground | especialista-css    |

Sombras dependem do modo: os valores padrão ficam em `semantic/shadows.json` (especialista-css); `mode-dark.json` pode sobrescrevê-los (especialista-design).
