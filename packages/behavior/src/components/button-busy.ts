const BUSY = '.eds-button[aria-busy="true"]';

/**
 * Botão em carregamento (`.eds-button[aria-busy="true"]`) não ativa: o CSS só barra o mouse
 * (`pointer-events`), então Enter e Espaço ainda gerariam `click`. Ouvintes de captura em `root`
 * cancelam (`preventDefault` + `stopImmediatePropagation`) o `click` e as teclas de ativação.
 * O botão continua focável e sem `disabled` (o foco não se perde); o leitor de tela lê o
 * `aria-busy`. Devolve a limpeza.
 */
export function initButtonBusy(root: ParentNode = document): () => void {
  const target = root as unknown as EventTarget;
  const busyButton = (event: Event): boolean =>
    event.target instanceof Element && event.target.closest(BUSY) !== null;
  const block = (event: Event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const onClick = (event: Event) => {
    if (busyButton(event)) block(event);
  };
  const onKey = (event: Event) => {
    const key = (event as KeyboardEvent).key;
    // Enter ativa no keydown; Espaço no keyup (alguns navegadores já no keydown).
    if ((key === 'Enter' || key === ' ' || key === 'Spacebar') && busyButton(event)) block(event);
  };
  target.addEventListener('click', onClick, true);
  target.addEventListener('keydown', onKey, true);
  target.addEventListener('keyup', onKey, true);
  return () => {
    target.removeEventListener('click', onClick, true);
    target.removeEventListener('keydown', onKey, true);
    target.removeEventListener('keyup', onKey, true);
  };
}
