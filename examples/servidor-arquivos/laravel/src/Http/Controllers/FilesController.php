<?php

namespace Efds\Files\Http\Controllers;

use Efds\Files\Services\FilesService;
use Efds\Files\Support\FilesException;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Camada HTTP fina: traduz a tabela 4.1 do contrato em chamadas ao FilesService.
 * Erros são FilesException (renderizam sozinhas no formato { error: { code, message } }).
 */
class FilesController extends Controller
{
    public function __construct(private readonly FilesService $files) {}

    private function user(Request $request): Authenticatable
    {
        return $request->user() ?? throw new FilesException('forbidden', 'Autenticação necessária.', null, 401);
    }

    /** @return array<string, mixed> */
    private function body(Request $request): array
    {
        if (! $request->isJson()) {
            throw FilesException::invalid('Envie o corpo como application/json.');
        }
        $data = $request->json()->all();
        if (! is_array($data)) {
            throw FilesException::invalid('JSON inválido.');
        }

        return $data;
    }

    public function capabilities(Request $request): JsonResponse
    {
        return response()->json($this->files->capabilities($this->user($request)));
    }

    public function list(Request $request): JsonResponse
    {
        return response()->json($this->files->list($this->user($request), $request->query()));
    }

    public function tree(Request $request): JsonResponse
    {
        return response()->json($this->files->tree($this->user($request), $request->query()));
    }

    public function createFolder(Request $request): JsonResponse
    {
        return response()->json($this->files->createFolder($this->user($request), $this->body($request)), 201);
    }

    public function upload(Request $request): JsonResponse
    {
        $file = $request->file('file');
        if (is_array($file) || $file === null) {
            throw FilesException::invalid('Campo "file" ausente.');
        }
        $entry = $this->files->upload($this->user($request), $request->query('path'), $request->query('conflict'), $file);

        return response()->json($entry, 201);
    }

    public function uploadUrl(Request $request): JsonResponse
    {
        return response()->json($this->files->uploadUrl($this->user($request), $this->body($request)));
    }

    public function rename(Request $request): JsonResponse
    {
        return response()->json($this->files->rename($this->user($request), $this->body($request)));
    }

    public function move(Request $request): JsonResponse
    {
        return response()->json($this->files->transfer($this->user($request), $this->body($request), 'move'));
    }

    public function copy(Request $request): JsonResponse
    {
        return response()->json($this->files->transfer($this->user($request), $this->body($request), 'copy'));
    }

    public function delete(Request $request): JsonResponse
    {
        return response()->json($this->files->remove($this->user($request), $this->body($request)));
    }

    public function trash(Request $request): JsonResponse
    {
        return response()->json($this->files->trashList($this->user($request), $request->query()));
    }

    public function trashRestore(Request $request): JsonResponse
    {
        return response()->json($this->files->trashRestore($this->user($request), $this->body($request)));
    }

    public function trashEmpty(Request $request): JsonResponse
    {
        return response()->json($this->files->trashDelete($this->user($request), $request->isJson() ? $this->body($request) : [], true));
    }

    public function trashDelete(Request $request): JsonResponse
    {
        return response()->json($this->files->trashDelete($this->user($request), $this->body($request)));
    }

    public function versions(Request $request): JsonResponse
    {
        return response()->json($this->files->versions($this->user($request), $request->query()));
    }

    public function restoreVersion(Request $request): JsonResponse
    {
        return response()->json($this->files->restoreVersion($this->user($request), $this->body($request)));
    }

    /** Download com os cabeçalhos exigidos pela seção 4.4 do contrato. */
    public function download(Request $request): Response
    {
        $d = $this->files->download($this->user($request), $request->query());
        $headers = [
            'Content-Type' => $d['contentType'],
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store, private',
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'self'",
        ];
        $disposition = $d['inline'] ? 'inline' : 'attachment';

        if (isset($d['redirectUrl'])) {
            return new Response('', 302, $headers + ['Location' => $d['redirectUrl']]);
        }

        $store = $this->files->store();
        if ($store->isLocal()) {
            // BinaryFileResponse cuida de Range (vídeo/áudio com avanço) e Last-Modified.
            $response = new BinaryFileResponse($store->absolutePath($d['path'], $d['version']), 200, $headers, false);
            $ascii = preg_replace('/[^\x20-\x7e]|[\/\\\\%"]/u', '_', $d['name']) ?? 'arquivo';
            $response->setContentDisposition($disposition, $d['name'], $ascii);
            $response->headers->set('Cache-Control', 'no-store, private'); // BinaryFileResponse acrescenta padrões

            return $response;
        }

        // Disco remoto: transmite pelo servidor (sem Range). Para vídeos grandes prefira URL assinada.
        $stream = $store->openStream($d['path'], $d['version']);
        $headers['Content-Disposition'] = FilesService::contentDisposition($disposition, $d['name']);
        $headers['Content-Length'] = (string) $stream['size'];

        return new StreamedResponse(function () use ($stream) {
            fpassthru($stream['stream']);
            if (is_resource($stream['stream'])) {
                fclose($stream['stream']);
            }
        }, 200, $headers);
    }
}
