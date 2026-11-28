// Driver S3 (ou compatível: MinIO, Ceph). Requer @aws-sdk/client-s3 e @aws-sdk/s3-request-presigner.
// NÃO foi executado contra um bucket real nesta entrega: revise e teste no seu ambiente.
//
// Modelo: pasta = prefixo "a/b/"; pastas vazias existem como objeto vazio "a/b/" (marcador).
// Credenciais: cadeia padrão do SDK (papel IAM, variáveis AWS_*). Nada de chave no código.
import { FilesError, notFound } from '../errors.js';

const MAX_ENTRIES = 10000;

/**
 * @param {{ bucket: string, region?: string, prefix?: string, endpoint?: string, forcePathStyle?: boolean,
 *   versioning?: 'auto'|'true'|'false', sse?: string, purgeVersions?: boolean }} cfg
 */
export async function createS3Driver(cfg) {
  const s3 = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const client = new s3.S3Client({
    region: cfg.region,
    ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
    ...(cfg.forcePathStyle ? { forcePathStyle: true } : {}),
  });
  const Bucket = cfg.bucket;
  const prefix = cfg.prefix ? cfg.prefix.replace(/^\/+|\/+$/g, '') + '/' : '';
  const sse = cfg.sse ? { ServerSideEncryption: cfg.sse } : {};

  /** "/a/b" -> "<prefix>a/b" (sem barra final). */
  const key = (logical) => prefix + logical.replace(/^\/+/, '').replace(/\/+$/, '');
  const folderPrefix = (logical) => (logical === '/' ? prefix : key(logical) + '/');
  const copySource = (k, versionId) =>
    `${Bucket}/${k.split('/').map(encodeURIComponent).join('/')}` +
    (versionId ? `?versionId=${encodeURIComponent(versionId)}` : '');
  const isMissing = (e) =>
    e?.name === 'NotFound' || e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;

  async function listAll(params, cap = MAX_ENTRIES) {
    const contents = [];
    const prefixes = [];
    let token;
    do {
      const r = await client.send(
        new s3.ListObjectsV2Command({ Bucket, ...params, ContinuationToken: token }),
      );
      contents.push(...(r.Contents ?? []));
      prefixes.push(...(r.CommonPrefixes ?? []).map((p) => p.Prefix));
      token = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (token && contents.length + prefixes.length < cap);
    return { contents, prefixes };
  }

  async function stat(logical) {
    if (logical === '/') return { type: 'folder' };
    try {
      const h = await client.send(new s3.HeadObjectCommand({ Bucket, Key: key(logical) }));
      return { type: 'file', size: h.ContentLength, modified: h.LastModified?.toISOString() };
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
    const r = await client.send(
      new s3.ListObjectsV2Command({ Bucket, Prefix: folderPrefix(logical), MaxKeys: 1 }),
    );
    return r.KeyCount ? { type: 'folder' } : null;
  }

  async function list(logical) {
    const pre = folderPrefix(logical);
    const { contents, prefixes } = await listAll({ Prefix: pre, Delimiter: '/' });
    const out = [];
    for (const p of prefixes) {
      const name = p.slice(pre.length, -1);
      if (name && !name.startsWith('.')) out.push({ name, type: 'folder' });
    }
    for (const o of contents) {
      const name = o.Key.slice(pre.length);
      if (!name || name.startsWith('.')) continue; // marcador da própria pasta e itens ocultos
      out.push({ name, type: 'file', size: o.Size, modified: o.LastModified?.toISOString() });
    }
    return out;
  }

  async function walk(logical, { limit = 5000 } = {}) {
    const pre = folderPrefix(logical);
    const { contents } = await listAll({ Prefix: pre }, limit);
    return contents
      .map((o) => ({ rel: o.Key.slice(pre.length), o }))
      .filter(({ rel }) => rel && !rel.split('/').some((s) => s.startsWith('.')))
      .slice(0, limit)
      .map(({ rel, o }) => {
        const isMarker = rel.endsWith('/');
        const clean = isMarker ? rel.slice(0, -1) : rel;
        return {
          path: (logical === '/' ? '' : logical) + '/' + clean,
          name: clean.slice(clean.lastIndexOf('/') + 1),
          type: isMarker ? 'folder' : 'file',
          ...(isMarker ? {} : { size: o.Size, modified: o.LastModified?.toISOString() }),
        };
      });
  }

  async function mkdir(logical) {
    if (logical === '/') return;
    await client.send(
      new s3.PutObjectCommand({ Bucket, Key: key(logical) + '/', Body: '', ...sse }),
    );
  }

  async function put(logical, data, { contentType, overwrite = false } = {}) {
    try {
      await client.send(
        new s3.PutObjectCommand({
          Bucket,
          Key: key(logical),
          Body: data,
          ContentType: contentType,
          ...sse,
          // Escrita condicional: sem sobrescrever, o S3 recusa se a chave já existir (412).
          ...(overwrite ? {} : { IfNoneMatch: '*' }),
        }),
      );
    } catch (e) {
      if (e?.$metadata?.httpStatusCode === 412) {
        throw new FilesError('conflict', 'Já existe um item com esse nome.', { path: logical });
      }
      throw e;
    }
    return { type: 'file', size: data.length, modified: new Date().toISOString() };
  }

  async function get(logical, { version, range } = {}) {
    try {
      const r = await client.send(
        new s3.GetObjectCommand({
          Bucket,
          Key: key(logical),
          ...(version && version !== 'current' ? { VersionId: version } : {}),
          ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
        }),
      );
      const total = r.ContentRange ? Number(r.ContentRange.split('/')[1]) : r.ContentLength;
      return {
        stream: r.Body,
        size: total,
        modified: r.LastModified?.toISOString(),
        rangeSupported: true,
      };
    } catch (e) {
      if (isMissing(e) || e?.name === 'NoSuchVersion') throw notFound(logical);
      throw e;
    }
  }

  async function copyOne(fromKey, toKey) {
    await client.send(
      new s3.CopyObjectCommand({ Bucket, Key: toKey, CopySource: copySource(fromKey), ...sse }),
    );
  }

  async function allKeysUnder(logical) {
    const { contents } = await listAll({ Prefix: folderPrefix(logical) });
    return contents.map((o) => o.Key);
  }

  async function copy(from, to) {
    const src = await stat(from);
    if (src?.type === 'folder') {
      const fromPre = folderPrefix(from);
      const toPre = folderPrefix(to);
      for (const k of await allKeysUnder(from)) await copyOne(k, toPre + k.slice(fromPre.length));
      if (!(await allKeysUnder(to)).length) await mkdir(to);
      return;
    }
    await copyOne(key(from), key(to));
  }

  async function deleteKeys(keys) {
    for (let i = 0; i < keys.length; i += 1000) {
      await client.send(
        new s3.DeleteObjectsCommand({
          Bucket,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }

  /** Apaga também as versões antigas e marcadores de exclusão (custo e LGPD: "excluir" tem de excluir). */
  async function purgeVersionsUnder(keyPrefix) {
    let keyMarker;
    let versionMarker;
    do {
      const r = await client.send(
        new s3.ListObjectVersionsCommand({
          Bucket,
          Prefix: keyPrefix,
          KeyMarker: keyMarker,
          VersionIdMarker: versionMarker,
        }),
      );
      const items = [...(r.Versions ?? []), ...(r.DeleteMarkers ?? [])].map((v) => ({
        Key: v.Key,
        VersionId: v.VersionId,
      }));
      for (let i = 0; i < items.length; i += 1000) {
        await client.send(
          new s3.DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: items.slice(i, i + 1000), Quiet: true },
          }),
        );
      }
      keyMarker = r.IsTruncated ? r.NextKeyMarker : undefined;
      versionMarker = r.IsTruncated ? r.NextVersionIdMarker : undefined;
    } while (keyMarker);
  }

  async function remove(logical) {
    const st = await stat(logical);
    if (!st) return;
    const keys = st.type === 'folder' ? await allKeysUnder(logical) : [key(logical)];
    await deleteKeys(keys);
    if (cfg.purgeVersions)
      await purgeVersionsUnder(st.type === 'folder' ? folderPrefix(logical) : key(logical));
  }

  async function move(from, to, o = {}) {
    await copy(from, to, o);
    // Move não é "remoção definitiva": o histórico de versões do destino já nasceu na cópia.
    const st = await stat(from);
    const keys = st?.type === 'folder' ? await allKeysUnder(from) : [key(from)];
    await deleteKeys(keys);
  }

  let versioningPromise;
  const supportsVersions = () => {
    versioningPromise ??= (async () => {
      if (cfg.versioning === 'true') return true;
      if (cfg.versioning === 'false') return false;
      try {
        const r = await client.send(new s3.GetBucketVersioningCommand({ Bucket }));
        return r.Status === 'Enabled';
      } catch {
        return false;
      }
    })();
    return versioningPromise;
  };

  async function versions(logical) {
    const k = key(logical);
    const out = [];
    let keyMarker;
    let versionMarker;
    do {
      const r = await client.send(
        new s3.ListObjectVersionsCommand({
          Bucket,
          Prefix: k,
          KeyMarker: keyMarker,
          VersionIdMarker: versionMarker,
        }),
      );
      for (const v of r.Versions ?? []) {
        if (v.Key !== k) continue;
        out.push({
          version: v.VersionId,
          modified: v.LastModified.toISOString(),
          size: v.Size,
          ...(v.IsLatest ? { current: true } : {}),
        });
      }
      keyMarker = r.IsTruncated ? r.NextKeyMarker : undefined;
      versionMarker = r.IsTruncated ? r.NextVersionIdMarker : undefined;
    } while (keyMarker);
    return out.sort((a, b) => b.modified.localeCompare(a.modified));
  }

  async function restoreVersion(logical, version) {
    await client.send(
      new s3.CopyObjectCommand({
        Bucket,
        Key: key(logical),
        CopySource: copySource(key(logical), version),
        ...sse,
      }),
    );
    return stat(logical);
  }

  async function readText(logical) {
    try {
      const r = await client.send(new s3.GetObjectCommand({ Bucket, Key: key(logical) }));
      return await r.Body.transformToString('utf-8');
    } catch (e) {
      if (isMissing(e)) return null;
      throw e;
    }
  }

  async function presignDownload(logical, { expires, version, disposition, contentType }) {
    const cmd = new s3.GetObjectCommand({
      Bucket,
      Key: key(logical),
      ...(version && version !== 'current' ? { VersionId: version } : {}),
      ResponseContentDisposition: disposition,
      ResponseContentType: contentType,
      ResponseCacheControl: 'no-store, private',
    });
    return getSignedUrl(client, cmd, { expiresIn: expires });
  }

  async function presignUpload(logical, { expires, contentType }) {
    // Só o Content-Type é assinado. O tamanho NÃO é imposto por um PUT assinado: use política do
    // bucket/cota e confira o objeto depois (ver README, "Upload direto").
    const cmd = new s3.PutObjectCommand({
      Bucket,
      Key: key(logical),
      ContentType: contentType,
      ...sse,
    });
    const url = await getSignedUrl(client, cmd, {
      expiresIn: expires,
      signableHeaders: new Set(['content-type']),
    });
    return { url, method: 'PUT', headers: { 'Content-Type': contentType } };
  }

  return {
    kind: 's3',
    supportsVersions,
    supportsDirectUpload: () => true,
    stat,
    list,
    walk,
    mkdir,
    put,
    get,
    copy,
    move,
    remove,
    versions,
    restoreVersion,
    readText,
    presignDownload,
    presignUpload,
  };
}
