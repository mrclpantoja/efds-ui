// Configuração por variáveis de ambiente (veja .env.example). Nada de credenciais no código.

/**
 * @typedef {object} Config
 * @property {'fs' | 's3'} driver
 * @property {string} root                 pasta raiz do driver fs
 * @property {string} basePath             prefixo da API (o `data-eds-files-api` do cliente)
 * @property {string} locale               ordenação por nome
 * @property {number} maxUploadBytes
 * @property {string[]} accept             MIME/extensões aceitos; vazio = qualquer um não bloqueado
 * @property {number} trashRetentionDays   0 desliga a lixeira
 * @property {number} maxVersions          versões guardadas por arquivo (driver fs)
 * @property {number} signedUrlTtl         segundos (limitado a 300)
 * @property {boolean} directUpload
 * @property {boolean} redirectDownloads
 * @property {Record<string, { user: string, acl: Record<string, string> }>} tokens
 * @property {object} s3
 */

const bool = (v, fallback = false) =>
  v === undefined || v === '' ? fallback : /^(1|true|yes)$/i.test(v);
const int = (v, fallback) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** @returns {Config} */
export function loadConfig(env = process.env) {
  const driver = env.STORAGE_DRIVER === 's3' ? 's3' : 'fs';
  let tokens = {};
  if (env.FILES_TOKENS) {
    try {
      tokens = JSON.parse(env.FILES_TOKENS);
    } catch {
      throw new Error('FILES_TOKENS deve ser um JSON válido.');
    }
  }
  return {
    driver,
    root: env.FILES_ROOT ?? './storage',
    basePath: (env.FILES_BASE_PATH ?? '/api/arquivos').replace(/\/+$/, ''),
    locale: env.FILES_LOCALE ?? 'pt-BR',
    maxUploadBytes: int(env.MAX_UPLOAD_BYTES, 50 * 1024 * 1024),
    accept: (env.ACCEPT ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    trashRetentionDays: int(env.TRASH_RETENTION_DAYS, 30),
    maxVersions: int(env.MAX_VERSIONS, 20),
    signedUrlTtl: Math.min(int(env.SIGNED_URL_TTL, 300), 300), // contrato: <= 5 minutos
    directUpload: bool(env.S3_DIRECT_UPLOAD),
    redirectDownloads: bool(env.S3_REDIRECT_DOWNLOADS),
    tokens,
    s3: {
      bucket: env.S3_BUCKET ?? '',
      region: env.S3_REGION,
      prefix: env.S3_PREFIX ?? '',
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: bool(env.S3_FORCE_PATH_STYLE),
      versioning: env.S3_VERSIONING ?? 'auto',
      sse: env.S3_SSE || undefined,
      purgeVersions: bool(env.S3_PURGE_VERSIONS),
    },
  };
}
