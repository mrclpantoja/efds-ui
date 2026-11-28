# Servidor de arquivos em Laravel (referência)

Implementa o contrato HTTP de arquivos do efDS.ui (`docs/architecture/arquivos.md`, seção 4) para **Laravel 11 ou 12**, sobre o Flysystem do Laravel: `Storage::disk('local')` ou `Storage::disk('s3')`, a escolha é só configuração.

Leia primeiro o [README geral](../README.md) (mapa de rotas, checklist de segurança, limitações).

> **Estado**: o código passou em `php -l` e a lógica pura (caminhos, nomes, tipos) foi exercitada. A suíte PHPUnit e o disco S3 **ainda não foram executados**, porque nada foi instalado nesta entrega. Rode `composer test` no seu ambiente antes de adotar.

## Instalação

Este diretório é um pacote Laravel (com _service provider_ descoberto automaticamente). Duas formas de usar:

**A. Como pacote local** (recomendado para experimentar), na sua aplicação:

```jsonc
// composer.json da aplicação
"repositories": [{ "type": "path", "url": "../efds-ui/examples/servidor-arquivos/laravel" }],
"require": { "efds-ui/servidor-arquivos-laravel-exemplo": "*" }
```

```sh
composer update efds-ui/servidor-arquivos-laravel-exemplo
php artisan vendor:publish --tag=files-config      # opcional: copia config/files.php
```

**B. Copiando os arquivos**: copie `src/`, `routes/` e `config/files.php` para a aplicação, ajuste o _namespace_ e registre `FilesServiceProvider` em `bootstrap/providers.php`.

Para o disco S3 instale também `composer require league/flysystem-aws-s3-v3` (versão compatível com o seu Laravel) e configure o disco `s3` em `config/filesystems.php`. Para ordenar por nome em pt-BR e normalizar Unicode, habilite a extensão `intl` do PHP (opcional).

## Configuração

Variáveis (veja `.env.example`; valores fictícios) lidas por `config/files.php`:

| Chave / variável                                  | Padrão           | O que faz                                                               |
| ------------------------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `FILES_DISK`                                      | `local`          | Disco do `filesystems.php`: `local` ou `s3`.                            |
| `FILES_ROUTE_PREFIX`                              | `api/arquivos`   | Prefixo das rotas (o `data-eds-files-api` do cliente).                  |
| `files.middleware`                                | `['api','auth']` | Middleware das rotas. Use `auth:sanctum`/`auth:api` conforme o seu app. |
| `FILES_MAX_UPLOAD_BYTES`                          | `52428800`       | Limite do upload (confira `upload_max_filesize` e `post_max_size`).     |
| `FILES_ACCEPT`                                    | (vazio)          | MIME ou extensões aceitos, separados por vírgula.                       |
| `FILES_TRASH_RETENTION_DAYS`                      | `30`             | Retenção da lixeira. `0` desliga.                                       |
| `FILES_MAX_VERSIONS`                              | `20`             | Versões por arquivo no disco local.                                     |
| `FILES_SIGNED_URL_TTL`                            | `300`            | Validade das URLs assinadas (limitada a 300 s).                         |
| `FILES_S3_VERSIONING`                             | `auto`           | `auto` consulta o bucket; `true`/`false` força.                         |
| `FILES_S3_PURGE_VERSIONS`                         | `false`          | Exclusão definitiva apaga também versões antigas do bucket.             |
| `FILES_DIRECT_UPLOAD`, `FILES_REDIRECT_DOWNLOADS` | `false`          | URL assinada de upload; download `attachment` por 302.                  |
| `FILES_AUDIT_CHANNEL`                             | (padrão)         | Canal de log da auditoria.                                              |
| `files.policy`, `files.acl`                       |                  | Autorização (abaixo).                                                   |

Lixeira vencida: agende a limpeza (`routes/console.php` no Laravel 11+):

```php
Schedule::command('files:purge-trash')->daily();
```

### Autorização (Policy/Gate)

Cada chamada passa por quatro habilidades do Gate, definidas pelo provider e resolvidas pela classe de `config('files.policy')`:

| Habilidade             | Método da policy       | Usada em                                          |
| ---------------------- | ---------------------- | ------------------------------------------------- |
| `files.list`           | `list($user, $path)`   | listar/atravessar pastas                          |
| `files.read`           | `read($user, $path)`   | baixar, visualizar, versões, origem de cópia      |
| `files.write`          | `write($user, $path)`  | criar pasta, enviar, renomear, destino, restaurar |
| `files.delete`         | `delete($user, $path)` | excluir, origem de mover, esvaziar lixeira        |
| `files.write-anywhere` | `writeAnywhere($user)` | `capabilities.write`                              |

A `FolderAccessPolicy` de exemplo lê `config('files.acl')`:

```php
'acl' => [
    ['prefix' => '/contratos',       'abilities' => ['read', 'write', 'delete']],
    ['prefix' => '/publico',         'abilities' => ['read']],
    ['prefix' => '/usuarios/{user}', 'abilities' => ['read', 'write', 'delete']],
],
```

O prefixo mais longo vence e `{user}` vira o id do usuário. **Vazio = ninguém acessa nada.** Para papéis, departamentos ou ACL no banco, aponte `files.policy` para a sua classe com os mesmos métodos.

## Estrutura

```
config/files.php                         configuração
routes/files.php                         as rotas da tabela 4.1
src/FilesServiceProvider.php             config, Gates, rotas, 401 no formato do contrato
src/Http/Controllers/FilesController.php camada HTTP fina; download com os cabeçalhos da 4.4
src/Services/FilesService.php            regras: autorização, conflitos, lixeira, versões, limites, auditoria
src/Services/Store.php                   Flysystem (local/s3): lista, copia, move, versões, URLs assinadas
src/Policies/FolderAccessPolicy.php      autorização por prefixo de pasta (exemplo)
src/Support/{Path,Mime,Audit,FilesException}.php
src/Console/PurgeTrash.php               php artisan files:purge-trash
tests/                                   PHPUnit + Orchestra Testbench (Storage::fake)
```

## Testes

```sh
composer install      # no diretório laravel/
composer test         # phpunit
```

Os testes cobrem o contrato sobre `Storage::fake('local')`: ACL por prefixo, travessia, conflitos, lixeira e retenção, versões, cabeçalhos de download, tipo por conteúdo, limite de tamanho e auditoria sem conteúdo. O disco S3 **não** tem testes automatizados.

## Notas de implementação

- O disco local usa `BinaryFileResponse` (atende `Range` para vídeo/áudio). Em disco remoto o arquivo é transmitido pelo servidor, sem `Range`.
- No S3, versões vêm do versionamento do bucket (`getClient()->listObjectVersions`); restaurar copia a versão para a chave atual. No disco local ficam em `.versions/<caminho>/<id>` e acompanham renomeações e movimentos.
- Erros: `FilesException` se renderiza sozinha em `{ error: { code, message } }`. Falhas de autenticação nas rotas de arquivos também (renderizador registrado no provider). Erros inesperados seguem o tratamento padrão do Laravel; mantenha `APP_DEBUG=false` em produção.
- O Flysystem não tem escrita condicional: a recusa de sobrescrita confere a existência antes de gravar (janela de corrida pequena). Para garantir, use o exemplo Node ou trave por chave no banco/cache.

## Licença

MIT.
