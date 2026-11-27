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

## Proteções no GitHub

- **Dois jobs**: `build` roda as verificações e empacota os tarballs sem nenhuma credencial; `publish` só baixa esses tarballs (artifact) e os envia. Só o `publish` tem `id-token: write` e usa o environment `npm`.
- **Environment `npm`**: exige aprovação do mantenedor (Settings > Environments > npm > Required reviewers) e só aceita deploy de tags `v*` e do `main` (o `main` é a simulação manual). O Trusted Publisher do npm aceita só esse environment: nada publica sem as duas aprovações (GitHub e npm).
- **Rulesets**: "Tags de versão" impede apagar, mover ou reescrever tags `v*`; "Proteção do main" impede force push e exclusão do `main`.
- **Actions fixadas por SHA** (com a versão em comentário) e npm em versão exata no job de publicação. Ao atualizar uma action, trocar o SHA e o comentário juntos.
- **Commits e tags assinados** (SSH). Configuração local: `git config gpg.format ssh`, `git config user.signingkey <chave>.pub`, `git config commit.gpgsign true`, `git config tag.gpgsign true`; a mesma chave cadastrada no GitHub como _signing key_.

## Publicar uma versão

1. Subir a versão em `packages/*/package.json` (todas iguais) e registrar no `CHANGELOG.md`.
2. Atualizar `apps/docs/src/cdn.ts` (versão e hashes SRI) para o site apontar para a versão nova.
3. Commitar e criar a tag assinada: `git tag -s v1.0.0 -m v1.0.0` e `git push origin main v1.0.0`.
4. O job `build` roda todas as verificações; em Actions, aprove o deploy no environment `npm` para o job `publish` enviar à aprovação do npm os pacotes que ainda não existem nessa versão.
5. Em npmjs.com > **Staged Packages**, conferir e aprovar as 6 versões (dá para aprovar em lote, com um só 2FA). Só então ficam públicas. Pelo terminal: `npm stage list` e `npm stage approve <id>`.

A tag precisa ser `v` + a versão dos pacotes; senão o fluxo recusa. Se falhar no meio, rodar de novo é seguro: versões já publicadas são puladas. Versão enviada e ainda não aprovada não conta como publicada: para reenviar, rejeite a anterior (`npm stage reject <id>`).

## Simular

- No GitHub: Actions > **Publicar no npm** > Run workflow (só simula).
- Localmente: `node scripts/publish.ts --dry-run` (empacota e simula, exige npm 11.15.0 ou mais novo; enviar de verdade fora do CI é recusado).
