import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import completoHtml from '../../examples/app-shell/completo.html?raw';
import completoSource from '../../examples/app-shell/completo.tsx?raw';
import spaSource from '../../examples/app-shell/spa.tsx?raw';

export default function AppShellPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        A moldura de uma aplicação: sidebar, topo e uma área de conteúdo que rola sozinha. Uma grade
        só, que responde à largura do próprio contêiner e não à da janela: expandida, compacta ou
        off-canvas, sem JavaScript para a largura.
      </p>

      <UseCases
        use={[
          'Para aplicações com navegação persistente: ERP, CRM, painéis, back-offices.',
          'Para qualquer tela que precise de topo e sidebar fixos com o conteúdo rolando.',
        ]}
        avoid={[
          'Para sites e portais, onde a página inteira rola: use a Navbar sozinha.',
          'Para um app com poucas telas e sem navegação lateral: o topo basta.',
        ]}
      />

      <Section title="Exemplos">
        <p>
          Um app shell completo ocupa a tela inteira (<code>100dvh</code>) e por isso não cabe
          dentro do preview desta página. O exemplo vivo é este próprio site: o menu à esquerda, o
          topo com o botão de menu e a área de conteúdo são um <code>AppShell</code>. Reduza a
          janela para ver a sidebar ficar compacta (abaixo de 1024px) e virar off-canvas (abaixo de
          768px). As telas de referência do playground (<code>#/dashboard</code>,{' '}
          <code>#/listagem</code> e <code>#/formulario</code>) mostram o shell com conteúdo real.
        </p>
        <h3 className="eds-text-h4">Aplicação completa (React)</h3>
        <p className="docs-muted">
          O <code>AppShell</code> recebe a sidebar e o topo por slot, renderiza o único{' '}
          <code>&lt;main&gt;</code> e o skip link, e coordena o off-canvas.
        </p>
        <CodeBlock code={completoSource} label="Código React: aplicação completa" />
        <h3 className="eds-text-h4">Aplicação completa (HTML)</h3>
        <p className="docs-muted">
          O mesmo markup que o React emite. Sem JavaScript, o botão de menu abre a sidebar pelo
          Popover API; o contrato de foco e <code>inert</code> do off-canvas (ver Acessibilidade)
          precisa do React ou do <code>@eds-ui/behavior</code>, que liga a sidebar off-canvas
          sozinho (<code>inert</code> no resto da tela, foco e fechar ao navegar). Dentro de uma
          moldura de altura fixa, sobrescreva <code>block-size</code> da <code>.eds-app</code> no
          CSS da aplicação.
        </p>
        <CodeBlock code={completoHtml} label="Código HTML: aplicação completa" />
        <h3 className="eds-text-h4">Navegação em SPA com useAppShell</h3>
        <p className="docs-muted">
          O hook devolve <code>navId</code>, <code>mainId</code>, <code>navOpen</code>,{' '}
          <code>setNavOpen</code> e <code>closeNav()</code>. Chame <code>closeNav()</code> ao trocar
          de rota para fechar o off-canvas; <code>SidebarItem</code> com <code>href</code> já faz
          isso no clique.
        </p>
        <CodeBlock code={spaSource} label="Código React: useAppShell" />
      </Section>

      <Section title="API React">
        <p>
          <code>AppShell</code> aceita os atributos nativos de <code>&lt;div&gt;</code>,{' '}
          <code>ref</code> e <code>className</code>. <code>AppShellHeader</code> e{' '}
          <code>AppShellNavToggle</code> são partes dele.
        </p>
        <PropsTable
          caption="Props de AppShell"
          rows={[
            {
              name: 'sidebar',
              type: 'ReactNode',
              description: (
                <>
                  Slot da <code>Sidebar</code>.
                </>
              ),
            },
            {
              name: 'header',
              type: 'ReactNode',
              description: (
                <>
                  Slot do <code>AppShellHeader</code>.
                </>
              ),
            },
            {
              name: 'children',
              type: 'ReactNode',
              description: (
                <>
                  Conteúdo da página, dentro do único <code>&lt;main&gt;</code>.
                </>
              ),
            },
            {
              name: 'texts',
              type: 'Partial<AppShellTexts>',
              description: (
                <>
                  Textos internos: <code>skipLink</code> (&quot;Pular para o conteúdo&quot;). No{' '}
                  <code>AppShellNavToggle</code>, <code>texts.label</code> (&quot;Abrir
                  navegação&quot;).
                </>
              ),
            },
            {
              name: 'mainId',
              type: 'string',
              description: 'id do <main>. Padrão: gerado.',
            },
            {
              name: 'navId',
              type: 'string',
              description: 'id da sidebar. Padrão: o id dado à Sidebar ou um gerado.',
            },
            {
              name: 'mainClassName',
              type: 'string',
              description: 'Classe extra do <main>.',
            },
            {
              name: 'mainRef',
              type: 'Ref<HTMLElement>',
              description: 'Ref do <main>.',
            },
          ]}
        />
        <PropsTable
          caption="AppShellHeader e AppShellNavToggle"
          rows={[
            {
              name: 'AppShellHeader',
              type: 'NavbarProps',
              description: (
                <>
                  <code>&lt;header class=&quot;eds-app-header eds-navbar&quot;&gt;</code>. Fica
                  inerte com o off-canvas aberto. Aceita as mesmas props e filhos da Navbar.
                </>
              ),
            },
            {
              name: 'label',
              type: 'string',
              default: "'Abrir navegação'",
              description: (
                <>
                  Nome acessível do <code>AppShellNavToggle</code>.
                </>
              ),
            },
            {
              name: 'icon',
              type: 'ReactNode',
              description: (
                <>
                  Ícone do <code>AppShellNavToggle</code>. Padrão: menu.
                </>
              ),
            },
          ]}
        />
        <PropsTable
          caption="Retorno de useAppShell()"
          rows={[
            { name: 'navId', type: 'string', description: 'id da sidebar (alvo do gatilho).' },
            { name: 'mainId', type: 'string', description: 'id do <main> (alvo do skip link).' },
            {
              name: 'navOpen',
              type: 'boolean',
              description: 'Sidebar off-canvas aberta. Só muda no mobile.',
            },
            {
              name: 'setNavOpen',
              type: '(open: boolean) => void',
              description: 'Define o estado aberto (uso interno da Sidebar).',
            },
            {
              name: 'closeNav',
              type: '() => void',
              description: 'Fecha o off-canvas; sem efeito quando já está fechado.',
            },
            {
              name: 'navigatedRef',
              type: 'MutableRefObject<boolean>',
              description:
                'Marca uma navegação feita com o off-canvas aberto: o foco vai ao conteúdo.',
            },
          ]}
        />
        <p>
          Chamado fora de <code>&lt;AppShell&gt;</code>, <code>useAppShell</code> lança um erro.
        </p>
      </Section>

      <Section title="Classes CSS">
        <p>
          As faixas leem a largura do contêiner <code>.eds-app</code> (container query), não a da
          viewport: o shell funciona igual em página inteira e dentro de uma moldura.
        </p>
        <ClassTable
          caption="Classes do app shell"
          rows={[
            {
              name: '.eds-app',
              effect:
                'Grade de 100dvh: sidebar | topo + conteúdo. É o contêiner nomeado eds-app e não rola.',
            },
            { name: '.eds-app-header', effect: 'Área do topo; costuma ser o próprio .eds-navbar.' },
            {
              name: '.eds-app-main',
              effect:
                'Área de conteúdo; rola sozinha, sem encadear a rolagem, com a calha de rolagem reservada.',
            },
            {
              name: '.eds-app-nav-toggle',
              effect:
                'Botão que abre a sidebar (popovertarget). Só aparece abaixo de 768px de largura do shell e com Popover API.',
            },
            {
              name: '.eds-skip-link',
              effect: 'Pular para o conteúdo: primeiro filho do shell, visível somente no foco.',
            },
            {
              name: '.eds-sidebar[data-collapsed]',
              effect: 'Colapsar à mão (no elemento da sidebar, não no .eds-app).',
            },
          ]}
        />
        <p>
          Faixas (largura do <code>.eds-app</code>): 1024px ou mais, sidebar expandida; de 768 a
          1023px, compacta (só ícones); abaixo de 768px, off-canvas pelo botão de menu.
        </p>
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Landmarks:</strong> um único <code>&lt;main&gt;</code> por página (o AppShell
              o renderiza), <code>&lt;header&gt;</code> e <code>&lt;nav&gt;</code> nomeado. O skip
              link é o primeiro foco e leva ao <code>&lt;main&gt;</code>, que tem{' '}
              <code>tabIndex=-1</code>.
            </li>
            <li>
              <strong>Off-canvas:</strong> o popover não é modal. O React põe <code>inert</code> no
              topo, no conteúdo e no skip link enquanto a sidebar está aberta, sincroniza{' '}
              <code>aria-expanded</code> do gatilho e move o foco para o item atual; ao fechar,
              devolve o foco ao botão de menu ou, se houve navegação, ao conteúdo. Esc e clique fora
              fecham (nativo).
            </li>
            <li>
              <strong>Em SPA:</strong> feche o off-canvas ao navegar (<code>closeNav()</code>) e, a
              cada rota, atualize o <code>document.title</code> e mova o foco para o h1 da tela.
            </li>
            <li>
              <strong>Forçado pelo tipo:</strong> o <code>AppShellNavToggle</code> é sempre um botão
              só de ícone, com nome acessível (<code>label</code>, padrão &quot;Abrir
              navegação&quot;).
            </li>
            <li>
              <strong>Sem Popover API:</strong> o botão de menu some e a sidebar permanece compacta
              no mobile (fallback funcional).
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> nome em cada landmark (há mais de um{' '}
              <code>nav</code>), uma hierarquia de títulos que comece no h1 do conteúdo, e conteúdo
              que reflua a 320px dentro da área rolável.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
