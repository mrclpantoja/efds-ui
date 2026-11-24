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

Em **Allowed actions**, deixar **Allow npm publish** e **Allow npm dist-tag** desmarcados: o fluxo só pode enviar em etapas (`npm stage publish`), e cada versão fica retida até você aprovar com 2FA.

Depois, na mesma página, em **Publishing access**, escolher "Require two-factor authentication and disallow bypass 2fa tokens" e salvar (Update Package Settings).

## Publicar uma versão

1. Subir a versão em `packages/*/package.json` (todas iguais) e registrar no `CHANGELOG.md`.
2. Atualizar `apps/docs/src/cdn.ts` (versão e hashes SRI) para o site apontar para a versão nova.
3. Commitar e criar a tag: `git tag v0.1.2` e `git push origin main v0.1.2`.
4. O fluxo roda todas as verificações e envia para aprovação os pacotes que ainda não existem nessa versão.
5. Em npmjs.com > **Staged Packages**, conferir e aprovar as 6 versões (dá para aprovar em lote, com um só 2FA). Só então ficam públicas. Pelo terminal: `npm stage list` e `npm stage approve <id>`.

A tag precisa ser `v` + a versão dos pacotes; senão o fluxo recusa. Se falhar no meio, rodar de novo é seguro: versões já publicadas são puladas. Versão enviada e ainda não aprovada não conta como publicada: para reenviar, rejeite a anterior (`npm stage reject <id>`).

## Simular

- No GitHub: Actions > **Publicar no npm** > Run workflow (só simula).
- Localmente: `node scripts/publish.ts --dry-run` (empacota e simula, exige npm 11.15.0 ou mais novo; enviar de verdade fora do CI é recusado).
