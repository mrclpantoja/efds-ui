<?php

namespace Efds\Files\Tests;

use Efds\Files\FilesServiceProvider;
use Efds\Files\Support\Audit;
use Illuminate\Auth\GenericUser;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Orchestra\Testbench\TestCase as Orchestra;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

abstract class TestCase extends Orchestra
{
    protected const BASE = '/api/arquivos';

    /** Auditoria em memória (substitui o log). */
    protected object $audit;

    protected function getPackageProviders($app): array
    {
        return [FilesServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('files.disk', 'local');
        $app['config']->set('files.middleware', ['auth']); // 'api' exigiria o limitador de taxa da aplicação
        $app['config']->set('files.max_upload_bytes', 65536);
        $app['config']->set('files.trash_retention_days', 30);
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->audit = new class extends Audit
        {
            /** @var list<array<string, mixed>> */
            public array $log = [];

            public function record(?Authenticatable $user, string $action, array $paths = [], string $outcome = 'ok', ?string $code = null): void
            {
                $this->log[] = ['user' => $user?->getAuthIdentifier(), 'action' => $action, 'paths' => $paths, 'outcome' => $outcome, 'code' => $code];
            }
        };
        $this->app->instance(Audit::class, $this->audit);
        $this->acl(['/' => ['read', 'write', 'delete']]);
    }

    /** @param array<string, list<string>> $rules prefixo => habilidades */
    protected function acl(array $rules): void
    {
        $this->app['config']->set('files.acl', array_map(
            fn ($prefix, $abilities) => ['prefix' => $prefix, 'abilities' => $abilities],
            array_keys($rules),
            array_values($rules),
        ));
    }

    protected function user(string $id = 'admin'): GenericUser
    {
        return new GenericUser(['id' => $id]);
    }

    protected function api(string $id = 'admin'): static
    {
        return $this->actingAs($this->user($id));
    }

    protected function folder(string $parent, string $name): TestResponse
    {
        return $this->api()->postJson(self::BASE.'/folders', ['path' => $parent, 'name' => $name]);
    }

    protected function upload(string $folder, string $name, string $content, ?string $conflict = null): TestResponse
    {
        $query = http_build_query(['path' => $folder] + ($conflict ? ['conflict' => $conflict] : []));

        return $this->api()->post(self::BASE.'/upload?'.$query, [
            'file' => UploadedFile::fake()->createWithContent($name, $content),
        ], ['Accept' => 'application/json']);
    }

    protected function list(string $path, array $extra = []): TestResponse
    {
        return $this->api()->getJson(self::BASE.'/list?'.http_build_query(['path' => $path] + $extra));
    }

    /** @return list<string> */
    protected function names(TestResponse $response): array
    {
        return array_column($response->json('items'), 'name');
    }

    /** Conteúdo de um download (BinaryFileResponse ou resposta transmitida). */
    protected function body(TestResponse $response): string
    {
        $base = $response->baseResponse;

        return $base instanceof BinaryFileResponse ? (string) file_get_contents($base->getFile()->getPathname()) : $response->streamedContent();
    }
}
