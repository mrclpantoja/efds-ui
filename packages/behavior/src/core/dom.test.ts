import { describe, expect, it } from 'vitest';
import { flag } from './dom';

const el = (attrs: string) => {
  const host = document.createElement('div');
  host.innerHTML = `<div ${attrs}></div>`;
  return host.firstElementChild as HTMLElement;
};

describe('flag', () => {
  it('presença liga, ="false" desliga e ausente usa o padrão', () => {
    expect(flag(el('data-eds-x'), 'data-eds-x')).toBe(true);
    expect(flag(el('data-eds-x=""'), 'data-eds-x')).toBe(true);
    expect(flag(el('data-eds-x="true"'), 'data-eds-x')).toBe(true);
    expect(flag(el('data-eds-x="false"'), 'data-eds-x')).toBe(false);
    expect(flag(el(''), 'data-eds-x')).toBe(false);
    expect(flag(el(''), 'data-eds-x', true)).toBe(true);
    expect(flag(el('data-eds-x="false"'), 'data-eds-x', true)).toBe(false);
  });

  it('"off" não vale mais como desligado', () => {
    expect(flag(el('data-eds-x="off"'), 'data-eds-x')).toBe(true);
  });
});
