<?php

namespace Efds\Files\Console;

use Efds\Files\Services\FilesService;
use Illuminate\Console\Command;

/** Apaga da lixeira o que passou do prazo de retenção. Agende: Schedule::command('files:purge-trash')->daily(); */
class PurgeTrash extends Command
{
    protected $signature = 'files:purge-trash';

    protected $description = 'Remove da lixeira de arquivos os itens com retenção vencida';

    public function handle(FilesService $files): int
    {
        $this->info('Itens removidos da lixeira: '.$files->purgeExpired());

        return self::SUCCESS;
    }
}
