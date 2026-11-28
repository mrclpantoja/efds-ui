<?php

namespace Efds\Files\Tests;

use Efds\Files\Support\FilesException;
use Efds\Files\Support\Path;

/** Testes do contrato HTTP (docs/architecture/arquivos.md, seção 4) sobre o disco local (Storage::fake). */
class FilesContractTest extends TestCase
{
    private const PDF = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n";

    // ---------- caminhos ----------

    public function test_normaliza_e_recusa_travessia(): void
    {
        $this->assertSame('/a/b/c', Path::normalize('/a//b/./c'));
        $this->assertSame('/', Path::normalize('/'));
        foreach (['a/b', '/a/../b', '/a\\b', '/..', "/a/\0b", '/.trash', '/a/.versions'] as $bad) {
            try {
                Path::normalize($bad);
                $this->fail("Deveria recusar: $bad");
            } catch (FilesException $e) {
                $this->assertSame('invalid_name', $e->errorCode);
            }
        }
    }

    public function test_valida_nomes(): void
    {
        $this->assertSame('relatório.pdf', Path::validateName('relatório.pdf'));
        foreach (['', ' x', 'x ', '.oculto', 'a/b', 'con', 'nul.txt', 'a:b', 'fim.', "a\u{202E}txt.exe"] as $bad) {
            try {
                Path::validateName($bad);
                $this->fail('Deveria recusar: '.json_encode($bad));
            } catch (FilesException $e) {
                $this->assertSame('invalid_name', $e->errorCode);
            }
        }
    }

    public function test_api_recusa_travessia_mesmo_codificada(): void
    {
        foreach (['/%2e%2e', '/a/%2e%2e/b', '/..', '/a%5Cb'] as $raw) {
            $this->api()->getJson(self::BASE.'/list?path='.$raw)
                ->assertStatus(400)->assertJsonPath('error.code', 'invalid_name');
        }
    }

    // ---------- autenticação e autorização ----------

    public function test_sem_autenticacao_401_no_formato_de_erro(): void
    {
        $this->getJson(self::BASE.'/capabilities')
            ->assertStatus(401)->assertJsonPath('error.code', 'forbidden');
    }

    public function test_leitor_nao_grava(): void
    {
        $this->acl(['/' => ['read']]);
        $this->api('leitor')->postJson(self::BASE.'/folders', ['path' => '/', 'name' => 'X'])
            ->assertStatus(403)->assertJsonPath('error.code', 'forbidden');
        $this->api('leitor')->getJson(self::BASE.'/capabilities')->assertJsonPath('write', false);
    }

    public function test_acl_por_prefixo_e_pasta_do_usuario(): void
    {
        $this->folder('/', 'contratos')->assertCreated();
        $this->folder('/', 'financeiro')->assertCreated();
        $this->folder('/', 'usuarios')->assertCreated();
        $this->folder('/usuarios', 'ana')->assertCreated();
        $this->acl([
            '/contratos' => ['read', 'write', 'delete'],
            '/usuarios/{user}' => ['read', 'write'],
        ]);

        $root = $this->api('ana')->getJson(self::BASE.'/list?path=/');
        $this->assertSame(['contratos', 'usuarios'], array_column($root->json('items'), 'name'));
        $this->api('ana')->getJson(self::BASE.'/list?path=/financeiro')->assertStatus(403);
        $this->api('ana')->postJson(self::BASE.'/folders', ['path' => '/contratos', 'name' => '2026'])->assertCreated();
        $this->api('ana')->postJson(self::BASE.'/folders', ['path' => '/usuarios/ana', 'name' => 'meus'])->assertCreated();
        $this->api('ana')->postJson(self::BASE.'/folders', ['path' => '/financeiro', 'name' => 'x'])->assertStatus(403);
        $this->api('ana')->postJson(self::BASE.'/folders', ['path' => '/usuarios/bia', 'name' => 'x'])->assertStatus(403);
    }

    // ---------- capabilities, pastas, listagem, árvore ----------

    public function test_capabilities(): void
    {
        $this->api()->getJson(self::BASE.'/capabilities')
            ->assertOk()
            ->assertJson(['write' => true, 'trash' => true, 'versions' => true, 'search' => 'recursive', 'directUpload' => false, 'maxUploadBytes' => 65536]);
    }

    public function test_cria_pasta_e_recusa_duplicata(): void
    {
        $this->folder('/', 'Documentos')->assertCreated()->assertJson(['type' => 'folder', 'path' => '/Documentos']);
        $this->folder('/', 'Documentos')->assertStatus(409)->assertJsonPath('error.code', 'conflict');
        $this->folder('/', '../x')->assertStatus(400);
    }

    public function test_lista_ordena_busca_e_pagina(): void
    {
        $this->folder('/', 'Documentos');
        $this->folder('/Documentos', 'Sub');
        $this->upload('/Documentos', 'b.txt', 'bbb');
        $this->upload('/Documentos', 'a.txt', 'aaaa');
        $this->upload('/Documentos/Sub', 'Relatório final.txt', 'ok');

        $this->assertSame(['Sub', 'a.txt', 'b.txt'], $this->names($this->list('/Documentos')));

        $search = $this->list('/Documentos', ['q' => 'RELATORIO', 'recursive' => '1']);
        $this->assertSame(['Relatório final.txt'], $this->names($search));
        $this->assertSame('/Documentos/Sub/Relatório final.txt', $search->json('items.0.path'));

        $p1 = $this->list('/Documentos', ['limit' => 2]);
        $this->assertCount(2, $p1->json('items'));
        $cursor = $p1->json('nextCursor');
        $this->assertNotEmpty($cursor);
        $p2 = $this->list('/Documentos', ['limit' => 2, 'cursor' => $cursor]);
        $this->assertSame(['b.txt'], $this->names($p2));
        $this->assertNull($p2->json('nextCursor'));
    }

    public function test_lista_caminho_inexistente_404_e_arvore_so_com_pastas(): void
    {
        $this->list('/nao-existe')->assertStatus(404)->assertJsonPath('error.code', 'not_found');
        $this->folder('/', 'D');
        $this->folder('/D', 'Sub');
        $this->upload('/D', 'a.txt', 'a');
        $tree = $this->api()->getJson(self::BASE.'/tree?path=/D');
        $this->assertSame(['Sub'], array_column($tree->json('folders'), 'name'));
    }

    // ---------- upload ----------

    public function test_upload_sanea_nome_e_confere_conteudo(): void
    {
        $this->folder('/', 'up');
        $this->upload('/up', '../../etc/passwd.txt', 'texto')->assertCreated()
            ->assertJson(['name' => 'passwd.txt', 'path' => '/up/passwd.txt']);

        $this->upload('/up', 'falso.pdf', 'isto não é um pdf')
            ->assertStatus(415)->assertJsonPath('error.code', 'type_not_allowed');
        $this->upload('/up', 'real.pdf', self::PDF)->assertCreated();
    }

    public function test_upload_recusa_executaveis_e_arquivos_grandes(): void
    {
        $this->folder('/', 'up');
        $this->upload('/up', 'a.exe', 'x')->assertStatus(415);
        $this->upload('/up', 'a.txt', "MZ\x90\x00")->assertStatus(415);
        $this->upload('/up', 'a.php', '<?php')->assertStatus(415);
        $this->upload('/up', 'grande.txt', str_repeat('x', 70000))
            ->assertStatus(413)->assertJsonPath('error.code', 'too_large');
    }

    public function test_conflitos_fail_rename_replace(): void
    {
        $this->folder('/', 'up');
        $this->upload('/up', 'nota.txt', 'v1')->assertCreated();
        $this->upload('/up', 'nota.txt', 'v2')->assertStatus(409);
        $this->upload('/up', 'nota.txt', 'v2', 'rename')->assertCreated()->assertJsonPath('name', 'nota (1).txt');
        $this->upload('/up', 'nota.txt', 'v3-substituida', 'replace')->assertCreated()
            ->assertJsonPath('name', 'nota.txt')->assertJsonPath('size', strlen('v3-substituida'));
    }

    public function test_upload_url_sem_s3_e_unsupported(): void
    {
        $this->api()->postJson(self::BASE.'/upload-url', ['path' => '/', 'name' => 'a.txt', 'size' => 1, 'type' => 'text/plain'])
            ->assertStatus(501)->assertJsonPath('error.code', 'unsupported');
    }

    // ---------- download (4.4) ----------

    public function test_download_attachment_com_cabecalhos_de_seguranca(): void
    {
        $this->folder('/', 'up');
        $this->upload('/up', 'real.pdf', self::PDF);

        $r = $this->api()->get(self::BASE.'/download?path=/up/real.pdf');
        $r->assertOk();
        $this->assertStringStartsWith('attachment;', $r->headers->get('Content-Disposition'));
        $this->assertSame('nosniff', $r->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString('no-store', $r->headers->get('Cache-Control'));
        $this->assertSame('application/pdf', $r->headers->get('Content-Type'));
        $this->assertSame(self::PDF, $this->body($r));
    }

    public function test_inline_so_para_tipos_seguros_e_com_csp(): void
    {
        $this->folder('/', 'up');
        $this->upload('/up', 'real.pdf', self::PDF);
        $this->upload('/up', 'nota.txt', 'texto');
        $this->upload('/up', 'desenho.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->upload('/up', 'pagina.html', '<script>alert(1)</script>');

        $pdf = $this->api()->get(self::BASE.'/download?path=/up/real.pdf&inline=1');
        $this->assertStringStartsWith('inline;', $pdf->headers->get('Content-Disposition'));
        $this->assertSame("default-src 'none'; frame-ancestors 'self'", $pdf->headers->get('Content-Security-Policy'));

        $txt = $this->api()->get(self::BASE.'/download?path=/up/nota.txt&inline=1');
        $this->assertStringStartsWith('text/plain', $txt->headers->get('Content-Type'));
        $this->assertStringStartsWith('inline;', $txt->headers->get('Content-Disposition'));

        foreach (['desenho.svg', 'pagina.html'] as $name) {
            $r = $this->api()->get(self::BASE."/download?path=/up/$name&inline=1");
            $this->assertStringStartsWith('attachment;', $r->headers->get('Content-Disposition'), $name);
        }
    }

    public function test_download_404_e_pasta_como_arquivo(): void
    {
        $this->folder('/', 'up');
        $this->api()->getJson(self::BASE.'/download?path=/up/nada.txt')->assertStatus(404);
        $this->api()->getJson(self::BASE.'/download?path=/up')->assertStatus(409);
    }

    public function test_content_disposition_saneado(): void
    {
        $cd = \Efds\Files\Services\FilesService::contentDisposition('attachment', '50% café.txt');
        $this->assertSame("attachment; filename=\"50_ caf_.txt\"; filename*=UTF-8''50%25%20caf%C3%A9.txt", $cd);
    }

    // ---------- renomear, mover, copiar ----------

    private function opsFixture(): void
    {
        $this->folder('/', 'ops');
        $this->folder('/ops', 'A');
        $this->folder('/ops', 'B');
        $this->upload('/ops/A', 'um.txt', '1');
        $this->upload('/ops/A', 'dois.txt', '2');
        $this->upload('/ops/B', 'um.txt', 'existente');
    }

    public function test_rename_e_conflito(): void
    {
        $this->opsFixture();
        $this->api()->patchJson(self::BASE.'/rename', ['path' => '/ops/A/dois.txt', 'name' => 'segundo.txt'])
            ->assertOk()->assertJsonPath('path', '/ops/A/segundo.txt');
        $this->api()->patchJson(self::BASE.'/rename', ['path' => '/ops/A/segundo.txt', 'name' => 'um.txt'])->assertStatus(409);
        $this->api()->patchJson(self::BASE.'/rename', ['path' => '/ops/A/segundo.txt', 'name' => 'a/b'])->assertStatus(400);
    }

    public function test_copy_com_conflito_fail_recusa_o_lote_inteiro(): void
    {
        $this->opsFixture();
        $this->api()->postJson(self::BASE.'/copy', ['paths' => ['/ops/A/dois.txt', '/ops/A/um.txt'], 'target' => '/ops/B'])->assertStatus(409);
        $this->assertSame(['um.txt'], $this->names($this->list('/ops/B')));

        $r = $this->api()->postJson(self::BASE.'/copy', ['paths' => ['/ops/A/um.txt'], 'target' => '/ops/B', 'conflict' => 'rename'])->assertOk();
        $this->assertSame('um (1).txt', $r->json('items.0.name'));
        $this->assertSame([], $r->json('skipped'));
    }

    public function test_move_ignora_quem_ja_esta_no_destino(): void
    {
        $this->opsFixture();
        $r = $this->api()->postJson(self::BASE.'/move', ['paths' => ['/ops/A/dois.txt', '/ops/B/um.txt'], 'target' => '/ops/B'])->assertOk();
        $this->assertSame(['dois.txt'], array_column($r->json('items'), 'name'));
        $this->assertSame(['/ops/B/um.txt'], $r->json('skipped'));
        $this->assertSame(['um.txt'], $this->names($this->list('/ops/A')));
    }

    public function test_move_pasta_inteira_e_nao_para_dentro_de_si_mesma(): void
    {
        $this->opsFixture();
        $this->api()->postJson(self::BASE.'/move', ['paths' => ['/ops'], 'target' => '/ops/A'])->assertStatus(409);
        $this->folder('/', 'destino');
        $this->api()->postJson(self::BASE.'/move', ['paths' => ['/ops/A'], 'target' => '/destino'])->assertOk();
        $this->assertSame(['dois.txt', 'um.txt'], $this->names($this->list('/destino/A')));
        $this->api()->getJson(self::BASE.'/list?path=/ops/A')->assertStatus(404);
    }

    public function test_replace_no_move_guarda_versao_antiga(): void
    {
        $this->opsFixture();
        $this->upload('/ops/A', 'novo.txt', 'NOVO');
        $this->upload('/ops/B', 'novo.txt', 'ANTIGO');
        $this->api()->postJson(self::BASE.'/move', ['paths' => ['/ops/A/novo.txt'], 'target' => '/ops/B', 'conflict' => 'replace'])->assertOk();

        $versions = $this->api()->getJson(self::BASE.'/versions?path=/ops/B/novo.txt')->assertOk()->json('versions');
        $this->assertCount(2, $versions);
        $old = collect($versions)->firstWhere('current', null);
        $dl = $this->api()->get(self::BASE.'/download?path=/ops/B/novo.txt&version='.$old['version']);
        $this->assertSame('ANTIGO', $this->body($dl));
    }

    // ---------- lixeira ----------

    public function test_lixeira_lista_restaura_e_esvazia(): void
    {
        $this->folder('/', 'lix');
        $this->upload('/lix', 'a.txt', 'aaa');
        $this->upload('/lix', 'b.txt', 'bbb');

        $del = $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/lix/a.txt', '/lix/b.txt']])->assertOk()->json('deleted');
        $this->assertEqualsCanonicalizing(['/lix/a.txt', '/lix/b.txt'], $del);
        $this->assertSame([], $this->names($this->list('/lix')));

        $items = $this->api()->getJson(self::BASE.'/trash')->assertOk()->json('items');
        $this->assertCount(2, $items);
        $this->assertNotEmpty($items[0]['trashId']);
        $a = collect($items)->firstWhere('name', 'a.txt');

        $this->api()->postJson(self::BASE.'/trash/restore', ['ids' => [$a['trashId']]])->assertOk()
            ->assertJsonPath('items.0.path', '/lix/a.txt');

        $this->upload('/lix', 'b.txt', 'nova b');
        $b = collect($items)->firstWhere('name', 'b.txt');
        $this->api()->postJson(self::BASE.'/trash/restore', ['ids' => [$b['trashId']]])->assertStatus(409);
        $this->api()->postJson(self::BASE.'/trash/restore', ['ids' => [$b['trashId']], 'conflict' => 'rename'])
            ->assertOk()->assertJsonPath('items.0.name', 'b (1).txt');

        $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/lix/a.txt']]);
        $t = collect($this->api()->getJson(self::BASE.'/trash')->json('items'))->firstWhere('originalPath', '/lix/a.txt');
        $this->api()->postJson(self::BASE.'/trash/delete', ['ids' => [$t['trashId']]])->assertOk()->assertJsonPath('deleted.0', $t['trashId']);

        $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/lix/b.txt']]);
        $this->api()->postJson(self::BASE.'/trash/empty', [])->assertOk();
        $this->assertSame([], $this->api()->getJson(self::BASE.'/trash')->json('items'));
    }

    public function test_exclusao_permanente_e_retencao(): void
    {
        $this->folder('/', 'lix');
        $this->upload('/lix', 'x.txt', 'xxx');
        $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/lix/x.txt'], 'permanent' => true])->assertOk();
        $this->assertSame([], $this->api()->getJson(self::BASE.'/trash')->json('items'));

        $this->upload('/lix', 'velho.txt', 'v');
        $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/lix/velho.txt']]);
        $service = $this->app->make(\Efds\Files\Services\FilesService::class);
        $this->assertSame(0, $service->purgeExpired());
        $this->assertSame(1, $service->purgeExpired(time() + 31 * 86400));
        $this->assertSame([], $this->api()->getJson(self::BASE.'/trash')->json('items'));
    }

    public function test_lixeira_desligada_exige_permanent(): void
    {
        $this->app['config']->set('files.trash_retention_days', 0);
        $this->upload('/', 'a.txt', 'a');
        $this->api()->getJson(self::BASE.'/capabilities')->assertJsonPath('trash', false);
        $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/a.txt']])->assertStatus(501);
        $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/a.txt'], 'permanent' => true])->assertOk();
    }

    // ---------- versões ----------

    public function test_versoes_lista_baixa_e_restaura(): void
    {
        $this->folder('/', 'ver');
        $this->upload('/ver', 'doc.txt', 'um');
        $this->upload('/ver', 'doc.txt', 'dois', 'replace');
        $this->upload('/ver', 'doc.txt', 'tres', 'replace');

        $versions = $this->api()->getJson(self::BASE.'/versions?path=/ver/doc.txt')->assertOk()->json('versions');
        $this->assertCount(3, $versions);
        $this->assertTrue($versions[0]['current']);
        [, $v2, $v1] = $versions;
        $this->assertSame('um', $this->body($this->api()->get(self::BASE.'/download?path=/ver/doc.txt&version='.$v1['version'])));
        $this->assertSame('dois', $this->body($this->api()->get(self::BASE.'/download?path=/ver/doc.txt&version='.$v2['version'])));

        $this->api()->postJson(self::BASE.'/versions/restore', ['path' => '/ver/doc.txt', 'version' => $v1['version']])->assertOk();
        $this->assertSame('um', $this->body($this->api()->get(self::BASE.'/download?path=/ver/doc.txt')));
        $after = $this->api()->getJson(self::BASE.'/versions?path=/ver/doc.txt')->json('versions');
        $this->assertCount(4, $after); // restaurar também guarda a versão que estava valendo
    }

    public function test_id_de_versao_com_travessia_e_recusado(): void
    {
        $this->folder('/', 'ver');
        $this->upload('/ver', 'doc.txt', 'um');
        $this->api()->getJson(self::BASE.'/download?path=/ver/doc.txt&version=../../x')->assertStatus(404);
    }

    public function test_historico_acompanha_renomeacao_e_some_na_exclusao_definitiva(): void
    {
        $this->folder('/', 'ver');
        $this->upload('/ver', 'doc.txt', 'um');
        $this->upload('/ver', 'doc.txt', 'dois', 'replace');
        $this->api()->patchJson(self::BASE.'/rename', ['path' => '/ver/doc.txt', 'name' => 'renomeado.txt'])->assertOk();
        $this->assertCount(2, $this->api()->getJson(self::BASE.'/versions?path=/ver/renomeado.txt')->json('versions'));

        $this->api()->postJson(self::BASE.'/delete', ['paths' => ['/ver/renomeado.txt'], 'permanent' => true])->assertOk();
        $this->upload('/ver', 'renomeado.txt', 'novo');
        $this->assertCount(1, $this->api()->getJson(self::BASE.'/versions?path=/ver/renomeado.txt')->json('versions'));
    }

    // ---------- segurança e auditoria ----------

    public function test_areas_internas_nao_sao_alcancaveis(): void
    {
        $this->api()->getJson(self::BASE.'/list?path=/.trash')->assertStatus(400);
        $this->api()->getJson(self::BASE.'/download?path=/.versions/x')->assertStatus(400);
    }

    public function test_json_obrigatorio_nas_rotas_de_escrita(): void
    {
        $this->api()->post(self::BASE.'/folders', ['path' => '/', 'name' => 'x'], ['Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json'])
            ->assertStatus(400)->assertJsonPath('error.code', 'invalid_name');
    }

    public function test_auditoria_registra_quem_o_que_sem_conteudo(): void
    {
        $this->folder('/', 'aud');
        $this->upload('/aud', 'segredo.txt', 'CONTEUDO-SIGILOSO');
        $this->upload('/aud', 'segredo.txt', 'outro'); // 409

        $ok = collect($this->audit->log)->firstWhere('action', 'file.upload');
        $this->assertSame('admin', $ok['user']);
        $this->assertSame('ok', $ok['outcome']);
        $this->assertTrue(collect($this->audit->log)->contains(fn ($l) => $l['outcome'] === 'error' && $l['code'] === 'conflict'));
        $this->assertStringNotContainsString('CONTEUDO-SIGILOSO', json_encode($this->audit->log));
    }
}
