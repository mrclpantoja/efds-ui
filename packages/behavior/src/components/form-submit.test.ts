import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFormSubmit, resetSubmitConfig, submitState } from './form-submit';

const html = (attrs = 'data-eds-submit') => `
<form id="f" ${attrs} action="/salvar" ${attrs.includes('method=') ? '' : 'method="post"'}>
  <input name="nome" value="Ana Exemplo" />
  <button id="ok" type="submit" class="eds-button eds-button-primary"><svg id="ico"></svg>Salvar</button>
  <button id="outro" type="submit" name="acao" value="rascunho" class="eds-button">Rascunho</button>
</form>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Dispara um envio como o navegador faria; devolve o evento para ver `defaultPrevented`. */
function send(form: HTMLElement, submitter?: HTMLElement): SubmitEvent {
  const event = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter });
  form.dispatchEvent(event);
  return event;
}

const status = () => document.querySelector('[data-eds-page-status]')?.textContent ?? '';

describe('estado de envio (HTML)', () => {
  let destroy: () => void;
  const start = (attrs?: string) => {
    document.body.innerHTML = html(attrs);
    destroy = initFormSubmit(document);
  };
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    destroy();
    resetSubmitConfig();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('envio nativo: aria-busy no form e no botão, os outros ficam aria-disabled, sem cancelar', () => {
    start();
    const event = send($('f'), $('ok'));
    expect(event.defaultPrevented).toBe(false);
    expect($('f')).toHaveAttribute('aria-busy', 'true');
    expect($('ok')).toHaveAttribute('aria-busy', 'true');
    expect($('outro')).toHaveAttribute('aria-disabled', 'true');
    expect($('outro')).not.toHaveAttribute('aria-busy');
    expect($('outro')).not.toBeDisabled();
  });

  it('ignora novos envios enquanto envia (antes dos outros ouvintes)', () => {
    start();
    const later = vi.fn();
    $('f').addEventListener('submit', later);
    send($('f'), $('ok'));
    expect(later).toHaveBeenCalledTimes(1);
    const second = send($('f'), $('ok'));
    expect(second.defaultPrevented).toBe(true);
    expect(later).toHaveBeenCalledTimes(1);
  });

  it('desliga o PageLoader do form por padrão, sem sobrescrever o autor', () => {
    start();
    expect($('f')).toHaveAttribute('data-eds-loader', 'off');
    destroy();
    document.body.innerHTML = html('data-eds-submit data-eds-loader="auto"');
    destroy = initFormSubmit(document);
    expect($('f')).toHaveAttribute('data-eds-loader', 'auto');
  });

  it('envio cancelado por outro ouvinte (validação tardia) volta ao normal', () => {
    start();
    // Registrado depois do nosso na janela: cancela depois de nós.
    const late = (e: Event) => e.preventDefault();
    window.addEventListener('submit', late);
    send($('f'), $('ok'));
    vi.advanceTimersByTime(1);
    window.removeEventListener('submit', late);
    expect($('f')).not.toHaveAttribute('aria-busy');
    expect($('outro')).not.toHaveAttribute('aria-disabled');
  });

  it('envio já cancelado (validação, confirmação) não entra em envio', () => {
    start();
    $('f').addEventListener('submit', (e) => e.preventDefault());
    send($('f'), $('ok'));
    expect($('f')).not.toHaveAttribute('aria-busy');
  });

  it('ignora method=dialog e target diferente de _self', () => {
    start();
    send($('f'), $('ok'));
    submitState($('f') as HTMLFormElement).reset();
    $('f').setAttribute('target', '_blank');
    send($('f'), $('ok'));
    expect($('f')).not.toHaveAttribute('aria-busy');
  });

  it('eds:form-submit cancelável veta o envio', () => {
    start();
    $('f').addEventListener('eds:form-submit', (e) => e.preventDefault());
    const event = send($('f'), $('ok'));
    expect(event.defaultPrevented).toBe(true);
    expect($('f')).not.toHaveAttribute('aria-busy');
  });

  it('envio nativo volta ao normal pelo tempo limite e pelo pageshow do bfcache', () => {
    start('data-eds-submit data-eds-submit-timeout="500"');
    send($('f'), $('ok'));
    vi.advanceTimersByTime(500);
    expect($('f')).not.toHaveAttribute('aria-busy');
    start();
    send($('f'), $('ok'));
    const show = new Event('pageshow') as PageTransitionEvent;
    Object.defineProperty(show, 'persisted', { value: true });
    window.dispatchEvent(show);
    expect($('f')).not.toHaveAttribute('aria-busy');
  });

  describe('manual', () => {
    it('cancela o envio nativo e conclui com success(): texto, data-state, anúncio e volta em 2 s', () => {
      start('data-eds-submit="manual"');
      const reset = vi.fn();
      $('f').addEventListener('eds:dirty-reset', reset);
      const onSuccess = vi.fn();
      $('f').addEventListener('eds:form-success', onSuccess);
      const event = send($('f'), $('ok'));
      expect(event.defaultPrevented).toBe(true);
      expect($('ok')).toHaveAttribute('aria-busy', 'true');

      submitState($('f') as HTMLFormElement).success();
      expect($('ok')).not.toHaveAttribute('aria-busy');
      expect($('ok')).toHaveAttribute('data-state', 'success');
      expect($('ok')).toHaveTextContent('Salvo');
      expect($('ico')).toBeNull();
      expect($('f')).not.toHaveAttribute('aria-busy');
      expect($('outro')).not.toHaveAttribute('aria-disabled');
      expect(reset).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2000);
      expect($('ok')).not.toHaveAttribute('data-state');
      expect($('ok')).toHaveTextContent('Salvar');
      expect($('ico')).not.toBeNull();
      expect(submitState($('f') as HTMLFormElement).state).toBe('idle');
    });

    it('error(): texto próprio, foco no botão e anúncio; textos por atributo e duração configurável', () => {
      start(
        'data-eds-submit="manual" data-eds-submit-feedback="500" data-eds-submit-error-text="Falhou"',
      );
      const onError = vi.fn();
      $('f').addEventListener('eds:form-error', onError);
      send($('f'), $('ok'));
      submitState($('f') as HTMLFormElement).error();
      expect($('ok')).toHaveAttribute('data-state', 'error');
      expect($('ok')).toHaveTextContent('Falhou');
      expect(document.activeElement).toBe($('ok'));
      expect(onError).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(499);
      expect($('ok')).toHaveAttribute('data-state', 'error');
      vi.advanceTimersByTime(1);
      expect($('ok')).not.toHaveAttribute('data-state');
    });

    it('com resumo de erros visível, o foco vai para ele', () => {
      start('data-eds-submit="manual"');
      const summary = document.createElement('div');
      summary.setAttribute('data-eds-error-summary', '');
      $('f').append(summary);
      send($('f'), $('ok'));
      submitState($('f') as HTMLFormElement).error('Corrija os campos');
      expect(document.activeElement).toBe(summary);
      expect($('ok')).toHaveTextContent('Corrija os campos');
    });

    it('track() conclui pela promessa; reset() invalida o resultado atrasado', async () => {
      start('data-eds-submit="manual"');
      const ctl = submitState($('f') as HTMLFormElement);
      let resolve!: () => void;
      const done = ctl.track(new Promise<void>((r) => (resolve = r)));
      expect(ctl.state).toBe('busy');
      resolve();
      await done;
      expect(ctl.state).toBe('success');
      ctl.reset();
      const failing = ctl.track(Promise.reject(new Error('x')));
      await expect(failing).rejects.toThrow('x');
      expect(ctl.state).toBe('error');

      let late!: () => void;
      ctl.reset();
      const pending = ctl.track(new Promise<void>((r) => (late = r)));
      ctl.reset();
      late();
      await pending;
      expect(ctl.state).toBe('idle');
    });

    it('anuncia "Enviando…" só se demorar e o resultado pelo anunciador', () => {
      start('data-eds-submit="manual"');
      send($('f'), $('ok'));
      expect(status()).toBe('');
      vi.advanceTimersByTime(1000);
      expect(status()).toBe('Enviando…');
      submitState($('f') as HTMLFormElement).success();
      vi.advanceTimersByTime(0);
      expect(status()).toContain('Salvo');
    });
  });

  describe('fetch', () => {
    const response = (ok: boolean, status = ok ? 200 : 500) => ({ ok, status }) as Response;

    it('envia o form (urlencoded, com o botão que enviou), sem o PageLoader, e conclui com sucesso', async () => {
      start('data-eds-submit="fetch"');
      const fetchMock = vi.fn().mockResolvedValue(response(true));
      vi.stubGlobal('fetch', fetchMock);
      const onSuccess = vi.fn();
      $('f').addEventListener('eds:form-success', onSuccess);
      const event = send($('f'), $('outro'));
      expect(event.defaultPrevented).toBe(true);
      expect($('outro')).toHaveAttribute('aria-busy', 'true');
      await vi.advanceTimersByTimeAsync(0);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { edsLoader?: false }];
      expect(url).toContain('/salvar');
      expect(init.method).toBe('POST');
      expect(init.edsLoader).toBe(false);
      expect((init.body as URLSearchParams).toString()).toBe('nome=Ana+Exemplo&acao=rascunho');
      expect($('outro')).toHaveAttribute('data-state', 'success');
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect((onSuccess.mock.calls[0]?.[0] as CustomEvent).detail.status).toBe(200);
      vi.unstubAllGlobals();
    });

    it('HTTP de erro e falha de rede viram eds:form-error e deixam o form editável', async () => {
      start('data-eds-submit="fetch"');
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(response(false, 422))
        .mockRejectedValueOnce(new TypeError('rede'));
      vi.stubGlobal('fetch', fetchMock);
      const onError = vi.fn();
      $('f').addEventListener('eds:form-error', onError);
      send($('f'), $('ok'));
      await vi.advanceTimersByTimeAsync(0);
      expect($('ok')).toHaveAttribute('data-state', 'error');
      expect($('ok')).toHaveTextContent('Não foi possível salvar');
      expect(($('f') as HTMLFormElement).elements.length).toBeGreaterThan(0);
      // Nova tentativa logo em seguida (o erro não bloqueia).
      send($('f'), $('ok'));
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(2);
      expect((onError.mock.calls[1]?.[0] as CustomEvent).detail.error).toBeInstanceOf(TypeError);
      vi.unstubAllGlobals();
    });

    it('GET vai na query; multipart manda FormData; eds:form-submit pode acrescentar campos', async () => {
      start('data-eds-submit="fetch" method="get" enctype="multipart/form-data"');
      const fetchMock = vi.fn().mockResolvedValue(response(true));
      vi.stubGlobal('fetch', fetchMock);
      $('f').addEventListener('eds:form-submit', (e) => {
        (e as CustomEvent<{ data: FormData }>).detail.data.append('token', 'abc');
      });
      send($('f'), $('ok'));
      await vi.advanceTimersByTimeAsync(0);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('?nome=Ana+Exemplo&token=abc');
      vi.unstubAllGlobals();
    });
  });
});
