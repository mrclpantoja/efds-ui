/*
 * Tom e iniciais do Avatar. O mesmo algoritmo do `@efds-ui/behavior` (`avatarTone` e
 * `avatarInitials`): a mesma pessoa tem a mesma cor no HTML e no React. Os dois pacotes
 * conferem os mesmos valores em teste.
 */

/** Quantos tons `.eds-avatar-tone-N` o core define. */
export const AVATAR_TONES = 6;

const strip = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Tom (1 a 6) estável para um nome: sem acento nem caixa. */
export function avatarTone(name: string): number {
  const text = strip(name).replace(/\s+/g, ' ').trim();
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
