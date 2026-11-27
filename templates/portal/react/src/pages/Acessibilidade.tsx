import {
  Accordion,
  AccordionItem,
  Breadcrumb,
  BreadcrumbItem,
  Container,
  DescriptionList,
  Page,
  PageBody,
  PageHeader,
  Stack,
} from '@efds-ui/react';
import { a11yFaq, a11yFeatures, org } from '../data';
import { usePageTitle } from '../components/usePageTitle';
import { href } from '../router';

export function Acessibilidade() {
  usePageTitle('Acessibilidade e ajuda');
  return (
    <Container size="md">
      <Page>
        <PageHeader
          title="Acessibilidade e ajuda"
          description="O portal foi feito para ser usado por todas as pessoas, com teclado, leitor de tela ou ajustes de leitura."
          breadcrumb={
            <Breadcrumb>
              <BreadcrumbItem href={href.home}>Início</BreadcrumbItem>
              <BreadcrumbItem current>Acessibilidade e ajuda</BreadcrumbItem>
            </Breadcrumb>
          }
        />
        <PageBody>
          <Stack gap={7}>
            <Stack as="section" gap={3} aria-labelledby="recursos">
              <h2 className="eds-text-h3" id="recursos">
                Recursos do portal
              </h2>
              <DescriptionList
                divided
                items={a11yFeatures.map(([label, value]) => ({ label, value }))}
              />
            </Stack>

            <Stack as="section" gap={2} aria-labelledby="conformidade">
              <h2 className="eds-text-h3" id="conformidade">
                Padrões que seguimos
              </h2>
              <p>
                Buscamos atender às diretrizes WCAG 2.2, nível AA, e ao modelo eMAG do governo
                eletrônico. Revisamos o portal a cada nova versão e corrigimos as barreiras que
                encontramos.
              </p>
            </Stack>

            <Stack as="section" gap={3} aria-labelledby="duvidas">
              <h2 className="eds-text-h3" id="duvidas">
                Perguntas frequentes
              </h2>
              <Accordion>
                {a11yFaq.map(([question, answer]) => (
                  <AccordionItem key={question} title={question}>
                    <p>{answer}</p>
                  </AccordionItem>
                ))}
              </Accordion>
            </Stack>

            <Stack as="section" gap={3} aria-labelledby="canais">
              <h2 className="eds-text-h3" id="canais">
                Encontrou uma barreira? Fale conosco
              </h2>
              <DescriptionList
                orientation="horizontal"
                divided
                items={[
                  { label: 'Telefone', value: org.phone },
                  { label: 'E-mail', value: <a href={`mailto:${org.email}`}>{org.email}</a> },
                  { label: 'Presencial', value: org.address },
                  { label: 'Horário', value: org.hours },
                ]}
              />
              <p className="eds-text-small portal-muted">
                Telefone, endereço e e-mail são fictícios.
              </p>
            </Stack>
          </Stack>
        </PageBody>
      </Page>
    </Container>
  );
}
