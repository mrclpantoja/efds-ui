<?php

namespace Efds\Files\Services;

use Efds\Files\Support\FilesException;
use Efds\Files\Support\Path;
use Illuminate\Filesystem\FilesystemAdapter;
use League\Flysystem\FilesystemOperator;
use League\Flysystem\StorageAttributes;

/**
 * Armazenamento sobre o Flysystem do Laravel (disco `local` ou `s3`, escolhido em config('files.disk')).
 * Mesma ideia do "driver" do exemplo em Node: o FilesService só conhece esta classe.
 *
 * Caminhos lógicos ("/contratos/a.pdf"); no disco viram chaves sem a barra inicial.
 * Áreas internas: ".trash/" (feita pelo serviço) e ".versions/" (feita aqui, no disco local).
 * O S3 usa o versionamento do bucket (ListObjectVersions). Esta classe NÃO foi executada contra um bucket real.
 */
class Store
{
    private const VERSION_ID = '/^\d{13}-\d{1,12}-[0-9a-f]{4}$/';

    private ?bool $s3Versioning = null;

    public function __construct(
        private readonly FilesystemAdapter $disk,
        private readonly string $kind, // 'local' | 's3'
        private readonly int $maxVersions = 20,
        private readonly string $s3VersioningMode = 'auto',
        private readonly bool $s3PurgeVersions = false,
    ) {}

    public function isLocal(): bool
    {
        return $this->kind === 'local';
    }

    public function isS3(): bool
    {
        return $this->kind === 's3';
    }

    private function fs(): FilesystemOperator
    {
        return $this->disk->getDriver();
    }

    /** Caminho absoluto no disco (só disco local; usado para servir o arquivo com suporte a Range). */
    public function absolutePath(string $path, ?string $version = null): string
    {
        return $this->disk->path($version !== null && $version !== 'current' ? $this->versionFile($path, $version) : Path::key($path));
    }

    // ---------- consulta ----------

    /** @return array{type: string, size?: int, modified?: string}|null */
    public function stat(string $path): ?array
    {
        if ($path === '/') {
            return ['type' => 'folder'];
        }
        $key = Path::key($path);
        if ($this->fs()->fileExists($key)) {
            return [
                'type' => 'file',
                'size' => $this->fs()->fileSize($key),
                'modified' => gmdate('Y-m-d\TH:i:s\Z', $this->fs()->lastModified($key)),
            ];
        }
        if ($this->fs()->directoryExists($key)) {
            return ['type' => 'folder'];
        }

        return null;
    }

    /** @return list<array{name: string, type: string, size?: int, modified?: string}> filhos diretos, sem itens ocultos */
    public function list(string $path): array
    {
        $out = [];
        foreach ($this->fs()->listContents(Path::key($path), false) as $item) {
            $entry = $this->toEntry($item);
            if ($entry !== null && ! str_starts_with($entry['name'], '.')) {
                $out[] = $entry;
            }
        }

        return $out;
    }

    /** @return list<array{path: string, name: string, type: string, size?: int, modified?: string}> */
    public function walk(string $path, int $limit = 5000): array
    {
        $out = [];
        foreach ($this->fs()->listContents(Path::key($path), true) as $item) {
            $entry = $this->toEntry($item);
            if ($entry === null) {
                continue;
            }
            $logical = '/'.ltrim($item->path(), '/');
            if (collect(explode('/', $logical))->contains(fn (string $s) => str_starts_with($s, '.'))) {
                continue;
            }
            $out[] = ['path' => $logical] + $entry;
            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    private function toEntry(StorageAttributes $item): ?array
    {
        $name = Path::basename(rtrim($item->path(), '/'));
        if ($name === '') {
            return null;
        }
        if ($item->isDir()) {
            return ['name' => $name, 'type' => 'folder'];
        }
        $entry = ['name' => $name, 'type' => 'file', 'size' => (int) ($item->fileSize() ?? 0)];
        if ($item->lastModified() !== null) {
            $entry['modified'] = gmdate('Y-m-d\TH:i:s\Z', $item->lastModified());
        }

        return $entry;
    }

    public function readText(string $path): ?string
    {
        $key = Path::key($path);

        return $this->fs()->fileExists($key) ? $this->fs()->read($key) : null;
    }

    // ---------- escrita ----------

    public function mkdir(string $path): void
    {
        $this->fs()->createDirectory(Path::key($path));
    }

    /** @param resource $stream */
    public function putStream(string $path, $stream, bool $overwrite = false, ?string $contentType = null): void
    {
        $key = Path::key($path);
        if ($overwrite) {
            $this->snapshot($path);
        }
        $config = $contentType ? ['mimetype' => $contentType] : [];
        $this->fs()->writeStream($key, $stream, $config);
    }

    public function put(string $path, string $contents, bool $overwrite = false): void
    {
        if ($overwrite) {
            $this->snapshot($path);
        }
        $this->fs()->write(Path::key($path), $contents);
    }

    public function copy(string $from, string $to, bool $overwrite = false): void
    {
        $src = $this->stat($from);
        if ($src !== null && $src['type'] === 'folder') {
            $this->copyTree(Path::key($from), Path::key($to));

            return;
        }
        if ($overwrite) {
            $this->snapshot($to);
        }
        $this->fs()->copy(Path::key($from), Path::key($to));
    }

    public function move(string $from, string $to, bool $overwrite = false): void
    {
        $src = $this->stat($from);
        if ($src !== null && $src['type'] === 'folder') {
            $this->moveTree(Path::key($from), Path::key($to));
        } else {
            if ($overwrite) {
                $this->snapshot($to);
            }
            $this->fs()->move(Path::key($from), Path::key($to));
        }
        if ($this->isLocal()) {
            $this->moveTree($this->versionsKey($from), $this->versionsKey($to)); // o histórico acompanha o arquivo
        }
    }

    /** Remoção definitiva (inclui o histórico de versões). */
    public function remove(string $path): void
    {
        $st = $this->stat($path);
        if ($st === null) {
            return;
        }
        $key = Path::key($path);
        if ($st['type'] === 'folder') {
            $this->fs()->deleteDirectory($key);
        } else {
            $this->fs()->delete($key);
        }
        if ($this->isS3()) {
            if ($this->s3PurgeVersions) {
                $this->purgeS3Versions($st['type'] === 'folder' ? $key.'/' : $key);
            }
        } else {
            $this->fs()->deleteDirectory($this->versionsKey($path));
        }
    }

    /** Copia uma árvore (ou arquivo) sem lógica de versões. Não sobrescreve pastas existentes. */
    private function copyTree(string $fromKey, string $toKey): void
    {
        $this->fs()->createDirectory($toKey);
        foreach ($this->fs()->listContents($fromKey, true) as $item) {
            $rel = substr($item->path(), strlen($fromKey) + 1);
            if ($item->isDir()) {
                $this->fs()->createDirectory($toKey.'/'.$rel);
            } else {
                $this->fs()->copy($item->path(), $toKey.'/'.$rel);
            }
        }
    }

    private function moveTree(string $fromKey, string $toKey): void
    {
        if (! $this->fs()->directoryExists($fromKey) && ! $this->fs()->fileExists($fromKey)) {
            return;
        }
        if ($this->fs()->fileExists($fromKey)) {
            $this->fs()->move($fromKey, $toKey);

            return;
        }
        $this->copyTree($fromKey, $toKey);
        $this->fs()->deleteDirectory($fromKey);
    }

    // ---------- versões ----------

    public function supportsVersions(): bool
    {
        if ($this->isLocal()) {
            return true;
        }
        if ($this->s3VersioningMode === 'true') {
            return true;
        }
        if ($this->s3VersioningMode === 'false') {
            return false;
        }

        return $this->s3Versioning ??= $this->detectS3Versioning();
    }

    private function detectS3Versioning(): bool
    {
        try {
            $r = $this->s3Client()->getBucketVersioning(['Bucket' => $this->bucket()]);

            return ($r['Status'] ?? null) === 'Enabled';
        } catch (\Throwable) {
            return false;
        }
    }

    private function versionsKey(string $path): string
    {
        return '.versions'.($path === '/' ? '' : $path);
    }

    private function versionFile(string $path, string $version): string
    {
        if (! preg_match(self::VERSION_ID, $version)) {
            throw FilesException::notFound($path);
        }

        return $this->versionsKey($path).'/'.$version;
    }

    /** Guarda o conteúdo atual como versão antes de sobrescrever (só disco local; no S3 o bucket versiona). */
    private function snapshot(string $path): void
    {
        if (! $this->isLocal()) {
            return;
        }
        $key = Path::key($path);
        if (! $this->fs()->fileExists($key)) {
            return;
        }
        $id = sprintf('%013d-%d-%s', (int) (microtime(true) * 1000), $this->fs()->lastModified($key), bin2hex(random_bytes(2)));
        $dir = $this->versionsKey($path);
        $this->fs()->copy($key, $dir.'/'.$id);

        $ids = collect($this->fs()->listContents($dir, false))
            ->filter(fn (StorageAttributes $a) => $a->isFile())
            ->map(fn (StorageAttributes $a) => Path::basename($a->path()))
            ->filter(fn (string $n) => preg_match(self::VERSION_ID, $n) === 1)
            ->sort()
            ->values();
        foreach ($ids->slice(0, max(0, $ids->count() - $this->maxVersions)) as $old) {
            $this->fs()->delete($dir.'/'.$old);
        }
    }

    /** @return list<array{version: string, modified: string, size: int, current?: bool}> */
    public function versions(string $path): array
    {
        $cur = $this->stat($path);
        if ($cur === null || $cur['type'] !== 'file') {
            throw FilesException::notFound($path);
        }
        if ($this->isS3()) {
            return $this->s3Versions($path);
        }
        $list = [['version' => 'current', 'modified' => $cur['modified'], 'size' => $cur['size'], 'current' => true]];
        $dir = $this->versionsKey($path);
        if ($this->fs()->directoryExists($dir)) {
            $files = collect($this->fs()->listContents($dir, false))
                ->filter(fn (StorageAttributes $a) => $a->isFile() && preg_match(self::VERSION_ID, Path::basename($a->path())) === 1)
                ->sortByDesc(fn (StorageAttributes $a) => Path::basename($a->path()));
            foreach ($files as $a) {
                $id = Path::basename($a->path());
                $mtime = (int) explode('-', $id)[1]; // data do conteúdo antigo, gravada no id
                $list[] = ['version' => $id, 'modified' => gmdate('Y-m-d\TH:i:s\Z', $mtime), 'size' => (int) $a->fileSize()];
            }
        }

        return $list;
    }

    public function restoreVersion(string $path, string $version): void
    {
        if ($this->isS3()) {
            $key = $this->disk->path(Path::key($path));
            $source = $this->bucket().'/'.implode('/', array_map('rawurlencode', explode('/', $key))).'?versionId='.rawurlencode($version);
            $this->s3Client()->copyObject(['Bucket' => $this->bucket(), 'Key' => $key, 'CopySource' => $source]);

            return;
        }
        $file = $this->versionFile($path, $version);
        if (! $this->fs()->fileExists($file)) {
            throw FilesException::notFound($path);
        }
        $this->snapshot($path); // restaurar também guarda a versão que estava valendo
        $this->fs()->copy($file, Path::key($path));
    }

    // ---------- leitura de conteúdo (disco que não é local) ----------

    /** @return array{stream: resource, size: int} */
    public function openStream(string $path, ?string $version = null): array
    {
        if ($this->isS3() && $version !== null && $version !== 'current') {
            $r = $this->s3Client()->getObject(['Bucket' => $this->bucket(), 'Key' => $this->disk->path(Path::key($path)), 'VersionId' => $version]);

            return ['stream' => $r['Body']->detach(), 'size' => (int) $r['ContentLength']];
        }
        $key = $version !== null && $version !== 'current' ? $this->versionFile($path, $version) : Path::key($path);
        if (! $this->fs()->fileExists($key)) {
            throw FilesException::notFound($path);
        }

        return ['stream' => $this->fs()->readStream($key), 'size' => $this->fs()->fileSize($key)];
    }

    // ---------- URLs assinadas (S3) ----------

    public function supportsDirectUpload(): bool
    {
        return $this->isS3();
    }

    public function presignDownload(string $path, int $ttl, ?string $version, string $disposition, string $contentType): ?string
    {
        if (! $this->isS3()) {
            return null;
        }
        $options = [
            'ResponseContentDisposition' => $disposition,
            'ResponseContentType' => $contentType,
            'ResponseCacheControl' => 'no-store, private',
        ];
        if ($version !== null && $version !== 'current') {
            $options['VersionId'] = $version;
        }

        return $this->disk->temporaryUrl(Path::key($path), now()->addSeconds($ttl), $options);
    }

    /** @return array{url: string, method: string, headers: array<string, mixed>}|null */
    public function presignUpload(string $path, int $ttl, string $contentType): ?array
    {
        if (! $this->isS3()) {
            return null;
        }
        // Só o Content-Type é assinado. O tamanho NÃO é imposto por um PUT assinado (ver README).
        $signed = $this->disk->temporaryUploadUrl(Path::key($path), now()->addSeconds($ttl), ['ContentType' => $contentType]);
        $headers = array_filter($signed['headers'], fn ($_, $k) => strtolower((string) $k) !== 'host', ARRAY_FILTER_USE_BOTH);

        return ['url' => $signed['url'], 'method' => 'PUT', 'headers' => $headers + ['Content-Type' => $contentType]];
    }

    // ---------- S3 ----------

    private function s3Client(): object
    {
        return $this->disk->getClient();
    }

    private function bucket(): string
    {
        return (string) $this->disk->getConfig()['bucket'];
    }

    /** @return list<array{version: string, modified: string, size: int, current?: bool}> */
    private function s3Versions(string $path): array
    {
        $key = $this->disk->path(Path::key($path));
        $out = [];
        $params = ['Bucket' => $this->bucket(), 'Prefix' => $key];
        do {
            $r = $this->s3Client()->listObjectVersions($params);
            foreach ($r['Versions'] ?? [] as $v) {
                if ($v['Key'] !== $key) {
                    continue;
                }
                $out[] = [
                    'version' => $v['VersionId'],
                    'modified' => gmdate('Y-m-d\TH:i:s\Z', $v['LastModified']->getTimestamp()),
                    'size' => (int) $v['Size'],
                ] + ($v['IsLatest'] ? ['current' => true] : []);
            }
            $truncated = (bool) ($r['IsTruncated'] ?? false);
            $params['KeyMarker'] = $r['NextKeyMarker'] ?? null;
            $params['VersionIdMarker'] = $r['NextVersionIdMarker'] ?? null;
        } while ($truncated);
        usort($out, fn ($a, $b) => strcmp($b['modified'], $a['modified']));

        return $out;
    }

    /** Apaga também versões antigas e marcadores de exclusão (excluir tem de excluir). */
    private function purgeS3Versions(string $keyPrefix): void
    {
        $prefix = $this->disk->path($keyPrefix);
        $params = ['Bucket' => $this->bucket(), 'Prefix' => $prefix];
        do {
            $r = $this->s3Client()->listObjectVersions($params);
            $objects = [];
            foreach (array_merge($r['Versions'] ?? [], $r['DeleteMarkers'] ?? []) as $v) {
                $objects[] = ['Key' => $v['Key'], 'VersionId' => $v['VersionId']];
            }
            foreach (array_chunk($objects, 1000) as $chunk) {
                $this->s3Client()->deleteObjects(['Bucket' => $this->bucket(), 'Delete' => ['Objects' => $chunk, 'Quiet' => true]]);
            }
            $truncated = (bool) ($r['IsTruncated'] ?? false);
            $params['KeyMarker'] = $r['NextKeyMarker'] ?? null;
            $params['VersionIdMarker'] = $r['NextVersionIdMarker'] ?? null;
        } while ($truncated);
    }
}
