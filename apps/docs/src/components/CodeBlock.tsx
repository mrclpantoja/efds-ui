import { useEffect, useRef, useState, type RefObject } from 'react';

interface CodeBlockProps {
  code: string;
  /** Nome acessível da região quando o bloco rola (ex.: "Código HTML: Variantes"). */
  label: string;
  /** Ref do `<pre>` (para selecionar o texto). */
  preRef?: RefObject<HTMLPreElement | null>;
}

/**
 * Código em `<pre><code>` simples (sem realce de sintaxe). Só vira região focável (e nomeada)
 * quando rola de fato, para o teclado conseguir rolá-la (WCAG 2.1.1); do contrário, um bloco
 * que cabe não vira parada de Tab nem landmark. Mesma lógica do `useScrollRegion` do React.
 */
export function CodeBlock({ code, label, preRef }: CodeBlockProps) {
  const ownRef = useRef<HTMLPreElement | null>(null);
  const innerRef = preRef ?? ownRef;
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const sync = () =>
      setScrolls(el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    sync();
    return () => observer.disconnect();
  }, [code, innerRef]);

  const region = scrolls ? { tabIndex: 0, role: 'region', 'aria-label': label } : {};
  return (
    <pre className="docs-code" ref={innerRef} {...region}>
      <code>{code.trim()}</code>
    </pre>
  );
}
