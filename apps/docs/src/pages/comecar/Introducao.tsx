import { Card, CardBody, CardHeader, CardTitle, Grid, GridItem } from '@efds-ui/react';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import { REPOSITORY_URL } from '../../site';
import { VERSION } from '../../cdn';

const packages = [
  {
    name: '@efds-ui/core',
    text: 'CSS puro: tokens, base, layout e um arquivo por componente. Não depende de nada e não conhece React.',
  },
  {
    name: '@efds-ui/themes',
    text: 'Os eixos de aparência (tema, modo, densidade e forma), aplicados por atributos data-*.',
  },
  {
    name: '@efds-ui/behavior',
    text: 'Comportamento em JavaScript puro, sem dependências, para quem usa só HTML (PHP, Java, .NET, Vue, Angular): Tabs, Modal, Toast, Table, Combobox, DatePicker, FileUpload e o PageLoader.',
  },
  {
    name: '@efds-ui/react',
    text: 'Wrappers React sobre as classes do core: API pequena, acessibilidade forçada nos tipos.',
  },
  {
    name: '@efds-ui/icons',
    text: 'Ícones SVG como componentes React, um export por ícone.',
  },
] as const;

export default function Introducao() {
  return (
    <>
      <p className="eds-text-body-lg">
        O efDS.ui (Empresarial Framework Design System) é um design system leve para aplicações
        empresariais: SaaS, ERP, CRM e painéis. Começa pelo HTML e pelo CSS; o React é uma camada
        opcional por cima.
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
          <code>core</code> ← <code>react</code>. O <code>behavior</code> não depende de ninguém
          (nem do core: o CSS é do consumidor). Quem usa só HTML precisa do core e dos temas, e do{' '}
          <code>behavior</code> se quiser Tabs, Modal, Toast e os demais comportamentos.
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
            <a href={toHref('/comecar/comportamento')}>Comportamento (JS)</a>: o pacote para quem
            usa só HTML, com PHP, Java ou outro servidor.
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
          Versão atual: <strong>{VERSION}</strong>, publicada no npm sob o escopo{' '}
          <a href="https://www.npmjs.com/org/efds-ui">@efds-ui</a> (veja{' '}
          <a href={toHref('/comecar/instalacao')}>Instalação</a>). O código é aberto, sob a licença
          MIT, no repositório <a href={REPOSITORY_URL}>mrclpantoja/efds-ui</a> do GitHub, onde
          também ficam as issues para relatar problemas. A API pode mudar até a 1.0. Todos os dados
          de exemplo são fictícios.
        </p>
      </Section>

      <Section title="Quem mantém">
        <p>
          O efDS.ui é desenvolvido e mantido pela{' '}
          <a href="https://innovationtech.com.br/">Innovation Tech</a>, empresa de consultoria em
          tecnologia da informação e transformação digital. A Innovation Tech atua com órgãos
          públicos e empresas privadas em gestão pública digital, inovação de processos,
          inteligência artificial e automação, com foco em governança, qualidade e transparência.
        </p>
        <p>
          O design system nasceu dessa experiência com sistemas administrativos: telas densas,
          formulários longos, tabelas e exigências de acessibilidade e de proteção de dados (LGPD).
        </p>
      </Section>

      <Section title="Licença">
        <p>
          O código dos pacotes e os exemplos de código desta documentação estão sob a licença MIT. O
          texto da documentação está sob a licença Creative Commons Atribuição 4.0 Internacional (CC
          BY 4.0): pode ser copiado e adaptado, inclusive para uso comercial, desde que se dê o
          crédito ao efDS.ui.
        </p>
      </Section>
    </>
  );
}
