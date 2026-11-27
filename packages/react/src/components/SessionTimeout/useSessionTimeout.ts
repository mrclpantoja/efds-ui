import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSessionTimeoutOptions {
  /** Segundos sem atividade até a sessão expirar. Padrão: 900 (15 min). */
  timeout?: number;
  /** Segundos de aviso antes de expirar. Padrão: 60. */
  warnBefore?: number;
  /** Chamado quando a sessão expira (inclusive por "Sair" e por outra aba). */
  onExpire?: () => void;
  /** Chamado quando o aviso abre. */
  onWarn?: (remaining: number) => void;
  /**
   * Endereço para renovar a sessão no servidor (POST, mesmo site). Sem ele não há chamada de
   * rede nenhuma.
   */
  keepAliveUrl?: string;
  /** Segundos entre renovações por atividade. Padrão: 300. */
  keepAliveEvery?: number;
  /** Chave do `localStorage` que sincroniza as abas. Padrão: `eds-session`. */
  storageKey?: string;
  /** Desliga a contagem (ex.: usuário não autenticado). Padrão: `true`. */
  enabled?: boolean;
}

export interface UseSessionTimeoutResult {
  /** O aviso de expiração está aberto. */
  warning: boolean;
  /** Segundos restantes (só vale com `warning`). */
  remaining: number;
  /** "Continuar conectado": reinicia a contagem em todas as abas. */
  extend: () => void;
  /** "Sair": expira na hora. */
  leave: () => void;
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'mousemove'];

/**
 * Sessão por inatividade (WCAG 2.2.1 e 2.2.6). Qualquer atividade reinicia a contagem; faltando
 * `warnBefore` segundos, `warning` fica `true` e `remaining` anda por segundo. Atividade e
 * expiração são compartilhadas entre as abas pelo `localStorage`. Exige `extend()` explícito
 * durante o aviso (mexer o mouse não basta). Use `<SessionTimeout>` para o diálogo pronto.
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}): UseSessionTimeoutResult {
  const { enabled = true } = options;
  const [state, setState] = useState({ warning: false, remaining: 0 });
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const api = useRef<{ extend: () => void; leave: () => void }>({
    extend: () => undefined,
    leave: () => undefined,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const timeoutMs = Math.max(1, latest.current.timeout ?? 15 * 60) * 1000;
    let warnMs = Math.max(0, latest.current.warnBefore ?? 60) * 1000;
    if (warnMs >= timeoutMs) warnMs = Math.floor(timeoutMs / 2);
    const keepAliveMs = (latest.current.keepAliveEvery ?? 300) * 1000;
    const key = latest.current.storageKey ?? 'eds-session';
    const lastKey = `${key}-last`;
    const nonce = Math.random().toString(36).slice(2);
    let store: Storage | null = null;
    try {
      store = window.localStorage;
    } catch {
      store = null;
    }

    let last = Date.now();
    let lastWrite = 0;
    let lastPing = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let warning = false;
    let expired = false;
    let stopped = false;

    const write = (type: 'activity' | 'expired', at: number) => {
      lastWrite = Date.now();
      try {
        store?.setItem(lastKey, String(at));
        store?.setItem(key, `${nonce}|${type}|${at}|${Math.random()}`);
      } catch {
        /* cada aba conta sozinha */
      }
    };
    const stored = Number(store?.getItem(lastKey) ?? '');
    if (Number.isFinite(stored) && stored > 0 && Date.now() - stored < timeoutMs) last = stored;
    else write('activity', last);

    const ping = () => {
      const url = latest.current.keepAliveUrl;
      if (!url) return;
      lastPing = Date.now();
      try {
        void fetch(url, { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(
          () => undefined,
        );
      } catch {
        /* sem fetch: segue sem renovar */
      }
    };

    const setWarning = (next: boolean, remaining: number) => {
      const opened = next && !warning;
      warning = next;
      setState((prev) =>
        prev.warning === next && prev.remaining === remaining ? prev : { warning: next, remaining },
      );
      if (opened) latest.current.onWarn?.(remaining);
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (stopped || expired) return;
      const rem = last + timeoutMs - Date.now();
      if (rem <= 0) {
        expire(true);
        return;
      }
      if (warnMs > 0 && rem <= warnMs) {
        setWarning(true, Math.ceil(rem / 1000));
        timer = setTimeout(schedule, rem % 1000 || 1000);
        return;
      }
      setWarning(false, 0);
      timer = setTimeout(schedule, Math.min(rem - warnMs, 30_000));
    };

    const expire = (broadcast: boolean) => {
      if (stopped || expired) return;
      expired = true;
      if (timer) clearTimeout(timer);
      timer = null;
      setWarning(false, 0);
      if (broadcast) write('expired', Date.now());
      latest.current.onExpire?.();
    };

    const extend = () => {
      if (stopped || expired) return;
      last = Date.now();
      write('activity', last);
      setWarning(false, 0);
      ping();
      schedule();
    };

    const onActivity = () => {
      if (stopped || expired || warning) return;
      const now = Date.now();
      if (now - lastWrite < 1000) return;
      last = now;
      write('activity', now);
      if (latest.current.keepAliveUrl && now - lastPing > keepAliveMs) ping();
      schedule();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return;
      const [from, type, at] = event.newValue.split('|');
      if (from === nonce) return;
      if (type === 'expired') {
        expire(false);
        return;
      }
      const time = Number(at);
      if (Number.isFinite(time) && time > last) {
        last = time;
        setWarning(false, 0);
        schedule();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule();
    };

    api.current = { extend, leave: () => expire(true) };
    for (const name of ACTIVITY_EVENTS) {
      document.addEventListener(name, onActivity, { passive: true, capture: true });
    }
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    schedule();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      for (const name of ACTIVITY_EVENTS) {
        document.removeEventListener(name, onActivity, { capture: true });
      }
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // As opções de tempo valem na montagem; para mudar, mude a `key` do componente.
  }, [enabled]);

  const extend = useCallback(() => api.current.extend(), []);
  const leave = useCallback(() => api.current.leave(), []);
  return {
    warning: enabled && state.warning,
    remaining: enabled ? state.remaining : 0,
    extend,
    leave,
  };
}
