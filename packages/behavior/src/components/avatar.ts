import { normalizeText } from '../core/data';
import { bindAll, type Behavior } from '../core/registry';

/** Quantos tons `.eds-avatar-tone-N` o core define. */
export const AVATAR_TONES = 6;

/** Tom (1 a 6) estável para um nome: o mesmo nome dá sempre a mesma cor, sem acento nem caixa. */
export function avatarTone(name: string): number {
  const text = normalizeText(name).replace(/\s+/g, ' ').trim();
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return (hash % AVATAR_TONES) + 1;
}

/** "Ana Souza" -> "AS"; uma palavra só -> as duas primeiras letras; vazio -> "". */
export function avatarInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  const first = words[0];
  if (!first) return '';
  const letters = (w: string) => Array.from(w.replace(/[^\p{L}]/gu, ''));
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const a = letters(first);
  const initials = last ? `${a[0] ?? ''}${letters(last)[0] ?? ''}` : a.slice(0, 2).join('');
  return initials.toLocaleUpperCase();
}

/**
 * Avatar (`.eds-avatar`): sem classe `.eds-avatar-tone-N`, escolhe o tom pelo nome (hash entre 6
 * tons com contraste AA) e, se o avatar estiver vazio e houver `data-name`, escreve as iniciais
 * e dá `role="img"` com o nome. O nome vem de `data-name`, do `aria-label` ou do texto. Quem
 * define o tom (classe ou `data-eds-tone`) não é alterado.
 */
export const avatarBehavior: Behavior = {
  name: 'avatar',
  selector: '.eds-avatar',
  bind(el) {
    const named = el.getAttribute('data-name');
    const name = (
      named ??
      el.getAttribute('aria-label') ??
      el.querySelector('img')?.getAttribute('alt') ??
      el.textContent ??
      ''
    ).trim();
    const hasTone = /\beds-avatar-tone-\d\b/.test(el.className) || el.hasAttribute('data-eds-tone');
    if (!hasTone && name !== '') el.classList.add(`eds-avatar-tone-${avatarTone(name)}`);
    if (named && el.childNodes.length === 0) {
      el.textContent = avatarInitials(named);
      if (!el.hasAttribute('role') && !el.hasAttribute('aria-hidden')) {
        el.setAttribute('role', 'img');
        if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', named);
      }
    }
  },
};

export function initAvatar(root: ParentNode = document): () => void {
  return bindAll(root, [avatarBehavior]);
}
