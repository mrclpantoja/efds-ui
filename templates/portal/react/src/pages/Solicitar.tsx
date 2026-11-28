import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  Checkbox,
  Container,
  CopyButton,
  DescriptionList,
  Field,
  FileUpload,
  Grid,
  GridItem,
  IconDisc,
  Input,
  OptionCard,
  OptionCardGroup,
  Page,
  PageBody,
  PageHeader,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Textarea,
  Wizard,
  type DescriptionListItem,
} from '@efds-ui/react';
import { categories, serviceBySlug, services } from '../data';
import { usePageTitle } from '../components/usePageTitle';
import { href } from '../router';
import { newProtocolNumber, saveProtocol } from '../storage';

interface Review {
  servico: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  titulo: string;
  canal: string;
  contato: string;
  detalhes: string;
  anexos: string;
}

const emptyReview: Review = {
  servico: '',
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  cep: '',
  titulo: '',
  canal: '',
  contato: '',
  detalhes: '',
  anexos: '',
};

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

const channels = [
  {
    value: 'presencial',
    label: 'Presencial',
    description: 'No balcão da prefeitura, com hora marcada.',
    icon: 'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4',
  },
  {
    value: 'online',
    label: 'On-line',
    description: 'Tudo pelo portal, sem sair de casa.',
    icon: 'M3 5h18v11H3zM8 20h8M12 16v4',
  },
  {
    value: 'retirada',
    label: 'Retirada',
    description: 'Peça aqui e retire o documento no balcão.',
    icon: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  },
] as const;

const glyph = (path: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

export function Solicitar({ params }: { params: URLSearchParams }) {
  usePageTitle('Solicitar um serviço');
  const wanted = params.get('servico') ?? '';
  const initialService = serviceBySlug(wanted)?.slug ?? '';

  const formRef = useRef<HTMLFormElement>(null);
  const files = useRef<File[]>([]);
  const [review, setReview] = useState<Review>(emptyReview);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const confirmationTitle = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (protocol) {
      confirmationTitle.current?.focus();
      window.scrollTo(0, 0);
    }
  }, [protocol]);

  const readForm = (form: HTMLFormElement): Review => {
    const data = new FormData(form);
    const select = form.elements.namedItem('servico');
    const option = select instanceof HTMLSelectElement ? select.selectedOptions[0] : undefined;
    return {
      servico: option?.value ? (option.textContent ?? '') : '',
      nome: text(data, 'nome'),
      cpf: text(data, 'cpf'),
      email: text(data, 'email'),
      telefone: text(data, 'telefone'),
      cep: text(data, 'cep'),
      titulo: text(data, 'titulo'),
      canal: channels.find((c) => c.value === text(data, 'canal'))?.label ?? '',
      contato: text(data, 'contato'),
      detalhes: text(data, 'detalhes'),
      anexos: files.current.map((file) => file.name).join(', '),
    };
  };

  const reviewItems: DescriptionListItem[] = [
    { label: 'Serviço', value: review.servico },
    { label: 'Nome', value: review.nome },
    { label: 'CPF', value: review.cpf },
    { label: 'E-mail', value: review.email },
    { label: 'Telefone', value: review.telefone },
    { label: 'CEP', value: review.cep },
    { label: 'Título de eleitor', value: review.titulo },
    { label: 'Atendimento', value: review.canal },
    { label: 'Aviso por', value: review.contato },
    { label: 'Detalhes', value: review.detalhes },
    { label: 'Documentos', value: review.anexos },
  ];

  // Estado de envio: o botão final mostra "Enviando…" e um segundo envio é ignorado. O "servidor"
  // é fictício (900 ms); num sistema real, troque o setTimeout pelo seu fetch e trate a falha.
  const complete = (data: FormData, form: HTMLFormElement) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const summary = readForm(form);
    window.setTimeout(() => {
      const number = newProtocolNumber();
      saveProtocol({
        number,
        service: summary.servico || String(data.get('servico') ?? ''),
        opened: new Date().toLocaleDateString('pt-BR'),
      });
      sendingRef.current = false;
      setSending(false);
      setProtocol(number);
    }, 900);
  };

  // O botão final é do Wizard: o aria-busy (círculo de espera) é posto direto nele.
  useEffect(() => {
    const finish = formRef.current?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!finish) return;
    if (sending) finish.setAttribute('aria-busy', 'true');
    else finish.removeAttribute('aria-busy');
  }, [sending]);

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem href={href.home}>Início</BreadcrumbItem>
      <BreadcrumbItem href={href.carta()}>Carta de serviços</BreadcrumbItem>
      <BreadcrumbItem current>Solicitar um serviço</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <Container size="md">
      <Page>
        <PageHeader
          title="Solicitar um serviço"
          description="Preencha as quatro etapas. Ao final, você recebe um número de protocolo para acompanhar o pedido."
          breadcrumb={breadcrumb}
        />
        <PageBody>
          <Stack gap={5}>
            {protocol ? (
              <Stack as="section" gap={4} aria-labelledby="confirmacao-t">
                <Alert
                  tone="success"
                  title={
                    <span id="confirmacao-t" tabIndex={-1} ref={confirmationTitle}>
                      Solicitação enviada
                    </span>
                  }
                >
                  Guarde o número do protocolo para acompanhar o andamento.
                </Alert>
                <Card>
                  <CardBody>
                    <Stack gap={2}>
                      <p className="eds-text-label">Número do protocolo</p>
                      <Stack direction="row" wrap gap={3}>
                        <strong className="portal-protocol">{protocol}</strong>
                        <CopyButton size="sm" text={protocol} />
                      </Stack>
                    </Stack>
                  </CardBody>
                </Card>
                <Stack direction="row" wrap gap={2}>
                  <Button variant="primary" href={href.protocolo(protocol)}>
                    Acompanhar solicitação
                  </Button>
                  <Button href={href.home}>Voltar ao início</Button>
                </Stack>
              </Stack>
            ) : (
              <>
                <Alert tone="info" title="Demonstração">
                  Este site é fictício. Nenhum dado sai do seu navegador; use dados inventados.
                </Alert>
                <Wizard
                  ref={formRef}
                  aria-label="Etapas da solicitação"
                  aria-busy={sending || undefined}
                  texts={{ finish: sending ? 'Enviando…' : 'Enviar solicitação' }}
                  onStepChange={(index) => {
                    if (index === 3 && formRef.current) setReview(readForm(formRef.current));
                  }}
                  onComplete={complete}
                  steps={[
                    {
                      title: 'Identificação',
                      content: (
                        <Stack gap={4}>
                          <Field label="Serviço" required>
                            <Select
                              name="servico"
                              defaultValue={initialService}
                              data-eds-error-message="Escolha o serviço que você quer solicitar."
                            >
                              <option value="">Selecione</option>
                              {categories.map((category) => (
                                <optgroup key={category.slug} label={category.name}>
                                  {services
                                    .filter((s) => s.cat === category.slug)
                                    .map((s) => (
                                      <option key={s.slug} value={s.slug}>
                                        {s.name}
                                      </option>
                                    ))}
                                </optgroup>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Nome completo" required>
                            <Input
                              name="nome"
                              autoComplete="name"
                              placeholder="Ex.: Maria Exemplo"
                              data-eds-error-message="Informe o seu nome completo."
                            />
                          </Field>
                          <Grid>
                            <GridItem span={12} spanSm={6}>
                              <Field
                                label="CPF"
                                required
                                helper="Usado só para identificar quem pede. Para testar: 529.982.247-25"
                              >
                                <Input
                                  name="cpf"
                                  mask="cpf"
                                  validate="cpf"
                                  inputMode="numeric"
                                  autoComplete="off"
                                  data-eds-error-message="Informe um CPF válido, com 11 números."
                                />
                              </Field>
                            </GridItem>
                            <GridItem span={12} spanSm={6}>
                              <Field
                                label="Título de eleitor"
                                helper="Opcional. Para testar: 1234 5678 0396"
                              >
                                <Input
                                  name="titulo"
                                  validate="titulo"
                                  inputMode="numeric"
                                  autoComplete="off"
                                  maxLength={14}
                                />
                              </Field>
                            </GridItem>
                          </Grid>
                        </Stack>
                      ),
                    },
                    {
                      title: 'Contato',
                      content: (
                        <Stack gap={4}>
                          <Grid>
                            <GridItem span={12} spanSm={6}>
                              <Field label="E-mail" required>
                                <Input
                                  name="email"
                                  type="email"
                                  autoComplete="email"
                                  data-eds-error-message="Informe um e-mail válido."
                                />
                              </Field>
                            </GridItem>
                            <GridItem span={12} spanSm={6}>
                              <Field label="Telefone" helper="Opcional. Com DDD.">
                                <Input
                                  name="telefone"
                                  type="tel"
                                  mask="telefone"
                                  validate="telefone"
                                  autoComplete="tel-national"
                                />
                              </Field>
                            </GridItem>
                            <GridItem span={12} spanSm={6}>
                              <Field label="CEP" helper="Opcional. Do seu endereço.">
                                <Input
                                  name="cep"
                                  mask="cep"
                                  validate="cep"
                                  inputMode="numeric"
                                  autoComplete="postal-code"
                                />
                              </Field>
                            </GridItem>
                          </Grid>
                          <OptionCardGroup
                            legend="Como prefere ser atendido?"
                            name="canal"
                            defaultValue="online"
                          >
                            {channels.map((channel) => (
                              <OptionCard
                                key={channel.value}
                                type="radio"
                                value={channel.value}
                                title={channel.label}
                                description={channel.description}
                                icon={<IconDisc>{glyph(channel.icon)}</IconDisc>}
                                mark={glyph('M5 12l5 5 9-10')}
                              />
                            ))}
                          </OptionCardGroup>
                          <RadioGroup
                            legend="Como prefere ser avisado?"
                            name="contato"
                            defaultValue="E-mail"
                          >
                            <Radio value="E-mail">E-mail</Radio>
                            <Radio value="Telefone">Telefone</Radio>
                          </RadioGroup>
                        </Stack>
                      ),
                    },
                    {
                      title: 'Anexos',
                      content: (
                        <Stack gap={4}>
                          <Field
                            label="Detalhes da solicitação"
                            helper="Opcional. Até 500 caracteres."
                          >
                            <Textarea name="detalhes" maxLength={500} />
                          </Field>
                          <div className="eds-field">
                            <span className="eds-label" id="anexos-l">
                              Documentos
                            </span>
                            <FileUpload
                              name="anexos"
                              aria-labelledby="anexos-l"
                              accept=".pdf,.jpg,.jpeg,.png"
                              maxSize={5 * 1024 * 1024}
                              maxFiles={5}
                              hint="PDF, JPG ou PNG, até 5 MB cada (máximo de 5)"
                              onValueChange={(list) => {
                                files.current = list;
                              }}
                            />
                          </div>
                        </Stack>
                      ),
                    },
                    {
                      title: 'Revisão',
                      content: (
                        <Stack gap={4}>
                          <p>
                            Confira os dados antes de enviar. Para corrigir algo, volte pela etapa
                            correspondente.
                          </p>
                          <DescriptionList divided items={reviewItems} />
                          <Checkbox
                            name="declaracao"
                            required
                            data-eds-error-message="Marque a declaração para enviar."
                          >
                            Declaro que as informações são verdadeiras.
                          </Checkbox>
                        </Stack>
                      ),
                    },
                  ]}
                />
              </>
            )}
          </Stack>
        </PageBody>
      </Page>
    </Container>
  );
}
