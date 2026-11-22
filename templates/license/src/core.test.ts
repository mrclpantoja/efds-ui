import { describe, expect, it } from 'vitest';
import { base64urlDecode, base64urlEncode, canonicalize, hostMatches, verifyLicense } from './core';
import { baseLicense, makeKeys, sign } from './test-keys';

const { secretKey, publicKey } = makeKeys();
const other = makeKeys();
const opts = { publicKey, hostname: 'localhost' };

describe('canonicalize', () => {
  it('ordena as chaves em todos os níveis, sem espaços', () => {
    expect(canonicalize({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: 'x' } })).toBe(
      '{"a":{"c":"x","d":[2,{"y":2,"z":1}]},"b":1}',
    );
  });
  it('ignora undefined em objetos', () => {
    expect(canonicalize({ a: undefined, b: 1 })).toBe('{"b":1}');
  });
});

describe('base64url', () => {
  it('ida e volta e rejeita lixo', () => {
    const bytes = new Uint8Array([251, 255, 0, 1, 2]);
    expect(Array.from(base64urlDecode(base64urlEncode(bytes)) ?? [])).toEqual(Array.from(bytes));
    expect(base64urlDecode('não é base64')).toBeNull();
    expect(base64urlDecode('a')).toBeNull();
  });
});

describe('hostMatches', () => {
  it('aceita igual, subdomínio, caixa e ponto final', () => {
    expect(hostMatches('exemplo.gov.br', ['exemplo.gov.br'])).toBe(true);
    expect(hostMatches('app.Exemplo.gov.br.', ['EXEMPLO.gov.br'])).toBe(true);
  });
  it('recusa domínio vizinho', () => {
    expect(hostMatches('exemplo.gov.br.evil.com', ['exemplo.gov.br'])).toBe(false);
    expect(hostMatches('meuexemplo.gov.br', ['exemplo.gov.br'])).toBe(false);
  });
});

describe('verifyLicense', () => {
  it('aceita licença e chave válidas', () => {
    const license = baseLicense();
    const result = verifyLicense(license, sign(license, secretKey), opts);
    expect(result).toEqual({ ok: true, license });
  });

  it('aceita a chave pública em bytes', () => {
    const license = baseLicense();
    const bytes = base64urlDecode(publicKey)!;
    expect(
      verifyLicense(license, sign(license, secretKey), { publicKey: bytes, hostname: 'x' }).ok,
    ).toBe(true);
  });

  it('recusa campo adulterado', () => {
    const license = baseLicense();
    const key = sign(license, secretKey);
    expect(verifyLicense({ ...license, type: 'multi' }, key, opts)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
    expect(verifyLicense({ ...license, id: 'outro' }, key, opts)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('recusa chave de outro arquivo e de outro emissor', () => {
    const a = baseLicense({ id: 'a' });
    const b = baseLicense({ id: 'b' });
    expect(verifyLicense(a, sign(b, secretKey), opts)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
    expect(verifyLicense(a, sign(a, other.secretKey), opts)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('chave ausente ou lixo', () => {
    const license = baseLicense();
    expect(verifyLicense(license, undefined, opts)).toEqual({ ok: false, reason: 'missing-key' });
    expect(verifyLicense(license, '  ', opts)).toEqual({ ok: false, reason: 'missing-key' });
    for (const junk of ['lixo', '!!!', 'AAAA', 'x'.repeat(86)]) {
      expect(verifyLicense(license, junk, opts)).toEqual({ ok: false, reason: 'bad-signature' });
    }
  });

  it('chave pública marcador nunca valida', () => {
    const license = baseLicense();
    expect(
      verifyLicense(license, sign(license, secretKey), { publicKey: 'MARCADOR', hostname: 'x' }),
    ).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('formato inválido do arquivo', () => {
    const key = sign(baseLicense(), secretKey);
    for (const bad of [
      undefined,
      null,
      'texto',
      [],
      {},
      { ...baseLicense(), v: 2 },
      { ...baseLicense(), type: 'pro' },
      { ...baseLicense(), id: '' },
      { ...baseLicense(), domains: 'a.com' },
      { ...baseLicense(), domains: [] },
      { ...baseLicense(), domains: [1] },
    ]) {
      expect(verifyLicense(bad, key, opts)).toEqual({ ok: false, reason: 'invalid-file' });
    }
  });

  it('single exige domains', () => {
    const license = baseLicense({ type: 'single' });
    expect(verifyLicense(license, sign(license, secretKey), opts)).toEqual({
      ok: false,
      reason: 'invalid-file',
    });
  });

  it('confere o domínio: igual, subdomínio e vizinho', () => {
    const license = baseLicense({ type: 'single', domains: ['exemplo.gov.br'] });
    const key = sign(license, secretKey);
    const at = (hostname: string) => verifyLicense(license, key, { publicKey, hostname });
    expect(at('exemplo.gov.br').ok).toBe(true);
    expect(at('PAINEL.Exemplo.gov.br.').ok).toBe(true);
    expect(at('exemplo.gov.br.evil.com')).toEqual({ ok: false, reason: 'domain' });
    expect(at('localhost')).toEqual({ ok: false, reason: 'domain' });
  });

  it('sem domains, qualquer host serve, inclusive localhost', () => {
    const license = baseLicense({ type: 'free' });
    expect(
      verifyLicense(license, sign(license, secretKey), { publicKey, hostname: 'qualquer.com' }).ok,
    ).toBe(true);
  });
});
