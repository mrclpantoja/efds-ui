# Templates

Telas completas montadas só com o efDS.ui, entregues em **HTML puro** (com `@efds-ui/behavior`, para PHP, Java, .NET) e em **React** (Vite + `@efds-ui/react`), com as mesmas telas e os mesmos dados fictícios.

- **Gratuitos (MIT, neste repositório, em `templates/`)**: Painel administrativo, Cadastro (CRUD) e Portal de serviços. **Sem trava de licença**: funcionam abertos direto do disco ou de um servidor, sem chave e sem cadastro. O download é livre; um cadastro futuro (backend do usuário) pode existir, mas o template nunca depende dele.
- **Premium (repositório privado à parte)**: ERP financeiro, CRM de vendas, Helpdesk, RH, Protocolo, Ouvidoria e e-SIC, Contratos e licitações, Estoque e patrimônio, Agenda e atendimento, Gestão escolar. Licenças "um site" e "vários sites", com **trava de licença** (descrita abaixo). Ainda não publicados.

## Estrutura

```
templates/
  license/              @efds-ui/template-license (privado no workspace, não publicado; só os premium usam)
    src/core.ts         verificação pura (sem DOM)
    src/html.ts         IIFE dist/efds-license-gate.js para as páginas HTML
    src/react.tsx       <LicenseGate> para os apps React
    src/public-key.ts   chave pública de produção (a privada nunca entra em repositório)
  painel/   html/ react/
  cadastro/ html/ react/
  portal/   html/ react/
scripts/templates/      keygen e issue (licença, só premium), vendor, pack (monta o .zip), site
```

## Licença e chave (só templates premium)

Os templates gratuitos **não** têm arquivo de validação, chave, `efds-config.js` nem verificação: as páginas HTML carregam só o `eds-behavior.js` (que se liga sozinho, sem `data-eds-manual`) e os apps React renderizam `<App />` direto. Tudo o que segue vale para os premium (repositório à parte), que usam a biblioteca `templates/license` e os scripts daqui por `--source`.

Cada download premium leva um **arquivo de validação** com id único; a **chave** é a assinatura Ed25519 desse arquivo, feita com a chave privada do emissor. Sem a chave, ou com uma chave que não corresponde ao arquivo, o template **não executa**.

Arquivo de validação (`efds-license.json`, em `react/src/` no app React; no HTML também `efds-license.js`, que define `window.EFDS_LICENSE` e funciona em `file://`):

```json
{
  "v": 1,
  "id": "0b7c…",
  "product": "painel",
  "type": "single",
  "domains": ["exemplo.gov.br"],
  "issuedAt": "2026-11-22"
}
```

- `type`: `single` (um site) ou `multi` (vários sites). O tipo `free` foi removido: os gratuitos não têm licença.
- `domains` (opcional): quando existe, o `location.hostname` precisa ser um deles ou um subdomínio. `single` sempre leva `domains`.
- **Chave** = `base64url(Ed25519.sign(privada, JSON canônico do arquivo))`. JSON canônico: chaves em ordem alfabética, sem espaços.
- Verificação **offline**, em JavaScript puro (não usa `crypto.subtle`, que não existe em `http://` de intranet). Nenhuma chamada a servidor; nenhum dado pessoal no arquivo.

Onde a chave é colocada:

- **HTML**: `efds-config.js` com `window.EFDS_LICENSE_KEY = '...'`.
- **React**: `VITE_EFDS_LICENSE_KEY` no `.env`.

Comportamento:

- **Chave válida**: o HTML chama `EDS.init()` (nos premium o behavior é carregado com `data-eds-manual`); o React renderiza o app.
- **Sem chave ou inválida**: nada é ligado. O conteúdo da página fica `inert` e oculto, e uma tela de bloqueio explica o motivo ("Chave de licença ausente", "Chave não corresponde ao arquivo de licença", "Domínio não coberto pela licença") e como resolver, com link para a documentação. Mensagem em `role="alert"`, foco no título, contraste AA.

## Conteúdo das páginas HTML

Cada página referencia arquivos locais em `vendor/` (copiados de `dist/` pelo script; fora do Git), nunca CDN.

Gratuitos:

```html
<link rel="stylesheet" href="vendor/efds-ui/core/index.css" />
<link rel="stylesheet" href="vendor/efds-ui/themes/index.css" />
<script src="vendor/efds-ui/behavior/eds-behavior.js" defer></script>
```

Premium (com a trava):

```html
<script src="efds-config.js"></script>
<script src="efds-license.js"></script>
<script src="vendor/efds-ui/behavior/eds-behavior.js" data-eds-manual defer></script>
<script src="vendor/efds-ui/license/efds-license-gate.js" defer></script>
```

## Scripts

- `pnpm templates:vendor`: copia `core`, `themes` e `behavior` para `templates/<t>/html/vendor/efds-ui/` dos gratuitos. Com `--source <pasta>` (premium) copia também `license/efds-license-gate.js`.
- `pnpm templates:pack --template <t> --out <pasta>`: zip de um gratuito, sem licença nem chave (README e LICENSE MIT). Com `--source <pasta> --license <pasta> --out <pasta>` (premium) exige o arquivo de licença emitido por `templates:issue`, embute o verificador e a chave vazia. Gratuito e premium se distinguem por `--source`.
- `pnpm templates:issue` e `pnpm templates:keygen`: só premium.
- `pnpm templates:site`: copia as demos dos gratuitos para o site (sem licença).

## Regras

- Só classes `.eds-*` e componentes `@efds-ui/react`; CSS próprio do template só para composição de página, consumindo tokens semânticos (zero cor literal, zero `style=`).
- Dados fictícios, pt-BR; CPF/CNPJ fictícios e mascarados.
- WCAG 2.2 AA; responsivo de 320 px a 1440 px.
- Licenças de terceiros: só pacotes `@efds-ui/*` (os premium acrescentam o verificador Ed25519, MIT).
