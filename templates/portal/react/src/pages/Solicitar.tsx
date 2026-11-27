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
  Input,
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
  contato: '',
  detalhes: '',
  anexos: '',
};

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};

export function Solicitar({ params }: { params: URLSearchParams }) {
  usePageTitle('Solicitar um serviço');
  const wanted = params.get('servico') ?? '';
  const initialService = serviceBySlug(wanted)?.slug ?? '';

  const formRef = useRef<HTMLFormElement>(null);
  const files = useRef<File[]>([]);
  const [review, setReview] = useState<Review>(emptyReview);
  const [protocol, setProtocol] = useState<string | null>(null);
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
    { label: 'Aviso por', value: review.contato },
    { label: 'Detalhes', value: review.detalhes },
    { label: 'Documentos', value: review.anexos },
  ];

  const complete = (data: FormData, form: HTMLFormElement) => {
    const summary = readForm(form);
    const number = newProtocolNumber();
    saveProtocol({
      number,
      service: summary.servico || String(data.get('servico') ?? ''),
      opened: new Date().toLocaleDateString('pt-BR'),
    });
    setProtocol(number);
  };

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
                  texts={{ finish: 'Enviar solicitação' }}
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
                                helper="Usado só para identificar quem pede. Ex.: 123.456.789-00"
                              >
                                <Input
                                  name="cpf"
                                  mask="cpf"
                                  inputMode="numeric"
                                  autoComplete="off"
                                  pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
                                  data-eds-error-message="Informe o CPF completo, com 11 números."
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
                                  autoComplete="tel-national"
                                />
                              </Field>
                            </GridItem>
                          </Grid>
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
