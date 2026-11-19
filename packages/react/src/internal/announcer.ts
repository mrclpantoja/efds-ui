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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reread = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef('');

  const flush = useCallback(() => {
    timer.current = null;
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
      if (!timer.current) timer.current = setTimeout(flush, 0);
    },
    [flush],
  );

  const set = useCallback((next: string) => {
    last.current = next;
    queue.current = [];
    if (timer.current) clearTimeout(timer.current);
    if (reread.current) clearTimeout(reread.current);
    timer.current = null;
    reread.current = null;
    setText(next);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (reread.current) clearTimeout(reread.current);
    },
    [],
  );

  return { text, announce, set };
}
