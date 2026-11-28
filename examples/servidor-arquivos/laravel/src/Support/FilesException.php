<?php

namespace Efds\Files\Support;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Erro da API no formato do contrato: status HTTP + { error: { code, message, path? } }.
 * O Laravel chama render() sozinho, entao nenhum middleware extra e necessario.
 */
final class FilesException extends RuntimeException
{
    private const STATUS = [
        'not_found' => 404,
        'forbidden' => 403,
        'conflict' => 409,
        'invalid_name' => 400,
        'too_large' => 413,
        'type_not_allowed' => 415,
        'quota_exceeded' => 507,
        'unsupported' => 501,
        'internal' => 500,
    ];

    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly ?string $path = null,
        public readonly ?int $status = null,
    ) {
        parent::__construct($message);
    }

    public function httpStatus(): int
    {
        return $this->status ?? self::STATUS[$this->errorCode] ?? 500;
    }

    public static function notFound(?string $path = null): self
    {
        return new self('not_found', 'Item não encontrado.', $path);
    }

    public static function forbidden(?string $path = null): self
    {
        return new self('forbidden', 'Você não tem permissão para esta operação.', $path);
    }

    public static function conflict(string $message, ?string $path = null): self
    {
        return new self('conflict', $message, $path);
    }

    /** O código `invalid_name` cobre também parâmetros inválidos (o contrato não tem um código genérico). */
    public static function invalid(string $message, ?string $path = null): self
    {
        return new self('invalid_name', $message, $path);
    }

    public function toArray(): array
    {
        $error = ['code' => $this->errorCode, 'message' => $this->getMessage()];
        if ($this->path !== null) {
            $error['path'] = $this->path;
        }

        return ['error' => $error];
    }

    public function render(): JsonResponse
    {
        return new JsonResponse($this->toArray(), $this->httpStatus());
    }
}
