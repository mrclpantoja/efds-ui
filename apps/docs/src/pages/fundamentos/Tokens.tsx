import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { ColorSwatches, RadiusScale, SpaceScale } from '../../components/TokenSamples';

const sobrescrita = `/* Sua folha de estilos, carregada depois do eDS.ui */
:root {
  /* Um único valor: o resto da família deriva dele */
  --eds-color-action-primary: #0f766e;
  --eds-color-action-primary-hover: color-mix(in oklch, var(--eds-color-action-primary), black 12%);
  --eds-color-action-primary-active: color-mix(in oklch, var(--eds-color-action-primary), black 22%);
  --eds-color-action-primary-subtle: color-mix(in oklch, var(--eds-color-action-primary) 12%, white);
}`;

const subarvore = `/* Só dentro do painel de relatórios */
.painel-relatorios {
  --eds-color-bg-surface: #f8fafc;
  --eds-radius-md: 4px;
}`;

const niveis = `/* 1. Primitive: valor bruto (não use) */
--eds-blue-500: #315efb;

/* 2. Semantic: intenção; é a API pública */
--eds-color-action-primary: var(--eds-accent-500);

/* 3. Component: interno de um componente (não use) */
--_button-height: var(--eds-control-height-md);`;

export default function Tokens() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Todo valor visual do eDS.ui (cor, espaço, raio, altura, sombra, tipografia) vem de um token:
        uma variável CSS com prefixo <code>--eds-</code>. Os tokens se organizam em três níveis, e
        só um deles é a API de personalização.
      </p>

      <Section title="Os três níveis">
        <p>
          Cada nível só consome o anterior. Assim, tema, modo, densidade e forma mudam os tokens
          semânticos e os componentes acompanham sem nenhuma alteração.
        </p>
        <ClassTable
          caption="Níveis de token"
          headers={['Nível', 'Uso']}
          rows={[
            {
              name: 'Primitive',
              effect: (
                <>
                  Valores brutos da paleta e das escalas: <code>--eds-blue-500</code>,{' '}
                  <code>--eds-gray-200</code>, <code>--eds-space-4</code>. Existem para alimentar os
                  semânticos e os temas. Não são API: podem mudar sem aviso.
                </>
              ),
            },
            {
              name: 'Semantic',
              effect: (
                <>
                  Descrevem a intenção: <code>--eds-color-action-primary</code>,{' '}
                  <code>--eds-color-text-secondary</code>. Componentes e aplicações consomem somente
                  estes. <strong>É a API de tematização.</strong>
                </>
              ),
            },
            {
              name: 'Component',
              effect: (
                <>
                  Internos de cada componente, com prefixo <code>--_</code> (por exemplo{' '}
                  <code>--_button-height</code>). Não são API: não leia nem reatribua.
                </>
              ),
            },
          ]}
        />
        <CodeBlock code={niveis} label="Exemplo dos três níveis" />
      </Section>

      <Section title="Nomenclatura">
        <p>
          O padrão é <code>--eds-&#123;categoria&#125;-&#123;papel&#125;-&#123;variante&#125;</code>
          , sempre em kebab-case. As categorias são <code>color</code>, <code>font</code>,{' '}
          <code>space</code>, <code>radius</code>, <code>shadow</code>, <code>motion</code>,{' '}
          <code>control</code> e <code>layout</code>; as escalas de acento ficam em{' '}
          <code>accent-50</code> a <code>accent-900</code>.
        </p>
        <p>
          Os tokens ficam em <code>@layer eds.tokens</code> com seletor de especificidade zero,
          então qualquer CSS seu, sem camada ou em camada posterior, vence sem precisar de{' '}
          <code>!important</code>.
        </p>
      </Section>

      <Section title="O que você pode sobrescrever">
        <p>
          Sobrescreva os tokens semânticos. A tabela resume os grupos; a lista completa está em{' '}
          <code>packages/core/tokens/semantic/</code>.
        </p>
        <ClassTable
          caption="Tokens semânticos públicos"
          headers={['Token', 'Uso']}
          rows={[
            {
              name: '--eds-color-bg-{page|surface|subtle|overlay}',
              effect:
                'Fundos: página, superfície (cards, campos), áreas sutis e a camada atrás dos modais.',
            },
            {
              name: '--eds-color-text-{primary|secondary|muted|on-action}',
              effect: 'Texto principal, secundário, apoio e texto sobre fundo de ação.',
            },
            {
              name: '--eds-color-border-{default|strong}',
              effect: 'Bordas decorativas e bordas de controles.',
            },
            {
              name: '--eds-color-action-primary (-hover, -active, -subtle)',
              effect: 'A cor de ação da aplicação e seus estados. É o token da cor de destaque.',
            },
            {
              name: '--eds-color-action-danger (-hover, -active)',
              effect: 'Ação destrutiva.',
            },
            {
              name: '--eds-color-status-{info|success|warning|danger} (-subtle, -text)',
              effect: 'Estado: cor sólida, fundo suave e cor para texto e ícone.',
            },
            { name: '--eds-color-focus-ring', effect: 'Cor do anel de foco.' },
            {
              name: '--eds-font-family, --eds-font-size-*, --eds-line-height-*, --eds-font-weight-*',
              effect: 'Tipografia: família, tamanhos e alturas de linha por estilo, e pesos.',
            },
            {
              name: '--eds-space-{1..9}',
              effect: 'Escala de espaçamento (4px a 64px). O space-4 acompanha a densidade.',
            },
            {
              name: '--eds-radius-{none|sm|md|lg|xl|full}',
              effect: 'Raios de borda. Acompanham o eixo de forma.',
            },
            {
              name: '--eds-shadow-{xs|sm|md|lg}',
              effect: 'Elevações. Dependem do modo.',
            },
            {
              name: '--eds-control-height-{sm|md|lg}',
              effect: 'Altura dos controles. Acompanha a densidade.',
            },
            {
              name: '--eds-layout-*',
              effect: 'Larguras de Container, Sidebar e altura da Navbar.',
            },
          ]}
        />
        <h3 className="eds-text-h3">Cores</h3>
        <p>
          As amostras leem os tokens ao vivo: mude tema ou modo no menu &quot;Aparência&quot; e elas
          acompanham.
        </p>
        <ColorSwatches />
        <h3 className="eds-text-h3">Espaço</h3>
        <SpaceScale />
        <h3 className="eds-text-h3">Raio</h3>
        <p>
          Os raios <code>sm</code>, <code>md</code> e <code>lg</code> acompanham o eixo de forma.
        </p>
        <RadiusScale />
        <p>
          Para trocar a cor de destaque da aplicação, reatribua um único valor e derive os estados
          com <code>color-mix()</code>. Confira o contraste: texto sobre a cor de ação precisa de
          4,5:1 e a cor sobre o fundo, 3:1 para componentes de interface.
        </p>
        <CodeBlock code={sobrescrita} label="Sobrescrita da cor de ação" />
        <p>
          A sobrescrita também funciona em qualquer subárvore, porque as variáveis herdam. Para
          trocar tema, modo, densidade ou forma, prefira os eixos (veja{' '}
          <a href="#/fundamentos/temas-e-eixos">Temas e eixos</a>), que já vêm calculados e testados
          para contraste.
        </p>
        <CodeBlock code={subarvore} label="Sobrescrita em uma subárvore" />
      </Section>

      <Section title="O que não sobrescrever">
        <ul className="docs-list">
          <li>
            <strong>Primitivos</strong> (<code>--eds-blue-500</code>, <code>--eds-space-4</code> da
            escala de base): não são API e os semânticos já os usam. Mudar um primitivo muda o
            sistema inteiro de forma difícil de prever.
          </li>
          <li>
            <strong>Tokens de componente</strong> (<code>--_*</code>): internos e sem garantia de
            estabilidade. Se falta um ajuste, peça um token semântico em vez de reatribuir um
            interno.
          </li>
          <li>
            <strong>Valores literais nos seus componentes:</strong> consuma os tokens semânticos (
            <code>var(--eds-color-text-secondary)</code>) em vez de copiar hexadecimais, para o seu
            código acompanhar temas e modo escuro.
          </li>
        </ul>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            Os valores padrão de todos os temas e modos passam o contraste AA (4,5:1 para texto). Ao
            sobrescrever cores, o contraste passa a ser sua responsabilidade.
          </li>
          <li>
            Para texto e ícone de status, use <code>--eds-color-status-*-text</code>: as cores
            sólidas de sucesso e alerta não atingem 3:1 sobre branco.
          </li>
          <li>
            Os tokens de movimento são zerados com <code>prefers-reduced-motion: reduce</code>.
          </li>
        </ul>
      </Section>
    </>
  );
}
