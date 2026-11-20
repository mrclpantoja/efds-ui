import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { initAccordion } from './accordion';

describe('accordion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('item indisponível não alterna; os outros sim', async () => {
    document.body.innerHTML = `<div class="eds-accordion">
      <details id="a"><summary class="eds-accordion-trigger">A</summary><div>x</div></details>
      <details id="b"><summary class="eds-accordion-trigger" aria-disabled="true">B</summary><div>y</div></details></div>`;
    const destroy = initAccordion(document);
    const user = userEvent.setup();
    await user.click(document.querySelector('#a summary') as HTMLElement);
    await user.click(document.querySelector('#b summary') as HTMLElement);
    expect((document.getElementById('a') as HTMLDetailsElement).open).toBe(true);
    expect((document.getElementById('b') as HTMLDetailsElement).open).toBe(false);
    destroy();
  });
});
