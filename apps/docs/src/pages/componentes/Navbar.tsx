import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Acoes from '../../examples/navbar/acoes';
import acoesHtml from '../../examples/navbar/acoes.html?raw';
import acoesSource from '../../examples/navbar/acoes.tsx?raw';
import Portal from '../../examples/navbar/portal';
import portalHtml from '../../examples/navbar/portal.html?raw';
import portalSource from '../../examples/navbar/portal.tsx?raw';

export default function NavbarPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Barra superior com a marca, a navegação entre seções e ações globais (busca, notificações,
        entrar). Discreta: sem sombra, só uma borda inferior suave.
      </p>

      <UseCases
        use={[
          'Em portais e sites, para a navegação entre as seções principais.',
          'No app shell, como o topo da aplicação, com busca e ações do usuário (AppShellHeader).',
        ]}
        avoid={[
          'Para a navegação principal de uma aplicação com muitas áreas: use a Sidebar.',
          'Para alternar visões do mesmo conteúdo: use Tabs.',
          'Para mostrar a localização dentro da hierarquia: use Breadcrumb.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Portal"
          description="Marca, navegação com a página atual marcada e uma ação. Abaixo de 768px de largura, a navegação desce para uma segunda linha com rolagem horizontal."
          html={portalHtml}
          react={{ Component: Portal, source: portalSource }}
        />
        <Example
          title="Só marca e ações"
          description="Sem navegação por seções, as ações ocupam a sobra e encostam à direita."
          html={acoesHtml}
          react={{ Component: Acoes, source: acoesSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Navbar</code> renderiza um <code>&lt;header&gt;</code>; as partes são componentes
          irmãos. Todos aceitam os atributos nativos do elemento, <code>ref</code> e{' '}
          <code>className</code>.
        </p>
        <PropsTable
          caption="Partes e props de Navbar"
          rows={[
            {
              name: 'Navbar',
              type: 'HTMLAttributes<HTMLElement>',
              description: (
                <>
                  O <code>&lt;header class=&quot;eds-navbar&quot;&gt;</code>. Sem props próprias.
                </>
              ),
            },
            {
              name: 'NavbarBrand',
              type: 'AnchorHTMLAttributes<HTMLAnchorElement>',
              description: 'Marca: link com ícone e nome.',
            },
            {
              name: 'NavbarNav',
              type: "({ 'aria-label': string } | { 'aria-labelledby': string }) & HTMLAttributes<HTMLElement>",
              description: (
                <>
                  Navegação por seções (<code>&lt;nav&gt;</code>). O tipo exige um nome acessível.
                </>
              ),
            },
            {
              name: 'NavbarLink',
              type: 'AnchorHTMLAttributes<HTMLAnchorElement> & { current?: boolean }',
              description: (
                <>
                  Link da navegação. <code>current</code> emite{' '}
                  <code>aria-current=&quot;page&quot;</code>.
                </>
              ),
            },
            {
              name: 'NavbarActions',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Ações à direita: busca, botões, avatar.',
            },
          ]}
        />
        <PropsTable
          caption="Props de NavbarLink"
          rows={[
            {
              name: 'current',
              type: 'boolean',
              default: 'false',
              description: 'Página atual: aria-current="page" e destaque na cor de ação.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          A Navbar é contêiner de si mesma: o reflow depende da largura dela, não da viewport. No
          app shell, use <code>eds-app-header eds-navbar</code> no mesmo elemento.
        </p>
        <ClassTable
          caption="Classes e atributos de Navbar"
          rows={[
            {
              name: '.eds-navbar',
              effect:
                'Base: linha flex que quebra, altura mínima do layout, fundo de superfície, borda inferior.',
            },
            {
              name: '.eds-navbar-brand',
              effect: 'Marca: ícone de 1,5rem e nome em peso semibold, sem sublinhado.',
            },
            {
              name: '.eds-navbar-nav',
              effect:
                'Lista de links; rola na horizontal. Abaixo de 768px de largura da barra, vai para a segunda linha.',
            },
            {
              name: '.eds-navbar-link',
              effect:
                'Link da navegação, com fundo sutil no hover (nunca sobre o atual) e anel de foco por dentro.',
            },
            {
              name: '.eds-navbar-link[aria-current="page"]',
              effect: 'Página atual: fundo e texto na cor de ação.',
            },
            {
              name: '.eds-navbar-actions',
              effect: 'Ações; ocupam a sobra e encostam à direita.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Landmarks:</strong> o <code>&lt;header&gt;</code> da página é o banner; cada{' '}
              <code>&lt;nav&gt;</code> precisa de nome, porque há mais de um na página (a Sidebar
              também é uma).
            </li>
            <li>
              <strong>Página atual:</strong> <code>aria-current=&quot;page&quot;</code>, nunca só
              cor ou fundo.
            </li>
            <li>
              <strong>Teclado:</strong> são links e botões comuns, alcançados por Tab. O anel de
              foco é desenhado por dentro, porque a lista rola e recortaria o anel externo.
            </li>
            <li>
              <strong>Forçado pelo tipo:</strong> <code>NavbarNav</code> exige{' '}
              <code>aria-label</code> ou <code>aria-labelledby</code>.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> nome acessível em botões só de ícone e na
              busca; e, em reflow a 320px, que os links não se percam (a lista rola, mas deve
              continuar legível).
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
