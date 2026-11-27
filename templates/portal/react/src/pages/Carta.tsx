import { useState, type FormEvent } from 'react';
import {
  Accordion,
  AccordionItem,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Container,
  EmptyState,
  Field,
  Input,
  Page,
  PageBody,
  PageHeader,
  PageToolbar,
  Select,
  Stack,
} from '@efds-ui/react';
import { SearchIcon } from '@efds-ui/icons';
import { categories, services, type Service } from '../data';
import { usePageTitle } from '../components/usePageTitle';
import { href } from '../router';

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const haystack = (s: Service) =>
  normalize(`${s.name} ${s.summary} Prazo: ${s.prazo}. Custo: ${s.custo}.`);

export function Carta({ params }: { params: URLSearchParams }) {
  usePageTitle('Carta de serviços');
  const wanted = params.get('categoria') ?? '';
  const [busca, setBusca] = useState(params.get('busca') ?? '');
  const [categoria, setCategoria] = useState(
    categories.some((c) => c.slug === wanted) ? wanted : '',
  );

  const term = normalize(busca);
  const visible = services.filter(
    (s) => (!categoria || s.cat === categoria) && (!term || haystack(s).includes(term)),
  );
  const status =
    visible.length === 0
      ? 'Nenhum serviço encontrado.'
      : visible.length === 1
        ? '1 serviço encontrado.'
        : `${visible.length} serviços encontrados.`;

  const clear = () => {
    setBusca('');
    setCategoria('');
  };

  return (
    <Container>
      <Page>
        <PageHeader
          title="Carta de serviços"
          description="Consulte o que a prefeitura oferece, quanto tempo leva e o que é preciso para pedir."
          breadcrumb={
            <Breadcrumb>
              <BreadcrumbItem href={href.home}>Início</BreadcrumbItem>
              <BreadcrumbItem current>Carta de serviços</BreadcrumbItem>
            </Breadcrumb>
          }
        />

        <PageToolbar>
          <Stack gap={3}>
            <form
              className="eds-filter-bar"
              role="search"
              aria-label="Filtrar a carta de serviços"
              onSubmit={(event: FormEvent) => event.preventDefault()}
              onReset={(event) => {
                event.preventDefault();
                clear();
              }}
            >
              <div className="eds-filter-bar-fields">
                <Field label="Buscar" className="eds-filter-bar-search">
                  <Input
                    type="search"
                    name="busca"
                    placeholder="Nome ou assunto do serviço"
                    autoComplete="off"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                  />
                </Field>
                <Field label="Categoria">
                  <Select
                    name="categoria"
                    value={categoria}
                    onChange={(event) => setCategoria(event.target.value)}
                  >
                    <option value="">Todas</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="eds-filter-bar-actions">
                <Button type="reset">Limpar</Button>
              </div>
            </form>
            <p className="eds-text-small portal-muted" role="status">
              {status}
            </p>
          </Stack>
        </PageToolbar>

        <PageBody>
          <Stack gap={7}>
            {categories.map((category) => {
              const items = visible.filter((s) => s.cat === category.slug);
              if (items.length === 0) return null;
              const headingId = `cat-${category.slug}`;
              return (
                <Stack as="section" gap={3} key={category.slug} aria-labelledby={headingId}>
                  <h2 className="eds-text-h3" id={headingId}>
                    {category.name} <Badge tone="neutral">{items.length}</Badge>
                  </h2>
                  <Accordion>
                    {items.map((s) => (
                      <AccordionItem key={s.slug} title={s.name}>
                        <Stack gap={3}>
                          <p>{s.summary}</p>
                          <p className="eds-text-small portal-muted">
                            Prazo: {s.prazo}. Custo: {s.custo}.
                          </p>
                          <Stack direction="row" wrap gap={2}>
                            <Button variant="primary" size="sm" href={href.solicitar(s.slug)}>
                              Solicitar<span className="eds-visually-hidden"> {s.name}</span>
                            </Button>
                            <Button size="sm" href={href.servico(s.slug)}>
                              Ver detalhes<span className="eds-visually-hidden"> de {s.name}</span>
                            </Button>
                          </Stack>
                        </Stack>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Stack>
              );
            })}

            {visible.length === 0 ? (
              <EmptyState
                icon={<SearchIcon />}
                headingLevel={2}
                title="Nenhum serviço encontrado"
                description="Tente outra palavra ou escolha todas as categorias."
                actions={
                  <Button variant="primary" onClick={clear}>
                    Limpar filtros
                  </Button>
                }
              />
            ) : null}
          </Stack>
        </PageBody>
      </Page>
    </Container>
  );
}
