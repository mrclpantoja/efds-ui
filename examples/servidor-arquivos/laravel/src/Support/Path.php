<?php

namespace Efds\Files\Support;

/**
 * Caminhos lógicos: sempre com "/" inicial, separador "/", normalizados e sem travessia.
 * Nomes iniciados por ponto são recusados, o que também protege as áreas internas .trash e .versions.
 */
final class Path
{
    public const MAX_NAME_BYTES = 255;
    public const MAX_PATH_LENGTH = 1024;
    public const MAX_DEPTH = 32;

    private const CONTROL = '/[\x00-\x1f\x7f-\x{9f}]/u';
    private const BIDI = '/[\x{202A}-\x{202E}\x{2066}-\x{2069}]/u';
    private const FORBIDDEN = '/[\/\\\\<>:"|?*]/';
    private const RESERVED_WINDOWS = '/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i';

    private static function nfc(string $s): string
    {
        return class_exists(\Normalizer::class) ? (\Normalizer::normalize($s, \Normalizer::FORM_C) ?: $s) : $s;
    }

    /** Valida um nome de arquivo ou pasta (um segmento). Devolve o nome em NFC. */
    public static function validateName(mixed $name): string
    {
        $invalid = FilesException::invalid('Nome inválido. Evite barras, caracteres de controle e nomes iniciados por ponto.');
        if (! is_string($name) || ! mb_check_encoding($name, 'UTF-8')) {
            throw $invalid;
        }
        $n = self::nfc($name);
        if (
            $n === '' || $n !== preg_replace('/^\s+|\s+$/u', '', $n)
            || $n === '.' || $n === '..'
            || str_starts_with($n, '.') || str_ends_with($n, '.')
            || strlen($n) > self::MAX_NAME_BYTES
            || preg_match(self::CONTROL, $n) || preg_match(self::BIDI, $n)
            || preg_match(self::FORBIDDEN, $n) || preg_match(self::RESERVED_WINDOWS, $n)
        ) {
            throw $invalid;
        }

        return $n;
    }

    /** O servidor sanea o nome enviado no upload (nunca confia no do cliente). */
    public static function sanitizeName(?string $raw): string
    {
        $n = (string) $raw;
        $n = mb_check_encoding($n, 'UTF-8') ? self::nfc($n) : mb_convert_encoding($n, 'UTF-8', 'UTF-8');
        $parts = preg_split('/[\/\\\\]/', $n) ?: [];
        $n = (string) end($parts);
        $n = preg_replace([self::CONTROL, self::BIDI, '/[<>:"|?*]/'], ['', '', '_'], $n) ?? '';
        $n = preg_replace(['/^[.\s]+/u', '/[.\s]+$/u'], '', $n) ?? '';
        if (preg_match(self::RESERVED_WINDOWS, $n)) {
            $n = '_'.$n;
        }
        while (strlen($n) > self::MAX_NAME_BYTES) {
            $n = mb_substr($n, 0, mb_strlen($n) - 1);
        }

        return $n === '' ? 'arquivo' : $n;
    }

    /** Normaliza o caminho recebido da API. Recusa "..", "\", controle e nomes reservados. */
    public static function normalize(mixed $input): string
    {
        if (! is_string($input) || $input === '' || $input[0] !== '/') {
            throw FilesException::invalid('Caminho inválido: deve começar com "/".');
        }
        if (
            strlen($input) > self::MAX_PATH_LENGTH || str_contains($input, '\\')
            || ! mb_check_encoding($input, 'UTF-8') || preg_match(self::CONTROL, $input)
        ) {
            throw FilesException::invalid('Caminho inválido.');
        }
        $segments = [];
        foreach (explode('/', self::nfc($input)) as $raw) {
            if ($raw === '' || $raw === '.') {
                continue;
            }
            $segments[] = self::validateName($raw); // ".." cai aqui (começa com ponto)
        }
        if (count($segments) > self::MAX_DEPTH) {
            throw FilesException::invalid('Caminho profundo demais.');
        }

        return '/'.implode('/', $segments);
    }

    public static function join(string $parent, string $name): string
    {
        return $parent === '/' ? "/$name" : "$parent/$name";
    }

    public static function basename(string $path): string
    {
        return substr($path, (int) strrpos($path, '/') + 1);
    }

    public static function parent(string $path): string
    {
        $i = strrpos($path, '/');

        return $i === false || $i === 0 ? '/' : substr($path, 0, $i);
    }

    /** `$path` é `$folder` ou está dentro dele. */
    public static function isInside(string $path, string $folder): bool
    {
        return $folder === '/' || $path === $folder || str_starts_with($path, $folder.'/');
    }

    /** "relatório.final.pdf" => ["relatório.final", ".pdf"] */
    public static function splitExt(string $name): array
    {
        $dot = strrpos($name, '.');

        return $dot !== false && $dot > 0 ? [substr($name, 0, $dot), substr($name, $dot)] : [$name, ''];
    }

    public static function ext(string $name): string
    {
        return strtolower(ltrim(self::splitExt($name)[1], '.'));
    }

    /** "/a/b" => "a/b" (chave no disco). */
    public static function key(string $path): string
    {
        return ltrim($path, '/');
    }
}
