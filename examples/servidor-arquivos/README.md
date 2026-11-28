# Servidor de arquivos: implementações de referência

Exemplos de servidor para o **contrato HTTP de arquivos** do efDS.ui 1.1.0 (seções 0 e 4 de `docs/architecture/arquivos.md`), que alimenta o Gerenciador (`FileManager`) e o Visualizador (`FileViewer`).

O efDS.ui **não tem servidor**: o navegador nunca fala com o S3 nem com o disco, só com uma API HTTP do seu sistema. Credenciais, bucket e caminhos reais ficam no servidor.

| Pasta                   | Stack                      | Armazenamento                                 | Testes                        |
| ----------------------- | -------------------------- | --------------------------------------------- | ----------------------------- |
| [`node/`](./node)       | `node:http`, sem framework | disco (`fs`, sem dependência) e S3            | `node --test` (driver `fs`)   |
| [`laravel/`](./laravel) | Laravel 11/12, Flysystem   | disco (`local`) e S3 (`s3`), por configuração | PHPUnit + Orchestra Testbench |

Os dois implementam **o mesmo contrato e os mesmos comportamentos**: caminho lógico com recusa de travessia, autorização por pasta e operação, conflitos `fail | replace | rename`, lixeira com retenção, versões, upload multipart e (S3) URL assinada, download com os cabeçalhos da seção 4.4, auditoria sem conteúdo e erros `{ error: { code, message } }`.

Esta pasta fica **fora do workspace do pnpm**, sem build nem teste no CI do efDS.ui, e não é publicada no npm. É código de partida para você adaptar: leia, ajuste a autenticação e a autorização ao seu sistema e só então use.

## Mapa das rotas

Todas relativas à base da API (ex.: `/api/arquivos`). Exigem autenticação.

| Método e caminho                           | Corpo / query                              | Resposta                             |
| ------------------------------------------ | ------------------------------------------ | ------------------------------------ |
| `GET /capabilities`                        | -                                          | `Capabilities`                       |
| `GET /list`                                | `path`, `cursor`, `sort`, `q`, `recursive` | `{ path, items, nextCursor? }`       |
| `GET /tree`                                | `path`                                     | `{ path, folders }`                  |
| `POST /folders`                            | `{ path, name }`                           | `Entry` (201)                        |
| `POST /upload`                             | query `path`, `conflict`; multipart `file` | `Entry` (201)                        |
| `POST /upload-url`                         | `{ path, name, size, type }` (só S3)       | `{ url, method, headers, entry }`    |
| `GET /download`                            | `path`, `version`, `inline`                | o arquivo (ou 302 para URL assinada) |
| `PATCH /rename`                            | `{ path, name, conflict? }`                | `Entry`                              |
| `POST /move` e `POST /copy`                | `{ paths, target, conflict? }`             | `{ items, skipped }`                 |
| `POST /delete`                             | `{ paths, permanent? }`                    | `{ deleted }`                        |
| `GET /trash`                               | `cursor`                                   | `{ items, nextCursor? }`             |
| `POST /trash/restore`                      | `{ ids, conflict? }`                       | `{ items }`                          |
| `POST /trash/empty` e `POST /trash/delete` | `{ ids? }`                                 | `{ deleted }`                        |
| `GET /versions`                            | `path`                                     | `{ versions }`                       |
| `POST /versions/restore`                   | `{ path, version }`                        | `Entry`                              |

Comportamentos que valem nos dois exemplos (decisões de implementação, dentro do contrato):

- **Conflito em lote**: com `conflict=fail`, `move`/`copy` conferem tudo antes de mexer em qualquer item; um conflito recusa o lote inteiro (409). `skipped` lista os itens que já estavam na pasta de destino (só em `move`).
- **`replace`** só vale arquivo sobre arquivo. Pasta sobre pasta é 409.
- **Lixeira desligada** (retenção `0`): `delete` sem `permanent: true` responde `501 unsupported`, para nunca apagar de vez por engano.
- **`invalid_name`** cobre também parâmetros inválidos (o contrato não tem um código genérico). Falha de autenticação é `401` com `code: "forbidden"`.
- **Nomes iniciados por ponto** são recusados em qualquer ponto da API; isso mantém `.trash/` e `.versions/` inalcançáveis.
- **Paginação**: o servidor lê a pasta, filtra, ordena e fatia; `cursor` é um deslocamento opaco. Serve para milhares de itens por pasta, não para milhões (nesse caso, indexe em banco).
- **Busca recursiva** percorre a árvore (limite de 5000 itens); em bucket grande, troque por um índice.
- **Auditoria** registra quem, o quê e quando em escritas, downloads e visualizações; listagens não são registradas (volume).

## Como ligar ao cliente

HTML (behavior, IIFE completo):

```html
<div
  class="eds-files"
  data-eds-files
  data-eds-files-api="/api/arquivos"
  data-eds-files-path="/"
  aria-label="Arquivos do contrato"
></div>
```

Cabeçalhos de autenticação (token, CSRF) e cookies, uma vez:

```js
EDS.configure({
  files: {
    headers: { Authorization: 'Bearer ...' },
    credentials: 'same-origin',
  },
});
```

React:

```tsx
<FileManager api="/api/arquivos" requestInit={{ headers: { Authorization: `Bearer ${token}` } }} />
```

Sirva a API **na mesma origem** da página (ou por proxy reverso). Assim não há CORS, o cookie de sessão funciona e `frame-ancestors 'self'` deixa o PDF abrir no visualizador. Com cookie de sessão, proteja as rotas de escrita contra CSRF (no Laravel, o grupo `web`/Sanctum; no Node, token no cabeçalho como no exemplo).

## Checklist de segurança (seção 4.4 do contrato)

Marque cada item antes de colocar em produção. A coluna mostra onde o exemplo cobre.

- [ ] **Autenticação em toda chamada.** Node: `src/auth.js` (token de exemplo, troque). Laravel: middleware `config('files.middleware')`.
- [ ] **Autorização por pasta e por operação a cada chamada.** Node: `can()` em `src/auth.js`. Laravel: `FolderAccessPolicy` via Gate (`files.list/read/write/delete`). Substitua as regras de exemplo pelas do seu sistema.
- [ ] **Normalização de caminho com recusa de travessia** (`..`, `\`, controle, nomes reservados, links simbólicos fora da raiz). Coberto e testado.
- [ ] **Tipo e tamanho conferidos no servidor, por conteúdo** (assinatura dos primeiros bytes contra a extensão; executáveis e scripts de servidor bloqueados; lista `accept`). Coberto no upload multipart. **Não** cobre o upload direto ao S3 (ver abaixo).
- [ ] **Nome gravado saneado no servidor** (upload) e validado (pasta, renomear). Coberto.
- [ ] **Download** com `Content-Disposition` saneado (`filename` ASCII + `filename*`), `X-Content-Type-Options: nosniff`, `Cache-Control: no-store, private`. Coberto.
- [ ] **`inline` só para tipos seguros** (PDF, imagem exceto SVG, vídeo, áudio, texto como `text/plain`) com `Content-Security-Policy: default-src 'none'; frame-ancestors 'self'`; SVG, HTML e o resto sempre `attachment`. Coberto e testado. Teste o PDF no Chrome, Edge e Firefox da sua versão: se algum bloquear o leitor embutido por causa do CSP, o contrato manda manter o CSP e usar a alternativa "Abrir em nova aba" do visualizador.
- [ ] **URLs assinadas do S3 de até 5 minutos**, geradas só depois da autorização (`SIGNED_URL_TTL`/`FILES_SIGNED_URL_TTL`, limitado a 300 s). Coberto.
- [ ] **Trilha de auditoria** sem gravar conteúdo. Node: uma linha JSON por evento no stdout. Laravel: `Log` (canal `FILES_AUDIT_CHANNEL`). Envie para o seu coletor de logs.
- [ ] **Lixeira com prazo de retenção** configurável, com limpeza agendada (Node: a cada hora; Laravel: `php artisan files:purge-trash` no agendador).
- [ ] **Nada de bucket público.** Bloqueie todo acesso público (Block Public Access), acesse só por papel IAM com o menor privilégio e ligue criptografia (`S3_SSE`/SSE no bucket).
- [ ] **Limites de requisição** no proxy reverso (tamanho do corpo, taxa por usuário) e HTTPS obrigatório.
- [ ] **Antivírus** nos uploads, se o seu órgão exigir (ponto de extensão: logo antes de gravar).
- [ ] **LGPD**: arquivo é dado pessoal até prova em contrário. Defina retenção, base legal e quem pode baixar; não envie conteúdo a terceiros; mascare identificadores nos logs.

## Limitações conhecidas (leia antes de adotar)

- **S3 não foi executado** contra um bucket real nestas entregas (nem MinIO). O código segue a documentação do SDK, mas precisa do seu teste de integração. Os testes automatizados cobrem só o disco.
- **Upload direto ao S3** (`/upload-url`): o navegador grava no destino final sem passar pelo servidor. O servidor confere nome, extensão e tamanho **declarados**; a assinatura só prende o `Content-Type`, não o tamanho nem o conteúdo. Se precisar impor isso, use uma política de POST, limite no bucket ou uma verificação posterior (Lambda/fila), e deixe `directUpload` desligado enquanto não houver. Por padrão vem **desligado**.
- **Multipart em memória** (Node) e limite do PHP (`upload_max_filesize`, `post_max_size`, Laravel). Para arquivos grandes use o upload direto ou um parser em fluxo (por exemplo `busboy`).
- **Sem escrita condicional** no Flysystem: o Laravel confere a existência antes de gravar; há uma janela de corrida entre a conferência e a escrita. O disco do Node e o S3 do Node usam gravação atômica sem sobrescrever (`link`/`If-None-Match`).
- **Cópia de objeto S3 maior que 5 GB** exige multipart copy (não implementado).
- **Versões**: no S3 vêm do versionamento do bucket (`ListObjectVersions`; `author` não é preenchido); no disco ficam em `.versions/` (até `MAX_VERSIONS`). Excluir "de verdade" no S3 versionado deixa versões antigas, a não ser que `S3_PURGE_VERSIONS`/`FILES_S3_PURGE_VERSIONS` esteja ligado ou haja regra de ciclo de vida.

## Licença

MIT (veja `LICENSE`).
