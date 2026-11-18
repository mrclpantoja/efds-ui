import { Card, CardBody, CardHeader, CardTitle, Grid, GridItem } from '@eds-ui/react';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

const packages = [
  {
    name: '@eds-ui/core',
    text: 'CSS puro: tokens, base, layout e um arquivo por componente. Não depende de nada e não conhece React.',
  },
  {
    name: '@eds-ui/themes',
    text: 'Os eixos de aparência (tema, modo, densidade e forma), aplicados por atributos data-*.',
  },
  {
    name: '@eds-ui/react',
    text: 'Wrappers React sobre as classes do core: API pequena, acessibilidade forçada nos tipos.',
  },
  {
    name: '@eds-ui/icons',
    text: 'Ícones SVG como componentes React, um export por ícone.',
  },
] as const;

export default function Introducao() {
  return (
    <>
      <p className="eds-text-body-lg">
        O eDS.ui (Empresarial Design System) é um design system leve para aplicações empresariais:
        SaaS, ERP, CRM e painéis. Começa pelo HTML e pelo CSS; o React é uma camada opcional por
        cima.
      </p>

      <Section title="Princípios">
        <ul className="docs-list">
          <li>
            <strong>Soft Precision:</strong> superfícies calmas, bordas finas e sombras discretas,
            para telas densas que continuam legíveis.
          </li>
          <li>
            <strong>Swiss Grid:</strong> grade de 12 colunas, alinhamento e ritmo vertical
            consistentes.
          </li>
          <li>
            <strong>Adaptive Surface:</strong> tema, modo, densidade e forma mudam por atributos no
            HTML. Os componentes não mudam, só os tokens.
          </li>
          <li>
            <strong>Acessibilidade:</strong> WCAG 2.2 AA como requisito, com HTML semântico antes de
            ARIA, foco visível e a cor nunca sozinha.
          </li>
        </ul>
      </Section>

      <Section title="Pacotes">
        <Grid gap={4}>
          {packages.map((pkg) => (
            <GridItem key={pkg.name} span={12} spanMd={6}>
              <Card>
                <CardHeader>
                  <CardTitle level={3}>
                    <code>{pkg.name}</code>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <p>{pkg.text}</p>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
        <p>
          A dependência vai em um só sentido: <code>core</code> ← <code>themes</code>, e{' '}
          <code>core</code> ← <code>react</code>. Quem usa só HTML precisa apenas do core e dos
          temas.
        </p>
      </Section>

      <Section title="Por onde começar">
        <ul className="docs-list">
          <li>
            <a href={toHref('/comecar/instalacao')}>Instalação</a>: os pacotes e os CSS que
            importar.
          </li>
          <li>
            <a href={toHref('/comecar/uso-com-html')}>Uso com HTML</a> ou{' '}
            <a href={toHref('/comecar/uso-com-react')}>Uso com React</a>: o primeiro componente na
            tela.
          </li>
          <li>
            <a href={toHref('/fundamentos/temas-e-eixos')}>Temas e eixos</a>: como mudar a aparência
            sem tocar nos componentes.
          </li>
          <li>
            <a href={toHref('/componentes/button')}>Componentes</a>: cada página traz exemplos em
            HTML e em React, a API, as classes CSS e as regras de acessibilidade.
          </li>
        </ul>
      </Section>

      <Section title="Estado do projeto">
        <p>
          O eDS.ui está em pré-lançamento (v0.1.0, MVP). Os pacotes ainda não foram publicados no
          npm. Todos os dados de exemplo são fictícios.
        </p>
      </Section>
    </>
  );
}
