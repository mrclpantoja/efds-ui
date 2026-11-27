import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import basicoHtml from '../../examples/tabs/basico.html?raw';
import Basico from '../../examples/tabs/basico';
import basicoSource from '../../examples/tabs/basico.tsx?raw';
import Controlado from '../../examples/tabs/controlado';
import controladoSource from '../../examples/tabs/controlado.tsx?raw';
import Indisponivel from '../../examples/tabs/indisponivel';
import indisponivelSource from '../../examples/tabs/indisponivel.tsx?raw';
import LarguraTotal from '../../examples/tabs/largura-total';
import larguraTotalSource from '../../examples/tabs/largura-total.tsx?raw';

export default function TabsPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Alterna entre painéis do mesmo contexto, mostrando um de cada vez. Os painéis ficam
        montados; só o ativo é visível.
      </p>

      <UseCases
        use={[
          'Para dividir um conteúdo em visões irmãs de peso parecido (Resumo, Itens, Histórico).',
          'Quando o usuário alterna com frequência e quer manter o contexto da página.',
        ]}
        avoid={[
          'Para navegar entre páginas: use links, Navbar ou Sidebar.',
          'Para passos sequenciais obrigatórios: um fluxo em etapas comunica melhor a ordem.',
          'Para mais de sete ou oito abas: reorganize o conteúdo.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Básico"
          description="Não controlado: defaultValue define a aba inicial. Setas, Home e End navegam. No HTML, o @efds-ui/behavior liga o mesmo markup (a aba Anexos é indisponível)."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Aba indisponível"
          description="disabled vira aria-disabled: a aba continua alcançável pelas setas, mas não ativa."
          react={{ Component: Indisponivel, source: indisponivelSource }}
        />
        <Example
          title="Controlado"
          description="value e onValueChange deixam o estado com o consumidor."
          react={{ Component: Controlado, source: controladoSource }}
        />
        <Example
          title="Largura total"
          description="fill divide a largura da lista entre as abas."
          react={{ Component: LarguraTotal, source: larguraTotalSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert tone="info" title="No HTML, o comportamento vem do @efds-ui/behavior">
          <p>
            O CSS só estiliza. Roving tabindex, setas, Home/End e a troca de painéis são JavaScript:
            carregue o <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a>, que detecta{' '}
            <code>.eds-tabs</code> pelo próprio markup (<code>role</code>,{' '}
            <code>aria-selected</code> e <code>aria-controls</code>), sem atributo extra. O estado
            inicial vem de <code>aria-selected</code> e <code>aria-disabled</code>; a troca dispara{' '}
            <code>eds:tabs-change</code> em <code>.eds-tabs</code>. Sem o pacote, não use o padrão
            tablist: prefira links ou seções comuns.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <p>
          Um conjunto de quatro partes: <code>Tabs</code> (estado), <code>TabList</code>,{' '}
          <code>Tab</code> e <code>TabPanel</code>. Todas repassam <code>ref</code> e aceitam{' '}
          <code>className</code>. Os painéis ficam todos montados, os inativos com{' '}
          <code>hidden</code>.
        </p>
        <PropsTable
          caption="Props de Tabs"
          rows={[
            {
              name: 'value',
              type: 'string',
              description: (
                <>
                  Aba ativa (controlado). Use com <code>onValueChange</code>. Exclusivo com{' '}
                  <code>defaultValue</code>.
                </>
              ),
            },
            {
              name: 'defaultValue',
              type: 'string',
              description: 'Aba inicial (não controlado).',
            },
            {
              name: 'onValueChange',
              type: '(value: string) => void',
              description: 'Chamado ao ativar uma aba por clique, setas, Home ou End.',
            },
            {
              name: 'fill',
              type: 'boolean',
              default: 'false',
              description: 'As abas dividem a largura da lista.',
            },
          ]}
        />
        <PropsTable
          caption="Props de TabList"
          rows={[
            {
              name: 'aria-label',
              type: 'string',
              required: true,
              description: (
                <>
                  Nome da lista. O tipo exige <code>aria-label</code> ou{' '}
                  <code>aria-labelledby</code>.
                </>
              ),
            },
          ]}
        />
        <PropsTable
          caption="Props de Tab e TabPanel"
          rows={[
            {
              name: 'value',
              type: 'string',
              required: true,
              description: (
                <>
                  Identifica a aba e o painel correspondente. Pode ter espaços e acentos; os ids são
                  gerados com <code>useId</code>.
                </>
              ),
            },
            {
              name: 'disabled',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Só em <code>Tab</code>. Vira <code>aria-disabled</code>: focável por setas, não
                  ativa.
                </>
              ),
            },
            {
              name: 'tabIndex',
              type: 'number',
              default: '0',
              description: (
                <>
                  Só em <code>TabPanel</code>. O painel é alcançável por Tab; passe <code>-1</code>{' '}
                  quando o conteúdo já começa por um elemento focável.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Tabs"
          rows={[
            { name: '.eds-tabs', effect: 'Contêiner das abas e dos painéis.' },
            { name: '.eds-tabs-fill', effect: 'As abas dividem a largura da lista.' },
            {
              name: '.eds-tablist',
              effect: 'Lista de abas; rola na horizontal quando não cabe.',
            },
            { name: '.eds-tab', effect: 'Aba (um <button role="tab">).' },
            {
              name: '[aria-selected="true"]',
              effect: 'Aba ativa, na cor de ação e com indicador.',
            },
            {
              name: ':disabled, [aria-disabled="true"]',
              effect: 'Aba indisponível.',
            },
            { name: '.eds-tabpanel', effect: 'Painel; os inativos recebem hidden.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Teclado:</strong> Tab entra na lista (na aba ativa) e sai dela; ← e → movem
            entre as abas, com volta ao fim; Home e End vão à primeira e à última. A ativação é
            automática: mover o foco ativa a aba, exceto a indisponível, que recebe foco sem ser
            ativada.
          </li>
          <li>
            <strong>ARIA:</strong> <code>role=&quot;tablist&quot;</code>,{' '}
            <code>role=&quot;tab&quot;</code> com <code>aria-selected</code> e{' '}
            <code>aria-controls</code>, <code>role=&quot;tabpanel&quot;</code> com{' '}
            <code>aria-labelledby</code>. Roving tabindex: <code>0</code> na aba ativa,{' '}
            <code>-1</code> nas demais. Tudo isso o componente faz.
          </li>
          <li>
            <strong>Forçado pelo tipo:</strong> <code>TabList</code> exige <code>aria-label</code>{' '}
            ou <code>aria-labelledby</code>; <code>Tab</code> e <code>TabPanel</code> exigem{' '}
            <code>value</code>.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> rótulos curtos e distintos; que os painéis
            tenham o mesmo valor das abas; e não esconder conteúdo essencial em uma aba que ninguém
            abre.
          </li>
          <li>
            <strong>Direção:</strong> em páginas da direita para a esquerda (
            <code>dir=&quot;rtl&quot;</code>), as setas se invertem.
          </li>
        </ul>
      </Section>
    </>
  );
}
