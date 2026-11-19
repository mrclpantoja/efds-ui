import { createRef, type ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field';
import { FileUpload, formatFileSize, type FileUploadProps } from './FileUpload';

afterEach(() => vi.unstubAllGlobals());

const pdf = (name = 'contrato.pdf', size = 10) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf', lastModified: 1 });

function setup(props: Partial<ComponentProps<typeof FileUpload>> = {}) {
  // applyAccept=false: o seletor nativo filtra por `accept`, mas o arraste não.
  const user = userEvent.setup({ applyAccept: false });
  const utils = render(<FileUpload aria-label="Documentos" {...props} />);
  const input = utils.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const zone = utils.container.querySelector<HTMLElement>('.eds-upload')!;
  const status = () => utils.container.querySelector('[role="status"]')!;
  const pick = (...files: File[]) => user.upload(input, files);
  return { user, input, zone, status, pick, ...utils };
}

/** DataTransfer mínimo: guarda os arquivos e os devolve como `files`. */
function stubDataTransfer() {
  class FakeTransfer {
    list: File[] = [];
    items = { add: (f: File) => this.list.push(f) };
    get files() {
      return this.list;
    }
  }
  vi.stubGlobal('DataTransfer', FakeTransfer);
}

function deferred() {
  let resolve!: (v: { id: string }) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<{ id: string }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('formatFileSize', () => {
  it('formata em pt-BR', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(850 * 1024)).toBe('850 KB');
    expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1,2 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('FileUpload: estrutura', () => {
  it('renderiza o markup do contrato, ref no input e className', () => {
    const ref = createRef<HTMLInputElement>();
    const { input, zone, container } = setup({
      ref,
      className: 'extra',
      name: 'documentos[]',
      accept: '.pdf',
      hint: 'PDF até 5 MB',
    });
    expect(ref.current).toBe(input);
    expect(zone).toHaveClass('eds-upload', 'extra');
    expect(input).toHaveClass('eds-upload-input');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('name', 'documentos[]');
    expect(input).toHaveAttribute('accept', '.pdf');
    const label = container.querySelector('label.eds-upload-dropzone')!;
    expect(label).toHaveAttribute('for', input.id);
    expect(label).toHaveTextContent('Arraste arquivos aqui ou escolha no computador');
    expect(container.querySelector('.eds-upload-link')).toBeInTheDocument();
    expect(container.querySelector('.eds-upload-hint')).toHaveTextContent('PDF até 5 MB');
    expect(input).toHaveAccessibleDescription('PDF até 5 MB');
    expect(container.querySelector('.eds-upload-list')).toBeNull();
    expect(container.querySelector('[data-eds-upload]')).toBeNull();
  });

  it('compact, invalid e disabled viram classe/atributo', () => {
    const { zone, input } = setup({ compact: true, invalid: true, disabled: true });
    expect(zone).toHaveClass('eds-upload-compact');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeDisabled();
  });

  it('multiple={false} tira o atributo', () => {
    const { input } = setup({ multiple: false });
    expect(input).not.toHaveAttribute('multiple');
  });

  it('integra com Field: nome pelo rótulo, ajuda e erro', () => {
    render(
      <Field label="Documentos do contrato" helper="Envie o PDF" error="Obrigatório" required>
        <FileUpload hint="Até 5 MB" />
      </Field>,
    );
    const input = screen.getByLabelText('Documentos do contrato', { selector: 'input' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-labelledby');
    expect(input).toHaveAccessibleDescription('Envie o PDF Obrigatório Até 5 MB');
  });
});

describe('FileUpload: seleção e validação', () => {
  it('lista o arquivo com nome e tamanho, chama onChange e anuncia', async () => {
    const onChange = vi.fn();
    const { pick, status } = setup({ onChange });
    const file = pdf('contrato.pdf', 1.2 * 1024 * 1024);
    await pick(file);
    const list = screen.getByRole('list', { name: 'Arquivos selecionados' });
    expect(list).toHaveClass('eds-upload-list');
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('data-state', 'ready');
    expect(item).toHaveTextContent('contrato.pdf');
    expect(item).toHaveTextContent('1,2 MB');
    expect(onChange).toHaveBeenLastCalledWith([file]);
    expect(status()).toHaveTextContent('contrato.pdf adicionado.');
  });

  it('acumula entre seleções e ignora duplicado', async () => {
    const onChange = vi.fn();
    const { pick, status } = setup({ onChange });
    await pick(pdf('a.pdf'));
    await pick(pdf('b.pdf'), pdf('a.pdf'));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(onChange.mock.lastCall![0].map((f: File) => f.name)).toEqual(['a.pdf', 'b.pdf']);
    expect(status()).toHaveTextContent('b.pdf adicionado.');
  });

  it('vários arquivos: status com a contagem', async () => {
    const { pick, status } = setup();
    await pick(pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf'));
    expect(status()).toHaveTextContent('3 arquivos adicionados.');
  });

  it('rejeita tipo fora de accept (extensão, MIME e curinga)', async () => {
    const onChange = vi.fn();
    const { pick, status } = setup({ accept: '.pdf,image/*', onChange });
    const exe = new File(['x'], 'setup.exe', { type: 'application/x-msdownload' });
    const png = new File(['x'], 'foto.png', { type: 'image/png' });
    await pick(exe, png, pdf('ok.pdf'));
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.getAttribute('data-state'))).toEqual(['error', 'ready', 'ready']);
    expect(items[0]).toHaveTextContent('Tipo não permitido');
    expect(onChange.mock.lastCall![0].map((f: File) => f.name)).toEqual(['foto.png', 'ok.pdf']);
    expect(status()).toHaveTextContent('setup.exe: tipo não permitido.');
  });

  it('rejeita arquivo maior que maxSize', async () => {
    const { pick, status } = setup({ maxSize: 5 * 1024 * 1024 });
    await pick(pdf('grande.pdf', 6 * 1024 * 1024));
    expect(screen.getByRole('listitem')).toHaveAttribute('data-state', 'error');
    expect(screen.getByRole('listitem')).toHaveTextContent('Arquivo maior que 5 MB');
    expect(status()).toHaveTextContent('grande.pdf: arquivo maior que 5 MB.');
  });

  it('respeita maxFiles e avisa o limite', async () => {
    const onChange = vi.fn();
    const { pick, status } = setup({ maxFiles: 2, onChange });
    await pick(pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf'));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(status()).toHaveTextContent('Limite de 2 arquivos atingido.');
    expect(onChange.mock.lastCall![0]).toHaveLength(2);
  });

  it('multiple={false}: a nova seleção substitui a anterior', async () => {
    const { pick } = setup({ multiple: false });
    await pick(pdf('a.pdf'));
    await pick(pdf('b.pdf'));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('b.pdf');
  });
});

describe('FileUpload: remover e foco', () => {
  it('remove, anuncia e chama onChange', async () => {
    const onChange = vi.fn();
    const { user, pick, status } = setup({ onChange });
    await pick(pdf('a.pdf'), pdf('b.pdf'));
    await user.click(screen.getByRole('button', { name: 'Remover a.pdf' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(status()).toHaveTextContent('a.pdf removido.');
    expect(onChange.mock.lastCall![0].map((f: File) => f.name)).toEqual(['b.pdf']);
  });

  it('foco após remover: próximo item, senão o anterior, senão o input', async () => {
    const { user, input, pick } = setup();
    await pick(pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf'));
    await user.click(screen.getByRole('button', { name: 'Remover b.pdf' }));
    expect(screen.getByRole('button', { name: 'Remover c.pdf' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remover c.pdf' }));
    expect(screen.getByRole('button', { name: 'Remover a.pdf' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remover a.pdf' }));
    expect(input).toHaveFocus();
  });
});

describe('FileUpload: modo formulário', () => {
  it('mantém só os arquivos válidos no input nativo (DataTransfer)', async () => {
    stubDataTransfer();
    const { input, user } = setup({ accept: '.pdf', name: 'documentos[]' });
    const a = pdf('a.pdf');
    const b = pdf('b.pdf');
    const bad = new File(['x'], 'x.exe');
    fireEvent.change(input, { target: { files: [a] } });
    fireEvent.change(input, { target: { files: [b, bad] } });
    expect(Array.from(input.files!).map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
    await user.click(screen.getByRole('button', { name: 'Remover a.pdf' }));
    expect(Array.from(input.files!).map((f) => f.name)).toEqual(['b.pdf']);
    expect(input).toHaveAttribute('name', 'documentos[]');
  });
});

describe('FileUpload: arrastar e soltar', () => {
  const dt = (files: File[] = []) => ({ types: ['Files'], files });

  it('data-dragover enquanto está sobre a área, com contador para os filhos', () => {
    const { zone } = setup();
    const child = zone.querySelector('.eds-upload-title')!;
    fireEvent.dragEnter(zone, { dataTransfer: dt() });
    expect(zone).toHaveAttribute('data-dragover');
    fireEvent.dragEnter(child, { dataTransfer: dt() });
    fireEvent.dragLeave(zone, { dataTransfer: dt() });
    expect(zone).toHaveAttribute('data-dragover');
    fireEvent.dragLeave(child, { dataTransfer: dt() });
    expect(zone).not.toHaveAttribute('data-dragover');
  });

  it('dragover aceita o arraste (preventDefault) só para arquivos', () => {
    const { zone } = setup();
    expect(fireEvent.dragOver(zone, { dataTransfer: dt() })).toBe(false);
    expect(fireEvent.dragOver(zone, { dataTransfer: { types: ['text/plain'], files: [] } })).toBe(
      true,
    );
  });

  it('soltar adiciona os arquivos e limpa o destaque', async () => {
    const { zone, status } = setup();
    fireEvent.dragEnter(zone, { dataTransfer: dt() });
    fireEvent.drop(zone, { dataTransfer: dt([pdf('solto.pdf')]) });
    expect(zone).not.toHaveAttribute('data-dragover');
    expect(screen.getByRole('listitem')).toHaveTextContent('solto.pdf');
    await waitFor(() => expect(status()).toHaveTextContent('solto.pdf adicionado.'));
  });

  it('disabled ignora arraste e soltura', () => {
    const { zone } = setup({ disabled: true });
    fireEvent.dragEnter(zone, { dataTransfer: dt() });
    expect(zone).not.toHaveAttribute('data-dragover');
    fireEvent.drop(zone, { dataTransfer: dt([pdf()]) });
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});

describe('FileUpload: modo imediato', () => {
  it('envia cada arquivo, mostra progresso, gera hidden e o input perde o name', async () => {
    const d = deferred();
    let progress!: (n: number) => void;
    const upload = vi.fn((_f: File, o: { onProgress: (n: number) => void }) => {
      progress = o.onProgress;
      return d.promise;
    });
    const { pick, input, container, status } = setup({ upload, name: 'documentos[]' });
    expect(input).not.toHaveAttribute('name');
    await pick(pdf('contrato.pdf', 1.2 * 1024 * 1024));
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('data-state', 'uploading');
    expect(upload).toHaveBeenCalledTimes(1);
    act(() => progress(45));
    const bar = screen.getByRole('progressbar', { name: 'Enviando contrato.pdf' });
    expect(bar).toHaveClass('eds-upload-progress');
    expect(bar).toHaveAttribute('value', '45');
    expect(item).toHaveTextContent('1,2 MB · Enviando 45%');
    // progresso contínuo não é anunciado
    await waitFor(() => expect(status()).toHaveTextContent('contrato.pdf adicionado.'));
    await act(async () => d.resolve({ id: 'abc' }));
    expect(item).toHaveAttribute('data-state', 'done');
    expect(item).toHaveTextContent('Enviado');
    expect(screen.queryByRole('progressbar')).toBeNull();
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]')!;
    expect(hidden).toHaveAttribute('name', 'documentos[]');
    expect(hidden).toHaveValue('abc');
    await waitFor(() => expect(status()).toHaveTextContent('contrato.pdf enviado.'));
  });

  it('bloqueia o submit com setCustomValidity enquanto envia', async () => {
    const d = deferred();
    const { pick, input } = setup({ upload: () => d.promise });
    expect(input.validationMessage).toBe('');
    await pick(pdf());
    expect(input.validationMessage).toBe('Aguarde o envio dos arquivos.');
    await act(async () => d.resolve({ id: '1' }));
    expect(input.validity.customError).toBe(false);
  });

  it('remover durante o envio aborta o sinal e não gera hidden', async () => {
    const d = deferred();
    let signal!: AbortSignal;
    const { user, pick, container } = setup({
      name: 'docs',
      upload: (_f, o) => {
        signal = o.signal;
        return d.promise;
      },
    });
    await pick(pdf('a.pdf'));
    await user.click(screen.getByRole('button', { name: 'Remover a.pdf' }));
    expect(signal.aborted).toBe(true);
    await act(async () => d.resolve({ id: 'zz' }));
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('remover um enviado remove o hidden', async () => {
    const { user, pick, container } = setup({ name: 'docs', upload: async () => ({ id: 'x1' }) });
    await pick(pdf('a.pdf'));
    await waitFor(() =>
      expect(container.querySelector('input[type="hidden"]')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Remover a.pdf' }));
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it('falha mostra erro com Tentar de novo, chama onUploadError e reenvia', async () => {
    const onUploadError = vi.fn();
    const upload = vi
      .fn<NonNullable<FileUploadProps['upload']>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 'ok' });
    const { user, pick, status, container, input } = setup({
      upload,
      onUploadError,
      name: 'docs',
    });
    const file = pdf('a.pdf');
    await pick(file);
    const item = await screen.findByRole('listitem');
    await waitFor(() => expect(item).toHaveAttribute('data-state', 'error'));
    expect(item).toHaveTextContent('Falha no envio');
    expect(onUploadError).toHaveBeenCalledWith(file, expect.any(Error));
    await waitFor(() => expect(status()).toHaveTextContent('a.pdf: falha no envio.'));
    // texto visível primeiro no nome acessível (WCAG 2.5.3)
    const retry = screen.getByRole('button', { name: 'Tentar de novo a.pdf' });
    expect(retry).toHaveTextContent('Tentar de novo');
    expect(retry).not.toHaveAttribute('aria-describedby');
    expect(input.validationMessage).toBe(
      'Há arquivos com falha no envio. Tente de novo ou remova.',
    );
    await user.click(retry);
    await waitFor(() => expect(item).toHaveAttribute('data-state', 'done'));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(container.querySelector('input[type="hidden"]')).toHaveValue('ok');
  });

  it('arquivo inválido não é enviado', async () => {
    const upload = vi.fn(async () => ({ id: '1' }));
    const { pick } = setup({ upload, accept: '.pdf' });
    await pick(new File(['x'], 'a.exe'));
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole('listitem')).toHaveAttribute('data-state', 'error');
    expect(screen.queryByRole('button', { name: /Tentar/ })).toBeNull();
  });
});

describe('FileUpload: required e reset', () => {
  it('modo imediato: required vira validade até haver envio concluído', async () => {
    const { pick, input } = setup({ required: true, upload: async () => ({ id: '1' }) });
    expect(input).not.toHaveAttribute('required');
    expect(input.validationMessage).toBe('Envie ao menos um arquivo.');
    await pick(pdf());
    await waitFor(() => expect(input.validity.customError).toBe(false));
  });

  it('reset do formulário esvazia a lista', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <FileUpload aria-label="Docs" />
      </form>,
    );
    await user.upload(container.querySelector('input')!, pdf());
    expect(screen.getByRole('listitem')).toBeInTheDocument();
    act(() => container.querySelector('form')!.reset());
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});

describe('FileUpload: vagas, avisos e status', () => {
  it('item com falha de envio ocupa vaga; recusado por tipo não ocupa', async () => {
    const upload = vi.fn().mockRejectedValue(new Error('x'));
    const onChange = vi.fn();
    const { pick, user, status } = setup({ upload, maxFiles: 1, accept: '.pdf', onChange });
    await pick(new File(['x'], 'ruim.exe'));
    await pick(pdf('a.pdf'));
    await waitFor(() =>
      expect(screen.getAllByRole('listitem').map((i) => i.getAttribute('data-state'))).toEqual([
        'error',
        'error',
      ]),
    );
    // a.pdf (falhou, retryable) ocupa a vaga; b.pdf fica de fora
    onChange.mockClear();
    await pick(pdf('b.pdf'));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    await waitFor(() =>
      expect(status()).toHaveTextContent('Limite de 1 arquivo atingido. 1 arquivo não adicionado.'),
    );
    // removê-lo chama onChange com os que ocupam vaga
    await user.click(screen.getByRole('button', { name: 'Remover ruim.exe' }));
    expect(onChange.mock.lastCall![0].map((f: File) => f.name)).toEqual(['a.pdf']);
    await user.click(screen.getByRole('button', { name: 'Remover a.pdf' }));
    expect(onChange.mock.lastCall![0]).toEqual([]);
  });

  it('anuncia duplicado', async () => {
    const { pick, status } = setup();
    await pick(pdf('a.pdf'));
    await pick(pdf('a.pdf'));
    await waitFor(() => expect(status()).toHaveTextContent('a.pdf já foi adicionado.'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('limite com vários: avisa quantos ficaram de fora', async () => {
    const { pick, status } = setup({ maxFiles: 1 });
    await pick(pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf'));
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Limite de 1 arquivo atingido. 2 arquivos não adicionados.',
      ),
    );
  });

  it('multiple=false com vários: só o primeiro entra e avisa', async () => {
    const { zone, status } = setup({ multiple: false });
    // o seletor nativo já limita a um; no arraste podem vir vários
    fireEvent.drop(zone, {
      dataTransfer: { types: ['Files'], files: [pdf('a.pdf'), pdf('b.pdf')] },
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('listitem')).toHaveTextContent('a.pdf');
    await waitFor(() => expect(status()).toHaveTextContent('Só um arquivo é aceito.'));
  });

  it('desabilitado ainda cancela dragover/drop com arquivos (dropEffect none) e não adiciona', () => {
    const { zone } = setup({ disabled: true });
    const dataTransfer = { types: ['Files'], files: [pdf()], dropEffect: 'copy' };
    expect(fireEvent.dragOver(zone, { dataTransfer })).toBe(false);
    expect(dataTransfer.dropEffect).toBe('none');
    expect(fireEvent.drop(zone, { dataTransfer })).toBe(false);
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('mensagens do mesmo tick são concatenadas', async () => {
    const a = deferred();
    const b = deferred();
    const upload = vi
      .fn<NonNullable<FileUploadProps['upload']>>()
      .mockImplementationOnce(() => a.promise)
      .mockImplementationOnce(() => b.promise);
    const { pick, status } = setup({ upload });
    await pick(pdf('a.pdf'), pdf('b.pdf'));
    await waitFor(() => expect(status()).toHaveTextContent('2 arquivos adicionados.'));
    await act(async () => {
      a.reject(new Error('x'));
      b.resolve({ id: '2' });
    });
    await waitFor(() =>
      expect(status()).toHaveTextContent('a.pdf: falha no envio. b.pdf enviado.'),
    );
  });

  it('mensagem igual à anterior é relida (limpa e reescreve)', async () => {
    const { pick, status } = setup();
    await pick(pdf('a.pdf'));
    await pick(pdf('a.pdf'));
    await waitFor(() => expect(status()).toHaveTextContent('a.pdf já foi adicionado.'));
    await pick(pdf('a.pdf'));
    // entre as duas leituras iguais a região fica vazia por um instante
    await waitFor(() => expect(status()).toBeEmptyDOMElement());
    await waitFor(() => expect(status()).toHaveTextContent('a.pdf já foi adicionado.'));
  });
});

describe('FileUpload: textos', () => {
  it('textos configuráveis', async () => {
    const { pick } = setup({
      texts: {
        dropzone: 'Drop files or',
        link: 'browse',
        listLabel: 'Files',
        remove: (n) => `Delete ${n}`,
      },
    });
    expect(screen.getByText('browse')).toBeInTheDocument();
    await pick(pdf('a.pdf'));
    expect(screen.getByRole('list', { name: 'Files' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete a.pdf' })).toBeInTheDocument();
  });
});
