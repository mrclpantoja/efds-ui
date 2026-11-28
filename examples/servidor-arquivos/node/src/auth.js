// Autenticação e autorização de EXEMPLO. Troque pela do seu sistema (sessão, JWT, SSO).
// O contrato só exige: autenticar a cada chamada e autorizar por pasta e por operação.
import { createHash, timingSafeEqual } from 'node:crypto';
import { FilesError } from './errors.js';

const sha = (s) => createHash('sha256').update(s).digest();

/**
 * Autenticador por token Bearer. `tokens` = { "<token>": { user: "ana", acl: { "/contratos": "rwd" } } }
 * `acl`: prefixo de pasta -> letras de permissão: r (ler/listar), w (gravar), d (excluir).
 * "{user}" no prefixo vira o id do usuário (ex.: "/usuarios/{user}").
 */
export function createTokenAuthenticator(tokens) {
  const entries = Object.entries(tokens ?? {}).map(([token, def]) => ({ hash: sha(token), def }));
  return function authenticate(req) {
    const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (match) {
      const given = sha(match[1]);
      for (const { hash, def } of entries) {
        if (timingSafeEqual(hash, given))
          return { id: def.user, acl: expandAcl(def.acl, def.user) };
      }
    }
    throw new FilesError('forbidden', 'Autenticação necessária.', { status: 401 });
  };
}

function expandAcl(acl = {}, userId) {
  return Object.entries(acl).map(([prefix, letters]) => ({
    prefix: prefix.replaceAll('{user}', userId).replace(/\/+$/, '') || '/',
    letters: String(letters),
  }));
}

const LETTER = { read: 'r', write: 'w', delete: 'd' };

/** Regra mais específica (prefixo mais longo) vence. */
function ruleFor(user, path) {
  let best = null;
  for (const rule of user.acl) {
    const inside =
      rule.prefix === '/' || path === rule.prefix || path.startsWith(rule.prefix + '/');
    if (inside && (!best || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best;
}

/**
 * @param {{ acl: { prefix: string, letters: string }[] }} user
 * @param {'list' | 'read' | 'write' | 'delete'} ability
 * `list` vale também para pastas "de passagem" (ancestrais de uma pasta permitida).
 */
export function can(user, ability, path) {
  if (ability === 'list') {
    if (can(user, 'read', path)) return true;
    return user.acl.some(
      (r) => r.letters.includes('r') && (path === '/' || r.prefix.startsWith(path + '/')),
    );
  }
  return ruleFor(user, path)?.letters.includes(LETTER[ability]) ?? false;
}

export const canAnywhere = (user, ability) =>
  user.acl.some((r) => r.letters.includes(LETTER[ability]));
