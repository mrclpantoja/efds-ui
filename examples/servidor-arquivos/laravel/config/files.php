<?php

use Efds\Files\Policies\FolderAccessPolicy;

return [
    // Disco do config/filesystems.php que guarda os arquivos: 'local' ou 's3'.
    'disk' => env('FILES_DISK', 'local'),

    // Prefixo das rotas: e o valor de data-eds-files-api no cliente (ex.: /api/arquivos).
    'prefix' => env('FILES_ROUTE_PREFIX', 'api/arquivos'),

    // Middleware das rotas. SEMPRE exija autenticacao (troque 'auth' por 'auth:sanctum' etc.).
    'middleware' => ['api', 'auth'],

    'max_upload_bytes' => (int) env('FILES_MAX_UPLOAD_BYTES', 50 * 1024 * 1024),

    // MIME ("image/*", "application/pdf") ou extensoes (".pdf"). Vazio = qualquer tipo nao bloqueado.
    'accept' => array_values(array_filter(array_map('trim', explode(',', (string) env('FILES_ACCEPT', ''))))),

    // 0 desliga a lixeira (so exclusao definitiva).
    'trash_retention_days' => (int) env('FILES_TRASH_RETENTION_DAYS', 30),

    // Versoes guardadas por arquivo no disco local (no S3 vale o versionamento do bucket).
    'max_versions' => (int) env('FILES_MAX_VERSIONS', 20),

    // Validade das URLs assinadas, em segundos (o contrato manda <= 300).
    'signed_url_ttl' => min((int) env('FILES_SIGNED_URL_TTL', 300), 300),

    // S3: auto (consulta o bucket), true ou false.
    's3_versioning' => env('FILES_S3_VERSIONING', 'auto'),

    // S3: ao excluir de vez, apaga tambem as versoes antigas e marcadores (LGPD: excluir tem de excluir).
    's3_purge_versions' => (bool) env('FILES_S3_PURGE_VERSIONS', false),

    // S3: habilita POST /upload-url (o navegador envia direto ao bucket).
    'direct_upload' => (bool) env('FILES_DIRECT_UPLOAD', false),

    // S3: downloads "attachment" por redirecionamento 302 para URL assinada curta.
    'redirect_downloads' => (bool) env('FILES_REDIRECT_DOWNLOADS', false),

    // Canal de log da auditoria (null = canal padrao).
    'audit_channel' => env('FILES_AUDIT_CHANNEL') ?: null,

    // Locale da ordenacao por nome.
    'locale' => 'pt_BR',

    // Classe com os metodos list/read/write/delete/writeAnywhere (ver FolderAccessPolicy).
    'policy' => FolderAccessPolicy::class,

    // Regras de acesso por prefixo de pasta, usadas pela FolderAccessPolicy de exemplo.
    // Vazio = ninguem acessa nada. A regra de prefixo mais longo vence. "{user}" vira o id do usuario.
    //
    // 'acl' => [
    //     ['prefix' => '/contratos',        'abilities' => ['read', 'write', 'delete']],
    //     ['prefix' => '/publico',          'abilities' => ['read']],
    //     ['prefix' => '/usuarios/{user}',  'abilities' => ['read', 'write', 'delete']],
    // ],
    'acl' => [],
];
