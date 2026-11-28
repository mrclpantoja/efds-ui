# Visualizador e gerenciador de arquivos: contrato (1.1.0)

Contrato de markup, atributos, ARIA, teclado, eventos, API React e API de servidor do **Visualizador** (`FileViewer`) e do **Gerenciador de arquivos** (`FileManager`). É a fonte única para o core, o behavior, o React e os exemplos de servidor serem feitos em paralelo. Decisões do mantenedor (28/11/2026): contrato próprio (sem copiar outro sistema), PDF pelo leitor nativo do navegador com alternativa, tudo no core/behavior/React (sem pacote novo, só no IIFE completo), operações básicas + mover/copiar + lixeira/versões, e exemplos de servidor em Laravel e Node para S3 e disco.

## 0. Princípios

1. **O efDS.ui não tem servidor.** O navegador nunca fala com o S3 nem com o disco: fala com uma API HTTP do sistema (seção 4). Credenciais, bucket e caminhos reais ficam só no servidor.
2. **Arquivo é dado pessoal até prova em contrário (LGPD).** Nada é enviado a terceiros, não há visualizador externo (Google Docs, Office Online) nem CDN de bibliotecas; download e visualização usam URLs do próprio sistema, autenticadas ou assinadas e de curta duração. Recentes e preferências, se existirem, guardam só ids, opt-in.
3. **Nativo antes de dependência.** `<dialog>`, `<iframe>`/`<object>` com o leitor de PDF do navegador, `<img>`, `<video>`, `<audio>`, `popover`, `<details>`. Nenhuma dependência nova (sem pdf.js, sem SDK da AWS no pacote).
4. **Melhoria progressiva.** Sem JS, o link do visualizador abre o arquivo em nova aba, e o gerenciador renderizado pelo servidor é uma lista de links navegável.
5. **Toda ação com arrasto tem alternativa por clique e teclado** (WCAG 2.5.7): recortar/copiar/colar e "Mover para…".
6. **Um anúncio por ação**, em região `role="status"` do componente.
7. Textos em `configure({ messages })` e `texts` no React; tokens semânticos apenas; dados de exemplo fictícios.

## 1. Tipos de arquivo

`kindOf(mime, name)` (função pura, compartilhada com o React por `@efds-ui/behavior/internal`) devolve:

| kind    | Quando                                                                    | Renderização                                                                                        |
| ------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pdf`   | `application/pdf` ou `.pdf`                                               | `<iframe>` com a URL (leitor nativo). Sem `sandbox` (o leitor do Chrome não roda em sandbox).       |
| `image` | `image/*` exceto SVG por padrão; extensões jpg/jpeg/png/gif/webp/avif/bmp | `<img>` com zoom (ajustar, 100%, +/−), girar 90° e arrastar quando ampliada                         |
| `video` | `video/*`; mp4/webm/ogv/mov                                               | `<video controls>` nativo; legendas por `tracks` quando o item trouxer                              |
| `audio` | `audio/*`; mp3/ogg/wav/m4a/flac                                           | `<audio controls>` nativo                                                                           |
| `text`  | `text/plain`, `text/csv`, `application/json`, md/txt/csv/json/log/xml     | baixa por `fetch` (até `maxTextBytes`, padrão 1 MB) e mostra em `<pre>` como texto, nunca como HTML |
| `other` | o resto (Office, zip, SVG, HTML…)                                         | estado "Sem pré-visualização" com Baixar e Abrir em nova aba                                        |

SVG e HTML caem em `other` de propósito (podem carregar script). O autor pode forçar o tipo por item (`kind`).

**PDF no celular:** em toque (`pointer: coarse`) e em navegadores sem leitor embutido (`navigator.pdfViewerEnabled === false`), o PDF não é embutido: mostra o estado "Sem pré-visualização" com Abrir e Baixar. Opção `pdf: 'auto' | 'embed' | 'link'` (padrão `auto`).

## 2. Visualizador (`FileViewer`)

### 2.1 Markup (HTML)

Gatilhos declarativos; o behavior cria um único `<dialog>` compartilhado quando não há um no documento:

```html
<a
  href="/arquivos/12?inline=1"
  data-eds-viewer
  data-eds-viewer-group="anexos"
  data-eds-viewer-type="application/pdf"
  data-eds-viewer-download="/arquivos/12"
  data-eds-viewer-name="Contrato social.pdf"
  >Contrato social.pdf</a
>
```

- `data-eds-viewer` liga o gatilho (link `href` = URL de visualização; em `button`, `data-eds-viewer-src`).
- `-group`: itens do mesmo grupo navegam entre si (ordem do documento). Sem grupo, o item fica sozinho.
- `-type` (MIME), `-name` (nome exibido; padrão: texto do link), `-download` (URL de download; padrão: a própria URL), `-kind` (força o tipo), `-poster` (vídeo), `-size` (bytes, informativo).

Diálogo (pode vir do servidor para personalizar; senão o behavior gera igual):

```html
<dialog class="eds-viewer" aria-labelledby="eds-viewer-title">
  <header class="eds-viewer-header">
    <h2 class="eds-viewer-title" id="eds-viewer-title">…</h2>
    <p class="eds-viewer-position">2 de 5</p>
    <div class="eds-viewer-tools">  <!-- zoom/girar só em imagem; Baixar; Abrir em nova aba; Tela cheia -->
    <button class="eds-viewer-close" data-eds-close aria-label="Fechar">…</button>
  </header>
  <div class="eds-viewer-stage" data-state="loading|ready|error|unsupported">…</div>
  <footer class="eds-viewer-footer">
    <button class="eds-viewer-prev">Anterior</button>
    <div class="eds-viewer-actions"><!-- slot livre do autor --></div>
    <button class="eds-viewer-next">Próximo</button>
  </footer>
</dialog>
```

- Modo escuro no palco (como o Lightbox: `data-mode="dark"` + `data-theme` vigente). Ocupa quase toda a tela; a 320 px vira tela cheia.
- Estados do palco: `loading` (Spinner após 300 ms), `ready`, `error` (mensagem + Tentar de novo + Baixar + Abrir em nova aba), `unsupported` (ícone do tipo, nome, tamanho, Baixar, Abrir).
- Timeout de carregamento: `loadTimeout` (padrão 20 s) vira `error`. Erro do iframe de PDF não é detectável; o PDF fica em `ready` no `load`.
- `.eds-viewer-actions` é o slot do autor (ex.: "Aprovar", "Recusar"); o evento traz o item atual.

### 2.2 Interação e acessibilidade

- `showModal()`, foco inicial no Fechar, foco devolvido ao gatilho; Esc fecha; clique no fundo **não** fecha (evita perder trabalho no slot de ações).
- Setas ←/→ e PageUp/PageDown trocam de item quando o foco não está num controle que usa setas (vídeo, áudio, iframe, campos); Home/End vão ao primeiro/último. Anterior/Próximo ficam `disabled` nas pontas (sem loop).
- Troca anuncia "Arquivo 2 de 5: Contrato social.pdf." na região de status do diálogo.
- Imagem: `+`/`-`/`0` dão zoom e ajuste; `R` gira; arrastar ou setas com Shift movem a imagem ampliada; roda do mouse com Ctrl dá zoom.
- Ao fechar: zera `src` (descarrega PDF/vídeo, pausa mídia), revoga `blob:` criados, rola o gatilho até a vista.
- `iframe` com `title` = nome do arquivo; `<img alt>` = nome; vídeo/áudio com `aria-label` = nome.

### 2.3 Eventos e API (behavior)

- `eds:viewer-open` (`detail: { item, index, items, trigger }`, cancelável), `eds:viewer-change` (`{ item, index }`), `eds:viewer-close` (`{ item, index }`), `eds:viewer-error` (`{ item, reason: 'timeout' | 'network' | 'too-large' }`).
- `EDS.viewer.open(items: ViewerItem[], index = 0, options?)` → controlador `{ next(), prev(), go(i), close(), current }`; `EDS.viewer.close()`.

```ts
interface ViewerItem {
  src: string; // URL de visualização (inline)
  name: string;
  type?: string; // MIME
  kind?: 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'other';
  downloadUrl?: string;
  size?: number;
  poster?: string;
  tracks?: { src: string; kind: 'subtitles' | 'captions'; srclang: string; label: string }[];
  meta?: Record<string, unknown>; // livre, volta nos eventos
}
```

Opções (globais por `configure({ viewer })` e por chamada): `pdf`, `loadTimeout`, `maxTextBytes`, `download` (`true` | `false`: esconder Baixar quando o sistema proíbe), `openInNewTab` (idem).

### 2.4 React

`<FileViewer items index open onIndexChange onClose texts pdf loadTimeout download openInNewTab actions?: (item) => ReactNode />` — diálogo controlado (`open` + `onClose`, como Modal). Hook de conveniência `useFileViewer()` → `{ open(items, index), viewerProps }`.

## 3. Gerenciador de arquivos (`FileManager`)

### 3.1 Layout

```
┌ barra: trilha (breadcrumb) · busca · Nova pasta · Enviar · Lista|Grade · Lixeira ┐
├ árvore de pastas (Tree, só leitura, carga sob demanda) │ conteúdo da pasta       ┤
│                                                        │ (Table ou grade de cards)│
└ barra de seleção (lote): Baixar · Mover para… · Copiar para… · Excluir           ┘
```

- Árvore: reaproveita o `Tree` (sem edição inline). Em contêiner estreito (< 768 px) a árvore vira um Drawer aberto por "Pastas".
- Lista: Table com colunas Nome (ícone do tipo + link), Tamanho, Modificado, Tipo; ordenação por clique; seleção por checkbox; barra de lote `.eds-table-bulk`. Grade: cards com miniatura (só se o servidor der `thumbnailUrl`) ou ícone do tipo.
- Abrir: pasta → navega; arquivo → `FileViewer` com todos os arquivos visíveis da pasta como grupo.
- Ações por item em menu "⋯" (Dropdown disclosure) e menu de contexto (Shift+F10 / tecla Menu / botão direito, mesmo conteúdo): Abrir, Baixar, Renomear, Mover para…, Copiar para…, Versões, Excluir.
- Enviar: botão + arrastar arquivos do sistema para a área de conteúdo (ou para uma pasta da árvore/lista); usa o FileUpload em modo imediato (progresso por item, cancelar, tentar de novo). Limites de tipo e tamanho vêm de `capabilities` do servidor e são conferidos antes de enviar.
- Arrastar itens para uma pasta (lista, grade ou árvore) = mover; com Ctrl/Alt = copiar. Alternativa: Recortar (Ctrl+X) / Copiar (Ctrl+C) / Colar (Ctrl+V) e o diálogo "Mover para…" com árvore de destino.
- Conflito de nome (409 `conflict`): diálogo "Substituir", "Manter os dois" (servidor gera "nome (1).ext") ou "Pular", com "Aplicar a todos".
- Excluir: confirm; com lixeira ligada, vai para a lixeira com Toast "Desfazer" (8 s, como a Tree); sem lixeira, confirm de exclusão definitiva em tom danger.
- Lixeira: visão própria (lista com local de origem e data de exclusão): Restaurar, Excluir definitivamente, Esvaziar lixeira.
- Versões: Drawer com a lista (data, tamanho, autor quando houver): Visualizar, Baixar, Restaurar esta versão.
- Busca: na pasta atual por padrão; opção "em todas as pastas" se `capabilities.search` for `recursive`.
- Estados: carregando (Skeleton na lista), vazio (EmptyState "Esta pasta está vazia" + Enviar), erro (ErrorState com Tentar de novo), sem permissão (403: mensagem, sem ações de escrita).
- Paginação: "Carregar mais" por `nextCursor` (lista longa de S3), sem scroll infinito.
- Somente leitura: `capabilities.write === false` ou `data-eds-files-readonly` esconde ações de escrita.

### 3.2 Teclado e ARIA

- Lista é `<table>` semântica (sem `role="grid"`); grade é `<ul>` de cards com links. Seleção por checkbox; Ctrl+A seleciona todos os visíveis; Delete exclui a seleção; F2 renomeia; Enter abre; Backspace/Alt+↑ sobe uma pasta.
- Trilha é `nav[aria-label="Local"]` com `aria-current="page"` na pasta atual.
- Anúncios: "Pasta Contratos: 12 itens.", "3 itens movidos para Arquivo morto.", "Enviando 2 arquivos.", "Item excluído: relatório.pdf. Desfazer disponível."

### 3.3 Markup (HTML) e ligação

```html
<div
  class="eds-files"
  data-eds-files
  data-eds-files-api="/api/arquivos"
  data-eds-files-path="/"
  data-eds-files-view="list"
  aria-label="Arquivos do contrato"
></div>
```

- `data-eds-files-api`: base da API (seção 4). Obrigatório. Sem ela o componente não faz chamada nenhuma.
- `-path` (pasta inicial), `-view` (`list|grid`), `-readonly`, `-root-label` (nome da raiz na trilha, padrão "Arquivos").
- O behavior renderiza tudo dentro do contêiner. Para personalizar cabeçalhos de requisição (CSRF, token), `configure({ files: { headers, credentials } })` ou o evento `eds:files-request` (`detail.init` mutável).
- Eventos: `eds:files-navigate` (`{ path }`), `eds:files-select` (`{ items }`), `eds:files-open` (`{ item }`, cancelável: impede o visualizador), `eds:files-change` (`{ action, items, target? }` depois de cada operação), `eds:files-error` (`{ action, status, error }`), `eds:files-request` (`{ url, init }`).
- `EDS.files(el)` → `{ navigate(path), refresh(), select(ids), upload(files), get path, get selection }`.

### 3.4 React

`<FileManager api adapter? path defaultPath onPathChange view defaultView onViewChange readOnly rootLabel texts onOpen onChange onError requestInit />`

- `api`: URL base (usa o adaptador HTTP padrão) **ou** `adapter`: objeto que implementa `FilesAdapter` (seção 4.3) — permite usar o mesmo componente sobre GraphQL, tRPC ou mocks.
- Lógica comum (estado da pasta, seleção, ordenação, conflitos, fila de envio) em `@efds-ui/behavior/internal` como funções puras + cliente HTTP, usada pelo behavior e pelo React.

## 4. API de servidor (contrato HTTP)

JSON, UTF-8. Caminhos são **lógicos** (`/contratos/2026`), sempre começando com `/`, separador `/`, normalizados pelo servidor; o servidor recusa `..`, `\`, caracteres de controle e nomes reservados. Ids opacos são opcionais (`id`); o cliente sempre manda `path`.

### 4.1 Recursos

| Método e caminho                                     | Corpo / query                                      | Resposta                                    |
| ---------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| `GET  {api}/capabilities`                            | —                                                  | `Capabilities`                              |
| `GET  {api}/list?path=&cursor=&sort=&q=&recursive=`  | `sort` = `name`, `-modified` etc.                  | `{ path, items: Entry[], nextCursor? }`     |
| `GET  {api}/tree?path=`                              | só pastas filhas                                   | `{ path, folders: Entry[] }`                |
| `POST {api}/folders`                                 | `{ path, name }`                                   | `Entry`                                     |
| `POST {api}/upload?path=&conflict=`                  | `multipart/form-data` (`file`)                     | `Entry`                                     |
| `POST {api}/upload-url`                              | `{ path, name, size, type }` (opcional, S3 direto) | `{ url, method, headers?, fields?, entry }` |
| `GET  {api}/download?path=&version=&inline=`         | —                                                  | o arquivo (ou 302 para URL assinada curta)  |
| `PATCH {api}/rename`                                 | `{ path, name, conflict? }`                        | `Entry`                                     |
| `POST {api}/move` · `POST {api}/copy`                | `{ paths: string[], target, conflict? }`           | `{ items: Entry[], skipped: string[] }`     |
| `POST {api}/delete`                                  | `{ paths: string[], permanent?: boolean }`         | `{ deleted: string[] }`                     |
| `GET  {api}/trash?cursor=`                           | —                                                  | `{ items: TrashEntry[], nextCursor? }`      |
| `POST {api}/trash/restore`                           | `{ ids: string[], conflict? }`                     | `{ items: Entry[] }`                        |
| `POST {api}/trash/empty` · `POST {api}/trash/delete` | `{ ids? }`                                         | `{ deleted: string[] }`                     |
| `GET  {api}/versions?path=`                          | —                                                  | `{ versions: Version[] }`                   |
| `POST {api}/versions/restore`                        | `{ path, version }`                                | `Entry`                                     |

`conflict` = `fail` (padrão, responde 409) | `replace` | `rename`.

### 4.2 Tipos

```ts
interface Entry {
  path: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: string; // ISO 8601
  mime?: string;
  thumbnailUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  id?: string;
  permissions?: { write?: boolean; delete?: boolean };
}
interface TrashEntry extends Entry {
  trashId: string;
  originalPath: string;
  deletedAt: string;
}
interface Version {
  version: string;
  modified: string;
  size: number;
  author?: string;
  current?: boolean;
}
interface Capabilities {
  write: boolean;
  trash: boolean;
  versions: boolean;
  search: 'none' | 'folder' | 'recursive';
  directUpload: boolean;
  maxUploadBytes?: number;
  accept?: string[]; // MIME ou extensões
}
```

Se `viewUrl`/`downloadUrl` não vierem, o cliente usa `{api}/download?path=…&inline=1` e `…/download?path=…`.

**Erros**: status HTTP + `{ error: { code, message, path? } }`, com `code` em `not_found | forbidden | conflict | invalid_name | too_large | type_not_allowed | quota_exceeded | unsupported | internal`. O cliente mostra `message` se vier (o servidor decide o texto) ou o texto padrão pt-BR do `code`.

### 4.3 Adaptador (`FilesAdapter`)

Interface TypeScript com um método por linha da tabela 4.1 (`capabilities()`, `list()`, `tree()`, `createFolder()`, `upload(file, path, { onProgress, signal, conflict })`, `rename()`, `move()`, `copy()`, `remove()`, `trash()`, `restore()`, `emptyTrash()`, `versions()`, `restoreVersion()`, `downloadUrl()`, `viewUrl()`). `createHttpAdapter(api, { headers, credentials, fetch })` é o padrão; testes e a doc usam `createMemoryAdapter(seed)` (em memória, dados fictícios), que também alimenta as demos sem servidor.

### 4.4 Segurança exigida do servidor (documentada nos exemplos)

Autorização por pasta e por operação a cada chamada; normalização de caminho com recusa de travessia; lista de tipos e tamanho conferidos no servidor (por conteúdo, não só extensão); nome gravado gerado ou saneado no servidor; download com `Content-Disposition` saneado, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store, private`; modo `inline` só para tipos seguros (PDF, imagem não SVG, vídeo, áudio, texto como `text/plain`) com `Content-Security-Policy: default-src 'none'; frame-ancestors 'self'`, demais sempre `attachment`; URLs assinadas do S3 curtas (≤ 5 min) e geradas só depois da autorização; trilha de auditoria (quem, o quê, quando) sem gravar conteúdo; lixeira com prazo de retenção configurável; nada de bucket público.

### 4.5 Implementações de referência

`examples/servidor-arquivos/` (fora do workspace do pnpm, sem build no CI, MIT):

- `laravel/`: controller + rotas + `FilesService` sobre o Flysystem do Laravel (`Storage::disk('local')` e `disk('s3')`, a escolha é configuração), lixeira como prefixo `.trash/` com metadados, versões pelo versionamento do S3 (no disco: pasta `.versions/`), policies de autorização.
- `node/`: servidor HTTP mínimo (sem framework obrigatório) com dois drivers, `fs` e `s3` (`@aws-sdk/client-s3` + `s3-request-presigner`), mesma interface.
- Cada um com README (instalar, configurar, variáveis, checklist de segurança da 4.4) e testes do contrato.

### 4.6 Detalhes fixados pelas implementações de referência

- `invalid_name` cobre também parâmetro inválido; requisição sem autenticação responde 401 com `code: "forbidden"`; operação não suportada responde 501 `unsupported`.
- Lixeira desligada: `delete` sem `permanent: true` responde 501 (nunca apaga de vez por engano). O cliente só oferece exclusão definitiva quando `capabilities.trash` é `false`.
- Nomes que começam com ponto são recusados em toda a API (mantém `.trash/` e `.versions/` inalcançáveis).
- `move`/`copy` em lote com `conflict=fail` são atômicos: planejam tudo e recusam o lote inteiro com 409.
- `nextCursor` é opaco. `version` é opaco (a versão em vigor pode vir como `current`).
- Download por 302 para URL assinada só em `attachment`; `inline` passa sempre pelo servidor, que aplica a CSP e o `nosniff`. Vídeo e áudio aceitam `Range` (206/416).
- Upload direto ao S3 (`/upload-url`) vem desligado por padrão: a assinatura não garante tamanho nem conteúdo.

## 5. Distribuição

- Core: `viewer.css`, `files.css` (só tokens; reaproveitam Table, Tree, Drawer, Dropdown, FileUpload, EmptyState, ErrorState, Skeleton, Toast).
- Behavior: `components/viewer.ts`, `components/files*.ts`; só no IIFE completo; subentrada `@efds-ui/behavior/files` com o cliente HTTP e os adaptadores (`createHttpAdapter`, `createMemoryAdapter`) e `kindOf`.
- React: `FileViewer`, `useFileViewer`, `FileManager`, tipos `FilesAdapter`, `FileEntry`, `ViewerItem`.
- Docs: páginas "Visualizador de arquivos" e "Gerenciador de arquivos" (Recursos de página, selo experimental), com demo sobre o adaptador em memória, e a página "Servidor de arquivos" (contrato 4 + segurança 4.4 + links dos exemplos).
- Orçamento de tamanho: limites do IIFE completo e do React sobem na medida, registrados em `size-limits.json`.
