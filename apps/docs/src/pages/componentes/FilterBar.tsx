import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/filter-bar/basico';
import basicoHtml from '../../examples/filter-bar/basico.html?raw';
import basicoSource from '../../examples/filter-bar/basico.tsx?raw';
import Periodo from '../../examples/filter-bar/periodo';
import periodoHtml from '../../examples/filter-bar/periodo.html?raw';
import periodoSource from '../../examples/filter-bar/periodo.tsx?raw';
import Completa from '../../examples/filter-bar/completa';
import completaHtml from '../../examples/filter-bar/completa.html?raw';
import completaSource from '../../examples/filter-bar/completa.tsx?raw';

export default function FilterBarPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Faixa de filtros de uma listagem: campos em linha, Filtrar e Limpar, &quot;Mais
        filtros&quot; e os chips dos filtros aplicados, que se removem um a um. É um formulário
        comum: o envio por GET funciona sem JavaScript.
      </p>

      <UseCases
        use={[
          'Acima de uma tabela ou lista que o usuário refina com frequência.',
          'Quando vale mostrar o que está filtrado e permitir tirar um filtro de cada vez.',
        ]}
        avoid={[
          'Para uma busca de texto só: o filtro local da Table basta.',
          'Para filtros que mudam o resultado a cada tecla sem confirmação: aqui o usuário aplica.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Básico"
          description="Busca e situação. Os chips mostram o que foi aplicado (rótulo do campo + texto da opção): remover um chip limpa o campo e refaz a busca, e o foco vai ao próximo chip ou, se não sobrou nenhum, ao primeiro campo. Nestes exemplos o envio não navega."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Com período"
          description="O campo com DateRangePicker recebe mais largura e o período nunca quebra linha (início, “até”, fim e botão do calendário). As ações ficam no fim da linha, alinhadas à base dos campos. Reduza a largura do navegador para ver."
          html={periodoHtml}
          react={{ Component: Periodo, source: periodoSource }}
        />
        <Example
          title="Com “Mais filtros”"
          description="Em contêiner largo os campos extras ficam sempre visíveis; em estreito, o resumo “Mais filtros (2)” recolhe e o contador diz quantos extras estão preenchidos. Reduza a largura do navegador para ver."
          html={completaHtml}
          react={{ Component: Completa, source: completaSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert tone="info" title="Chips e contador pelo @efds-ui/behavior">
          <p>
            Marque o <code>&lt;form&gt;</code> com <code>data-eds-filter-bar</code>. O{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> monta os chips a partir
            dos campos preenchidos, atualiza o contador de &quot;Mais filtros&quot; enquanto se
            digita e trata os chips e o botão Limpar. Remover um chip limpa o campo e envia o
            formulário (<code>requestSubmit</code>); <code>reset</code> vira &quot;limpar de
            verdade&quot; (zera, não restaura o valor inicial) e envia. Sem o pacote, o servidor
            pode renderizar os chips; com ele, são refeitos a cada envio.
          </p>
          <p>
            <code>eds:filter-change</code> no formulário a cada envio: <code>detail.reason</code> (
            <code>submit</code>, <code>remove</code> ou <code>clear</code>), <code>values</code> (os
            campos não vazios), <code>filters</code> (chave, rótulo e texto de cada chip) e{' '}
            <code>count</code>. Para o app que filtra sem navegar, chame <code>preventDefault</code>{' '}
            no <code>submit</code>. Campos fora dos filtros: <code>data-eds-filter-ignore</code>;
            rótulo do chip diferente do rótulo do campo: <code>data-eds-filter-label-text</code>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de FilterBar"
          rows={[
            {
              name: 'aria-label',
              type: 'string',
              required: true,
              description: 'Nome da região de busca (“Filtrar pedidos”).',
            },
            {
              name: 'children',
              type: 'ReactNode',
              description: (
                <>
                  Campos principais (<code>Field</code>); a busca leva{' '}
                  <code>className=&quot;eds-filter-bar-search&quot;</code>.
                </>
              ),
            },
            {
              name: 'more / moreCount',
              type: 'ReactNode / number',
              description: 'Campos extras em “Mais filtros”; moreCount mostra “(2)” no resumo.',
            },
            {
              name: 'active',
              type: '{ key, label, onRemove }[]',
              description:
                'Filtros aplicados, um chip cada. label já leva o rótulo: “Situação: Ativo”.',
            },
            {
              name: 'onSubmit',
              type: '(event) => void',
              description: 'Filtrar (ou Enter). O envio nativo é impedido.',
            },
            {
              name: 'onClear',
              type: '() => void',
              description: 'Limpar: zere os campos e os filtros aplicados.',
            },
            {
              name: 'texts',
              type: 'Partial<FilterBarTexts>',
              description: 'filter, clear, more, remove e chips.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos da barra de filtros"
          rows={[
            { name: '.eds-filter-bar', effect: 'O formulário (role="search").' },
            {
              name: '.eds-filter-bar-fields',
              effect: 'Campos em linha que quebra, por contêiner.',
            },
            {
              name: '.eds-filter-bar-search',
              effect: 'A busca principal: ocupa o espaço que sobra.',
            },
            {
              name: '.eds-filter-bar-actions',
              effect:
                'Filtrar e Limpar: no fim da linha dos campos, alinhadas à base; em contêiner estreito ocupam a linha toda.',
            },
            {
              name: '.eds-filter-bar-more',
              effect:
                '<details> “Mais filtros”: sempre aberto em contêiner largo; recolhível no estreito.',
            },
            { name: '.eds-filter-bar-count', effect: 'Contador “(2)” no resumo.' },
            {
              name: '.eds-filter-chips',
              effect: 'Lista dos filtros ativos; some sozinha sem itens.',
            },
            { name: '.eds-chip', effect: 'Chip: um <button> removível, ou <span> estático.' },
            { name: '.eds-chip-list', effect: 'Lista de chips fora da barra.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Região:</strong> <code>role=&quot;search&quot;</code> com nome; a lista de chips
            tem <code>aria-label</code> (&quot;Filtros ativos&quot;).
          </li>
          <li>
            <strong>Chips:</strong> são botões; o texto oculto &quot;— remover&quot; diz a ação (o
            ícone é decorativo). O alvo respeita 24 px (WCAG 2.5.8).
          </li>
          <li>
            <strong>Foco:</strong> depois de remover, o foco vai ao próximo chip (ou ao anterior, ou
            ao primeiro campo): nunca se perde no <code>body</code>. Uma região de status anuncia
            &quot;Filtro removido: …&quot; e quantos filtros restam.
          </li>
          <li>
            <strong>Aplicar explicitamente:</strong> os chips refletem o que foi aplicado, não o que
            se digita: nada muda debaixo das mãos do usuário.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> rótulos visíveis em todos os campos e que a
            lista filtrada anuncie o resultado (a Table tem <code>status</code> para isso).
          </li>
        </ul>
      </Section>
    </>
  );
}
