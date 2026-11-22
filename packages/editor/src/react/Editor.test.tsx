import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef, useState } from 'react';
import { TextSelection } from 'prosemirror-state';
import { describe, expect, it, vi } from 'vitest';
import { Editor, type EditorRef } from './index';

const selectAll = (ref: React.RefObject<EditorRef | null>) => {
  const view = ref.current!.view!;
  view.dispatch(
    view.state.tr.setSelection(
      TextSelection.create(view.state.doc, 1, view.state.doc.content.size - 1),
    ),
  );
};

describe('<Editor>', () => {
  it('emite o markup do core e nomeia o conteúdo pelo label', () => {
    render(<Editor label="Descrição" defaultValue="<p>Oi</p>" rows={5} placeholder="Escreva" />);
    const box = screen.getByRole('textbox', { name: 'Descrição' });
    expect(box).toHaveClass('eds-editor-content', 'eds-prose');
    expect(box).toHaveTextContent('Oi');
    expect(box).toHaveAttribute('data-placeholder', 'Escreva');
    expect(screen.getByRole('toolbar', { name: 'Formatação' })).toBeInTheDocument();
    expect(document.querySelector('.eds-field > .eds-editor')).not.toBeNull();
    expect(document.querySelector('label.eds-label')).toHaveTextContent('Descrição');
  });

  it('não controlado: onChange recebe o HTML e o ref expõe a API', async () => {
    const onChange = vi.fn();
    const ref = createRef<EditorRef>();
    render(<Editor ref={ref} label="Texto" defaultValue="<p>a</p>" onChange={onChange} />);
    expect(ref.current?.getHTML()).toBe('<p>a</p>');
    selectAll(ref);
    fireEvent.click(screen.getByRole('button', { name: 'Negrito' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('<p><strong>a</strong></p>'));
    act(() => ref.current?.setHTML('<h2>novo</h2>'));
    expect(ref.current?.getHTML()).toBe('<h2>novo</h2>');
    expect(ref.current?.view).not.toBeNull();
  });

  it('controlado: valor novo de fora entra no editor sem disparar onChange', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState('<p>um</p>');
      return (
        <>
          <Editor
            label="Texto"
            value={value}
            onChange={(html) => {
              onChange(html);
              setValue(html);
            }}
          />
          <button type="button" onClick={() => setValue('<p>dois</p>')}>
            Trocar
          </button>
        </>
      );
    }
    render(<Harness />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveTextContent('um');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    await waitFor(() => expect(box).toHaveTextContent('dois'));
    await new Promise((r) => setTimeout(r, 250));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('com name, um input hidden leva o HTML no formulário', async () => {
    const ref = createRef<EditorRef>();
    render(
      <form data-testid="f">
        <Editor ref={ref} label="Texto" name="conteudo" defaultValue="<p>a</p>" />
      </form>,
    );
    const form = screen.getByTestId('f') as HTMLFormElement;
    expect(new FormData(form).get('conteudo')).toBe('<p>a</p>');
    const view = ref.current!.view!;
    view.dispatch(view.state.tr.insertText('b', 2));
    fireEvent.submit(form);
    expect(new FormData(form).get('conteudo')).toBe('<p>ab</p>');
  });

  it('o hidden acompanha o texto mesmo depois de o React renderizar de novo (modo controlado)', async () => {
    const ref = createRef<EditorRef>();
    function Harness() {
      const [value, setValue] = useState('<p>a</p>');
      return (
        <form data-testid="f">
          <Editor ref={ref} label="Texto" name="conteudo" value={value} onChange={setValue} />
          <output>{value}</output>
        </form>
      );
    }
    render(<Harness />);
    const form = screen.getByTestId('f') as HTMLFormElement;
    const view = ref.current!.view!;
    act(() => view.dispatch(view.state.tr.insertText('b', 2)));
    await waitFor(() => expect(document.querySelector('output')).toHaveTextContent('<p>ab</p>'));
    expect(new FormData(form).get('conteudo')).toBe('<p>ab</p>');
  });

  it('disabled, readOnly e invalid chegam ao editor', () => {
    const { rerender } = render(<Editor label="T" disabled />);
    const shell = () => document.querySelector('.eds-editor')!;
    expect(shell()).toHaveAttribute('data-disabled');
    rerender(<Editor label="T" readOnly />);
    expect(shell()).toHaveAttribute('data-readonly');
    rerender(<Editor label="T" invalid aria-describedby="erro" />);
    expect(shell()).toHaveAttribute('data-invalid');
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute('aria-describedby', 'erro');
  });

  it('texts troca os rótulos da barra', () => {
    render(<Editor label="T" texts={{ bold: 'Bold', toolbarLabel: 'Formatting' }} />);
    expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
  });

  it('desmonta limpando o editor', () => {
    const { unmount } = render(<Editor label="T" />);
    unmount();
    expect(document.querySelector('.eds-editor')).toBeNull();
  });

  it('required: aria-required, bloqueia o envio vazio com erro visível e some ao digitar', async () => {
    const ref = createRef<EditorRef>();
    render(
      <form data-testid="f">
        <Editor ref={ref} label="Texto" name="conteudo" required aria-describedby="ajuda" />
        <p id="ajuda">Ajuda</p>
      </form>,
    );
    const box = screen.getByRole('textbox', { name: 'Texto' });
    expect(box).toHaveAttribute('aria-required', 'true');
    const form = screen.getByTestId('f') as HTMLFormElement;
    const event = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const error = document.querySelector<HTMLElement>('p[id$="-required"]')!;
    expect(error).toHaveTextContent('Preencha o conteúdo.');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box.getAttribute('aria-describedby')).toBe(`ajuda ${error.id}`);
    expect(document.querySelector('.eds-editor')).toHaveAttribute('data-invalid');
    expect(box.contains(document.activeElement) || document.activeElement === box).toBe(true);

    const view = ref.current!.view!;
    act(() => {
      view.dispatch(view.state.tr.insertText('x', 1));
    });
    await waitFor(() => expect(document.querySelector('p[id$="-required"]')).toBeNull());
    expect(box).not.toHaveAttribute('aria-invalid');
    expect(box.getAttribute('aria-describedby')).toBe('ajuda');
    const ok = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(ok);
    expect(ok.defaultPrevented).toBe(false);
  });

  it('required: o reset do formulário limpa o erro', async () => {
    render(
      <form data-testid="f">
        <Editor label="Texto" name="conteudo" required />
      </form>,
    );
    const form = screen.getByTestId('f') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(document.querySelector('p[id$="-required"]')).not.toBeNull();
    form.dispatchEvent(new Event('reset', { bubbles: true }));
    await waitFor(() => expect(document.querySelector('p[id$="-required"]')).toBeNull());
  });
});
