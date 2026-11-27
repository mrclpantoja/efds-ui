import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type Status = 'info' | 'success' | 'warning' | 'danger';

const statuses: { key: Status; label: string; title: string; text: string }[] = [
  {
    key: 'info',
    label: 'Informação',
    title: 'Informação:',
    text: 'A conciliação roda todos os dias às 02h.',
  },
  {
    key: 'success',
    label: 'Sucesso',
    title: 'Sucesso:',
    text: 'O contrato foi assinado e arquivado.',
  },
  {
    key: 'warning',
    label: 'Atenção',
    title: 'Atenção:',
    text: 'O certificado digital vence em 7 dias.',
  },
  {
    key: 'danger',
    label: 'Erro',
    title: 'Erro:',
    text: 'Não foi possível enviar a nota fiscal.',
  },
];

const section: CSSProperties = {
  display: 'grid',
  gap: 'var(--eds-space-4)',
  padding: 'var(--eds-space-5)',
  border: '1px solid var(--eds-color-border-default)',
  borderRadius: 'var(--eds-radius-lg)',
  background: 'var(--eds-color-bg-surface)',
};
const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--eds-space-3)',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={section}>
      <h3 className="eds-text-h4">{title}</h3>
      {children}
    </section>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/* ---------------------------------- Alert ---------------------------------- */

function Alerts() {
  const [open, setOpen] = useState(true);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const focusRestore = useRef(false);
  // Ao fechar, o foco vai para o botão que reabre o aviso (o botão fechar sai do DOM).
  useEffect(() => {
    if (!open && focusRestore.current) {
      focusRestore.current = false;
      restoreRef.current?.focus();
    }
  }, [open]);
  return (
    <Section title="Alert">
      <div style={{ display: 'grid', gap: 'var(--eds-space-3)' }}>
        {statuses.map((s) => (
          <div key={s.key} className={`eds-alert eds-alert-${s.key}`}>
            <div className="eds-alert-content">
              <strong className="eds-alert-title">{s.title}</strong> {s.text}
            </div>
          </div>
        ))}

        <div className="eds-alert eds-alert-warning">
          <div className="eds-alert-content">
            <p className="eds-alert-title">Atenção: faturas em atraso</p>
            <p>
              Existem 3 faturas vencidas há mais de 30 dias. Revise antes de fechar o período
              contábil.
            </p>
          </div>
          <div className="eds-alert-actions">
            <button type="button" className="eds-button eds-button-secondary eds-button-sm">
              Ver faturas
            </button>
            <button type="button" className="eds-button eds-button-ghost eds-button-sm">
              Lembrar depois
            </button>
          </div>
        </div>

        {open ? (
          <div className="eds-alert eds-alert-info">
            <div className="eds-alert-content">
              <strong className="eds-alert-title">Novidade:</strong> agora você pode exportar
              relatórios em PDF.
            </div>
            <button
              type="button"
              className="eds-button eds-button-ghost eds-button-icon eds-button-sm eds-alert-close"
              aria-label="Fechar aviso"
              onClick={() => {
                focusRestore.current = true;
                setOpen(false);
              }}
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <button
            ref={restoreRef}
            type="button"
            className="eds-button eds-button-tertiary eds-button-sm"
            style={{ justifySelf: 'start' }}
            onClick={() => setOpen(true)}
          >
            Mostrar aviso novamente
          </button>
        )}
      </div>
    </Section>
  );
}

/* ---------------------------------- Toast ----------------------------------
   Referência do comportamento que o React vai encapsular:
   - fila (máx. 3 visíveis); info/success fecham sozinhos em max(5 s, ~1 s a cada 10 palavras);
     warning e danger NÃO fecham sozinhos (exigem ação); pausa em hover/foco, com tempo restante;
   - Esc com foco dentro de um toast fecha esse toast;
   - ao fechar um toast que tinha o foco, o foco vai para o próximo toast ou, na falta dele, para o
     elemento que disparou o toast;
   - anúncio: uma região polite montada desde o início; só o danger tem role="alert";
   - com um <dialog> modal aberto, a região é renderizada DENTRO dele (portal): fora do dialog ela
     ficaria atrás do backdrop e inerte. Ao fechar o dialog, volta para a página.
   Saída: [data-closing] e remoção por timer (sob reduced-motion não há transitionend). */

const EXIT_MS = 250;
const MAX_VISIBLE = 3;

interface ToastData {
  id: number;
  kind: Status;
  title: string;
  text: string;
  closing: boolean;
  origin: HTMLElement | null;
}

function autoCloseMs(toast: ToastData): number | null {
  if (toast.kind === 'warning' || toast.kind === 'danger') return null;
  const words = `${toast.title} ${toast.text}`.trim().split(/\s+/).length;
  return Math.max(5000, words * 100);
}

/** Dialog modal aberto mais recente (ordem do DOM), ou null. */
function useModalHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => {
      const open = document.querySelectorAll<HTMLElement>('dialog:modal');
      setHost(open[open.length - 1] ?? null);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => observer.disconnect();
  }, []);
  return host;
}

function ToastItem({
  toast,
  paused,
  onClose,
}: {
  toast: ToastData;
  paused: boolean;
  onClose: (id: number) => void;
}) {
  const remaining = useRef(autoCloseMs(toast));
  useEffect(() => {
    if (paused || toast.closing || remaining.current === null) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onClose(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, (remaining.current ?? 0) - (Date.now() - startedAt));
    };
  }, [paused, toast.closing, toast.id, onClose]);

  return (
    <div
      className={`eds-toast eds-toast-${toast.kind}`}
      data-toast-id={toast.id}
      data-closing={toast.closing || undefined}
      role={toast.kind === 'danger' ? 'alert' : undefined}
    >
      <div className="eds-toast-content">
        <strong className="eds-toast-title">{toast.title}</strong> {toast.text}
      </div>
      <button
        type="button"
        className="eds-button eds-button-ghost eds-button-icon eds-button-sm eds-toast-close"
        aria-label="Fechar notificação"
        onClick={() => onClose(toast.id)}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function ToastRegion({ toasts, onClose }: { toasts: ToastData[]; onClose: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const visible = toasts.slice(0, MAX_VISIBLE);

  // Esc dentro de um toast fecha só ele (e não o dialog que o contém).
  useEffect(() => {
    const region = ref.current;
    if (!region) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !(event.target instanceof Element)) return;
      const id = event.target.closest<HTMLElement>('[data-toast-id]')?.dataset.toastId;
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      onClose(Number(id));
    };
    region.addEventListener('keydown', onKeyDown);
    return () => region.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="eds-toast-region"
      aria-live="polite"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
      }}
    >
      {visible.map((toast) => (
        <ToastItem key={toast.id} toast={toast} paused={hover || focus} onClose={onClose} />
      ))}
    </div>
  );
}

function Toasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastsRef = useRef(toasts);
  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);
  const nextId = useRef(1);
  const modalHost = useModalHost();

  const close = useCallback((id: number) => {
    const current = toastsRef.current.find((t) => t.id === id);
    if (!current || current.closing) return;
    const el = document.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
    if (el?.contains(document.activeElement)) {
      const sibling = [el.nextElementSibling, el.previousElementSibling].find(
        (node) => node && !node.hasAttribute('data-closing'),
      );
      const next = sibling?.querySelector<HTMLElement>('button') ?? current.origin;
      if (next?.isConnected) next.focus();
    }
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const push = (s: (typeof statuses)[number]) => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setToasts((list) => [
      ...list,
      { id: nextId.current++, kind: s.key, title: s.title, text: s.text, closing: false, origin },
    ]);
  };

  const region = <ToastRegion toasts={toasts} onClose={close} />;

  return (
    <Section title="Toast">
      <p className="eds-helper">
        Informação e sucesso fecham sozinhos (mín. 5 s); atenção e erro ficam até serem fechados.
        Passar o mouse ou focar pausa a contagem; Esc fecha o toast focado. Com mais de 3, as demais
        esperam na fila. Com um modal aberto, a região passa para dentro dele.
      </p>
      <div style={row}>
        {statuses.map((s) => (
          <button
            key={s.key}
            type="button"
            className="eds-button eds-button-secondary"
            onClick={() => push(s)}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          className="eds-button eds-button-tertiary"
          onClick={() => statuses.forEach(push)}
        >
          Disparar 4 de uma vez
        </button>
      </div>
      {modalHost ? createPortal(region, modalHost) : region}
    </Section>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

const badgeKinds = [
  { key: 'neutral', label: 'Rascunho' },
  { key: 'info', label: 'Em análise' },
  { key: 'success', label: 'Pago' },
  { key: 'warning', label: 'Pendente' },
  { key: 'danger', label: 'Atrasado' },
] as const;

const invoices = [
  { id: 'FAT-0001', client: 'Cliente Exemplo A', value: 'R$ 1.200,00', status: 'success' },
  { id: 'FAT-0002', client: 'Cliente Exemplo B', value: 'R$ 845,50', status: 'warning' },
  { id: 'FAT-0003', client: 'Cliente Exemplo C', value: 'R$ 3.990,00', status: 'danger' },
  { id: 'FAT-0004', client: 'Cliente Exemplo D', value: 'R$ 150,00', status: 'info' },
  { id: 'FAT-0005', client: 'Cliente Exemplo E', value: 'R$ 72,30', status: 'neutral' },
] as const;

const th: CSSProperties = {
  padding: 'var(--eds-space-2) var(--eds-space-3)',
  textAlign: 'start',
  fontWeight: 'var(--eds-font-weight-medium)',
  color: 'var(--eds-color-text-secondary)',
  borderBlockEnd: '1px solid var(--eds-color-border-default)',
};
const td: CSSProperties = {
  padding: 'var(--eds-space-2) var(--eds-space-3)',
  borderBlockEnd: '1px solid var(--eds-color-border-default)',
};

function Badges() {
  return (
    <Section title="Badge">
      <div style={row}>
        {badgeKinds.map((b) => (
          <span key={b.key} className={`eds-badge eds-badge-${b.key}`}>
            {b.label}
          </span>
        ))}
      </div>
      <div style={row}>
        {badgeKinds.map((b) => (
          <span key={b.key} className={`eds-badge eds-badge-${b.key} eds-badge-dot`}>
            {b.label}
          </span>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ inlineSize: '100%', borderCollapse: 'collapse', minInlineSize: '28rem' }}>
          <caption className="eds-visually-hidden">Faturas recentes (dados fictícios)</caption>
          <thead>
            <tr>
              <th scope="col" style={th}>
                Fatura
              </th>
              <th scope="col" style={th}>
                Cliente
              </th>
              <th scope="col" style={th}>
                Valor
              </th>
              <th scope="col" style={th}>
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td style={td}>{inv.id}</td>
                <td style={td}>{inv.client}</td>
                <td style={td}>{inv.value}</td>
                <td style={td}>
                  <span className={`eds-badge eds-badge-${inv.status}`}>
                    {badgeKinds.find((b) => b.key === inv.status)?.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* --------------------------------- Spinner --------------------------------- */

function Spinner({ size, color }: { size?: 'sm' | 'lg'; color?: string }) {
  return (
    <span
      className={`eds-spinner${size ? ` eds-spinner-${size}` : ''}`}
      role="status"
      style={color ? { color } : undefined}
    >
      <span className="eds-visually-hidden">Carregando</span>
    </span>
  );
}

/* Spinner dinâmico: o role="status" nasce montado e vazio; o texto e o spinner entram ao carregar
   (uma live region que já nasce preenchida não é anunciada). */
function SyncDemo() {
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    if (!syncing) return;
    const timer = setTimeout(() => setSyncing(false), 3000);
    return () => clearTimeout(timer);
  }, [syncing]);
  return (
    <div style={row}>
      <button
        type="button"
        className="eds-button eds-button-secondary"
        disabled={syncing}
        onClick={() => setSyncing(true)}
      >
        Sincronizar pedidos
      </button>
      <span role="status" style={{ ...row, gap: 'var(--eds-space-2)', minBlockSize: '1.5rem' }}>
        {syncing && (
          <>
            <span className="eds-spinner eds-spinner-sm" aria-hidden="true" />
            Sincronizando pedidos...
          </>
        )}
      </span>
    </div>
  );
}

/* ------------------------------- PageLoader -------------------------------- */

function PageLoaderDemo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = () => {
    const el = dialog.current;
    if (!el || el.open) return;
    el.showModal();
    timer.current = window.setTimeout(() => el.close(), 2000);
  };
  return (
    <Section title="PageLoader">
      <div style={row}>
        <button type="button" className="eds-button eds-button-secondary" onClick={run}>
          Buscar processo
        </button>
        <span className="eds-helper">Bloqueia a tela por 2 segundos.</span>
      </div>
      <dialog
        ref={dialog}
        className="eds-page-loader"
        aria-labelledby="demo-loader-title"
        aria-describedby="demo-loader-text"
        onCancel={(e) => e.preventDefault()}
      >
        <span className="eds-spinner eds-spinner-lg" aria-hidden="true" />
        <p className="eds-page-loader-title" id="demo-loader-title">
          Buscando processo…
        </p>
        <p className="eds-page-loader-text" id="demo-loader-text">
          Aguarde um instante.
        </p>
      </dialog>
    </Section>
  );
}

function Spinners() {
  return (
    <Section title="Spinner">
      <div style={row}>
        <Spinner size="sm" />
        <Spinner />
        <Spinner size="lg" />
        <Spinner color="var(--eds-color-status-success-text)" />
        <Spinner color="var(--eds-color-status-danger-text)" />
        <Spinner color="var(--eds-color-text-secondary)" />
      </div>
      <SyncDemo />
    </Section>
  );
}

/* --------------------------------- Skeleton -------------------------------- */

const cardLine = 'calc(3 * var(--eds-line-height-body))';

function SkeletonCard() {
  const [loading, setLoading] = useState(true);
  return (
    <Section title="Skeleton">
      <div style={row}>
        <button
          type="button"
          className="eds-button eds-button-secondary"
          aria-pressed={loading}
          onClick={() => setLoading((v) => !v)}
        >
          {loading ? 'Mostrar conteúdo' : 'Mostrar carregamento'}
        </button>
        <p className="eds-helper">Mesma altura nos dois estados: sem layout shift.</p>
      </div>

      <article
        aria-busy={loading}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          columnGap: 'var(--eds-space-4)',
          maxInlineSize: '32rem',
          padding: 'var(--eds-space-4)',
          border: '1px solid var(--eds-color-border-default)',
          borderRadius: 'var(--eds-radius-lg)',
        }}
      >
        {/* Montado e vazio desde o início; o texto entra ao carregar (para ser anunciado). */}
        <span className="eds-visually-hidden" role="status">
          {loading ? 'Carregando perfil' : ''}
        </span>
        {loading ? (
          <>
            <span
              className="eds-skeleton eds-skeleton-circle eds-skeleton-shimmer"
              style={{ inlineSize: '3rem' }}
              aria-hidden="true"
            />
            <div style={{ display: 'grid', alignContent: 'start' }} aria-hidden="true">
              <div className="eds-text-h4">
                <span
                  className="eds-skeleton eds-skeleton-text eds-skeleton-shimmer"
                  style={{ inlineSize: '50%' }}
                />
              </div>
              <div style={{ minBlockSize: cardLine }}>
                <span className="eds-skeleton eds-skeleton-text eds-skeleton-shimmer" />
                <span className="eds-skeleton eds-skeleton-text eds-skeleton-shimmer" />
                <span className="eds-skeleton eds-skeleton-text eds-skeleton-shimmer" />
              </div>
            </div>
          </>
        ) : (
          <>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                inlineSize: '3rem',
                aspectRatio: '1',
                borderRadius: '50%',
                background: 'var(--eds-color-action-primary-subtle)',
                color: 'var(--eds-color-action-primary)',
                fontWeight: 'var(--eds-font-weight-semibold)',
              }}
              aria-hidden="true"
            >
              ME
            </span>
            <div style={{ display: 'grid', alignContent: 'start' }}>
              <h4 className="eds-text-h4" style={{ margin: 0 }}>
                Maria Exemplo
              </h4>
              <p
                style={{
                  margin: 0,
                  minBlockSize: cardLine,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden',
                  color: 'var(--eds-color-text-secondary)',
                }}
              >
                Analista financeira responsável pela conciliação mensal dos contratos e pelo
                acompanhamento das faturas em aberto junto aos clientes de exemplo da carteira.
              </p>
            </div>
          </>
        )}
      </article>
    </Section>
  );
}

function ToneActions() {
  const tones: { key: Status; title: string }[] = [
    { key: 'danger', title: 'Erro: falha na conciliação' },
    { key: 'warning', title: 'Atenção: fechamento próximo' },
    { key: 'success', title: 'Sucesso: importação concluída' },
    { key: 'info', title: 'Informação: nova versão disponível' },
  ];
  const buttons = (
    <>
      <button type="button" className="eds-button eds-button-primary eds-button-sm">
        Primário
      </button>
      <button type="button" className="eds-button eds-button-secondary eds-button-sm">
        Secundário
      </button>
      <button type="button" className="eds-button eds-button-ghost eds-button-sm">
        Ghost
      </button>
    </>
  );
  return (
    <Section title="Alert e Banner: botões herdam o tom">
      <div style={{ display: 'grid', gap: 'var(--eds-space-3)' }}>
        {tones.map((t) => (
          <div key={t.key} className={`eds-alert eds-alert-${t.key}`}>
            <div className="eds-alert-content">
              <p className="eds-alert-title">{t.title}</p>
              <p>Texto de apoio do aviso, com as ações logo abaixo.</p>
            </div>
            <div className="eds-alert-actions">{buttons}</div>
          </div>
        ))}
        {[...tones, { key: 'neutral' as const, title: 'Aviso legal' }].map((t) => (
          <div
            key={t.key}
            className={`eds-banner eds-banner-${t.key}`}
            role="region"
            aria-label={t.title}
          >
            <p className="eds-banner-text">
              <strong>{t.title}.</strong> Texto curto do aviso do sistema.
            </p>
            <div className="eds-banner-actions">{buttons}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ErrorSummaryDemo() {
  return (
    <Section title="Resumo de erros (ErrorSummary)">
      <div
        className="eds-error-summary"
        data-eds-error-summary
        tabIndex={-1}
        aria-labelledby="demo-erros-titulo"
      >
        <h2 className="eds-error-summary-title" id="demo-erros-titulo">
          Corrija 2 campos
        </h2>
        <ul className="eds-error-summary-list">
          <li>
            <a href="#cpf">CPF: informe um CPF válido.</a>
          </li>
          <li>
            <a href="#competencia">
              Competência: informe um mês com ano, no formato mm/aaaa, que não seja futuro.
            </a>
          </li>
        </ul>
      </div>
      <div
        className="eds-error-summary"
        data-eds-error-summary
        tabIndex={-1}
        aria-labelledby="demo-erros-foco"
        id="demo-erros-focado"
      >
        <h2 className="eds-error-summary-title" id="demo-erros-foco">
          Corrija 1 campo (com foco)
        </h2>
        <ul className="eds-error-summary-list">
          <li>
            <a href="#nome">Nome: campo obrigatório.</a>
          </li>
        </ul>
      </div>
      <div className="eds-error-summary" tabIndex={-1} aria-label="Oculto" hidden>
        <h2 className="eds-error-summary-title">Este resumo está oculto (hidden)</h2>
      </div>
    </Section>
  );
}

export function FeedbackDemo() {
  return (
    <div
      style={{ display: 'grid', gap: 'var(--eds-space-5)', marginBlockStart: 'var(--eds-space-7)' }}
    >
      <h2 className="eds-text-h2">Feedback</h2>
      <Alerts />
      <ToneActions />
      <ErrorSummaryDemo />
      <Toasts />
      <Badges />
      <Spinners />
      <PageLoaderDemo />
      <SkeletonCard />
    </div>
  );
}
