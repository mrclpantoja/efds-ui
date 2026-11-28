<?php

use Efds\Files\Http\Controllers\FilesController;
use Illuminate\Support\Facades\Route;

/*
| Rotas do contrato HTTP de arquivos (docs/architecture/arquivos.md, tabela 4.1).
| O prefixo e o middleware vêm de config('files.prefix') e config('files.middleware')
| (carregadas pelo FilesServiceProvider).
*/

Route::get('capabilities', [FilesController::class, 'capabilities'])->name('capabilities');
Route::get('list', [FilesController::class, 'list'])->name('list');
Route::get('tree', [FilesController::class, 'tree'])->name('tree');
Route::post('folders', [FilesController::class, 'createFolder'])->name('folders');
Route::post('upload', [FilesController::class, 'upload'])->name('upload');
Route::post('upload-url', [FilesController::class, 'uploadUrl'])->name('upload-url');
Route::get('download', [FilesController::class, 'download'])->name('download');
Route::patch('rename', [FilesController::class, 'rename'])->name('rename');
Route::post('move', [FilesController::class, 'move'])->name('move');
Route::post('copy', [FilesController::class, 'copy'])->name('copy');
Route::post('delete', [FilesController::class, 'delete'])->name('delete');
Route::get('trash', [FilesController::class, 'trash'])->name('trash');
Route::post('trash/restore', [FilesController::class, 'trashRestore'])->name('trash.restore');
Route::post('trash/empty', [FilesController::class, 'trashEmpty'])->name('trash.empty');
Route::post('trash/delete', [FilesController::class, 'trashDelete'])->name('trash.delete');
Route::get('versions', [FilesController::class, 'versions'])->name('versions');
Route::post('versions/restore', [FilesController::class, 'restoreVersion'])->name('versions.restore');
