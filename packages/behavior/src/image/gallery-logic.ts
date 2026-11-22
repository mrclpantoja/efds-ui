/**
 * Regras puras da galeria (índice da imagem, teclas, deslizar), iguais no HTML e no React.
 * Sem volta ao início: nas pontas o botão fica desabilitado.
 */

/** Índice dentro de `0..total-1` (ou 0 sem itens). */
export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, Math.trunc(index)));
}

/**
 * Novo índice para a tecla (setas, Home, End), ou `null` se a tecla não navega.
 * `rtl`: em leitura da direita para a esquerda as setas trocam de sentido.
 */
export function indexForKey(key: string, index: number, total: number, rtl = false): number | null {
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (key === forward) return clampIndex(index + 1, total);
  if (key === back) return clampIndex(index - 1, total);
  if (key === 'Home') return 0;
  if (key === 'End') return clampIndex(total - 1, total);
  return null;
}

/**
 * Deslizar no toque: `1` (próxima), `-1` (anterior) ou `0` (não foi um deslize). O gesto precisa
 * ser sobretudo horizontal e passar de `threshold` px, para não confundir com rolar a página.
 */
export function swipeDirection(dx: number, dy: number, threshold = 50): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/** Índices vizinhos (anterior e próximo) que valem a pena carregar antes. */
export function neighborIndexes(index: number, total: number): number[] {
  const result: number[] = [];
  if (index > 0) result.push(index - 1);
  if (index < total - 1) result.push(index + 1);
  return result;
}

/** Texto lido a cada troca: "3 de 12" e, se houver, a legenda. */
export function announcement(counter: string, caption: string): string {
  const text = caption.trim();
  return text === '' ? counter : `${counter}. ${text}`;
}
