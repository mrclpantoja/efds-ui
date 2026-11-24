import { useEffect, useMemo, useRef, useState } from 'react';
import { createTheme } from '@efds-ui/behavior/theme';
import { Badge, Button, Field, Input, Stack } from '@efds-ui/react';

/**
 * `createTheme(hex)` gera `--eds-accent-50..900` com contraste AA nos dois modos. Aqui as
 * variáveis vão num contêiner (`data-theme="custom"` + `data-mode` no mesmo elemento).
 */
export default function Basico() {
  const [cor, setCor] = useState('#2f6f5e');
  const result = useMemo(() => createTheme(cor), [cor]);
  const box = useRef<HTMLDivElement>(null);
  // O contêiner segue o modo (claro/escuro) do documento: `data-theme` e `data-mode` andam juntos.
  // `typeof document`: o mesmo código roda em renderização no servidor (Next.js, pré-render).
  const [mode, setMode] = useState(() =>
    typeof document === 'undefined'
      ? 'light'
      : (document.documentElement.getAttribute('data-mode') ?? 'light'),
  );
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => setMode(html.getAttribute('data-mode') ?? 'light'));
    observer.observe(html, { attributes: true, attributeFilter: ['data-mode'] });
    return () => observer.disconnect();
  }, []);
  // As variáveis do tema vão no contêiner (sem `style` no JSX).
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    for (const [token, value] of Object.entries(result.tokens)) el.style.setProperty(token, value);
    return () => {
      for (const token of Object.keys(result.tokens)) el.style.removeProperty(token);
    };
  }, [result]);
  const action = result.checks.find((check) => check.id === `${mode}-action-text`);
  return (
    <div ref={box} data-theme={result.name} data-mode={mode}>
      <Stack gap={4}>
        <Field
          label="Cor da organização"
          helper="O sistema ajusta o tom até o texto branco atingir o contraste mínimo (4.5:1)."
        >
          <Input type="color" value={cor} onChange={(event) => setCor(event.target.value)} />
        </Field>
        <Stack direction="row" wrap gap={3}>
          <Button variant="primary">Ação principal</Button>
          <Button variant="ghost">Ação suave</Button>
          <Badge variant="info">Amostra</Badge>
        </Stack>
        <p className="eds-text-small">
          Contraste do texto sobre a ação: {String(action?.ratio).replace('.', ',')}:1
          {result.adjusted ? ' (a cor foi ajustada para atingir o contraste).' : '.'}
        </p>
      </Stack>
    </div>
  );
}
