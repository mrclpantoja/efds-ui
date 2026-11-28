<?php

namespace Efds\Files;

use Efds\Files\Console\PurgeTrash;
use Efds\Files\Services\FilesService;
use Efds\Files\Services\Store;
use Efds\Files\Support\Audit;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;

class FilesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/files.php', 'files');

        $this->app->bind(Audit::class, fn () => new Audit(config('files.audit_channel')));

        $this->app->bind(Store::class, function () {
            $diskName = (string) config('files.disk');
            $driver = config("filesystems.disks.$diskName.driver");
            if (! in_array($driver, ['local', 's3'], true)) {
                throw new \InvalidArgumentException("files.disk deve apontar para um disco 'local' ou 's3' (recebido: $driver).");
            }

            return new Store(
                Storage::disk($diskName),
                $driver,
                (int) config('files.max_versions'),
                (string) config('files.s3_versioning'),
                (bool) config('files.s3_purge_versions'),
            );
        });

        $this->app->bind(FilesService::class, fn ($app) => new FilesService(
            $app->make(Store::class),
            config('files'),
            $app->make(Audit::class),
        ));
    }

    public function boot(): void
    {
        $this->publishes([__DIR__.'/../config/files.php' => config_path('files.php')], 'files-config');

        // Autorização: cada habilidade chama a classe de config('files.policy') (Policy/Gate).
        $policy = (string) config('files.policy');
        foreach (['list', 'read', 'write', 'delete'] as $ability) {
            Gate::define("files.$ability", "$policy@$ability");
        }
        Gate::define('files.write-anywhere', "$policy@writeAnywhere");

        Route::prefix(config('files.prefix'))
            ->middleware(config('files.middleware'))
            ->name('files.')
            ->group(__DIR__.'/../routes/files.php');

        // Falha de autenticação nas rotas de arquivos também sai no formato do contrato.
        $handler = $this->app->make(ExceptionHandler::class);
        if (method_exists($handler, 'renderable')) {
            $handler->renderable(function (AuthenticationException $e, Request $request) {
                if ($request->is(trim((string) config('files.prefix'), '/').'/*')) {
                    return response()->json(
                        ['error' => ['code' => 'forbidden', 'message' => 'Autenticação necessária.']],
                        401,
                    );
                }

                return null;
            });
        }

        if ($this->app->runningInConsole()) {
            $this->commands([PurgeTrash::class]);
        }
    }
}
