import { ed25519 } from '@noble/curves/ed25519.js';

export type LicenseType = 'single' | 'multi';

export interface License {
  v: 1;
  id: string;
  product: string;
  type: LicenseType;
  domains?: string[];
  issuedAt: string;
}

export type LicenseFailure = 'missing-key' | 'invalid-file' | 'bad-signature' | 'domain';

export type VerifyResult = { ok: true; license: License } | { ok: false; reason: LicenseFailure };

export interface VerifyOptions {
  /** Chave pública Ed25519: 32 bytes ou base64url. */
  publicKey: Uint8Array | string;
  /** `location.hostname` do site que executa o template. */
  hostname: string;
}

/** JSON canônico: chaves em ordem alfabética (recursivo), sem espaços. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? 'null' : canonicalize(item))).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of Object.keys(record).sort()) {
    const item = record[key];
    if (item === undefined || typeof item === 'function') continue;
    parts.push(`${JSON.stringify(key)}:${canonicalize(item)}`);
  }
  return `{${parts.join(',')}}`;
}

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Devolve `null` quando o texto não é base64url válido. */
export function base64urlDecode(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) return null;
  const padded = text
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(text.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

const TYPES: readonly string[] = ['single', 'multi'];

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.+$/, '');
}

/** Valida o formato do arquivo de licença. */
export function parseLicense(input: unknown): License | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (raw.v !== 1) return null;
  if (typeof raw.id !== 'string' || raw.id === '') return null;
  if (typeof raw.product !== 'string' || raw.product === '') return null;
  if (typeof raw.type !== 'string' || !TYPES.includes(raw.type)) return null;
  if (typeof raw.issuedAt !== 'string' || raw.issuedAt === '') return null;
  if (raw.domains !== undefined) {
    if (!Array.isArray(raw.domains) || raw.domains.length === 0) return null;
    if (!raw.domains.every((d) => typeof d === 'string' && normalizeHost(d) !== '')) return null;
  } else if (raw.type === 'single') {
    return null;
  }
  return raw as unknown as License;
}

/** Igual ou subdomínio, sem diferença de caixa, ignorando o ponto final. */
export function hostMatches(hostname: string, domains: readonly string[]): boolean {
  const host = normalizeHost(hostname);
  if (host === '') return false;
  return domains.some((entry) => {
    const domain = normalizeHost(entry);
    return host === domain || host.endsWith(`.${domain}`);
  });
}

export function verifyLicense(
  license: unknown,
  key: string | undefined,
  opts: VerifyOptions,
): VerifyResult {
  const parsed = parseLicense(license);
  if (!parsed) return { ok: false, reason: 'invalid-file' };
  if (typeof key !== 'string' || key.trim() === '') return { ok: false, reason: 'missing-key' };

  const signature = base64urlDecode(key.trim());
  const publicKey =
    typeof opts.publicKey === 'string' ? base64urlDecode(opts.publicKey) : opts.publicKey;
  let valid = false;
  if (signature && publicKey && signature.length === 64 && publicKey.length === 32) {
    try {
      valid = ed25519.verify(signature, new TextEncoder().encode(canonicalize(parsed)), publicKey);
    } catch {
      valid = false;
    }
  }
  if (!valid) return { ok: false, reason: 'bad-signature' };

  if (parsed.domains && !hostMatches(opts.hostname, parsed.domains)) {
    return { ok: false, reason: 'domain' };
  }
  return { ok: true, license: parsed };
}
