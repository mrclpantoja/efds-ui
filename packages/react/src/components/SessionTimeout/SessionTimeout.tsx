import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { mergeRefs } from '../../internal/refs-d';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { useSessionTimeout, type UseSessionTimeoutOptions } from './useSessionTimeout';

export interface SessionTimeoutTexts {
  title: string;
  /** Corpo do aviso; `{time}` vira a contagem. */
  body: string;
  continue: string;
  leave: string;
  /** Anúncio do tempo restante; `{time}` é a duração falada. */
  announce: string;
  second: string;
  seconds: string;
  minute: string;
  minutes: string;
  /** Liga minutos e segundos ("1 minuto e 5 segundos"). */
  and: string;
}

const defaultTexts: SessionTimeoutTexts = {
  title: 'Sua sessão vai expirar',
  body: 'Por inatividade, você será desconectado em {time}. Alterações não salvas serão perdidas.',
  continue: 'Continuar conectado',
  leave: 'Sair',
  announce: 'A sessão expira em {time}.',
  second: '{count} segundo',
  seconds: '{count} segundos',
  minute: '{count} minuto',
  minutes: '{count} minutos',
  and: ' e ',
};

export interface SessionTimeoutProps extends UseSessionTimeoutOptions {
  texts?: Partial<SessionTimeoutTexts>;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Aviso de sessão por inatividade: um `alertdialog` modal com a contagem regressiva (visual,
 * sem anúncio por segundo; o leitor de tela ouve o tempo ao abrir, a cada minuto e aos 10 s)
 * e os botões "Continuar conectado" e "Sair". Esc continua conectado. Não renderiza nada fora
 * do aviso. Para uma tela própria, use `useSessionTimeout`.
 */
export const SessionTimeout = forwardRef<HTMLDialogElement, SessionTimeoutProps>(
  function SessionTimeout({ texts, ...options }, ref) {
    const t = mergeTexts(defaultTexts, texts);
    const { warning, remaining, extend, leave } = useSessionTimeout(options);
    const id = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const origin = useRef<HTMLElement | null>(null);
    const announced = useRef(new Set<number>());
    const [status, setStatus] = useState('');
    const warnSeconds = Math.max(0, options.warnBefore ?? 60);

    const spoken = (seconds: number): string => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      const parts: string[] = [];
      if (m > 0) parts.push((m === 1 ? t.minute : t.minutes).replace('{count}', String(m)));
      if (s > 0 || m === 0)
        parts.push((s === 1 ? t.second : t.seconds).replace('{count}', String(s)));
      return parts.join(t.and);
    };

    // Abre o modal ao entrar em aviso; devolve o foco ao sair.
    useEffect(() => {
      if (!warning) return undefined;
      origin.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const el = dialogRef.current;
      if (el && !el.open) {
        try {
          el.showModal();
        } catch {
          el.setAttribute('open', '');
        }
      }
      el?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      return () => {
        announced.current = new Set();
        setStatus('');
        if (origin.current?.isConnected) origin.current.focus();
      };
    }, [warning]);

    // Anúncios moderados: a cada minuto cheio abaixo do aviso e aos 10 s.
    useEffect(() => {
      if (!warning) return;
      const marks: number[] = [];
      for (let s = 60; s < warnSeconds; s += 60) marks.push(s);
      if (warnSeconds > 10) marks.push(10);
      for (const m of marks) {
        if (remaining <= m && !announced.current.has(m)) {
          announced.current.add(m);
          setStatus(t.announce.replace('{time}', spoken(remaining)));
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warning, remaining]);

    if (!warning) return null;
    const [before = '', after = ''] = t.body.split('{time}');
    return (
      <dialog
        ref={mergeRefs(ref, dialogRef)}
        className="eds-modal eds-alert-dialog eds-alert-dialog-warning"
        role="alertdialog"
        data-eds-backdrop="static"
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-d`}
        onCancel={(event) => {
          event.preventDefault();
          extend();
        }}
      >
        <div className="eds-alert-dialog-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <h2 className="eds-alert-dialog-title" id={`${id}-t`}>
          {t.title}
        </h2>
        <p className="eds-alert-dialog-text" id={`${id}-d`}>
          {before}
          <strong className="eds-session-countdown" aria-hidden="true">
            {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
          </strong>
          <span className="eds-visually-hidden">{spoken(remaining)}</span>
          {after}
        </p>
        <div className="eds-visually-hidden" role="status" aria-live="polite">
          {status}
        </div>
        <div className="eds-alert-dialog-actions">
          <Button variant="secondary" onClick={leave}>
            {t.leave}
          </Button>
          <Button variant="primary" data-autofocus onClick={extend}>
            {t.continue}
          </Button>
        </div>
      </dialog>
    );
  },
);
SessionTimeout.displayName = 'SessionTimeout';
