# Servidor de arquivos em Node (referência)

Implementa o contrato HTTP de arquivos do efDS.ui (`docs/architecture/arquivos.md`, seção 4) com `node:http`, sem framework. Dois drivers de armazenamento atrás da mesma interface: `fs` (disco, **sem nenhuma dependência**) e `s3` (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, carregados só se você escolher `s3`).

Leia primeiro o [README geral](../README.md) (mapa de rotas, checklist de segurança, limitações).

## Instalação

Requer Node 20.6 ou superior.

```sh
cd examples/servidor-arquivos/node
cp .env.example .env        # ajuste os valores (o .env não deve ir para o Git)
npm install                 # só é necessário para o driver s3 (o fs não tem dependências)
npm start                   # node --env-file=.env src/index.js
```

Com o driver `fs` você pode pular o `npm install`. As versões do SDK da AWS estão **fixas** em `package.json` (`3.700.0`); confira e atualize para a versão estável vigente ao adotar.

## Configuração

Tudo por variáveis de ambiente (veja `.env.example`; todos os valores são fictícios).

| Variável                                    | Padrão              | O que faz                                                                |
| ------------------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `PORT`, `HOST`                              | `3000`, `127.0.0.1` | Onde escutar. Coloque atrás de proxy reverso com HTTPS.                  |
| `FILES_BASE_PATH`                           | `/api/arquivos`     | Base da API (o `data-eds-files-api` do cliente).                         |
| `FILES_TOKENS`                              | (obrigatório)       | JSON `{ "<token>": { "user": "ana", "acl": { "/contratos": "rwd" } } }`. |
| `STORAGE_DRIVER`                            | `fs`                | `fs` ou `s3`.                                                            |
| `FILES_ROOT`                                | `./storage`         | Raiz do driver `fs`.                                                     |
| `MAX_UPLOAD_BYTES`                          | `52428800`          | Limite do upload multipart.                                              |
| `ACCEPT`                                    | (vazio)             | MIME (`image/*`) ou extensões (`.pdf`), separados por vírgula.           |
| `TRASH_RETENTION_DAYS`                      | `30`                | Retenção da lixeira. `0` desliga a lixeira.                              |
| `MAX_VERSIONS`                              | `20`                | Versões por arquivo no driver `fs`.                                      |
| `SIGNED_URL_TTL`                            | `300`               | Validade das URLs assinadas (limitada a 300 s).                          |
| `S3_BUCKET`, `S3_REGION`, `S3_PREFIX`       |                     | Bucket, região e prefixo opcional dentro do bucket.                      |
| `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`        |                     | Para MinIO/Ceph (endereços fictícios no exemplo).                        |
| `S3_VERSIONING`                             | `auto`              | `auto` consulta o bucket; `true`/`false` força.                          |
| `S3_SSE`                                    |                     | `AES256` ou `aws:kms`.                                                   |
| `S3_DIRECT_UPLOAD`, `S3_REDIRECT_DOWNLOADS` | `false`             | URL assinada de upload; download `attachment` por 302.                   |
| `S3_PURGE_VERSIONS`                         | `false`             | Exclusão definitiva apaga também as versões antigas do bucket.           |

Credenciais da AWS **não** ficam no `.env`: use a cadeia padrão do SDK (papel IAM da instância/contêiner).

### Autenticação e autorização

`src/auth.js` traz um autenticador de **exemplo** por token Bearer e uma ACL por prefixo de pasta (`r` ler/listar, `w` gravar, `d` excluir; o prefixo mais longo vence; `{user}` vira o id do usuário). Para o seu sistema, substitua `createTokenAuthenticator` por uma função `authenticate(req)` que devolva `{ id, acl }` (ou lance `FilesError('forbidden', ..., { status: 401 })`), e/ou reescreva `can()`.

## Estrutura

```
src/
  index.js        entrada (config, driver, limpeza da lixeira, listen)
  config.js       variáveis de ambiente
  server.js       camada HTTP: rotas da tabela 4.1, multipart, download, cabeçalhos
  service.js      regras: autorização, conflitos, lixeira, versões, limites, auditoria
  auth.js         autenticação e ACL de exemplo
  paths.js        normalização de caminho e validação/saneamento de nomes
  mime.js         MIME, verificação por conteúdo, regra de "inline" seguro
  audit.js        trilha de auditoria (uma linha JSON por evento)
  errors.js       FilesError e formato { error: { code, message } }
  drivers/
    index.js      interface StorageDriver (JSDoc) e fábrica
    fs.js         disco local (links simbólicos nunca são seguidos; escrita atômica)
    s3.js         S3 (não executado contra um bucket real)
test/             node:test sobre o driver fs em pasta temporária
```

## Testes

```sh
node --test "test/*.test.js"      # ou: npm test
```

Cobrem cada rota da tabela 4.1 no driver `fs`: autenticação, ACL por prefixo, travessia de caminho, conflitos, lixeira e retenção, versões, cabeçalhos de download, `Range`, tipo por conteúdo, limite de tamanho e auditoria sem conteúdo. O driver `s3` **não** tem testes automatizados.

## Notas de implementação

- O multipart usa o parser nativo (`Request.formData()` do undici) com contador de bytes: o arquivo fica em memória até o limite. Para arquivos grandes use o upload direto (S3) ou troque por um parser em fluxo.
- Download atende `Range` (206/416) para vídeo e áudio. Com `S3_REDIRECT_DOWNLOADS`, só downloads `attachment` redirecionam (302); `inline` sempre passa pelo servidor, porque o S3 não aplica o CSP nem o `nosniff`.
- Para trocar o driver por outro (Azure Blob, GCS), implemente a interface descrita em `src/drivers/index.js`.

## Licença

MIT.
