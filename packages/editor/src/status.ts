/**
 * Região `role=status`: mensagens do mesmo tick são concatenadas e uma mensagem igual à anterior
 * é relida (limpa e reescreve depois de uma pausa curta).
 */
export interface Announcer {
  say: (text: string) => void;
  dispose: () => void;
}

const REREAD_MS = 60;

export function createAnnouncer(el: HTMLElement | null): Announcer {
  let sameTick = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    say(text) {
      if (!el) return;
      cancel();
      if (text === '') {
        el.textContent = '';
        return;
      }
      if (sameTick && el.textContent) {
        el.textContent = `${el.textContent} ${text}`;
        return;
      }
      sameTick = true;
      queueMicrotask(() => {
        sameTick = false;
      });
      if (el.textContent === text) {
        el.textContent = '';
        timer = setTimeout(() => {
          timer = null;
          el.textContent = text;
        }, REREAD_MS);
      } else el.textContent = text;
    },
    dispose: cancel,
  };
}
