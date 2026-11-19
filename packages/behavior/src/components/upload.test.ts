import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDataTransferPolyfill, pickFiles } from '../test-utils/dom-polyfills';
import { formatFileSize, initUpload } from './upload';

type Listener = (event: Record<string, unknown>) => void;

class MockXHR {
  static instances: MockXHR[] = [];
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: FormData | null = null;
  aborted = false;
  status = 0;
  responseText = '';
  private listeners: Record<string, Listener[]> = {};
  private uploadListeners: Record<string, Listener[]> = {};
  upload = {
    addEventListener: (type: string, fn: Listener) => {
      (this.uploadListeners[type] ??= []).push(fn);
    },
  };
  constructor() {
    MockXHR.instances.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  addEventListener(type: string, fn: Listener) {
    (this.listeners[type] ??= []).push(fn);
  }
  send(body: FormData) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
  }
  progress(loaded: number, total: number) {
    for (const fn of this.uploadListeners.progress ?? []) {
      fn({ lengthComputable: true, loaded, total });
    }
  }
  respond(status: number, body: string) {
    this.status = status;
    this.responseText = body;
    for (const fn of this.listeners.load ?? []) fn({});
  }
  fail() {
    for (const fn of this.listeners.error ?? []) fn({});
  }
}

const file = (name: string, size = 1000, type = 'application/pdf', lastModified = 1) => {
  const f = new File(['x'], name, { type, lastModified });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

const markup = (attrs = '', inputAttrs = '') => `
<form id="form">
  <span class="eds-label" id="docs-l">Documentos</span>
  <div class="eds-upload" id="up" data-eds-upload ${attrs}>
    <input id="docs" class="eds-upload-input" type="file" name="documentos[]" multiple
      accept=".pdf,.png,image/jpeg" aria-labelledby="docs-l" ${inputAttrs} />
    <label class="eds-upload-dropzone" for="docs">Arraste</label>
    <ul class="eds-upload-list" aria-label="Arquivos selecionados"></ul>
    <span class="eds-visually-hidden" role="status"></span>
  </div>
  <button type="submit" id="enviar">Enviar</button>
</form>`;

const input = () => document.getElementById('docs') as HTMLInputElement;
const root = () => document.getElementById('up') as HTMLElement;
const status = () => document.querySelector('[role="status"]') as HTMLElement;
const items = () => Array.from(document.querySelectorAll<HTMLElement>('.eds-upload-item'));
const names = () => items().map((i) => i.querySelector('.eds-upload-item-name')?.textContent);
const inputFiles = () => Array.from((input().files ?? []) as unknown as File[]).map((f) => f.name);
const removeBtn = (name: string) =>
  document.querySelector<HTMLButtonElement>(
    `button[aria-label="Remover ${name}"]`,
  ) as HTMLButtonElement;

describe('formatFileSize', () => {
  it('formata em pt-BR', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(850 * 1024)).toBe('850 KB');
    expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1,2 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatFileSize(1023.9 * 1024)).toBe('1 MB');
  });
});

describe('upload (modo formulário)', () => {
  let destroy: () => void;
  let restore: () => void;
  beforeEach(() => {
    restore = installDataTransferPolyfill();
    document.body.innerHTML = markup('data-eds-max-size="5242880" data-eds-max-files="3"');
    destroy = initUpload(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });

  it('acumula seleções no input, ignora duplicado e anuncia', () => {
    pickFiles(input(), [file('a.pdf')]);
    expect(status()).toHaveTextContent('a.pdf adicionado.');
    pickFiles(input(), [file('b.pdf'), file('a.pdf')]);
    expect(names()).toEqual(['a.pdf', 'b.pdf']);
    expect(inputFiles()).toEqual(['a.pdf', 'b.pdf']);
    pickFiles(input(), [file('c.png', 10, 'image/png'), file('d.pdf', 10, '', 2)]);
    expect(status()).toHaveTextContent('Limite de 3 arquivos atingido.');
    expect(names()).toEqual(['a.pdf', 'b.pdf', 'c.png']);
  });

  it('anuncia vários de uma vez', () => {
    pickFiles(input(), [file('a.pdf'), file('b.pdf')]);
    expect(status()).toHaveTextContent('2 arquivos adicionados.');
  });

  it('recusa tipo e tamanho: item com erro, fora do input e sem ocupar vaga', () => {
    pickFiles(input(), [
      file('x.exe', 10, 'application/x-msdownload'),
      file('grande.pdf', 6000000),
    ]);
    expect(items().map((i) => i.getAttribute('data-state'))).toEqual(['error', 'error']);
    expect(items()[0]).toHaveTextContent('Tipo não permitido');
    expect(items()[1]).toHaveTextContent('Arquivo maior que 5 MB');
    expect(status()).toHaveTextContent('x.exe: tipo não permitido.');
    expect(status()).toHaveTextContent('grande.pdf: arquivo maior que 5 MB.');
    expect(inputFiles()).toEqual([]);
    // Sem "Tentar de novo" para recusa de validação.
    expect(screen.queryByRole('button', { name: /Tentar de novo/ })).toBeNull();
    pickFiles(input(), [file('1.pdf'), file('2.pdf'), file('3.pdf')]);
    expect(inputFiles()).toEqual(['1.pdf', '2.pdf', '3.pdf']);
  });

  it('aceita por MIME exato e por extensão', () => {
    pickFiles(input(), [file('foto.jpeg', 10, 'image/jpeg'), file('F.PDF', 10, '')]);
    expect(items().map((i) => i.getAttribute('data-state'))).toEqual(['ready', 'ready']);
  });

  it('remover foca o próximo, senão o anterior, senão o input; atualiza o input', async () => {
    const user = userEvent.setup();
    pickFiles(input(), [file('a.pdf'), file('b.pdf'), file('c.pdf')]);
    await user.click(removeBtn('b.pdf'));
    expect(document.activeElement).toBe(removeBtn('c.pdf'));
    expect(inputFiles()).toEqual(['a.pdf', 'c.pdf']);
    expect(status()).toHaveTextContent('b.pdf removido.');
    await user.click(removeBtn('c.pdf'));
    expect(document.activeElement).toBe(removeBtn('a.pdf'));
    await user.click(removeBtn('a.pdf'));
    expect(document.activeElement).toBe(input());
    expect(items()).toHaveLength(0);
  });

  it('emite eds:upload-change com os arquivos válidos', () => {
    const onChange = vi.fn();
    root().addEventListener('eds:upload-change', onChange);
    pickFiles(input(), [file('a.pdf'), file('x.exe', 1, 'x/y')]);
    const detail = (onChange.mock.calls[0]?.[0] as CustomEvent<File[]>).detail;
    expect(detail.map((f) => f.name)).toEqual(['a.pdf']);
  });

  it('arrastar: data-dragover com contador e drop adiciona', () => {
    const dt = { types: ['Files'], files: [file('d.pdf')], dropEffect: '' };
    const fire = (type: string, target: Element) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: dt });
      target.dispatchEvent(event);
      return event;
    };
    const zone = document.querySelector('.eds-upload-dropzone') as HTMLElement;
    fire('dragenter', root());
    fire('dragenter', zone);
    expect(root()).toHaveAttribute('data-dragover');
    fire('dragleave', root());
    expect(root()).toHaveAttribute('data-dragover');
    fire('dragleave', zone);
    expect(root()).not.toHaveAttribute('data-dragover');
    const over = fire('dragover', zone);
    expect(over.defaultPrevented).toBe(true);
    const drop = fire('drop', zone);
    expect(drop.defaultPrevented).toBe(true);
    expect(root()).not.toHaveAttribute('data-dragover');
    expect(names()).toEqual(['d.pdf']);
  });

  it('arrastar sem arquivos (texto) não é interceptado', () => {
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['text/plain'] } });
    root().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(root()).not.toHaveAttribute('data-dragover');
  });

  it('input desabilitado ignora o drop', () => {
    input().disabled = true;
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { types: ['Files'], files: [file('d.pdf')] },
    });
    root().dispatchEvent(event);
    expect(items()).toHaveLength(0);
  });

  it('sem multiple, a nova seleção substitui a anterior', () => {
    input().multiple = false;
    pickFiles(input(), [file('a.pdf')]);
    pickFiles(input(), [file('b.pdf'), file('c.pdf')]);
    expect(names()).toEqual(['b.pdf']);
  });

  it('reset do formulário esvazia a lista', async () => {
    pickFiles(input(), [file('a.pdf')]);
    (document.getElementById('form') as HTMLFormElement).reset();
    await new Promise((r) => setTimeout(r, 5));
    expect(items()).toHaveLength(0);
  });

  it('o ícone dos itens é decorativo', () => {
    pickFiles(input(), [file('a.pdf')]);
    expect(items()[0]?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('upload (modo imediato)', () => {
  let destroy: () => void;
  let restore: () => void;
  beforeEach(() => {
    MockXHR.instances = [];
    vi.stubGlobal('XMLHttpRequest', MockXHR);
    restore = installDataTransferPolyfill();
    document.body.innerHTML = markup(
      'data-eds-upload-url="/arquivos" data-eds-upload-field="arquivo"',
    );
    destroy = initUpload(document);
  });
  afterEach(() => {
    destroy();
    restore();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('envia por XHR com o cabeçalho do loader e tira o name do input', () => {
    expect(input()).not.toHaveAttribute('name');
    pickFiles(input(), [file('a.pdf')]);
    const xhr = MockXHR.instances[0] as MockXHR;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/arquivos');
    expect(xhr.headers['X-EDS-Loader']).toBe('off');
    expect((xhr.body?.get('arquivo') as File).name).toBe('a.pdf');
    expect(items()[0]).toHaveAttribute('data-state', 'uploading');
    expect(items()[0]?.querySelector('progress')).toHaveAttribute('aria-label', 'Enviando a.pdf');
  });

  it('mostra o progresso, conclui com hidden e emite eventos', () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    root().addEventListener('eds:upload-progress', onProgress);
    root().addEventListener('eds:upload-complete', onComplete);
    pickFiles(input(), [file('a.pdf', 1200000)]);
    const xhr = MockXHR.instances[0] as MockXHR;
    xhr.progress(45, 100);
    expect(items()[0]?.querySelector('progress')).toHaveAttribute('value', '45');
    expect(items()[0]).toHaveTextContent('Enviando 45%');
    expect((onProgress.mock.calls[0]?.[0] as CustomEvent).detail.percent).toBe(45);
    // O progresso contínuo não vai para a região de status.
    expect(status()).toHaveTextContent('a.pdf adicionado.');
    xhr.respond(200, '{"id":"abc123"}');
    const hidden = document.querySelector<HTMLInputElement>('input[type="hidden"]');
    expect(hidden).toHaveAttribute('name', 'documentos[]');
    expect(hidden?.value).toBe('abc123');
    expect(items()[0]).toHaveAttribute('data-state', 'done');
    expect(items()[0]?.querySelector('progress')).toBeNull();
    expect(items()[0]).toHaveTextContent('Enviado');
    expect(status()).toHaveTextContent('a.pdf enviado.');
    const detail = (onComplete.mock.calls[0]?.[0] as CustomEvent).detail;
    expect(detail.file.name).toBe('a.pdf');
    expect(detail.response).toEqual({ id: 'abc123' });
  });

  it('bloqueia o submit enquanto envia (setCustomValidity)', () => {
    pickFiles(input(), [file('a.pdf')]);
    expect(input().validationMessage).toBe('Aguarde o envio dos arquivos.');
    expect((document.getElementById('form') as HTMLFormElement).checkValidity()).toBe(false);
    (MockXHR.instances[0] as MockXHR).respond(200, '{"id":"1"}');
    expect(input().validationMessage).toBe('');
  });

  it('remover durante o envio aborta; remover enviado tira o hidden', async () => {
    const user = userEvent.setup();
    pickFiles(input(), [file('a.pdf'), file('b.pdf')]);
    await user.click(removeBtn('a.pdf'));
    expect((MockXHR.instances[0] as MockXHR).aborted).toBe(true);
    expect(input().validationMessage).toBe('Aguarde o envio dos arquivos.');
    (MockXHR.instances[1] as MockXHR).respond(200, '{"id":"9"}');
    expect(document.querySelectorAll('input[type="hidden"]')).toHaveLength(1);
    await user.click(removeBtn('b.pdf'));
    expect(document.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    expect(input().validationMessage).toBe('');
  });

  it('falha mostra erro com "Tentar de novo", que reenvia', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    root().addEventListener('eds:upload-error', onError);
    pickFiles(input(), [file('a.pdf')]);
    (MockXHR.instances[0] as MockXHR).fail();
    expect(items()[0]).toHaveAttribute('data-state', 'error');
    expect(items()[0]).toHaveTextContent('Falha no envio');
    expect(status()).toHaveTextContent('a.pdf: falha no envio.');
    expect(onError).toHaveBeenCalledTimes(1);
    const retry = screen.getByRole('button', { name: 'Tentar de novo a.pdf' });
    expect(retry).toHaveAttribute('aria-label', 'Tentar de novo a.pdf');
    expect(retry).not.toHaveAttribute('aria-describedby');
    expect(input().validationMessage).toBe(
      'Há arquivos com falha no envio. Tente de novo ou remova.',
    );
    await user.click(retry);
    expect(MockXHR.instances).toHaveLength(2);
    expect(items()[0]).toHaveAttribute('data-state', 'uploading');
    (MockXHR.instances[1] as MockXHR).respond(200, '{"id":"7"}');
    expect(items()[0]).toHaveAttribute('data-state', 'done');
  });

  it('resposta sem id ou com status de erro é falha', () => {
    pickFiles(input(), [file('a.pdf'), file('b.pdf')]);
    (MockXHR.instances[0] as MockXHR).respond(200, '{}');
    (MockXHR.instances[1] as MockXHR).respond(500, '{"id":"1"}');
    expect(items().map((i) => i.getAttribute('data-state'))).toEqual(['error', 'error']);
  });

  it('arquivo recusado na validação não é enviado', () => {
    pickFiles(input(), [file('x.exe', 10, 'x/y')]);
    expect(MockXHR.instances).toHaveLength(0);
  });

  it('destroy aborta envios, devolve o name e limpa a validade', () => {
    pickFiles(input(), [file('a.pdf')]);
    destroy();
    expect((MockXHR.instances[0] as MockXHR).aborted).toBe(true);
    expect(input()).toHaveAttribute('name', 'documentos[]');
    expect(input().validationMessage).toBe('');
    destroy = initUpload(document);
  });
});

describe('upload imediato obrigatório', () => {
  let destroy: () => void;
  let restore: () => void;
  beforeEach(() => {
    MockXHR.instances = [];
    vi.stubGlobal('XMLHttpRequest', MockXHR);
    restore = installDataTransferPolyfill();
    document.body.innerHTML = markup('data-eds-upload-url="/arquivos"', 'required');
    destroy = initUpload(document);
  });
  afterEach(() => {
    destroy();
    restore();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('exige ao menos um arquivo enviado, não um arquivo no input', () => {
    expect(input().required).toBe(false);
    expect(input().validationMessage).toBe('Envie ao menos um arquivo.');
    pickFiles(input(), [file('a.pdf')]);
    (MockXHR.instances[0] as MockXHR).respond(200, '{"id":"1"}');
    expect(input().validationMessage).toBe('');
  });
});

describe('upload (auditoria UX)', () => {
  let destroy: () => void;
  let restore: () => void;
  beforeEach(() => {
    MockXHR.instances = [];
    vi.stubGlobal('XMLHttpRequest', MockXHR);
    restore = installDataTransferPolyfill();
  });
  afterEach(() => {
    destroy();
    restore();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });
  const dropEvent = (type: string, dt: Record<string, unknown>) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dt });
    root().dispatchEvent(event);
    return event;
  };

  it('imediato obrigatório: aria-required no bind e removido no destroy', () => {
    document.body.innerHTML = markup('data-eds-upload-url="/a"', 'required');
    destroy = initUpload(document);
    expect(input()).toHaveAttribute('aria-required', 'true');
    destroy();
    expect(input()).not.toHaveAttribute('aria-required');
    expect(input().required).toBe(true);
    destroy = initUpload(document);
  });

  it('dragover e drop com arquivos sempre cancelam, mesmo desabilitado (sem adicionar)', () => {
    document.body.innerHTML = markup('', 'disabled');
    destroy = initUpload(document);
    const dt = { types: ['Files'], files: [file('d.pdf')], dropEffect: '' };
    expect(dropEvent('dragenter', dt).defaultPrevented).toBe(true);
    expect(dropEvent('dragover', dt).defaultPrevented).toBe(true);
    expect(dt.dropEffect).toBe('none');
    expect(root()).not.toHaveAttribute('data-dragover');
    expect(dropEvent('drop', dt).defaultPrevented).toBe(true);
    expect(items()).toHaveLength(0);
  });

  it('item com falha ocupa vaga; recusado por tipo não ocupa; change sempre emite', async () => {
    const user = userEvent.setup();
    document.body.innerHTML = markup('data-eds-upload-url="/a" data-eds-max-files="1"');
    destroy = initUpload(document);
    const onChange = vi.fn();
    root().addEventListener('eds:upload-change', onChange);
    pickFiles(input(), [file('x.exe', 1, 'x/y')]);
    expect(onChange).toHaveBeenCalledTimes(1);
    pickFiles(input(), [file('a.pdf')]);
    (MockXHR.instances[0] as MockXHR).fail();
    pickFiles(input(), [file('b.pdf')]);
    expect(names()).toEqual(['x.exe', 'a.pdf']);
    await user.click(removeBtn('x.exe'));
    expect(onChange).toHaveBeenCalledTimes(4);
    await user.click(removeBtn('a.pdf'));
    const last = onChange.mock.calls.at(-1)?.[0] as CustomEvent<File[]>;
    expect(last.detail).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it('anuncia duplicado, limite com quantidade e arquivo único', () => {
    document.body.innerHTML = markup('data-eds-max-files="1"');
    destroy = initUpload(document);
    pickFiles(input(), [file('a.pdf')]);
    pickFiles(input(), [file('a.pdf'), file('b.pdf'), file('c.pdf')]);
    expect(status()).toHaveTextContent(
      'a.pdf já foi adicionado. Limite de 1 arquivo atingido. 2 arquivos não adicionados.',
    );
    pickFiles(input(), [file('b.pdf')]);
    expect(status()).toHaveTextContent('Limite de 1 arquivo atingido. 1 arquivo não adicionado.');
  });

  it('sem multiple, vários soltos: só o primeiro entra e anuncia', () => {
    document.body.innerHTML = markup();
    input().multiple = false;
    destroy = initUpload(document);
    pickFiles(input(), [file('a.pdf'), file('b.pdf')]);
    expect(names()).toEqual(['a.pdf']);
    expect(status()).toHaveTextContent('a.pdf adicionado. Só um arquivo é aceito.');
  });

  it('mensagem igual à anterior é relida (limpa e reescreve)', async () => {
    document.body.innerHTML = markup();
    destroy = initUpload(document);
    pickFiles(input(), [file('a.pdf')]);
    await new Promise((r) => setTimeout(r, 0));
    pickFiles(input(), [file('a.pdf')]);
    await new Promise((r) => setTimeout(r, 0));
    pickFiles(input(), [file('a.pdf')]);
    expect(status()).toBeEmptyDOMElement();
    await new Promise((r) => setTimeout(r, 100));
    expect(status()).toHaveTextContent('a.pdf já foi adicionado.');
  });

  it('disabled do input chega aos botões da lista, também depois', async () => {
    document.body.innerHTML = markup();
    destroy = initUpload(document);
    pickFiles(input(), [file('a.pdf')]);
    expect(removeBtn('a.pdf').disabled).toBe(false);
    input().disabled = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(removeBtn('a.pdf').disabled).toBe(true);
    input().disabled = false;
    await new Promise((r) => setTimeout(r, 0));
    expect(removeBtn('a.pdf').disabled).toBe(false);
  });
});
