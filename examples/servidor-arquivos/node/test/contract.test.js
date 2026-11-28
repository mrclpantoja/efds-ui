// Testes do contrato HTTP (docs/architecture/arquivos.md, seção 4) sobre o driver fs.
import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { normalizePath, validateName } from '../src/paths.js';
import { ADMIN, LEITOR, PDF, PNG, RESTRITO, q, startServer } from './helpers.js';

let app;
let admin;

before(async () => {
  app = await startServer();
  admin = app.api(ADMIN);
});
after(() => app.close());

const names = (body) => body.items.map((i) => i.name);

describe('caminhos', () => {
  it('normaliza e recusa travessia', () => {
    assert.equal(normalizePath('/a//b/./c'), '/a/b/c');
    assert.equal(normalizePath('/'), '/');
    for (const bad of ['a/b', '/a/../b', '/a\\b', '/..', '/a/\u0000b', '/.trash', '/a/.versions']) {
      assert.throws(() => normalizePath(bad), { code: 'invalid_name' }, bad);
    }
  });

  it('valida nomes', () => {
    assert.equal(validateName('relatório.pdf'), 'relatório.pdf');
    for (const bad of [
      '',
      ' x',
      'x ',
      '.oculto',
      'a/b',
      'con',
      'nul.txt',
      'a:b',
      'fim.',
      'a‮txt.exe',
    ]) {
      assert.throws(() => validateName(bad), { code: 'invalid_name' }, JSON.stringify(bad));
    }
  });

  it('a API recusa ".." mesmo codificado', async () => {
    for (const raw of ['/%2e%2e', '/a/%2e%2e/b', '/..', '/a%5Cb']) {
      const r = await admin.get('/list?path=' + raw);
      assert.equal(r.status, 400, raw);
      assert.equal((await r.json()).error.code, 'invalid_name');
    }
  });
});

describe('autenticação e autorização', () => {
  it('sem token: 401 no formato de erro', async () => {
    const r = await fetch(app.base + '/capabilities');
    assert.equal(r.status, 401);
    assert.equal((await r.json()).error.code, 'forbidden');
  });

  it('token inválido: 401', async () => {
    const r = await fetch(app.base + '/capabilities', {
      headers: { authorization: 'Bearer outro' },
    });
    assert.equal(r.status, 401);
  });

  it('leitor não grava', async () => {
    const r = await app.api(LEITOR).post('/folders', { path: '/', name: 'X' });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error.code, 'forbidden');
  });

  it('acl por prefixo: só enxerga o que pode', async () => {
    await admin.post('/folders', { path: '/', name: 'contratos' });
    await admin.post('/folders', { path: '/', name: 'financeiro' });
    const ana = app.api(RESTRITO);
    const root = await (await ana.get('/list' + q({ path: '/' }))).json();
    assert.deepEqual(names(root), ['contratos']);
    const bloqueada = await ana.get('/list' + q({ path: '/financeiro' }));
    assert.equal(bloqueada.status, 403);
    const ok = await ana.post('/folders', { path: '/contratos', name: '2026' });
    assert.equal(ok.status, 201);
    const negado = await ana.post('/folders', { path: '/financeiro', name: 'x' });
    assert.equal(negado.status, 403);
  });
});

describe('capabilities, pastas, listagem e árvore', () => {
  it('GET /capabilities', async () => {
    const c = await (await admin.get('/capabilities')).json();
    assert.equal(c.write, true);
    assert.equal(c.trash, true);
    assert.equal(c.versions, true);
    assert.equal(c.search, 'recursive');
    assert.equal(c.directUpload, false);
    assert.equal(c.maxUploadBytes, 65536);
    assert.equal((await (await app.api(LEITOR).get('/capabilities')).json()).write, false);
  });

  it('POST /folders cria e recusa duplicata (409)', async () => {
    const r = await admin.post('/folders', { path: '/', name: 'Documentos' });
    assert.equal(r.status, 201);
    const e = await r.json();
    assert.equal(e.type, 'folder');
    assert.equal(e.path, '/Documentos');
    const dup = await admin.post('/folders', { path: '/', name: 'Documentos' });
    assert.equal(dup.status, 409);
    assert.equal((await dup.json()).error.code, 'conflict');
    const bad = await admin.post('/folders', { path: '/', name: '../x' });
    assert.equal(bad.status, 400);
  });

  it('GET /list ordena (pastas primeiro), filtra, busca recursiva e pagina', async () => {
    await admin.post('/folders', { path: '/Documentos', name: 'Sub' });
    await admin.upload('/Documentos', 'b.txt', 'bbb');
    await admin.upload('/Documentos', 'a.txt', 'aaaa');
    await admin.upload('/Documentos/Sub', 'Relatório final.txt', 'ok');

    const l = await (await admin.get('/list' + q({ path: '/Documentos' }))).json();
    assert.deepEqual(names(l), ['Sub', 'a.txt', 'b.txt']);
    assert.equal(l.items[1].mime, 'text/plain');
    assert.equal(l.items[1].size, 4);

    const bySize = await (
      await admin.get('/list' + q({ path: '/Documentos', sort: '-size' }))
    ).json();
    assert.deepEqual(names(bySize), ['Sub', 'a.txt', 'b.txt']);

    const search = await (
      await admin.get('/list' + q({ path: '/Documentos', q: 'RELATORIO', recursive: '1' }))
    ).json();
    assert.deepEqual(names(search), ['Relatório final.txt']);
    assert.equal(search.items[0].path, '/Documentos/Sub/Relatório final.txt');

    const p1 = await (await admin.get('/list' + q({ path: '/Documentos', limit: '2' }))).json();
    assert.equal(p1.items.length, 2);
    assert.ok(p1.nextCursor);
    const p2 = await (
      await admin.get('/list' + q({ path: '/Documentos', limit: '2', cursor: p1.nextCursor }))
    ).json();
    assert.deepEqual(names(p2), ['b.txt']);
    assert.equal(p2.nextCursor, undefined);
  });

  it('GET /list em caminho inexistente: 404', async () => {
    const r = await admin.get('/list' + q({ path: '/nao-existe' }));
    assert.equal(r.status, 404);
    assert.equal((await r.json()).error.code, 'not_found');
  });

  it('GET /tree devolve só pastas', async () => {
    const t = await (await admin.get('/tree' + q({ path: '/Documentos' }))).json();
    assert.deepEqual(
      t.folders.map((f) => f.name),
      ['Sub'],
    );
  });
});

describe('upload', () => {
  it('multipart: grava, sanea o nome e confere conteúdo', async () => {
    await admin.post('/folders', { path: '/', name: 'up' });
    const r = await admin.upload('/up', '../../etc/passwd.txt', 'texto');
    assert.equal(r.status, 201);
    const e = await r.json();
    assert.equal(e.name, 'passwd.txt');
    assert.equal(e.path, '/up/passwd.txt');
  });

  it('recusa conteúdo que não bate com a extensão (415)', async () => {
    const r = await admin.upload('/up', 'falso.pdf', 'isto não é um pdf');
    assert.equal(r.status, 415);
    assert.equal((await r.json()).error.code, 'type_not_allowed');
    const okPdf = await admin.upload('/up', 'real.pdf', PDF);
    assert.equal(okPdf.status, 201);
    const okPng = await admin.upload('/up', 'foto.png', PNG);
    assert.equal(okPng.status, 201);
  });

  it('recusa executáveis, mesmo renomeados', async () => {
    assert.equal((await admin.upload('/up', 'a.exe', 'x')).status, 415);
    assert.equal((await admin.upload('/up', 'a.txt', Buffer.from('MZ\x90\x00'))).status, 415);
    assert.equal((await admin.upload('/up', 'a.php', '<?php')).status, 415);
  });

  it('recusa arquivo grande demais (413)', async () => {
    const r = await admin.upload('/up', 'grande.txt', 'x'.repeat(70000));
    assert.equal(r.status, 413);
    assert.equal((await r.json()).error.code, 'too_large');
  });

  it('conflict=fail (409), replace e rename', async () => {
    await admin.upload('/up', 'nota.txt', 'v1');
    const dup = await admin.upload('/up', 'nota.txt', 'v2');
    assert.equal(dup.status, 409);

    const renamed = await (
      await admin.upload('/up', 'nota.txt', 'v2', { conflict: 'rename' })
    ).json();
    assert.equal(renamed.name, 'nota (1).txt');

    const replaced = await (
      await admin.upload('/up', 'nota.txt', 'v3-substituida', { conflict: 'replace' })
    ).json();
    assert.equal(replaced.name, 'nota.txt');
    assert.equal(replaced.size, 'v3-substituida'.length);
  });

  it('upload-url sem S3 é "unsupported"', async () => {
    const r = await admin.post('/upload-url', {
      path: '/up',
      name: 'a.txt',
      size: 1,
      type: 'text/plain',
    });
    assert.equal(r.status, 501);
    assert.equal((await r.json()).error.code, 'unsupported');
  });
});

describe('download (4.4)', () => {
  it('attachment por padrão, com cabeçalhos de segurança', async () => {
    const r = await admin.get('/download' + q({ path: '/up/real.pdf' }));
    assert.equal(r.status, 200);
    assert.match(
      r.headers.get('content-disposition'),
      /^attachment; filename="real.pdf"; filename\*=UTF-8''real\.pdf$/,
    );
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('cache-control'), 'no-store, private');
    assert.equal(r.headers.get('content-type'), 'application/pdf');
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), PDF);
  });

  it('inline só para tipos seguros e com CSP', async () => {
    const r = await admin.get('/download' + q({ path: '/up/real.pdf', inline: '1' }));
    assert.match(r.headers.get('content-disposition'), /^inline;/);
    assert.equal(
      r.headers.get('content-security-policy'),
      "default-src 'none'; frame-ancestors 'self'",
    );
    await r.arrayBuffer();

    const txt = await admin.get('/download' + q({ path: '/up/passwd.txt', inline: '1' }));
    assert.match(txt.headers.get('content-type'), /^text\/plain/);
    assert.match(txt.headers.get('content-disposition'), /^inline;/);
    await txt.arrayBuffer();
  });

  it('SVG e HTML nunca saem inline', async () => {
    await admin.upload(
      '/up',
      'desenho.svg',
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    await admin.upload('/up', 'pagina.html', '<script>alert(1)</script>');
    for (const n of ['desenho.svg', 'pagina.html']) {
      const r = await admin.get('/download' + q({ path: `/up/${n}`, inline: '1' }));
      assert.match(r.headers.get('content-disposition'), /^attachment;/, n);
      await r.arrayBuffer();
    }
  });

  it('nome com acento e porcentagem é saneado no cabeçalho', async () => {
    await admin.upload('/up', '50% café.txt', 'x');
    const r = await admin.get('/download' + q({ path: '/up/50% café.txt' }));
    const cd = r.headers.get('content-disposition');
    assert.match(cd, /filename="50_ caf_.txt"/);
    assert.ok(cd.endsWith("filename*=UTF-8''50%25%20caf%C3%A9.txt"), cd);
    await r.arrayBuffer();
  });

  it('Range: 206 e 416', async () => {
    const r = await admin.get('/download' + q({ path: '/up/passwd.txt' }), { range: 'bytes=1-3' });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), 'bytes 1-3/5');
    assert.equal(await r.text(), 'ext');
    const bad = await admin.get('/download' + q({ path: '/up/passwd.txt' }), {
      range: 'bytes=50-60',
    });
    assert.equal(bad.status, 416);
  });

  it('404 e pasta como arquivo', async () => {
    assert.equal((await admin.get('/download' + q({ path: '/up/nada.txt' }))).status, 404);
    assert.equal((await admin.get('/download' + q({ path: '/up' }))).status, 409);
  });
});

describe('renomear, mover e copiar', () => {
  before(async () => {
    await admin.post('/folders', { path: '/', name: 'ops' });
    await admin.post('/folders', { path: '/ops', name: 'A' });
    await admin.post('/folders', { path: '/ops', name: 'B' });
    await admin.upload('/ops/A', 'um.txt', '1');
    await admin.upload('/ops/A', 'dois.txt', '2');
    await admin.upload('/ops/B', 'um.txt', 'existente');
  });

  it('PATCH /rename e conflito', async () => {
    const r = await admin.patch('/rename', { path: '/ops/A/dois.txt', name: 'segundo.txt' });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).path, '/ops/A/segundo.txt');
    const dup = await admin.patch('/rename', { path: '/ops/A/segundo.txt', name: 'um.txt' });
    assert.equal(dup.status, 409);
    const bad = await admin.patch('/rename', { path: '/ops/A/segundo.txt', name: 'a/b' });
    assert.equal(bad.status, 400);
  });

  it('POST /copy: conflito fail recusa o lote inteiro sem copiar nada', async () => {
    const r = await admin.post('/copy', {
      paths: ['/ops/A/segundo.txt', '/ops/A/um.txt'],
      target: '/ops/B',
    });
    assert.equal(r.status, 409);
    const l = await (await admin.get('/list' + q({ path: '/ops/B' }))).json();
    assert.deepEqual(names(l), ['um.txt']);
  });

  it('POST /copy com rename', async () => {
    const r = await (
      await admin.post('/copy', { paths: ['/ops/A/um.txt'], target: '/ops/B', conflict: 'rename' })
    ).json();
    assert.deepEqual(
      r.items.map((i) => i.name),
      ['um (1).txt'],
    );
    assert.deepEqual(r.skipped, []);
  });

  it('POST /move: move, ignora quem já está no destino e mantém a origem fora', async () => {
    const r = await (
      await admin.post('/move', {
        paths: ['/ops/A/segundo.txt', '/ops/B/um.txt'],
        target: '/ops/B',
      })
    ).json();
    assert.deepEqual(
      r.items.map((i) => i.name),
      ['segundo.txt'],
    );
    assert.deepEqual(r.skipped, ['/ops/B/um.txt']);
    const a = await (await admin.get('/list' + q({ path: '/ops/A' }))).json();
    assert.deepEqual(names(a), ['um.txt']);
  });

  it('move com replace sobrescreve arquivo e guarda a versão antiga', async () => {
    await admin.upload('/ops/A', 'novo.txt', 'NOVO');
    await admin.upload('/ops/B', 'novo.txt', 'ANTIGO');
    const r = await admin.post('/move', {
      paths: ['/ops/A/novo.txt'],
      target: '/ops/B',
      conflict: 'replace',
    });
    assert.equal(r.status, 200);
    const v = await (await admin.get('/versions' + q({ path: '/ops/B/novo.txt' }))).json();
    assert.equal(v.versions.length, 2);
    const old = v.versions.find((x) => !x.current);
    const dl = await admin.get('/download' + q({ path: '/ops/B/novo.txt', version: old.version }));
    assert.equal(await dl.text(), 'ANTIGO');
  });

  it('não move pasta para dentro de si mesma', async () => {
    const r = await admin.post('/move', { paths: ['/ops'], target: '/ops/A' });
    assert.equal(r.status, 409);
  });
});

describe('lixeira', () => {
  it('delete vai para a lixeira, lista, restaura e esvazia', async () => {
    await admin.post('/folders', { path: '/', name: 'lix' });
    await admin.upload('/lix', 'a.txt', 'aaa');
    await admin.upload('/lix', 'b.txt', 'bbb');

    const del = await (await admin.post('/delete', { paths: ['/lix/a.txt', '/lix/b.txt'] })).json();
    assert.deepEqual(del.deleted.sort(), ['/lix/a.txt', '/lix/b.txt']);
    assert.deepEqual(names(await (await admin.get('/list' + q({ path: '/lix' }))).json()), []);

    const trash = await (await admin.get('/trash')).json();
    const mine = trash.items.filter((i) => i.originalPath.startsWith('/lix/'));
    assert.equal(mine.length, 2);
    assert.ok(mine[0].trashId && mine[0].deletedAt);

    const a = mine.find((i) => i.name === 'a.txt');
    const restored = await (await admin.post('/trash/restore', { ids: [a.trashId] })).json();
    assert.equal(restored.items[0].path, '/lix/a.txt');

    // conflito na restauração
    await admin.upload('/lix', 'b.txt', 'nova b');
    const b = mine.find((i) => i.name === 'b.txt');
    assert.equal((await admin.post('/trash/restore', { ids: [b.trashId] })).status, 409);
    const rn = await (
      await admin.post('/trash/restore', { ids: [b.trashId], conflict: 'rename' })
    ).json();
    assert.equal(rn.items[0].name, 'b (1).txt');

    await admin.post('/delete', { paths: ['/lix/a.txt'] });
    const t2 = (await (await admin.get('/trash')).json()).items.find(
      (i) => i.originalPath === '/lix/a.txt',
    );
    const gone = await (await admin.post('/trash/delete', { ids: [t2.trashId] })).json();
    assert.deepEqual(gone.deleted, [t2.trashId]);

    await admin.post('/delete', { paths: ['/lix/b.txt'] });
    const emptied = await (await admin.post('/trash/empty', {})).json();
    assert.ok(emptied.deleted.length >= 1);
    assert.deepEqual((await (await admin.get('/trash')).json()).items, []);
  });

  it('delete permanente remove de vez', async () => {
    await admin.upload('/lix', 'x.txt', 'xxx');
    const r = await admin.post('/delete', { paths: ['/lix/x.txt'], permanent: true });
    assert.equal(r.status, 200);
    assert.deepEqual((await (await admin.get('/trash')).json()).items, []);
  });

  it('retenção: purgeExpired apaga o que passou do prazo', async () => {
    await admin.upload('/lix', 'velho.txt', 'v');
    await admin.post('/delete', { paths: ['/lix/velho.txt'] });
    assert.equal(await app.service.purgeExpired(), 0);
    const depois = Date.now() + 31 * 86400000;
    assert.equal(await app.service.purgeExpired(depois), 1);
    assert.deepEqual((await (await admin.get('/trash')).json()).items, []);
  });

  it('com a lixeira desligada, exigir permanent', async () => {
    const off = await startServer({ trashRetentionDays: 0 });
    try {
      const a = off.api(ADMIN);
      assert.equal((await (await a.get('/capabilities')).json()).trash, false);
      await a.upload('/', 'a.txt', 'a');
      assert.equal((await a.post('/delete', { paths: ['/a.txt'] })).status, 501);
      assert.equal((await a.post('/delete', { paths: ['/a.txt'], permanent: true })).status, 200);
    } finally {
      await off.close();
    }
  });
});

describe('versões', () => {
  it('lista, baixa e restaura versões', async () => {
    await admin.post('/folders', { path: '/', name: 'ver' });
    await admin.upload('/ver', 'doc.txt', 'um');
    await admin.upload('/ver', 'doc.txt', 'dois', { conflict: 'replace' });
    await admin.upload('/ver', 'doc.txt', 'tres', { conflict: 'replace' });

    const { versions } = await (await admin.get('/versions' + q({ path: '/ver/doc.txt' }))).json();
    assert.equal(versions.length, 3);
    assert.equal(versions[0].current, true);
    const [, v2, v1] = versions;
    assert.equal(
      await (
        await admin.get('/download' + q({ path: '/ver/doc.txt', version: v1.version }))
      ).text(),
      'um',
    );
    assert.equal(
      await (
        await admin.get('/download' + q({ path: '/ver/doc.txt', version: v2.version }))
      ).text(),
      'dois',
    );

    const r = await admin.post('/versions/restore', { path: '/ver/doc.txt', version: v1.version });
    assert.equal(r.status, 200);
    assert.equal(await (await admin.get('/download' + q({ path: '/ver/doc.txt' }))).text(), 'um');
    const after = await (await admin.get('/versions' + q({ path: '/ver/doc.txt' }))).json();
    assert.equal(after.versions.length, 4); // restaurar também guarda a versão que estava valendo
  });

  it('id de versão com travessia é recusado', async () => {
    const r = await admin.get('/download' + q({ path: '/ver/doc.txt', version: '../../x' }));
    assert.equal(r.status, 404);
  });

  it('o histórico acompanha renomeação e some na exclusão definitiva', async () => {
    await admin.patch('/rename', { path: '/ver/doc.txt', name: 'renomeado.txt' });
    const v = await (await admin.get('/versions' + q({ path: '/ver/renomeado.txt' }))).json();
    assert.equal(v.versions.length, 4);
    await admin.post('/delete', { paths: ['/ver/renomeado.txt'], permanent: true });
    await admin.upload('/ver', 'renomeado.txt', 'novo');
    const v2 = await (await admin.get('/versions' + q({ path: '/ver/renomeado.txt' }))).json();
    assert.equal(v2.versions.length, 1);
  });
});

describe('segurança do disco', () => {
  it('link simbólico para fora da raiz não é seguido nem listado', async () => {
    await mkdir(join(app.root, 'link'));
    try {
      await symlink(process.cwd(), join(app.root, 'link', 'fuga'), 'junction');
    } catch {
      return; // sem permissão para criar links neste ambiente
    }
    await writeFile(join(app.root, 'link', 'ok.txt'), 'ok');
    const l = await (await admin.get('/list' + q({ path: '/link' }))).json();
    assert.deepEqual(names(l), ['ok.txt']);
    assert.equal((await admin.get('/list' + q({ path: '/link/fuga' }))).status, 403);
  });

  it('áreas internas não são alcançáveis pela API', async () => {
    assert.equal((await admin.get('/list' + q({ path: '/.trash' }))).status, 400);
    assert.equal((await admin.get('/download' + q({ path: '/.versions/x' }))).status, 400);
  });

  it('rota desconhecida: 404 no formato de erro', async () => {
    const r = await admin.get('/nada');
    assert.equal(r.status, 404);
    assert.equal((await r.json()).error.code, 'not_found');
  });

  it('JSON inválido: 400 sem vazar detalhe', async () => {
    const r = await fetch(app.base + '/folders', {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' },
      body: '{ nao-e-json',
    });
    assert.equal(r.status, 400);
  });
});

describe('auditoria', () => {
  it('registra quem, o quê e quando, sem conteúdo', () => {
    assert.ok(app.auditLog.length > 5);
    const e = app.auditLog.find((l) => l.action === 'file.upload' && l.outcome === 'ok');
    assert.equal(e.user, 'admin');
    assert.ok(e.ts && Array.isArray(e.paths));
    assert.ok(app.auditLog.some((l) => l.outcome === 'error' && l.code === 'conflict'));
    assert.ok(!JSON.stringify(app.auditLog).includes('v3-substituida'));
  });
});
