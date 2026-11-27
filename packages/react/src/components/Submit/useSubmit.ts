import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { announceStatus } from '../../internal/status-region';
import { mergeTexts } from '../../utils/texts';
import type { ButtonStatus, ButtonTexts } from '../Button';

/** `idle` normal · `busy` enviando · `success`/`error` resultado temporário. */
export type SubmitState = 'idle' | 'busy' | 'success' | 'error';

export interface SubmitTexts {
  /** Anunciado se o envio demorar mais de 1 s. */
  busy: string;
  /** Texto do botão e anúncio de sucesso. */
  success: string;
  /** Texto do botão e anúncio de falha. */
  error: string;
}

const defaultTexts: SubmitTexts = {
  busy: 'Enviando…',
  success: 'Salvo',
  error: 'Não foi possível salvar',
};

export interface UseSubmitOptions {
  /** Quanto tempo o resultado fica no botão (ms); `0` = até o próximo envio. Padrão: 2000. */
  feedbackMs?: number;
  texts?: Partial<SubmitTexts>;
  /** Chamado depois de um envio bem-sucedido. */
  onSuccess?: () => void;
  /** Chamado com o que o envio lançou. */
  onError?: (error: unknown) => void;
}

export interface UseSubmitResult {
  state: SubmitState;
  /** Atalho de `state === 'busy'` (use em `aria-disabled` dos outros botões de envio). */
  busy: boolean;
  /** O que o último envio lançou (limpo no próximo envio). */
  error: unknown;
  /** Para `<form onSubmit>`: cancela o envio nativo, ignora envio repetido e chama o handler. */
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Volta ao normal na hora. */
  reset: () => void;
  /** Para espalhar no `<Button type="submit">` que envia. */
  buttonProps: { loading: boolean; status?: ButtonStatus; texts: ButtonTexts };
}

const BUSY_ANNOUNCE_MS = 1000;

/**
 * Estado de envio de um formulário: embrulha um handler assíncrono e devolve `state`, o
 * `handleSubmit` (que bloqueia o duplo envio) e as props do Button (`loading`, `status`, `texts`).
 * Sucesso e falha ficam no botão por `feedbackMs` e são anunciados; na falha o foco vai para o
 * resumo de erros (`[data-eds-error-summary]` dentro do formulário) ou para o botão que enviou.
 * Com `PageLoaderProvider auto`, passe `edsLoader: false` no `fetch` do handler para não somar o
 * diálogo bloqueante ao botão.
 *
 * @example
 * const submit = useSubmit(async (data) => { await salvar(data); });
 * <form onSubmit={submit.handleSubmit}>
 *   <Button type="submit" variant="primary" {...submit.buttonProps}>Salvar</Button>
 * </form>
 */
export function useSubmit(
  handler: (data: FormData, event: FormEvent<HTMLFormElement>) => unknown,
  options: UseSubmitOptions = {},
): UseSubmitResult {
  const { feedbackMs = 2000, texts } = options;
  const t = mergeTexts(defaultTexts, texts);
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState<unknown>(undefined);
  const busyRef = useRef(false);
  const token = useRef(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ handler, t, options, feedbackMs });
  useEffect(() => {
    latest.current = { handler, t, options, feedbackMs };
  });

  const clearTimers = useCallback(() => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    if (busyTimer.current) clearTimeout(busyTimer.current);
    feedbackTimer.current = busyTimer.current = null;
  }, []);

  useEffect(
    () => () => {
      token.current += 1;
      clearTimers();
    },
    [clearTimers],
  );

  const reset = useCallback(() => {
    token.current += 1;
    busyRef.current = false;
    clearTimers();
    setState('idle');
  }, [clearTimers]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busyRef.current) return;
      const form = event.currentTarget;
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const data = new FormData(form, submitter instanceof HTMLElement ? submitter : undefined);
      clearTimers();
      busyRef.current = true;
      token.current += 1;
      const mine = token.current;
      setError(undefined);
      setState('busy');
      busyTimer.current = setTimeout(() => announceStatus(latest.current.t.busy), BUSY_ANNOUNCE_MS);

      const finish = (next: 'success' | 'error', failure?: unknown) => {
        if (mine !== token.current) return;
        const { t: texts2, options: opts, feedbackMs: ms } = latest.current;
        clearTimers();
        busyRef.current = false;
        setError(failure);
        setState(next);
        announceStatus(texts2[next]);
        if (next === 'success') opts.onSuccess?.();
        else {
          opts.onError?.(failure);
          const summary = form.querySelector<HTMLElement>('[data-eds-error-summary]:not([hidden])');
          if (summary && !summary.hasAttribute('tabindex')) summary.tabIndex = -1;
          (summary ?? (submitter instanceof HTMLElement ? submitter : null))?.focus();
        }
        if (ms > 0) feedbackTimer.current = setTimeout(reset, ms);
      };

      void (async () => {
        try {
          await latest.current.handler(data, event);
          finish('success');
        } catch (failure) {
          finish('error', failure);
        }
      })();
    },
    [clearTimers, reset],
  );

  return {
    state,
    busy: state === 'busy',
    error,
    handleSubmit,
    reset,
    buttonProps: {
      loading: state === 'busy',
      status: state === 'success' || state === 'error' ? state : undefined,
      texts: { success: t.success, error: t.error },
    },
  };
}
