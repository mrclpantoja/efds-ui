<?php

namespace Efds\Files\Support;

/** Tipos de arquivo: MIME por extensão, verificação por conteúdo (assinaturas) e regra de "inline" seguro. */
final class Mime
{
    /** ext => [mime, assinatura esperada] (ver sniff()). */
    private const TYPES = [
        'pdf' => ['application/pdf', 'pdf'],
        'png' => ['image/png', 'png'],
        'jpg' => ['image/jpeg', 'jpeg'],
        'jpeg' => ['image/jpeg', 'jpeg'],
        'gif' => ['image/gif', 'gif'],
        'webp' => ['image/webp', 'webp'],
        'avif' => ['image/avif', 'mp4'],
        'bmp' => ['image/bmp', 'bmp'],
        'mp4' => ['video/mp4', 'mp4'],
        'mov' => ['video/quicktime', 'mp4'],
        'webm' => ['video/webm', 'webm'],
        'ogv' => ['video/ogg', 'ogg'],
        'mp3' => ['audio/mpeg', 'mp3'],
        'm4a' => ['audio/mp4', 'mp4'],
        'ogg' => ['audio/ogg', 'ogg'],
        'wav' => ['audio/wav', 'wav'],
        'flac' => ['audio/flac', 'flac'],
        'txt' => ['text/plain', 'text'],
        'md' => ['text/markdown', 'text'],
        'csv' => ['text/csv', 'text'],
        'json' => ['application/json', 'text'],
        'log' => ['text/plain', 'text'],
        'xml' => ['application/xml', 'text'],
        'doc' => ['application/msword', 'ole'],
        'xls' => ['application/vnd.ms-excel', 'ole'],
        'ppt' => ['application/vnd.ms-powerpoint', 'ole'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'zip'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'zip'],
        'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'zip'],
        'odt' => ['application/vnd.oasis.opendocument.text', 'zip'],
        'ods' => ['application/vnd.oasis.opendocument.spreadsheet', 'zip'],
        'zip' => ['application/zip', 'zip'],
        'svg' => ['image/svg+xml', 'text'],
        'html' => ['text/html', 'text'],
        'htm' => ['text/html', 'text'],
    ];

    /** Executáveis e scripts de servidor: nunca aceitos num gerenciador de documentos. */
    private const BLOCKED_EXT = [
        'exe', 'dll', 'bat', 'cmd', 'com', 'msi', 'scr', 'ps1', 'vbs', 'sh', 'bash', 'php', 'php3', 'php4',
        'php5', 'phtml', 'phar', 'jsp', 'jspx', 'asp', 'aspx', 'cgi', 'pl', 'htaccess', 'jar', 'apk',
    ];

    /** Tipos exibíveis no navegador. SVG e HTML ficam de fora de propósito (podem carregar script). */
    private const INLINE = [
        'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp',
        'video/mp4', 'video/webm', 'video/ogg', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/flac',
    ];

    private const INLINE_AS_TEXT = ['txt', 'md', 'csv', 'json', 'log', 'xml'];

    public static function mimeFor(string $name): string
    {
        return self::TYPES[Path::ext($name)][0] ?? 'application/octet-stream';
    }

    /** Content-Type para exibir inline, ou null se o tipo só pode ser baixado (attachment). */
    public static function inlineContentType(string $name): ?string
    {
        if (in_array(Path::ext($name), self::INLINE_AS_TEXT, true)) {
            return 'text/plain; charset=utf-8';
        }
        $mime = self::mimeFor($name);

        return in_array($mime, self::INLINE, true) ? $mime : null;
    }

    /** Descobre o tipo pelos primeiros bytes. */
    public static function sniff(string $head): ?string
    {
        $b = substr($head, 0, 4096);
        $pdf = strpos($b, '%PDF-');
        if ($pdf !== false && $pdf < 1024) {
            return 'pdf';
        }
        $at = fn (int $from, int $len) => substr($b, $from, $len);
        $byte = fn (int $i) => isset($b[$i]) ? ord($b[$i]) : -1;

        return match (true) {
            $byte(0) === 0x89 && $at(1, 3) === 'PNG' => 'png',
            $byte(0) === 0xFF && $byte(1) === 0xD8 && $byte(2) === 0xFF => 'jpeg',
            $at(0, 4) === 'GIF8' => 'gif',
            $at(0, 4) === 'RIFF' && $at(8, 4) === 'WEBP' => 'webp',
            $at(0, 4) === 'RIFF' && $at(8, 4) === 'WAVE' => 'wav',
            $at(0, 2) === 'BM' => 'bmp',
            $at(0, 4) === "PK\x03\x04" => 'zip',
            $at(0, 4) === "\xD0\xCF\x11\xE0" => 'ole',
            $at(4, 4) === 'ftyp' => 'mp4',
            $at(0, 4) === 'OggS' => 'ogg',
            $at(0, 4) === 'fLaC' => 'flac',
            $at(0, 4) === "\x1A\x45\xDF\xA3" => 'webm',
            $at(0, 3) === 'ID3' || ($byte(0) === 0xFF && ($byte(1) & 0xE0) === 0xE0) => 'mp3',
            $at(0, 2) === 'MZ' => 'exe',
            $at(0, 4) === "\x7FELF" => 'elf',
            default => null,
        };
    }

    /** Confere extensão x conteúdo (`$head` = primeiros bytes). Lança type_not_allowed se não bater. */
    public static function assertContentMatches(string $name, string $head): void
    {
        $ext = Path::ext($name);
        $found = self::sniff($head);
        if (in_array($ext, self::BLOCKED_EXT, true) || $found === 'exe' || $found === 'elf') {
            throw new FilesException('type_not_allowed', 'Este tipo de arquivo não é aceito.');
        }
        $expected = self::TYPES[$ext][1] ?? null;
        if ($expected === null || $head === '') {
            return; // extensão desconhecida: só baixa (attachment)
        }
        $ok = $expected === 'text' ? ($found === null && ! str_contains(substr($head, 0, 8192), "\0")) : $found === $expected;
        if (! $ok) {
            throw new FilesException('type_not_allowed', 'O conteúdo do arquivo não corresponde à extensão.');
        }
    }

    /** @param list<string> $accept MIME ("image/*") ou extensões (".pdf"). Vazia = tudo. */
    public static function isAccepted(string $name, array $accept): bool
    {
        if ($accept === []) {
            return true;
        }
        $ext = '.'.Path::ext($name);
        $mime = self::mimeFor($name);
        foreach ($accept as $rule) {
            $r = strtolower(trim($rule));
            if (str_starts_with($r, '.') ? $r === $ext : (str_ends_with($r, '/*') ? str_starts_with($mime, substr($r, 0, -1)) : $r === $mime)) {
                return true;
            }
        }

        return false;
    }

    /** @param list<string> $accept */
    public static function assertExtensionAllowed(string $name, array $accept): void
    {
        if (in_array(Path::ext($name), self::BLOCKED_EXT, true) || ! self::isAccepted($name, $accept)) {
            throw new FilesException('type_not_allowed', 'Este tipo de arquivo não é aceito.');
        }
    }
}
