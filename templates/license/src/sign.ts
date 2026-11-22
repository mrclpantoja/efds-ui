/**
 * Emissão de licenças: usado só pelos scripts (`scripts/templates/`), nunca empacotado nos
 * templates. Os imports levam `.ts` para o Node executar este arquivo direto.
 */
import { ed25519 } from '@noble/curves/ed25519.js';
import { base64urlDecode, base64urlEncode, canonicalize } from './core.ts';

export interface KeyPair {
  /** Semente de 32 bytes em base64url (a chave privada). */
  secretKey: string;
  /** Chave pública de 32 bytes em base64url. */
  publicKey: string;
}

export function generateKeyPair(): KeyPair {
  const { secretKey, publicKey } = ed25519.keygen();
  return { secretKey: base64urlEncode(secretKey), publicKey: base64urlEncode(publicKey) };
}

function decodeSecret(secretKey: string): Uint8Array {
  const bytes = base64urlDecode(secretKey.trim());
  if (!bytes || bytes.length !== 32)
    throw new Error('Chave privada inválida (esperado base64url de 32 bytes).');
  return bytes;
}

export function publicKeyOf(secretKey: string): string {
  return base64urlEncode(ed25519.getPublicKey(decodeSecret(secretKey)));
}

/** Chave de licença = base64url da assinatura Ed25519 do JSON canônico. */
export function signLicense(license: unknown, secretKey: string): string {
  const signature = ed25519.sign(
    new TextEncoder().encode(canonicalize(license)),
    decodeSecret(secretKey),
  );
  return base64urlEncode(signature);
}
