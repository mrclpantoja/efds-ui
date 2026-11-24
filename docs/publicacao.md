# Publicação no npm

Os pacotes `@efds-ui/*` são publicados pelo GitHub Actions (`.github/workflows/publish.yml`), com **proveniência**: cada versão no npm traz um selo assinado que liga o pacote ao commit e ao build que o geraram. Não há token do npm guardado no GitHub; o npm confia no fluxo pela publicação confiável (OIDC).

## Configuração única no npm

Para cada um dos 6 pacotes (`core`, `themes`, `icons`, `react`, `behavior`, `editor`), em npmjs.com > pacote > **Settings** > **Trusted Publisher** > **GitHub Actions**:

| Campo             | Valor         |
| ----------------- | ------------- |
| Organization/user | `mrclpantoja` |
| Repository        | `efds-ui`     |
| Workflow filename | `publish.yml` |
| Environment name  | `npm`         |

Depois, na mesma página, em **Publishing access**, escolher "Require two-factor authentication and disallow tokens": publicar passa a ser possível só pelo fluxo ou com 2FA.

## Publicar uma versão

1. Subir a versão em `packages/*/package.json` (todas iguais) e registrar no `CHANGELOG.md`.
2. Atualizar `apps/docs/src/cdn.ts` (versão e hashes SRI) para o site apontar para a versão nova.
3. Commitar e criar a tag: `git tag v0.1.2` e `git push origin main v0.1.2`.
4. O fluxo roda todas as verificações e publica os pacotes que ainda não existem nessa versão.

A tag precisa ser `v` + a versão dos pacotes; senão o fluxo recusa. Se falhar no meio, rodar de novo é seguro: versões já publicadas são puladas.

## Simular

- No GitHub: Actions > **Publicar no npm** > Run workflow (só simula).
- Localmente: `node scripts/publish.ts --dry-run` (empacota e simula; publicar de verdade fora do CI é recusado).
