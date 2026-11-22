import { describe, expect, it } from 'vitest';
import { AllSelection, EditorState } from 'prosemirror-state';
import { toggleBold, toggleItalic, toggleStrike, toggleUnderline } from './commands';
import { htmlToDoc } from './html';
import { basicSchema } from './schema';

function selectAll(html: string): EditorState {
  const state = EditorState.create({ schema: basicSchema, doc: htmlToDoc(html) });
  return state.apply(state.tr.setSelection(new AllSelection(state.doc)));
}

describe('marcas com seleção de vários blocos (Ctrl+A)', () => {
  const html = '<h2>Resumo</h2><p>Texto <strong>forte</strong></p>';
  const cases = [
    ['negrito', toggleBold, 'strong'],
    ['itálico', toggleItalic, 'em'],
    ['sublinhado', toggleUnderline, 'underline'],
    ['tachado', toggleStrike, 'strike'],
  ] as const;

  for (const [name, command, mark] of cases) {
    it(`${name} se aplica a tudo e se desfaz`, () => {
      const state = selectAll(html);
      let applied: EditorState | null = null;
      expect(command(state, (tr) => (applied = state.apply(tr)))).toBe(true);
      const on = applied as EditorState | null;
      expect(on).not.toBeNull();
      let all = true;
      on!.doc.descendants((node) => {
        if (node.isText && !node.marks.some((m) => m.type.name === mark)) all = false;
      });
      expect(all).toBe(true);
    });
  }
});
