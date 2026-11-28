<?php

namespace Efds\Files\Services;

use Efds\Files\Support\Audit;
use Efds\Files\Support\FilesException;
use Efds\Files\Support\Mime;
use Efds\Files\Support\Path;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

/**
 * Regras do contrato (seção 4 de docs/architecture/arquivos.md) sobre o Store:
 * autorização por pasta/operação (Gate), conflitos, lixeira, versões, limites e auditoria.
 */
class FilesService
{
    private const TRASH = '/.trash';

    private const CONFLICTS = ['fail', 'replace', 'rename'];

    private const DEFAULT_LIMIT = 200;

    private const MAX_LIMIT = 500;

    /** @param array<string, mixed> $config config('files') */
    public function __construct(
        private readonly Store $store,
        private readonly array $config,
        private readonly Audit $audit,
    ) {}

    public function store(): Store
    {
        return $this->store;
    }

    private function trashOn(): bool
    {
        return (int) $this->config['trash_retention_days'] > 0;
    }

    // ---------- utilitários ----------

    private function can(Authenticatable $user, string $ability, string $path): bool
    {
        return Gate::forUser($user)->allows("files.$ability", [$path]);
    }

    private function need(Authenticatable $user, string $ability, string $path): void
    {
        if (! $this->can($user, $ability, $path)) {
            throw FilesException::forbidden($path);
        }
    }

    private function conflictMode(mixed $raw): string
    {
        $mode = $raw ?? 'fail';
        if (! is_string($mode) || ! in_array($mode, self::CONFLICTS, true)) {
            throw FilesException::invalid('Valor inválido para "conflict".');
        }

        return $mode;
    }

    /** @return list<string> caminhos únicos, sem itens que já estão dentro de outra pasta da lista */
    private function paths(mixed $raw): array
    {
        if (! is_array($raw) || $raw === [] || count($raw) > 500) {
            throw FilesException::invalid('Informe de 1 a 500 caminhos.');
        }
        $unique = array_values(array_unique(array_map(fn ($p) => Path::normalize($p), $raw)));

        return array_values(array_filter($unique, fn (string $p) => ! array_filter($unique, fn (string $q) => $q !== $p && Path::isInside($p, $q))));
    }

    private function entry(Authenticatable $user, string $path, array $st, array $extra = []): array
    {
        $name = Path::basename($path);
        $e = [
            'path' => $path,
            'name' => $name,
            'type' => $st['type'],
            'permissions' => ['write' => $this->can($user, 'write', $path), 'delete' => $this->can($user, 'delete', $path)],
        ] + $extra;
        if (isset($st['modified'])) {
            $e['modified'] = $st['modified'];
        }
        if ($st['type'] === 'file') {
            $e['size'] = $st['size'] ?? 0;
            $e['mime'] = Mime::mimeFor($name);
        }

        return $e;
    }

    private function mustStat(string $path): array
    {
        return $this->store->stat($path) ?? throw FilesException::notFound($path);
    }

    private function mustBeFolder(string $path): void
    {
        if ($this->mustStat($path)['type'] !== 'folder') {
            throw FilesException::conflict('O destino não é uma pasta.', $path);
        }
    }

    /**
     * Decide o destino de um item segundo `conflict`. `$taken` guarda destinos já planejados no lote.
     *
     * @param  array<string, true>  $taken
     * @return array{path: string, overwrite: bool}
     */
    private function resolveDestination(string $folder, string $name, string $type, string $mode, array &$taken): array
    {
        $dest = Path::join($folder, $name);
        $existing = isset($taken[$dest]) ? ['type' => $type] : $this->store->stat($dest);
        if ($existing === null) {
            $taken[$dest] = true;

            return ['path' => $dest, 'overwrite' => false];
        }
        if ($mode === 'fail') {
            throw FilesException::conflict('Já existe um item com esse nome.', $dest);
        }
        if ($mode === 'replace') {
            if ($existing['type'] !== 'file' || $type !== 'file' || isset($taken[$dest])) {
                throw FilesException::conflict('Só é possível substituir arquivo por arquivo.', $dest);
            }
            $taken[$dest] = true;

            return ['path' => $dest, 'overwrite' => true];
        }
        [$stem, $ext] = $type === 'file' ? Path::splitExt($name) : [$name, ''];
        for ($i = 1; $i <= 1000; $i++) {
            $candidate = Path::join($folder, "$stem ($i)$ext");
            if (! isset($taken[$candidate]) && $this->store->stat($candidate) === null) {
                $taken[$candidate] = true;

                return ['path' => $candidate, 'overwrite' => false];
            }
        }
        throw FilesException::conflict('Não foi possível gerar um nome livre.', $dest);
    }

    private function ensureFolders(string $path): void
    {
        $cur = '/';
        foreach (array_filter(explode('/', $path)) as $part) {
            $cur = Path::join($cur, $part);
            if ($this->store->stat($cur) === null) {
                $this->store->mkdir($cur);
            }
        }
    }

    /** Executa uma operação auditando sucesso e falha. */
    private function run(Authenticatable $user, string $action, array $paths, callable $fn): mixed
    {
        try {
            $result = $fn();
            $this->audit->record($user, $action, $paths);

            return $result;
        } catch (\Throwable $e) {
            $this->audit->record($user, $action, $paths, 'error', $e instanceof FilesException ? $e->errorCode : 'internal');
            throw $e;
        }
    }

    private static function fold(string $s): string
    {
        if (class_exists(\Normalizer::class)) {
            $s = preg_replace('/\p{M}/u', '', \Normalizer::normalize($s, \Normalizer::FORM_D) ?: $s) ?? $s;
        }

        return mb_strtolower($s);
    }

    private static function encodeCursor(int $offset): string
    {
        return rtrim(strtr(base64_encode((string) $offset), '+/', '-_'), '=');
    }

    private static function decodeCursor(mixed $cursor): int
    {
        if ($cursor === null || $cursor === '') {
            return 0;
        }
        $n = is_string($cursor) ? base64_decode(strtr($cursor, '-_', '+/'), true) : false;
        if ($n === false || ! ctype_digit($n)) {
            throw FilesException::invalid('Cursor inválido.');
        }

        return (int) $n;
    }

    private static function limit(mixed $raw): int
    {
        return min(max((int) $raw ?: self::DEFAULT_LIMIT, 1), self::MAX_LIMIT);
    }

    private function str(array $q, string $key, ?string $default = null): ?string
    {
        $v = $q[$key] ?? $default;
        if ($v !== null && ! is_string($v)) {
            throw FilesException::invalid("Parâmetro \"$key\" inválido.");
        }

        return $v;
    }

    // ---------- leitura ----------

    public function capabilities(Authenticatable $user): array
    {
        $caps = [
            'write' => Gate::forUser($user)->allows('files.write-anywhere'),
            'trash' => $this->trashOn(),
            'versions' => $this->store->supportsVersions(),
            'search' => 'recursive',
            'directUpload' => (bool) $this->config['direct_upload'] && $this->store->supportsDirectUpload(),
            'maxUploadBytes' => (int) $this->config['max_upload_bytes'],
        ];
        if ($this->config['accept'] !== []) {
            $caps['accept'] = array_values($this->config['accept']);
        }

        return $caps;
    }

    public function list(Authenticatable $user, array $q): array
    {
        $path = Path::normalize($this->str($q, 'path', '/'));
        $this->need($user, 'list', $path);
        if ($this->mustStat($path)['type'] !== 'folder') {
            throw FilesException::conflict('O caminho não é uma pasta.', $path);
        }
        $term = self::fold(trim((string) $this->str($q, 'q', '')));
        $recursive = in_array($q['recursive'] ?? null, ['1', 'true', true, 1], true);

        if ($recursive && $term !== '') {
            $found = array_filter($this->store->walk($path), fn ($e) => str_contains(self::fold($e['name']), $term));
        } else {
            $found = array_map(fn ($e) => ['path' => Path::join($path, $e['name'])] + $e, $this->store->list($path));
            if ($term !== '') {
                $found = array_filter($found, fn ($e) => str_contains(self::fold($e['name']), $term));
            }
        }
        // Só mostra o que o usuário pode ler ou atravessar.
        $found = array_values(array_filter($found, fn ($e) => $this->can($user, $e['type'] === 'folder' ? 'list' : 'read', $e['path'])));

        $sort = $this->str($q, 'sort', 'name');
        $desc = str_starts_with($sort, '-');
        $field = ltrim($sort, '-');
        if (! in_array($field, ['name', 'modified', 'size', 'type'], true)) {
            throw FilesException::invalid('Ordenação inválida.');
        }
        $collator = class_exists(\Collator::class) ? new \Collator($this->config['locale'] ?? 'pt_BR') : null;
        $cmp = fn (string $a, string $b) => $collator ? $collator->compare($a, $b) : strnatcasecmp($a, $b);
        usort($found, function ($a, $b) use ($field, $desc, $cmp) {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'folder' ? -1 : 1; // pastas primeiro
            }
            $r = match ($field) {
                'modified' => strcmp($a['modified'] ?? '', $b['modified'] ?? ''),
                'size' => ($a['size'] ?? 0) <=> ($b['size'] ?? 0),
                'type' => strcmp(Mime::mimeFor($a['name']), Mime::mimeFor($b['name'])),
                default => $cmp($a['name'], $b['name']),
            };

            return ($desc ? -$r : $r) ?: $cmp($a['name'], $b['name']);
        });

        $limit = self::limit($q['limit'] ?? null);
        $offset = self::decodeCursor($q['cursor'] ?? null);
        $page = array_slice($found, $offset, $limit);
        $result = ['path' => $path, 'items' => array_map(fn ($e) => $this->entry($user, $e['path'], $e), $page)];
        if ($offset + $limit < count($found)) {
            $result['nextCursor'] = self::encodeCursor($offset + $limit);
        }

        return $result;
    }

    public function tree(Authenticatable $user, array $q): array
    {
        $path = Path::normalize($this->str($q, 'path', '/'));
        $this->need($user, 'list', $path);
        $this->mustBeFolder($path);
        $folders = [];
        foreach ($this->store->list($path) as $e) {
            if ($e['type'] === 'folder' && $this->can($user, 'list', Path::join($path, $e['name']))) {
                $folders[] = $e;
            }
        }
        usort($folders, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

        return ['path' => $path, 'folders' => array_map(fn ($e) => $this->entry($user, Path::join($path, $e['name']), $e), $folders)];
    }

    // ---------- criação e envio ----------

    public function createFolder(Authenticatable $user, array $body): array
    {
        $parent = Path::normalize($body['path'] ?? '/');
        $name = Path::validateName($body['name'] ?? null);
        $this->need($user, 'write', $parent);
        $path = Path::join($parent, $name);

        return $this->run($user, 'folder.create', [$path], function () use ($user, $parent, $path) {
            $this->mustBeFolder($parent);
            if ($this->store->stat($path) !== null) {
                throw FilesException::conflict('Já existe um item com esse nome.', $path);
            }
            $this->store->mkdir($path);

            return $this->entry($user, $path, $this->mustStat($path));
        });
    }

    private function checkSize(int $size): void
    {
        $max = (int) $this->config['max_upload_bytes'];
        if ($size > $max) {
            throw new FilesException('too_large', 'O arquivo excede o limite de '.intdiv($max, 1048576).' MB.');
        }
    }

    public function upload(Authenticatable $user, mixed $rawPath, mixed $rawConflict, UploadedFile $file): array
    {
        $folder = Path::normalize($rawPath ?? '/');
        $mode = $this->conflictMode($rawConflict);
        $this->need($user, 'write', $folder);
        $name = Path::sanitizeName($file->getClientOriginalName()); // o servidor sanea, nunca confia no nome do cliente

        return $this->run($user, 'file.upload', [Path::join($folder, $name)], function () use ($user, $folder, $mode, $name, $file) {
            if (! $file->isValid()) {
                $iniSize = in_array($file->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
                throw $iniSize ? new FilesException('too_large', 'O arquivo excede o limite do servidor.') : FilesException::invalid('Falha no envio do arquivo.');
            }
            $this->checkSize((int) $file->getSize());
            Mime::assertExtensionAllowed($name, $this->config['accept']);
            $real = $file->getRealPath();
            Mime::assertContentMatches($name, (string) file_get_contents($real, false, null, 0, 8192)); // por conteúdo
            $this->mustBeFolder($folder);

            $taken = [];
            $dest = $this->resolveDestination($folder, $name, 'file', $mode, $taken);
            $stream = fopen($real, 'rb');
            try {
                $this->store->putStream($dest['path'], $stream, $dest['overwrite'], Mime::mimeFor(Path::basename($dest['path'])));
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            return $this->entry($user, $dest['path'], $this->mustStat($dest['path']));
        });
    }

    public function uploadUrl(Authenticatable $user, array $body): array
    {
        if (! $this->config['direct_upload'] || ! $this->store->supportsDirectUpload()) {
            throw new FilesException('unsupported', 'Upload direto não está habilitado.');
        }
        $folder = Path::normalize($body['path'] ?? '/');
        $name = Path::validateName($body['name'] ?? null);
        $size = $body['size'] ?? null;
        if (! is_int($size) && ! (is_float($size) && is_finite($size)) || $size < 0) {
            throw FilesException::invalid('Tamanho inválido.');
        }
        $this->need($user, 'write', $folder);
        $dest = Path::join($folder, $name);

        return $this->run($user, 'file.upload-url', [$dest], function () use ($user, $folder, $name, $size, $dest) {
            $this->checkSize((int) $size);
            Mime::assertExtensionAllowed($name, $this->config['accept']);
            $this->mustBeFolder($folder);
            if ($this->store->stat($dest) !== null) {
                throw FilesException::conflict('Já existe um item com esse nome.', $dest);
            }
            $signed = $this->store->presignUpload($dest, (int) $this->config['signed_url_ttl'], Mime::mimeFor($name)); // nunca o tipo declarado

            return $signed + ['entry' => $this->entry($user, $dest, ['type' => 'file', 'size' => (int) $size, 'modified' => gmdate('Y-m-d\TH:i:s\Z')])];
        });
    }

    // ---------- download ----------

    /**
     * Prepara um download; o controller aplica os cabeçalhos da seção 4.4.
     *
     * @return array{name: string, path: string, version: ?string, contentType: string, inline: bool, redirectUrl?: string}
     */
    public function download(Authenticatable $user, array $q): array
    {
        $path = Path::normalize($q['path'] ?? null);
        $this->need($user, 'read', $path);
        $version = $this->str($q, 'version');
        if ($version !== null && ! $this->store->supportsVersions()) {
            throw new FilesException('unsupported', 'Versões não estão habilitadas.');
        }
        $st = $this->mustStat($path);
        if ($st['type'] !== 'file') {
            throw FilesException::conflict('O caminho não é um arquivo.', $path);
        }
        $name = Path::basename($path);
        $wantsInline = in_array($q['inline'] ?? null, ['1', 'true'], true);
        $inlineType = $wantsInline ? Mime::inlineContentType($name) : null; // só tipos seguros
        $inline = $inlineType !== null;
        $contentType = $inlineType ?? Mime::mimeFor($name);
        $this->audit->record($user, $inline ? 'file.view' : 'file.download', [$path]);

        $out = ['name' => $name, 'path' => $path, 'version' => $version, 'contentType' => $contentType, 'inline' => $inline];
        if (! $inline && $this->config['redirect_downloads']) {
            // Só "attachment" vai por redirecionamento: o S3 não aplica nosso CSP nem nosso nosniff.
            $url = $this->store->presignDownload($path, (int) $this->config['signed_url_ttl'], $version, self::contentDisposition('attachment', $name), $contentType);
            if ($url !== null) {
                $out['redirectUrl'] = $url;
            }
        }

        return $out;
    }

    /** Content-Disposition saneado (fallback ASCII + filename* em UTF-8). */
    public static function contentDisposition(string $type, string $name): string
    {
        $fallback = preg_replace('/[^\x20-\x7e]|["\\\\%]/u', '_', $name) ?? 'arquivo';
        $star = preg_replace_callback("/['()*]/", fn ($m) => '%'.strtoupper(dechex(ord($m[0]))), rawurlencode($name));

        return sprintf('%s; filename="%s"; filename*=UTF-8\'\'%s', $type, $fallback, $star);
    }

    // ---------- renomear, mover, copiar ----------

    public function rename(Authenticatable $user, array $body): array
    {
        $path = Path::normalize($body['path'] ?? null);
        if ($path === '/') {
            throw FilesException::invalid('A raiz não pode ser renomeada.');
        }
        $name = Path::validateName($body['name'] ?? null);
        $mode = $this->conflictMode($body['conflict'] ?? null);
        $this->need($user, 'write', $path);
        $this->need($user, 'write', Path::parent($path));

        return $this->run($user, 'rename', [$path], function () use ($user, $path, $name, $mode) {
            $st = $this->mustStat($path);
            if ($name === Path::basename($path)) {
                return $this->entry($user, $path, $st);
            }
            $taken = [];
            $dest = $this->resolveDestination(Path::parent($path), $name, $st['type'], $mode, $taken);
            $this->store->move($path, $dest['path'], $dest['overwrite']);

            return $this->entry($user, $dest['path'], $this->mustStat($dest['path']));
        });
    }

    public function transfer(Authenticatable $user, array $body, string $op): array
    {
        $sources = $this->paths($body['paths'] ?? null);
        $target = Path::normalize($body['target'] ?? null);
        $mode = $this->conflictMode($body['conflict'] ?? null);
        $this->need($user, 'write', $target);
        foreach ($sources as $p) {
            $this->need($user, $op === 'move' ? 'delete' : 'read', $p);
        }

        return $this->run($user, $op, $sources, function () use ($user, $sources, $target, $mode, $op) {
            $this->mustBeFolder($target);
            $stats = [];
            foreach ($sources as $p) {
                $stats[$p] = $this->mustStat($p);
                if ($stats[$p]['type'] === 'folder' && Path::isInside($target, $p)) {
                    throw FilesException::conflict('Não é possível colocar uma pasta dentro dela mesma.', $p);
                }
            }
            // 1ª passada: planeja tudo (um conflito "fail" recusa o lote inteiro antes de mexer em qualquer coisa).
            $taken = [];
            $plan = [];
            $skipped = [];
            foreach ($sources as $p) {
                if ($op === 'move' && Path::parent($p) === $target) {
                    $skipped[] = $p; // já está na pasta de destino

                    continue;
                }
                $plan[] = ['from' => $p] + $this->resolveDestination($target, Path::basename($p), $stats[$p]['type'], $mode, $taken);
            }
            // 2ª passada: executa.
            $items = [];
            foreach ($plan as $step) {
                $op === 'move'
                    ? $this->store->move($step['from'], $step['path'], $step['overwrite'])
                    : $this->store->copy($step['from'], $step['path'], $step['overwrite']);
                $items[] = $this->entry($user, $step['path'], $this->mustStat($step['path']));
            }

            return ['items' => $items, 'skipped' => $skipped];
        });
    }

    // ---------- exclusão e lixeira ----------

    public function remove(Authenticatable $user, array $body): array
    {
        $paths = $this->paths($body['paths'] ?? null);
        $permanent = ($body['permanent'] ?? false) === true;
        foreach ($paths as $p) {
            if ($p === '/') {
                throw FilesException::invalid('A raiz não pode ser excluída.');
            }
            $this->need($user, 'delete', $p);
        }
        if (! $permanent && ! $this->trashOn()) {
            throw new FilesException('unsupported', 'A lixeira está desligada: use exclusão definitiva (permanent).');
        }

        return $this->run($user, $permanent ? 'delete.permanent' : 'delete.trash', $paths, function () use ($user, $paths, $permanent) {
            $stats = [];
            foreach ($paths as $p) {
                $stats[$p] = $this->mustStat($p);
            }
            foreach ($paths as $p) {
                if ($permanent) {
                    $this->store->remove($p);

                    continue;
                }
                $id = (string) Str::uuid();
                $name = Path::basename($p);
                $this->store->mkdir(self::TRASH."/$id");
                $this->store->move($p, self::TRASH."/$id/$name");
                $meta = [
                    'trashId' => $id,
                    'originalPath' => $p,
                    'name' => $name,
                    'type' => $stats[$p]['type'],
                    'size' => $stats[$p]['size'] ?? null,
                    'modified' => $stats[$p]['modified'] ?? null,
                    'deletedAt' => gmdate('Y-m-d\TH:i:s\Z'),
                    'deletedBy' => $user->getAuthIdentifier(),
                ];
                $this->store->put(self::TRASH."/$id.json", json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }

            return ['deleted' => $paths];
        });
    }

    /** @return list<array<string, mixed>> */
    private function readTrashMeta(): array
    {
        if ($this->store->stat(self::TRASH) === null) {
            return [];
        }
        $out = [];
        foreach ($this->store->list(self::TRASH) as $f) {
            if ($f['type'] !== 'file' || ! str_ends_with($f['name'], '.json')) {
                continue;
            }
            $meta = json_decode((string) $this->store->readText(self::TRASH.'/'.$f['name']), true);
            if (is_array($meta) && isset($meta['trashId'], $meta['originalPath'], $meta['deletedAt'])) {
                $out[] = $meta; // metadado corrompido é ignorado (não derruba a listagem)
            }
        }

        return $out;
    }

    private function purgeItem(array $meta): void
    {
        $this->store->remove(self::TRASH.'/'.$meta['trashId']);
        $this->store->remove(self::TRASH.'/'.$meta['trashId'].'.json');
    }

    /** Apaga da lixeira o que passou do prazo de retenção (agendado por `files:purge-trash`). */
    public function purgeExpired(?int $now = null): int
    {
        if (! $this->trashOn()) {
            return 0;
        }
        $now ??= time();
        $limit = (int) $this->config['trash_retention_days'] * 86400;
        $count = 0;
        foreach ($this->readTrashMeta() as $meta) {
            if ($now - strtotime($meta['deletedAt']) > $limit) {
                $this->purgeItem($meta);
                $count++;
            }
        }

        return $count;
    }

    private function trashEntry(Authenticatable $user, array $m): array
    {
        $st = ['type' => $m['type'], 'size' => $m['size'] ?? null, 'modified' => $m['modified'] ?? null];
        $st = array_filter($st, fn ($v) => $v !== null);

        return $this->entry($user, $m['originalPath'], $st, [
            'trashId' => $m['trashId'],
            'originalPath' => $m['originalPath'],
            'deletedAt' => $m['deletedAt'],
        ]);
    }

    private function requireTrash(): void
    {
        if (! $this->trashOn()) {
            throw new FilesException('unsupported', 'A lixeira está desligada.');
        }
    }

    public function trashList(Authenticatable $user, array $q): array
    {
        $this->requireTrash();
        $this->purgeExpired();
        $metas = array_values(array_filter($this->readTrashMeta(), fn ($m) => $this->can($user, 'read', $m['originalPath'])));
        usort($metas, fn ($a, $b) => strcmp($b['deletedAt'], $a['deletedAt']));
        $limit = self::limit($q['limit'] ?? null);
        $offset = self::decodeCursor($q['cursor'] ?? null);
        $result = ['items' => array_map(fn ($m) => $this->trashEntry($user, $m), array_slice($metas, $offset, $limit))];
        if ($offset + $limit < count($metas)) {
            $result['nextCursor'] = self::encodeCursor($offset + $limit);
        }

        return $result;
    }

    /** @return list<array<string, mixed>> */
    private function loadTrash(mixed $ids): array
    {
        if (! is_array($ids) || $ids === [] || count($ids) > 500) {
            throw FilesException::invalid('Identificadores da lixeira inválidos.');
        }
        $metas = [];
        foreach (array_unique($ids) as $id) {
            if (! is_string($id) || ! Str::isUuid($id)) {
                throw FilesException::invalid('Identificadores da lixeira inválidos.');
            }
            $text = $this->store->readText(self::TRASH."/$id.json");
            if ($text === null) {
                throw FilesException::notFound();
            }
            $metas[] = json_decode($text, true);
        }

        return $metas;
    }

    public function trashRestore(Authenticatable $user, array $body): array
    {
        $this->requireTrash();
        $mode = $this->conflictMode($body['conflict'] ?? null);
        $metas = $this->loadTrash($body['ids'] ?? null);
        foreach ($metas as $m) {
            $this->need($user, 'write', Path::parent($m['originalPath']));
        }

        return $this->run($user, 'trash.restore', array_column($metas, 'originalPath'), function () use ($user, $metas, $mode) {
            $items = [];
            $taken = [];
            foreach ($metas as $m) {
                $folder = Path::parent($m['originalPath']);
                $this->ensureFolders($folder);
                $dest = $this->resolveDestination($folder, $m['name'], $m['type'], $mode, $taken);
                $this->store->move(self::TRASH.'/'.$m['trashId'].'/'.$m['name'], $dest['path'], $dest['overwrite']);
                $this->purgeItem($m); // pasta vazia da lixeira e metadado
                $items[] = $this->entry($user, $dest['path'], $this->mustStat($dest['path']));
            }

            return ['items' => $items];
        });
    }

    public function trashDelete(Authenticatable $user, array $body, bool $all = false): array
    {
        $this->requireTrash();
        $metas = $all ? $this->readTrashMeta() : $this->loadTrash($body['ids'] ?? null);
        $allowed = array_values(array_filter($metas, fn ($m) => $this->can($user, 'delete', $m['originalPath'])));
        if (! $all && count($allowed) !== count($metas)) {
            throw FilesException::forbidden();
        }

        return $this->run($user, $all ? 'trash.empty' : 'trash.delete', array_column($allowed, 'originalPath'), function () use ($allowed) {
            foreach ($allowed as $m) {
                $this->purgeItem($m);
            }

            return ['deleted' => array_column($allowed, 'trashId')];
        });
    }

    // ---------- versões ----------

    private function requireVersions(): void
    {
        if (! $this->store->supportsVersions()) {
            throw new FilesException('unsupported', 'Versões não estão habilitadas.');
        }
    }

    public function versions(Authenticatable $user, array $q): array
    {
        $path = Path::normalize($q['path'] ?? null);
        $this->need($user, 'read', $path);
        $this->requireVersions();

        return ['versions' => $this->store->versions($path)];
    }

    public function restoreVersion(Authenticatable $user, array $body): array
    {
        $path = Path::normalize($body['path'] ?? null);
        $this->need($user, 'write', $path);
        $this->requireVersions();
        $version = $body['version'] ?? null;
        if (! is_string($version) || $version === '') {
            throw FilesException::invalid('Versão inválida.');
        }

        return $this->run($user, 'version.restore', [$path], function () use ($user, $path, $version) {
            $this->store->restoreVersion($path, $version);

            return $this->entry($user, $path, $this->mustStat($path));
        });
    }
}
