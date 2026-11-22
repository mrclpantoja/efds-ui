import { describe, expect, it } from 'vitest';
import {
  announcement,
  clampIndex,
  indexForKey,
  neighborIndexes,
  swipeDirection,
} from './gallery-logic';

describe('lógica da galeria', () => {
  it('índice sem volta ao início', () => {
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 0)).toBe(0);
    expect(indexForKey('ArrowRight', 2, 3)).toBe(2);
    expect(indexForKey('ArrowLeft', 0, 3)).toBe(0);
    expect(indexForKey('Home', 2, 3)).toBe(0);
    expect(indexForKey('End', 0, 3)).toBe(2);
    expect(indexForKey('ArrowRight', 1, 3, true)).toBe(0);
    expect(indexForKey('a', 1, 3)).toBeNull();
  });

  it('deslizar, vizinhas e anúncio', () => {
    expect(swipeDirection(-80, 5)).toBe(1);
    expect(swipeDirection(80, 5)).toBe(-1);
    expect(swipeDirection(30, 0)).toBe(0);
    expect(swipeDirection(80, 80)).toBe(0);
    expect(neighborIndexes(0, 3)).toEqual([1]);
    expect(neighborIndexes(1, 3)).toEqual([0, 2]);
    expect(announcement('3 de 12', ' Praia ')).toBe('3 de 12. Praia');
    expect(announcement('3 de 12', '')).toBe('3 de 12');
  });
});
