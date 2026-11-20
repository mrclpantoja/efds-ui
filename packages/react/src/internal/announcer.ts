import { useCallback, useEffect, useRef, useState } from 'react';

const REREAD_DELAY_MS = 60;

/**
 * Texto de uma live region (`role="status"`).
 * - `announce(msg)`: mensagens do mesmo tick são concatenadas (senão só a última seria lida) e uma
 *   mensagem igual à anterior é relida (a região é limpa e reescrita após um instante).
 * - `set(text)`: troca direta, sem fila (contagem de resultados, limpeza).
 */
export function useAnnouncer(): {
  text: string;
  announce: (message: string) => void;
  set: (text: string) => void;
} {
  const [text, setText] = useState('');
  const queue = useRef<string[]>([]);
  // Fila pendente de microtask (mesmo "tick" do behavior). Microtask, não setTimeout: abas em
  // segundo plano atrasam timers e juntariam anúncios de ações distintas.
  const scheduled = useRef(false);
  const reread = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef('');

  const flush = useCallback(() => {
    scheduled.current = false;
    const message = queue.current.join(' ');
    queue.current = [];
    if (message === '') return;
    if (message === last.current) {
      setText('');
      if (reread.current) clearTimeout(reread.current);
      reread.current = setTimeout(() => {
        reread.current = null;
        setText(message);
      }, REREAD_DELAY_MS);
    } else {
      last.current = message;
      setText(message);
    }
  }, []);

  const announce = useCallback(
    (message: string) => {
      if (message === '') return;
      queue.current.push(message);
      if (!scheduled.current) {
        scheduled.current = true;
        queueMicrotask(flush);
      }
    },
    [flush],
  );

  const set = useCallback((next: string) => {
    last.current = next;
    queue.current = [];
    scheduled.current = false;
    if (reread.current) clearTimeout(reread.current);
    reread.current = null;
    setText(next);
  }, []);

  useEffect(
    () => () => {
      queue.current = [];
      if (reread.current) clearTimeout(reread.current);
    },
    [],
  );

  return { text, announce, set };
}
