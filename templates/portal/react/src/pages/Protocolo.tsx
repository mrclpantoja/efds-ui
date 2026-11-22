import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Container,
  DescriptionList,
  ErrorState,
  Field,
  Input,
  Page,
  PageBody,
  PageHeader,
  Stack,
  Timeline,
} from '@efds-ui/react';
import { failingProtocol, protocols, type Protocol } from '../data';
import { usePageTitle } from '../components/usePageTitle';
import { href } from '../router';
import { storedProtocols } from '../storage';

type Result =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; record: Protocol }
  | { kind: 'notfound' }
  | { kind: 'error'; number: string };

function findProtocol(number: string): Protocol | null {
  const saved: Protocol[] = storedProtocols().map((item) => ({
    number: item.number,
    service: item.service,
    opened: item.opened,
    status: ['info', 'Recebida'],
    forecast: null,
    events: [
      {
        id: 'e1',
        title: 'Solicitação recebida',
        dateTime: new Date().toISOString().slice(0, 16),
        time: item.opened,
      },
    ],
  }));
  return [...protocols, ...saved].find((item) => item.number === number) ?? null;
}

export function Protocolo({ params }: { params: URLSearchParams }) {
  usePageTitle('Consultar protocolo');
  const initial = params.get('protocolo') ?? '';
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const isComplete = (number: string) => number.replace(/D/g, '').length === 20;
  const [result, setResult] = useState<Result>({ kind: isComplete(initial) ? 'loading' : 'idle' });
  const failedOnce = useRef(false);
  const timer = useRef(0);
  const resultTitle = useRef<HTMLHeadingElement & HTMLSpanElement>(null);

  const schedule = (number: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (number === failingProtocol && !failedOnce.current) {
        failedOnce.current = true;
        setResult({ kind: 'error', number });
        return;
      }
      const record = findProtocol(number);
      setResult(record ? { kind: 'found', record } : { kind: 'notfound' });
    }, 500);
  };

  const search = (number: string) => {
    setResult({ kind: 'loading' });
    schedule(number);
  };

  const submit = (number: string) => {
    if (number.replace(/\D/g, '').length !== 20) {
      setError('Informe os 20 números do protocolo.');
      setResult({ kind: 'idle' });
      document.getElementById('protocolo')?.focus();
      return;
    }
    setError('');
    search(number);
  };

  // Consulta direta, vinda do link "Acompanhar solicitação".
  useEffect(() => {
    if (isComplete(initial)) schedule(initial);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Depois do resultado, o foco vai ao título dele.
  useEffect(() => {
    if (result.kind !== 'idle' && result.kind !== 'loading') resultTitle.current?.focus();
  }, [result]);

  const busy = result.kind === 'loading';

  return (
    <Container size="md">
      <Page>
        <PageHeader
          title="Consultar protocolo"
          description="Digite o número recebido ao enviar a solicitação para ver o andamento."
          breadcrumb={
            <Breadcrumb>
              <BreadcrumbItem href={href.home}>Início</BreadcrumbItem>
              <BreadcrumbItem current>Consultar protocolo</BreadcrumbItem>
            </Breadcrumb>
          }
        />
        <PageBody>
          <Stack gap={6}>
            <form
              aria-label="Consultar protocolo"
              noValidate
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!busy) submit(value);
              }}
            >
              <Stack gap={2}>
                <div className="portal-search">
                  <Field
                    label="Número do protocolo"
                    required
                    error={error || undefined}
                    helper="Ex.: 0000000-00.0000.0.00.0000"
                    className="portal-search-field"
                  >
                    <Input
                      id="protocolo"
                      size="lg"
                      name="protocolo"
                      mask="processo"
                      inputMode="numeric"
                      autoComplete="off"
                      value={value}
                      onValueChange={(masked) => {
                        setValue(masked);
                        if (error) setError('');
                      }}
                    />
                  </Field>
                  <Button type="submit" variant="primary" size="lg" loading={busy}>
                    Consultar
                  </Button>
                </div>
              </Stack>
            </form>

            <details className="eds-accordion-item portal-examples">
              <summary className="eds-accordion-trigger">Números de exemplo para testar</summary>
              <div className="eds-accordion-panel">
                <ul className="portal-list">
                  {protocols
                    .filter((p) => p.number !== failingProtocol)
                    .map((p) => (
                      <li key={p.number}>
                        <code className="eds-text-mono">{p.number}</code>: {p.service},{' '}
                        {p.status[1].toLowerCase()}
                      </li>
                    ))}
                  <li>
                    <code className="eds-text-mono">{failingProtocol}</code>: simula uma falha na
                    primeira consulta
                  </li>
                </ul>
              </div>
            </details>

            <div role="status" aria-live="polite">
              {result.kind === 'loading' ? 'Consultando o protocolo…' : null}
              {result.kind === 'found' ? (
                <Stack as="section" gap={5} aria-labelledby="resultado-titulo">
                  <Stack direction="row" wrap justify="between" gap={2}>
                    <h2
                      className="eds-text-h3"
                      id="resultado-titulo"
                      tabIndex={-1}
                      ref={resultTitle}
                    >
                      Protocolo <span>{result.record.number}</span>
                    </h2>
                    <Badge variant={result.record.status[0]}>{result.record.status[1]}</Badge>
                  </Stack>
                  <DescriptionList
                    columns={2}
                    items={[
                      { label: 'Serviço', value: result.record.service },
                      { label: 'Aberto em', value: result.record.opened },
                      { label: 'Previsão de resposta', value: result.record.forecast },
                    ]}
                  />
                  <Stack gap={3}>
                    <h3 className="eds-text-h4">Andamento</h3>
                    <Timeline items={result.record.events} />
                  </Stack>
                </Stack>
              ) : null}
              {result.kind === 'notfound' ? (
                <Alert
                  variant="warning"
                  title={
                    <span id="resultado-titulo" tabIndex={-1} ref={resultTitle}>
                      Protocolo não encontrado
                    </span>
                  }
                >
                  Confira o número digitado. Se o problema continuar, fale com o atendimento.
                </Alert>
              ) : null}
              {result.kind === 'error' ? (
                <ErrorState
                  headingLevel={2}
                  title="Não foi possível consultar agora"
                  description="O serviço de consulta não respondeu. Tente novamente em instantes."
                  detail="Código: ERR-0042"
                  onRetry={() => search(result.number)}
                  ref={(el) => {
                    const title = el?.querySelector<HTMLHeadingElement>('.eds-empty-title');
                    if (title) {
                      title.tabIndex = -1;
                      resultTitle.current = title as HTMLHeadingElement & HTMLSpanElement;
                    }
                  }}
                />
              ) : null}
            </div>
          </Stack>
        </PageBody>
      </Page>
    </Container>
  );
}
