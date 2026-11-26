/** Auxiliares de teste: par de chaves gerado na hora; nunca a chave de produção. */
import { ed25519 } from '@noble/curves/ed25519.js';
import { base64urlEncode, canonicalize, type License } from './core';

export function makeKeys(): { secretKey: Uint8Array; publicKey: string } {
  const { secretKey, publicKey } = ed25519.keygen();
  return { secretKey, publicKey: base64urlEncode(publicKey) };
}

export function sign(license: unknown, secretKey: Uint8Array): string {
  return base64urlEncode(ed25519.sign(new TextEncoder().encode(canonicalize(license)), secretKey));
}

export function baseLicense(overrides: Partial<License> = {}): License {
  return {
    v: 1,
    id: 'teste-0001',
    product: 'painel',
    type: 'multi',
    issuedAt: '2026-11-22',
    ...overrides,
  };
}
