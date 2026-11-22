import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Grid,
  GridItem,
  Image,
} from '@efds-ui/react';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

/**
 * Projetos da vitrine. Só entra projeto com a confirmação de publicação assinada por quem
 * responde pelo sistema (texto e registro em docs/textos/autorizacao-vitrine.md).
 */
interface ShowcaseProject {
  name: string;
  organization: string;
  description: string;
  url?: string;
  image?: string;
}

const projects: readonly ShowcaseProject[] = [
  {
    name: 'Documentação do efDS.ui',
    organization: 'Innovation Tech',
    description: 'Este site: 89 páginas montadas só com os componentes do próprio design system.',
    url: 'https://efds-ui.com.br',
    image: 'img/quem-usa/efds-ui-docs.png',
  },
];

const contactUrl = 'https://innovationtech.com.br/';

export default function QuemUsa() {
  return (
    <>
      <p className="eds-text-body-lg">
        Sistemas e sites construídos com o efDS.ui. Cada projeto aparece aqui com a autorização de
        quem responde por ele.
      </p>

      <Section title="Projetos">
        <Grid gap={4}>
          {projects.map((p) => (
            <GridItem key={p.name} span={12} spanMd={6} spanLg={4}>
              <Card>
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={`Tela do projeto ${p.name}`}
                    width={1280}
                    height={800}
                    loading="lazy"
                  />
                ) : null}
                <CardHeader>
                  <CardTitle level={3}>{p.name}</CardTitle>
                </CardHeader>
                <CardBody>
                  <p className="eds-text-small">{p.organization}</p>
                  <p>{p.description}</p>
                </CardBody>
                {p.url ? (
                  <CardFooter>
                    <a href={p.url} rel="noopener">
                      Visitar
                      <span className="eds-visually-hidden"> {p.name}</span>
                    </a>
                  </CardFooter>
                ) : null}
              </Card>
            </GridItem>
          ))}
        </Grid>
      </Section>

      <Section title="Envie o seu projeto">
        <p>
          Usa o efDS.ui ou um dos <a href={toHref('/templates')}>templates</a> num sistema ou site?
          Envie pelo <a href={contactUrl}>canal de contato da Innovation Tech</a>:
        </p>
        <ul className="docs-list">
          <li>nome do projeto ou sistema e a organização responsável (empresa ou órgão);</li>
          <li>endereço público (URL), se houver;</li>
          <li>descrição curta, de até 140 caracteres;</li>
          <li>logo ou captura de tela, opcional, sem dados de pessoas reais.</li>
        </ul>
        <p>
          Antes de publicar, pedimos a confirmação de quem responde pelo sistema. Em órgão público,
          a autorização deve vir de quem tem competência para divulgá-lo, como a área de comunicação
          ou de TI.
        </p>
      </Section>

      <Section title="Privacidade">
        <ul className="docs-list">
          <li>
            Os templates não enviam dados para a Innovation Tech: não há rastreamento de onde são
            usados. A vitrine depende só de quem quiser participar.
          </li>
          <li>
            Ao baixar um template, a autorização de contato para a vitrine é opcional e não
            interfere no download nem na licença.
          </li>
          <li>
            Para retirar um projeto da vitrine, escreva pelo mesmo canal informando o nome do
            projeto. A retirada é feita em até 5 dias úteis.
          </li>
        </ul>
      </Section>
    </>
  );
}
