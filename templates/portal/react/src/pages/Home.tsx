import { useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardLink,
  CardTitle,
  Container,
  Field,
  Grid,
  GridItem,
  Image,
  Input,
  Stack,
  Tag,
} from '@efds-ui/react';
import { CategoryDisc } from '../components/CategoryDisc';
import { categories, featured, news, serviceBySlug, services, type Service } from '../data';
import { usePageTitle } from '../components/usePageTitle';
import { go, href } from '../router';

const img = (name: string) => `${import.meta.env.BASE_URL}img/${name}.svg`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function ServiceCard({ service }: { service: Service }) {
  return (
    <Card interactive subgrid>
      <CardHeader>
        <CardTitle>
          <CardLink href={href.servico(service.slug)}>{service.name}</CardLink>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <p>{service.summary}</p>
      </CardBody>
      <CardFooter>
        <span className="eds-text-small portal-muted">Prazo: {service.prazo}</span>
      </CardFooter>
    </Card>
  );
}

export function Home() {
  usePageTitle('Serviços ao cidadão');
  const [query, setQuery] = useState('');

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    go(href.carta({ busca: query.trim() }));
  };

  return (
    <>
      <section className="portal-hero" aria-labelledby="hero-titulo">
        <Container>
          <Grid>
            <GridItem span={12} spanLg={8}>
              <Stack gap={5}>
                <h1 className="eds-text-display" id="hero-titulo">
                  O que você precisa resolver hoje?
                </h1>
                <p className="eds-text-body-lg">
                  Peça serviços da prefeitura, acompanhe o andamento e emita documentos sem sair de
                  casa.
                </p>
                <form
                  className="portal-search"
                  role="search"
                  aria-label="Buscar serviços"
                  onSubmit={onSearch}
                >
                  <Field label="Buscar um serviço" className="portal-search-field">
                    <Input
                      size="lg"
                      type="search"
                      name="busca"
                      placeholder="Ex.: IPTU, alvará, matrícula"
                      autoComplete="off"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" variant="primary" size="lg">
                    Buscar
                  </Button>
                </form>
                <p className="portal-suggestions">
                  <span>Mais buscados:</span>
                  <a href={href.carta({ busca: 'iptu' })}>IPTU</a>
                  <a href={href.carta({ busca: 'alvará' })}>Alvará</a>
                  <a href={href.carta({ busca: 'matrícula' })}>Matrícula</a>
                </p>
              </Stack>
            </GridItem>
          </Grid>
        </Container>
      </section>

      <section className="portal-section" aria-labelledby="destaques-titulo">
        <Container>
          <Stack gap={5}>
            <div className="portal-section-head">
              <h2 className="eds-text-h2" id="destaques-titulo">
                Serviços mais acessados
              </h2>
              <a href={href.carta()}>Ver todos os serviços</a>
            </div>
            <Grid auto>
              {featured.map((slug) => {
                const service = serviceBySlug(slug);
                return service ? <ServiceCard key={slug} service={service} /> : null;
              })}
            </Grid>
          </Stack>
        </Container>
      </section>

      <section className="portal-section" aria-labelledby="categorias-titulo">
        <Container>
          <Stack gap={5}>
            <h2 className="eds-text-h2" id="categorias-titulo">
              Serviços por categoria
            </h2>
            <ul className="portal-categories">
              {categories.map((category) => (
                <li className="portal-category" key={category.slug}>
                  <a href={href.carta({ categoria: category.slug })}>
                    <CategoryDisc category={category} />
                    <span className="eds-text-h3 portal-category-name">{category.name}</span>
                    <span className="portal-category-text">{category.text}</span>
                    <span className="eds-text-small portal-muted">
                      {plural(
                        services.filter((s) => s.cat === category.slug).length,
                        'serviço',
                        'serviços',
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Stack>
        </Container>
      </section>

      <section className="portal-section" aria-labelledby="noticias-titulo">
        <Container>
          <Stack gap={5}>
            <h2 className="eds-text-h2" id="noticias-titulo">
              Notícias da prefeitura
            </h2>
            <Grid auto>
              {news.map((item) => (
                <Card key={item.slug} className="portal-news-card">
                  <Image src={img(item.img)} alt={item.alt} ratio="16x9" />
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <p>{item.text}</p>
                  </CardBody>
                  <CardFooter>
                    <Tag>{item.tag}</Tag>
                    <time className="eds-text-small portal-muted" dateTime={item.date}>
                      {item.dateText}
                    </time>
                  </CardFooter>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Container>
      </section>
    </>
  );
}
