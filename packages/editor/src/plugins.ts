import { baseKeymap, chainCommands, exitCode } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history, redo, undo } from 'prosemirror-history';
import {
  InputRule,
  inputRules,
  textblockTypeInputRule,
  undoInputRule,
  wrappingInputRule,
} from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Plugin } from 'prosemirror-state';
import { goToNextCell, tableEditing } from 'prosemirror-tables';
import { splitListItem } from 'prosemirror-schema-list';
import { basicSchema } from './schema';
import {
  setBlock,
  toggleBold,
  toggleItalic,
  toggleList,
  toggleStrike,
  toggleUnderline,
} from './commands';

const { heading, bullet_list, ordered_list, list_item, hard_break } = basicSchema.nodes;

export interface PluginHooks {
  /** Ctrl/Cmd+K: abre o diálogo de link. */
  onLink: () => void;
  /** Alt+F10: leva o foco à barra. */
  onToolbar: () => void;
}

function inputRulesPlugin(): Plugin {
  const rules: InputRule[] = [
    wrappingInputRule(/^\s*([-*])\s$/, bullet_list!),
    wrappingInputRule(/^1\.\s$/, ordered_list!),
    textblockTypeInputRule(/^#{2}\s$/, heading!, { level: 2 }),
    textblockTypeInputRule(/^#{3}\s$/, heading!, { level: 3 }),
    textblockTypeInputRule(/^#{4}\s$/, heading!, { level: 4 }),
  ];
  return inputRules({ rules });
}

const insertBreak = chainCommands(exitCode, (state, dispatch) => {
  if (dispatch) dispatch(state.tr.replaceSelectionWith(hard_break!.create()).scrollIntoView());
  return true;
});

/** Plugins do editor: histórico, atalhos, regras de entrada, tabelas, cursores e colar limpo. */
export function createPlugins(hooks: PluginHooks): Plugin[] {
  return [
    history(),
    inputRulesPlugin(),
    keymap({
      Backspace: undoInputRule,
      'Mod-z': undo,
      'Mod-y': redo,
      'Shift-Mod-z': redo,
      'Mod-b': toggleBold,
      'Mod-i': toggleItalic,
      'Mod-u': toggleUnderline,
      'Mod-Shift-x': toggleStrike,
      'Mod-k': () => {
        hooks.onLink();
        return true;
      },
      'Mod-Alt-0': setBlock('paragraph'),
      'Mod-Alt-2': setBlock('h2'),
      'Mod-Alt-3': setBlock('h3'),
      'Mod-Alt-4': setBlock('h4'),
      'Mod-Shift-7': toggleList('ordered'),
      'Mod-Shift-8': toggleList('bullet'),
      'Alt-F10': () => {
        hooks.onToolbar();
        return true;
      },
      'Shift-Enter': insertBreak,
      Enter: splitListItem(list_item!),
      // Tab navega as células dentro da tabela; fora dela o Tab sai do editor (não é capturado).
      Tab: goToNextCell(1),
      'Shift-Tab': goToNextCell(-1),
    }),
    keymap(baseKeymap),
    dropCursor({ color: 'currentColor', width: 2 }),
    gapCursor(),
    tableEditing(),
  ];
}
