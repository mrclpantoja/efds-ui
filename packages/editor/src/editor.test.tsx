import { fireEvent, screen } from '@testing-library/dom';
import { TextSelection } from 'prosemirror-state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditor, initEditors, type EditorInstance } from './index';

const instances: EditorInstance[] = [];
afterEach(() => {
  for (const i of instances.splice(0)) i.destroy();
  document.body.innerHTML = '';
});

function setup(html: string, attrs = '') {
  document.body.innerHTML = `<form id="f"><div class="eds-field"><label class="eds-label" for="c">Descrição</label>
    <textarea class="eds-textarea" id="c" name="conteudo" rows="6" ${attrs}>${html.replace(/</g, '&lt;')}</textarea></div>
    <button type="submit">Enviar</button></form>`;
  const textarea = document.querySelector('textarea')!;
  const editor = createEditor(textarea, { debounce: 10 });
  instances.push(editor);
  return { textarea, editor, form: document.querySelector('form')! };
}

function selectAll(editor: EditorInstance) {
  const { doc } = editor.view.state;
  editor.view.dispatch(
    editor.view.state.tr.setSelection(TextSelection.create(doc, 1, doc.content.size - 1)),
  );
}

function cursorAt(editor: EditorInstance, pos: number) {
  editor.view.dispatch(
    editor.view.state.tr.setSelection(TextSelection.create(editor.view.state.doc, pos)),
  );
}

const button = (name: string) => screen.getByRole('button', { name });

describe('editor ligado ao textarea', () => {
  it('esconde o textarea, monta a casca e nomeia o conteúdo pelo label', () => {
    const { textarea } = setup('<p>Olá</p>');
    expect(textarea).not.toBeVisible();
    const box = screen.getByRole('textbox', { name: 'Descrição' });
    expect(box).toHaveAttribute('contenteditable', 'true');
    expect(box).toHaveAttribute('aria-multiline', 'true');
    expect(box).toHaveClass('eds-editor-content', 'eds-prose');
    expect(box).toHaveTextContent('Olá');
    expect(
      document.querySelector<HTMLElement>('.eds-editor')!.style.getPropertyValue('--_editor-rows'),
    ).toBe('6');
    expect(screen.getByRole('toolbar', { name: 'Formatação' })).toHaveAttribute(
      'aria-controls',
      box.id,
    );
  });

  it('o textarea recebe o HTML limpo, com debounce, e o evento eds:editor-change', async () => {
    const { textarea, editor } = setup('<p>a</p>');
    const seen = vi.fn();
    textarea.addEventListener('eds:editor-change', (e) => seen((e as CustomEvent).detail.html));
    editor.view.dispatch(editor.view.state.tr.insertText('b', 2));
    expect(seen).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(seen).toHaveBeenCalledWith('<p>ab</p>'));
    expect(textarea.value).toBe('<p>ab</p>');
  });

  it('limpa o HTML inicial do textarea (script e style)', () => {
    const { textarea } = setup('<p style="color:red">x</p><script>1</script>');
    expect(textarea.value).toBe('<p>x</p>');
  });

  it('grava na hora no submit e no formdata', () => {
    const { textarea, editor, form } = setup('<p>a</p>');
    editor.view.dispatch(editor.view.state.tr.insertText('z', 2));
    form.addEventListener('submit', (e) => e.preventDefault());
    fireEvent.submit(form);
    expect(textarea.value).toBe('<p>az</p>');
    expect(new FormData(form).get('conteudo')).toBe('<p>az</p>');
  });

  it('reset do formulário restaura o conteúdo original', async () => {
    const { textarea, editor, form } = setup('<p>a</p>');
    editor.view.dispatch(editor.view.state.tr.insertText('z', 2));
    form.reset();
    await vi.waitFor(() => expect(editor.getHTML()).toBe('<p>a</p>'));
    expect(textarea.value).toBe('<p>a</p>');
  });

  it('disabled, readonly e aria-invalid do textarea viram estados do editor', async () => {
    const { textarea } = setup('<p>a</p>');
    const shell = document.querySelector('.eds-editor')!;
    const box = screen.getByRole('textbox');
    textarea.disabled = true;
    await vi.waitFor(() => expect(shell).toHaveAttribute('data-disabled'));
    expect(box).toHaveAttribute('contenteditable', 'false');
    expect(button('Negrito')).toBeDisabled();
    textarea.disabled = false;
    textarea.readOnly = true;
    await vi.waitFor(() => expect(shell).toHaveAttribute('data-readonly'));
    expect(box).toHaveAttribute('aria-readonly', 'true');
    textarea.readOnly = false;
    textarea.setAttribute('aria-invalid', 'true');
    await vi.waitFor(() => expect(shell).toHaveAttribute('data-invalid'));
    expect(box).toHaveAttribute('aria-invalid', 'true');
    textarea.setAttribute('aria-describedby', 'ajuda');
    await vi.waitFor(() => expect(box).toHaveAttribute('aria-describedby', 'ajuda'));
  });

  it('placeholder e data-empty', () => {
    const { editor } = setup('', 'placeholder="Escreva aqui"');
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('data-placeholder', 'Escreva aqui');
    expect(box).toHaveAttribute('data-empty');
    editor.setHTML('<p>x</p>');
    expect(box).not.toHaveAttribute('data-empty');
  });

  it('eventos focus e blur no textarea; destroy restaura o textarea', () => {
    const { textarea, editor } = setup('<p>a</p>');
    const names: string[] = [];
    for (const n of ['focus', 'blur']) {
      textarea.addEventListener(`eds:editor-${n}`, () => names.push(n));
    }
    const box = screen.getByRole('textbox');
    fireEvent.focus(box);
    fireEvent.blur(box);
    expect(names).toEqual(['focus', 'blur']);
    editor.destroy();
    expect(textarea.hidden).toBe(false);
    expect(document.querySelector('.eds-editor')).toBeNull();
  });

  it('emite eds:editor-ready com o editor', async () => {
    document.body.innerHTML = '<textarea id="t" data-eds-editor="basic"></textarea>';
    const ta = document.querySelector('textarea')!;
    const ready = vi.fn();
    ta.addEventListener('eds:editor-ready', (e) => ready((e as CustomEvent).detail.editor));
    const stop = initEditors(document);
    await vi.waitFor(() => expect(ready).toHaveBeenCalled());
    expect(ready.mock.calls[0]?.[0]?.view).toBeDefined();
    stop();
    expect(document.querySelector('.eds-editor')).toBeNull();
  });

  it('initEditors liga editores adicionados depois', async () => {
    const stop = initEditors(document);
    document.body.insertAdjacentHTML('beforeend', '<textarea id="n" data-eds-editor></textarea>');
    await vi.waitFor(() => expect(document.querySelector('.eds-editor')).not.toBeNull());
    stop();
  });

  it('textarea required: o conteúdo recebe aria-required', () => {
    setup('<p>a</p>', 'required');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });

  it('campo obrigatório vazio bloqueia o envio', () => {
    const { form } = setup('', 'required');
    const event = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.querySelector('.eds-editor')).toHaveAttribute('data-invalid');
  });

  it('envio recusado mostra o erro em texto, ligado ao conteúdo, e some ao digitar', async () => {
    const { form, editor } = setup('', 'required aria-describedby="ajuda"');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    const error = document.querySelector<HTMLElement>('p[id$="-required"]')!;
    expect(error).toHaveTextContent('Preencha o conteúdo.');
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box.getAttribute('aria-describedby')).toBe(`ajuda ${error.id}`);
    editor.view.dispatch(editor.view.state.tr.insertText('x', 1));
    await vi.waitFor(() => expect(document.querySelector('p[id$="-required"]')).toBeNull());
    expect(box).not.toHaveAttribute('aria-invalid');
    expect(box.getAttribute('aria-describedby')).toBe('ajuda');
  });

  it('placeholder é exposto por aria-placeholder; somente leitura entra na ordem de Tab', () => {
    setup('', 'placeholder="Escreva aqui"');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-placeholder', 'Escreva aqui');
    instances.splice(0).forEach((i) => i.destroy());
    setup('<p>a</p>', 'readonly');
    expect(screen.getByRole('textbox')).toHaveAttribute('tabindex', '0');
  });
});

describe('comandos e barra', () => {
  it('Negrito alterna pela barra e por Ctrl+B, com aria-pressed sincronizado', () => {
    const { editor } = setup('<p>texto</p>');
    selectAll(editor);
    fireEvent.click(button('Negrito'));
    expect(editor.getHTML()).toBe('<p><strong>texto</strong></p>');
    expect(button('Negrito')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(editor.content, { key: 'b', ctrlKey: true });
    expect(editor.getHTML()).toBe('<p>texto</p>');
    expect(button('Negrito')).toHaveAttribute('aria-pressed', 'false');
  });

  it('itálico, sublinhado e tachado (Ctrl+Shift+X)', () => {
    const { editor } = setup('<p>a</p>');
    selectAll(editor);
    fireEvent.keyDown(editor.content, { key: 'i', ctrlKey: true });
    fireEvent.keyDown(editor.content, { key: 'u', ctrlKey: true });
    fireEvent.keyDown(editor.content, { key: 'X', keyCode: 88, ctrlKey: true, shiftKey: true });
    expect(editor.getHTML()).toBe('<p><em><u><s>a</s></u></em></p>');
  });

  it('estilo do bloco: select reflete a seleção e aplica títulos', () => {
    const { editor } = setup('<h3>t</h3><p>p</p>');
    const block = screen.getByRole('combobox', { name: 'Estilo do bloco' }) as HTMLSelectElement;
    cursorAt(editor, 2);
    expect(block.value).toBe('h3');
    fireEvent.change(block, { target: { value: 'h2' } });
    expect(editor.getHTML()).toBe('<h2>t</h2><p>p</p>');
    fireEvent.keyDown(editor.content, { key: '0', ctrlKey: true, altKey: true });
    expect(editor.getHTML()).toBe('<p>t</p><p>p</p>');
    fireEvent.keyDown(editor.content, { key: '4', ctrlKey: true, altKey: true });
    expect(editor.getHTML()).toBe('<h4>t</h4><p>p</p>');
  });

  it('fonte: select aplica e reflete', () => {
    const { editor } = setup('<p>a</p>');
    selectAll(editor);
    const font = screen.getByRole('combobox', { name: 'Fonte' }) as HTMLSelectElement;
    expect(font.value).toBe('sans');
    fireEvent.change(font, { target: { value: 'mono' } });
    expect(editor.getHTML()).toBe('<p><span class="eds-prose-font-mono">a</span></p>');
    expect(font.value).toBe('mono');
    fireEvent.change(font, { target: { value: 'sans' } });
    expect(editor.getHTML()).toBe('<p>a</p>');
  });

  it('alinhamento por classe, com aria-pressed', () => {
    const { editor } = setup('<p>a</p>');
    fireEvent.click(button('Centralizar'));
    expect(editor.getHTML()).toBe('<p class="eds-prose-align-center">a</p>');
    expect(button('Centralizar')).toHaveAttribute('aria-pressed', 'true');
    expect(button('Alinhar à esquerda')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button('Justificar'));
    expect(editor.getHTML()).toBe('<p class="eds-prose-align-justify">a</p>');
  });

  it('listas: criar, trocar de tipo e desfazer; atalhos Ctrl+Shift+7/8', () => {
    const { editor } = setup('<p>a</p>');
    fireEvent.click(button('Lista com marcadores'));
    expect(editor.getHTML()).toBe('<ul><li>a</li></ul>');
    expect(button('Lista com marcadores')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(editor.content, { key: '7', ctrlKey: true, shiftKey: true });
    expect(editor.getHTML()).toBe('<ol><li>a</li></ol>');
    fireEvent.click(button('Lista numerada'));
    expect(editor.getHTML()).toBe('<p>a</p>');
    fireEvent.keyDown(editor.content, { key: '8', ctrlKey: true, shiftKey: true });
    expect(editor.getHTML()).toBe('<ul><li>a</li></ul>');
  });

  it('desfazer e refazer; indisponíveis ficam com aria-disabled', () => {
    const { editor } = setup('<p>a</p>');
    expect(button('Desfazer')).toHaveAttribute('aria-disabled', 'true');
    selectAll(editor);
    fireEvent.click(button('Negrito'));
    expect(button('Desfazer')).not.toHaveAttribute('aria-disabled');
    fireEvent.click(button('Desfazer'));
    expect(editor.getHTML()).toBe('<p>a</p>');
    expect(button('Refazer')).not.toHaveAttribute('aria-disabled');
    fireEvent.keyDown(editor.content, { key: 'y', ctrlKey: true });
    expect(editor.getHTML()).toBe('<p><strong>a</strong></p>');
  });

  it('limpar formatação: tira marcas, alinhamento e título, mantém o link', () => {
    const { editor } = setup(
      '<h2 class="eds-prose-align-center"><strong><a href="https://x.test">a</a></strong> <em>b</em></h2>',
    );
    selectAll(editor);
    fireEvent.click(button('Limpar formatação'));
    expect(editor.getHTML()).toBe('<p><a href="https://x.test">a</a> b</p>');
  });

  it('regras de entrada: "- " e "## "', () => {
    const { editor } = setup('<p></p>');
    const type = (text: string) => {
      const { from } = editor.view.state.selection;
      const handled = editor.view.someProp('handleTextInput', (f) =>
        f(editor.view, from, from, text, () => editor.view.state.tr.insertText(text, from, from)),
      );
      if (!handled) editor.view.dispatch(editor.view.state.tr.insertText(text));
    };
    type('-');
    type(' ');
    type('x');
    expect(editor.getHTML()).toBe('<ul><li>x</li></ul>');
    editor.setHTML('<p></p>');
    type('#');
    type('#');
    type(' ');
    type('t');
    expect(editor.getHTML()).toBe('<h2>t</h2>');
  });
});

describe('tabela', () => {
  const openMenu = () => {
    fireEvent.click(button('Tabela'));
  };
  const item = (name: string) => screen.getByRole('button', { name });
  const count = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

  it('insere 3x3 com cabeçalho; linhas e colunas; exclui', () => {
    const { editor } = setup('<p>a</p>');
    openMenu();
    expect(button('Tabela')).toHaveAttribute('aria-expanded', 'true');
    expect(item('Excluir tabela')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item('Inserir tabela 3×3'));
    expect(button('Tabela')).toHaveAttribute('aria-expanded', 'false');
    const html = editor.getHTML();
    expect(html).toContain(
      '<thead><tr><th scope="col"></th><th scope="col"></th><th scope="col"></th></tr></thead>',
    );
    expect(count(html, /<tr>/g)).toBe(3);
    expect(count(html, /<td>/g)).toBe(6);

    openMenu();
    fireEvent.click(item('Inserir linha abaixo'));
    expect(count(editor.getHTML(), /<tr>/g)).toBe(4);
    openMenu();
    fireEvent.click(item('Inserir coluna à direita'));
    expect(count(editor.getHTML(), /<th /g)).toBe(4);
    openMenu();
    fireEvent.click(item('Excluir coluna'));
    expect(count(editor.getHTML(), /<th /g)).toBe(3);
    openMenu();
    fireEvent.click(item('Excluir linha'));
    expect(count(editor.getHTML(), /<tr>/g)).toBe(3);
    openMenu();
    fireEvent.click(item('Excluir tabela'));
    expect(editor.getHTML()).not.toContain('<table');
  });

  it('Tab navega entre células e, fora da tabela, não é capturado', () => {
    const { editor } = setup(
      '<table><tr><th>a</th><th>b</th></tr><tr><td>c</td><td>d</td></tr></table>',
    );
    cursorAt(editor, 3);
    const before = editor.view.state.selection.from;
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    editor.content.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(editor.view.state.selection.from).toBeGreaterThan(before);

    editor.setHTML('<p>fora</p>');
    const out = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    editor.content.dispatchEvent(out);
    expect(out.defaultPrevented).toBe(false);
  });
});

describe('barra por teclado (APG Toolbar)', () => {
  it('tem uma só parada de Tab e setas, Home e End movem o foco', () => {
    setup('<p>a</p>');
    const toolbar = screen.getByRole('toolbar');
    const controls = Array.from(toolbar.querySelectorAll<HTMLElement>('button, select')).filter(
      (el) => !el.closest('.eds-dropdown'),
    );
    const stops = controls.filter((el) => el.tabIndex === 0);
    expect(stops).toHaveLength(1);
    const first = stops[0]!;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = document.activeElement as HTMLElement;
    expect(second).not.toBe(first);
    expect(second.tabIndex).toBe(0);
    expect(first.tabIndex).toBe(-1);
    fireEvent.keyDown(second, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'End' });
    const last = document.activeElement as HTMLElement;
    expect(last).toHaveAccessibleName('Limpar formatação');
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'End' });
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(first);
  });

  it('Esc volta ao conteúdo; Alt+F10 do conteúdo vai à barra', () => {
    const { editor } = setup('<p>a</p>');
    editor.focus();
    fireEvent.keyDown(editor.content, { key: 'F10', altKey: true });
    const active = document.activeElement as HTMLElement;
    expect(screen.getByRole('toolbar').contains(active)).toBe(true);
    fireEvent.keyDown(active, { key: 'Escape' });
    expect(editor.content.contains(document.activeElement)).toBe(true);
  });

  it('botões têm aria-keyshortcuts e o menu da tabela é disclosure', () => {
    setup('<p>a</p>');
    expect(button('Negrito')).toHaveAttribute('aria-keyshortcuts', 'Control+B');
    const table = button('Tabela');
    expect(table).toHaveAttribute('aria-haspopup', 'true');
    expect(table).toHaveAttribute('aria-expanded', 'false');
  });

  it('Esc no menu da tabela fecha e devolve o foco ao gatilho', () => {
    setup('<p>a</p>');
    const table = button('Tabela');
    fireEvent.click(table);
    expect(table).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toHaveTextContent('Inserir tabela 3×3');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(table).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(table);
  });
});

describe('link', () => {
  const dialog = () => document.querySelector('dialog')!;

  it('Ctrl+K abre o diálogo; aplica link em texto selecionado', () => {
    const { editor } = setup('<p>site</p>');
    selectAll(editor);
    fireEvent.keyDown(editor.content, { key: 'k', ctrlKey: true });
    expect(dialog()).toHaveAttribute('open');
    fireEvent.input(screen.getByLabelText('Endereço'), {
      target: { value: 'https://exemplo.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(editor.getHTML()).toBe('<p><a href="https://exemplo.test">site</a></p>');
    expect(button('Link')).toHaveAttribute('aria-pressed', 'true');
  });

  it('recusa javascript: com erro visível ligado ao campo', () => {
    const { editor } = setup('<p>x</p>');
    selectAll(editor);
    fireEvent.click(button('Link'));
    const address = screen.getByLabelText('Endereço');
    fireEvent.input(address, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(editor.getHTML()).toBe('<p>x</p>');
    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(address).toHaveAccessibleDescription(/Endereço inválido/);
    expect(dialog()).toHaveAttribute('open');
  });

  it('sem seleção insere o texto informado; "Remover link" desfaz', () => {
    const { editor } = setup('<p>a</p>');
    cursorAt(editor, 2);
    fireEvent.click(button('Link'));
    fireEvent.input(screen.getByLabelText('Endereço'), { target: { value: '/ajuda' } });
    fireEvent.input(screen.getByLabelText('Texto'), { target: { value: 'ajuda' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(editor.getHTML()).toBe('<p>a<a href="/ajuda">ajuda</a></p>');

    cursorAt(editor, 4);
    fireEvent.click(button('Link'));
    expect(screen.getByLabelText('Endereço')).toHaveValue('/ajuda');
    fireEvent.click(screen.getByRole('button', { name: 'Remover link' }));
    expect(editor.getHTML()).toBe('<p>aajuda</p>');
  });
});
