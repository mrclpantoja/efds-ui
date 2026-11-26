import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from 'react';
import { init } from '@efds-ui/behavior';
import { Button, Tab, TabList, TabPanel, Tabs } from '@efds-ui/react';
import { CodeBlock } from './CodeBlock';

export interface ReactExample {
  /** Exemplo importado como módulo (`import X from './x'`): vira o preview. */
  Component: ComponentType;
  /** O mesmo arquivo importado com `?raw`: vira o código exibido. */
  source: string;
}

export interface ExampleProps {
  title: string;
  description?: ReactNode;
  /** Arquivo `.html` importado com `?raw`: preview e código vêm do mesmo texto. */
  html?: string;
  react?: ReactExample;
}

/** Atributos cujo valor é (lista de) id ou referência a id. */
const ID_ATTRS =
  /(\s(?:id|for|form|aria-labelledby|aria-describedby|aria-controls|aria-owns|aria-activedescendant|aria-errormessage|popovertarget|list|data-eds-help|data-eds-open|data-eds-status|data-eds-table-filter|data-eds-export-target|data-eds-lookup-dialog)=)"([^"]*)"/g;

/**
 * Dá a cada id do exemplo um sufixo único por instância, para o mesmo exemplo poder aparecer
 * mais de uma vez na página sem ids duplicados. Só o preview é alterado: o código exibido
 * continua o original.
 */
export function scopeIds(html: string, suffix: string): string {
  const ids = new Set<string>();
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) ids.add(match[1] ?? '');
  if (ids.size === 0) return html;
  return (
    html
      .replace(ID_ATTRS, (_all, attr: string, value: string) => {
        const scoped = value
          .split(/\s+/)
          .map((token) => (ids.has(token) ? `${token}-${suffix}` : token))
          .join(' ');
        return `${attr}"${scoped}"`;
      })
      // `data-eds-cep-fill="campo:#id,..."`, `data-eds-copy="#id"` e `data-eds-cropper-preview="#id"`: os seletores `#id` também
      // apontam para ids do exemplo.
      .replace(
        /(\sdata-eds-(?:cep-fill|copy|cropper-preview)=)"([^"]*)"/g,
        (_all, attr: string, value: string) => {
          const scoped = value.replace(/#([A-Za-z][\w-]*)/g, (m, id: string) =>
            ids.has(id) ? `#${id}-${suffix}` : m,
          );
          return `${attr}"${scoped}"`;
        },
      )
  );
}

/**
 * Versão enxuta do HTML para exibir: cada `<svg>` vira um comentário. O preview usa o HTML
 * completo; só o código mostrado é abreviado.
 */
export function collapseIcons(html: string): string {
  return html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g, (svg) =>
    /aria-hidden="true"/.test(svg)
      ? '<!-- ícone: svg com aria-hidden="true" -->'
      : '<!-- ícone: svg -->',
  );
}

function HtmlPreview({ html }: { html: string }) {
  const suffix = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const scoped = useMemo(() => scopeIds(html, suffix), [html, suffix]);
  const ref = useRef<HTMLDivElement | null>(null);
  // O comportamento do `@efds-ui/behavior` liga só o markup HTML do preview (nunca o `document`:
  // o resto do site é React e não pode ser ligado duas vezes). O loader automático fica
  // desligado, para não bloquear a navegação da documentação.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const stop = init(el, { loader: { mode: 'manual' } });
    // O editor de conteúdo é outro pacote (`@efds-ui/editor`): carregado só quando o exemplo o usa.
    let stopEditors: (() => void) | undefined;
    let cancelled = false;
    if (el.querySelector('[data-eds-editor]')) {
      void import('@efds-ui/editor').then(({ initEditors }) => {
        if (!cancelled) stopEditors = initEditors(el);
      });
    }
    // Os formulários dos exemplos nunca navegam (a documentação é uma SPA sem servidor).
    // `method="dialog"` (ou `formmethod`) fecha o <dialog> sem navegar: esse envio passa.
    const block = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const submitter = (event as SubmitEvent).submitter;
      const method = submitter?.getAttribute('formmethod') ?? form.getAttribute('method');
      if (method?.toLowerCase() === 'dialog') return;
      event.preventDefault();
    };
    el.addEventListener('submit', block);
    return () => {
      el.removeEventListener('submit', block);
      cancelled = true;
      stopEditors?.();
      stop();
    };
  }, [scoped]);
  // O HTML vem de arquivos do próprio repositório (?raw), nunca de entrada do usuário.
  return <div ref={ref} className="docs-preview" dangerouslySetInnerHTML={{ __html: scoped }} />;
}

const statusText = {
  idle: '',
  copied: 'Código copiado.',
  failed: 'Código selecionado: use Ctrl+C.',
};

interface CopyButtonProps {
  /** Texto copiado. */
  code: string;
  /** Formato e título, para dar nome distinto a cada botão da página. */
  name: string;
  /** Bloco exibido: no erro da cópia, seu texto é selecionado. */
  preRef: RefObject<HTMLPreElement | null>;
}

function CopyButton({ code, name, preRef }: CopyButtonProps) {
  const [status, setStatus] = useState<keyof typeof statusText>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setStatus('copied');
    } catch {
      // Sem permissão para a área de transferência: seleciona o código para o Ctrl+C.
      const pre = preRef.current;
      if (pre) window.getSelection()?.selectAllChildren(pre);
      setStatus('failed');
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <>
      <Button size="sm" variant="tertiary" onClick={copy} aria-label={`Copiar código ${name}`}>
        Copiar código
      </Button>
      <span role="status" className="eds-visually-hidden">
        {statusText[status]}
      </span>
    </>
  );
}

interface BodyProps {
  kind: 'html' | 'react';
  title: string;
  /** Com abas, o formato já está no nome da aba: o rótulo da barra seria redundante. */
  tabbed: boolean;
  html?: string;
  react?: ReactExample;
}

function Body({ kind, title, tabbed, html, react }: BodyProps) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const source = kind === 'html' ? (html ?? '') : (react?.source ?? '');
  const shown = kind === 'html' ? collapseIcons(source) : source;
  const abbreviated = shown !== source;
  const Component = react?.Component;
  const format = kind === 'html' ? 'HTML' : 'React';
  return (
    <div className="docs-example-body">
      {kind === 'html' ? (
        <HtmlPreview html={html ?? ''} />
      ) : (
        <div className="docs-preview">{Component ? <Component /> : null}</div>
      )}
      <div className="docs-code-bar">
        {!tabbed || abbreviated ? (
          <span className="eds-text-small docs-code-bar-label">
            {[
              tabbed ? null : kind === 'html' ? 'HTML' : 'React (TSX)',
              abbreviated ? 'Ícones SVG abreviados aqui; a cópia traz o código completo.' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        ) : null}
        <CopyButton code={source} name={`${format}: ${title}`} preRef={preRef} />
      </div>
      <CodeBlock code={shown} label={`Código ${format}: ${title}`} preRef={preRef} />
    </div>
  );
}

/**
 * Exemplo vivo: preview + código. Com HTML e React, abas "HTML" | "React" (Tabs do
 * `@efds-ui/react`); cada aba mostra o preview renderizado a partir do seu próprio código.
 */
export function Example({ title, description, html, react }: ExampleProps) {
  const titleId = useId();
  return (
    <div className="docs-example" role="group" aria-labelledby={titleId}>
      <h3 id={titleId} className="eds-text-h4">
        {title}
      </h3>
      {description ? <p className="docs-muted">{description}</p> : null}
      {html !== undefined && react !== undefined ? (
        <Tabs defaultValue="html">
          <TabList aria-label={`Formato do exemplo: ${title}`}>
            <Tab value="html">HTML</Tab>
            <Tab value="react">React</Tab>
          </TabList>
          <TabPanel value="html" tabIndex={-1}>
            <Body kind="html" title={title} tabbed html={html} />
          </TabPanel>
          <TabPanel value="react" tabIndex={-1}>
            <Body kind="react" title={title} tabbed react={react} />
          </TabPanel>
        </Tabs>
      ) : html !== undefined ? (
        <Body kind="html" title={title} tabbed={false} html={html} />
      ) : react ? (
        <Body kind="react" title={title} tabbed={false} react={react} />
      ) : null}
    </div>
  );
}
