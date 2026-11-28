<?php

namespace Efds\Files\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Log;

/** Trilha de auditoria: quem, o quê, quando. Nunca grava o conteúdo dos arquivos. */
class Audit
{
    public function __construct(private readonly ?string $channel = null) {}

    /** @param list<string> $paths */
    public function record(?Authenticatable $user, string $action, array $paths = [], string $outcome = 'ok', ?string $code = null): void
    {
        $context = [
            'user' => $user?->getAuthIdentifier(),
            'action' => $action,
            'paths' => $paths,
            'outcome' => $outcome,
        ] + ($code !== null ? ['code' => $code] : []);

        ($this->channel ? Log::channel($this->channel) : Log::getFacadeRoot())->info('files.audit', $context);
    }
}
