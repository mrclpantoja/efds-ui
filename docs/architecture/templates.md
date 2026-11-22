# Templates

Telas completas montadas só com o efDS.ui, entregues em **HTML puro** (com `@efds-ui/behavior`, para PHP, Java, .NET) e em **React** (Vite + `@efds-ui/react`), com as mesmas telas e os mesmos dados fictícios.

- **Gratuitos (MIT, neste repositório, em `templates/`)**: Painel administrativo, Cadastro (CRUD) e Portal de serviços. Download depois de cadastro, com chave gratuita.
- **Premium (repositório privado à parte)**: ERP financeiro, CRM de vendas, Helpdesk, RH, Protocolo, Ouvidoria e e-SIC, Contratos e licitações, Estoque e patrimônio, Agenda e atendimento, Gestão escolar. Licenças "um site" e "vários sites". Ainda não publicados.

## Estrutura

```
templates/
  license/              @efds-ui/template-license (privado no workspace, não publicado)
    src/core.ts         verificação pura (sem DOM)
    src/html.ts         IIFE dist/efds-license-gate.js para as páginas HTML
    src/react.tsx       <LicenseGate> para os apps React
    src/public-key.ts   chave pública de produção (a privada nunca entra em repositório)
  painel/   html/ react/
  cadastro/ html/ react/
  portal/   html/ react/
scripts/templates/      keygen, issue (emitir licença), pack (montar o .zip de download)
```

## Licença e chave

Cada download leva um **arquivo de validação** com id único; a **chave** é a assinatura Ed25519 desse arquivo, feita com a chave privada do emissor. Sem a chave, ou com uma chave que não corresponde ao arquivo, o template **não executa**.

Arquivo de validação (`efds-license.json`, em `react/src/` no app React; no HTML também `efds-license.js`, que define `window.EFDS_LICENSE` e funciona em `file://`):

```json
{
  "v": 1,
  "id": "0b7c…",
  "product": "painel",
  "type": "free",
  "domains": ["exemplo.gov.br"],
  "issuedAt": "2026-11-22"
}
```

- `type`: `free`, `single` (um site) ou `multi` (vários sites).
- `domains` (opcional): quando existe, o `location.hostname` precisa ser um deles ou um subdomínio. `single` sempre leva `domains`.
- **Chave** = `base64url(Ed25519.sign(privada, JSON canônico do arquivo))`. JSON canônico: chaves em ordem alfabética, sem espaços.
- Verificação **offline**, em JavaScript puro (não usa `crypto.subtle`, que não existe em `http://` de intranet). Nenhuma chamada a servidor; nenhum dado pessoal no arquivo.

Onde a chave é colocada:

- **HTML**: `efds-config.js` com `window.EFDS_LICENSE_KEY = '...'`.
- **React**: `VITE_EFDS_LICENSE_KEY` no `.env`.

Comportamento:

- **Chave válida**: o HTML chama `EDS.init()` (o behavior é carregado com `data-eds-manual`); o React renderiza o app.
- **Sem chave ou inválida**: nada é ligado. O conteúdo da página fica `inert` e oculto, e uma tela de bloqueio explica o motivo ("Chave de licença ausente", "Chave não corresponde ao arquivo de licença", "Domínio não coberto pela licença") e como resolver, com link para a documentação. Mensagem em `role="alert"`, foco no título, contraste AA.

## Conteúdo das páginas HTML

Cada página referencia arquivos locais em `vendor/` (copiados de `dist/` pelo script; fora do Git), nunca CDN:

```html
<link rel="stylesheet" href="vendor/efds-ui/core/index.css" />
<link rel="stylesheet" href="vendor/efds-ui/themes/index.css" />
<script src="efds-config.js"></script>
<script src="efds-license.js"></script>
<script src="vendor/efds-ui/behavior/eds-behavior.js" data-eds-manual defer></script>
<script src="vendor/efds-ui/license/efds-license-gate.js" defer></script>
```

## Regras

- Só classes `.eds-*` e componentes `@efds-ui/react`; CSS próprio do template só para composição de página, consumindo tokens semânticos (zero cor literal, zero `style=`).
- Dados fictícios, pt-BR; CPF/CNPJ fictícios e mascarados.
- WCAG 2.2 AA; responsivo de 320 px a 1440 px.
- Licenças de terceiros: só pacotes `@efds-ui/*` e o verificador Ed25519 (MIT).

## Licença de demonstração

Os templates gratuitos deste repositório trazem uma licença `free` de demonstração, com os domínios `localhost`, `127.0.0.1` e `efds-ui.com.br` (arquivos de licença, `efds-config.js` e `react/.env` versionados). O `pnpm templates:pack` descarta esses arquivos: o download leva só a licença emitida para quem baixou e a chave vazia.
