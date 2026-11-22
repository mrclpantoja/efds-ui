import {
  Accordion,
  AccordionItem,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Container,
  DescriptionList,
  EmptyState,
  Grid,
  GridItem,
  Page,
  PageBody,
  PageHeader,
  Stack,
  Stepper,
  Tag,
} from '@efds-ui/react';
import { categoryName, serviceBySlug } from '../data';
import { usePageTitle } from '../components/usePageTitle';
import { href } from '../router';

export function Servico({ slug }: { slug: string }) {
  const service = serviceBySlug(slug);
  usePageTitle(service?.name ?? 'Serviço não encontrado');

  if (!service) {
    return (
      <Container>
        <h1 className="eds-text-h1">Serviço não encontrado</h1>
        <EmptyState
          headingLevel={2}
          title="Esse endereço não leva a um serviço"
          description="O endereço pode estar errado ou o serviço foi retirado da carta."
          actions={
            <Button variant="primary" href={href.carta()}>
              Ver a carta de serviços
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container>
      <Page>
        <PageHeader
          title={service.name}
          description={service.summary}
          breadcrumb={
            <Breadcrumb>
              <BreadcrumbItem href={href.home}>Início</BreadcrumbItem>
              <BreadcrumbItem href={href.carta()}>Carta de serviços</BreadcrumbItem>
              <BreadcrumbItem current>{service.name}</BreadcrumbItem>
            </Breadcrumb>
          }
          meta={
            <>
              <Tag>{categoryName(service.cat)}</Tag>
              <Badge variant="info">{service.canal}</Badge>
            </>
          }
          actions={
            <Button variant="primary" size="lg" href={href.solicitar(service.slug)}>
              Solicitar<span className="eds-visually-hidden"> {service.name}</span>
            </Button>
          }
        />

        <PageBody>
          <Grid>
            <GridItem span={12} spanLg={8}>
              <Stack gap={7}>
                <Stack as="section" gap={2} aria-labelledby="o-que-e">
                  <h2 className="eds-text-h3" id="o-que-e">
                    O que é
                  </h2>
                  <p>{service.what}</p>
                </Stack>
                <Stack as="section" gap={2} aria-labelledby="quem-pode">
                  <h2 className="eds-text-h3" id="quem-pode">
                    Quem pode solicitar
                  </h2>
                  <p>{service.who}</p>
                </Stack>
                <Stack as="section" gap={2} aria-labelledby="documentos">
                  <h2 className="eds-text-h3" id="documentos">
                    Documentos necessários
                  </h2>
                  <ul className="portal-list">
                    {service.docs.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </Stack>
                <Stack as="section" gap={3} aria-labelledby="etapas">
                  <h2 className="eds-text-h3" id="etapas">
                    Etapas
                  </h2>
                  <Stepper
                    aria-label="Etapas do serviço"
                    vertical
                    current={-1}
                    steps={service.steps.map((label) => ({ label }))}
                  />
                </Stack>
                <Stack as="section" gap={3} aria-labelledby="duvidas">
                  <h2 className="eds-text-h3" id="duvidas">
                    Perguntas frequentes
                  </h2>
                  <Accordion>
                    {service.faq.map(([question, answer]) => (
                      <AccordionItem key={question} title={question}>
                        <p>{answer}</p>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Stack>
              </Stack>
            </GridItem>

            <GridItem as="aside" span={12} spanLg={4} aria-labelledby="prazos">
              <Card>
                <CardHeader>
                  <CardTitle level={2} id="prazos">
                    Prazos e custos
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <DescriptionList
                    items={[
                      { label: 'Prazo', value: service.prazo },
                      { label: 'Custo', value: service.custo },
                      { label: 'Canal', value: service.canal },
                      { label: 'Responsável', value: service.orgao },
                      {
                        label: 'Atualizado em',
                        value: <time dateTime="2026-11-20">20/11/2026</time>,
                      },
                    ]}
                  />
                </CardBody>
                <CardFooter>
                  <Button href={href.protocolo()}>Consultar um protocolo</Button>
                </CardFooter>
              </Card>
            </GridItem>
          </Grid>
        </PageBody>
      </Page>
    </Container>
  );
}
