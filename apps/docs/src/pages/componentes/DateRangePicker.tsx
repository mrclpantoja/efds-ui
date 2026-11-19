import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/date-range-picker/basico';
import basicoHtml from '../../examples/date-range-picker/basico.html?raw';
import basicoSource from '../../examples/date-range-picker/basico.tsx?raw';
import MaxDias from '../../examples/date-range-picker/maxdias';
import maxdiasHtml from '../../examples/date-range-picker/maxdias.html?raw';
import maxdiasSource from '../../examples/date-range-picker/maxdias.tsx?raw';
import Nomes from '../../examples/date-range-picker/nomes';
import nomesHtml from '../../examples/date-range-picker/nomes.html?raw';
import nomesSource from '../../examples/date-range-picker/nomes.tsx?raw';
import Validacao from '../../examples/date-range-picker/validacao';
import validacaoHtml from '../../examples/date-range-picker/validacao.html?raw';
import validacaoSource from '../../examples/date-range-picker/validacao.tsx?raw';
import { toHref } from '../../router';

const hiddenHtml = `<!-- Os campos de texto não têm name. Os dois hidden levam o ISO aaaa-mm-dd
     (vazios se o campo estiver vazio ou inválido): -->
<input type="hidden" name="inicio" value="2026-03-03" />
<input type="hidden" name="fim" value="2026-03-15" />`;

const phpCode = `<?php
// PHP: início e fim chegam em ISO.
$inicio = DateTimeImmutable::createFromFormat('!Y-m-d', $_POST['inicio'] ?? '');
$fim    = DateTimeImmutable::createFromFormat('!Y-m-d', $_POST['fim'] ?? '');
if ($inicio === false || $fim === false || $fim < $inicio) {
    // erro de validação: confirme a regra também no servidor
}`;

const javaCode = `// Java (Spring Boot): LocalDate lê o ISO; valide a ordem no servidor.
@PostMapping("/relatorios")
public String gerar(
        @RequestParam("inicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
        @RequestParam("fim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
    if (fim.isBefore(inicio)) { /* erro de validação */ }
    servico.gerar(inicio, fim);
    return "redirect:/relatorios";
}`;

const eventos = `document.addEventListener('eds:daterange-change', (event) => {
  // Só quando o início ou o fim aceito muda. Ambos em ISO, ou null.
  const { start, end } = event.detail;
  console.log(start, end);   // '2026-03-03', '2026-03-15'
});`;

export default function DateRangePickerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo para escolher um <strong>período</strong>: duas datas (início e fim) em campos de
        texto com máscara e um calendário de um mês por vez, onde o primeiro dia escolhido é o
        início e o segundo é o fim. É o <a href={toHref('/componentes/date-picker')}>DatePicker</a>{' '}
        com dois valores.
      </p>

      <UseCases
        use={[
          'Para filtros e relatórios por período, reservas, férias, vigência.',
          'Quando o período tem um tamanho máximo (data-eds-max-days) ou limites de calendário.',
        ]}
        avoid={[
          <>
            Para uma data só: use <a href={toHref('/componentes/date-picker')}>DatePicker</a> ou a{' '}
            <a href={toHref('/componentes/date-input')}>data nativa</a>.
          </>,
          <>
            Quando dois campos de data nativos bastam (sem JavaScript, sem prévia do período): dois{' '}
            <a href={toHref('/componentes/date-input')}>
              <code>type=&quot;date&quot;</code>
            </a>{' '}
            lado a lado, validando no servidor que o fim não vem antes do início.
          </>,
          'Para períodos com atalhos prontos (últimos 7 dias, este mês): o componente não traz atalhos.',
        ]}
      />

      <Section title="Exemplos">
        <Alert variant="info" title="HTML: precisa do @eds-ui/behavior">
          <p>
            O calendário, a máscara, a prévia e a validação são JavaScript: no HTML vêm do{' '}
            <a href={toHref('/comecar/comportamento')}>@eds-ui/behavior</a>, que liga o{' '}
            <code>.eds-datepicker</code> com <code>data-eds-daterange</code>. Os previews HTML
            abaixo estão ligados a ele; no React, o <code>DateRangePicker</code> faz tudo sozinho.
          </p>
        </Alert>
        <Example
          title="Básico"
          description={
            <>
              Abra o calendário e clique em um dia (o início); ao passar o mouse ou as setas por
              outros dias, a faixa da prévia aparece. O segundo clique escolhe o fim e fecha; se for
              anterior ao início, vira o novo início. Também dá para digitar nos dois campos. Esc no
              meio descarta a escolha e mantém o período anterior.
            </>
          }
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <p>
          O servidor recebe os dois <code>hidden</code>, em ISO:
        </p>
        <CodeBlock code={hiddenHtml} label="Código HTML: os valores enviados" />
        <CodeBlock code={phpCode} label="Código PHP: receber o período" />
        <CodeBlock code={javaCode} label="Código Java: receber o período" />
        <Example
          title="Período máximo"
          description={
            <>
              <code>data-eds-max-days</code> (HTML) ou <code>maxDays</code> (React): dias corridos,
              contando início e fim. Depois de escolher o início, os dias além do limite ficam
              indisponíveis; digitar um fim além dele dá &quot;O período máximo é de 7 dias.&quot;.
            </>
          }
          html={maxdiasHtml}
          react={{ Component: MaxDias, source: maxdiasSource }}
        />
        <Example
          title="Nomes dos campos e limites"
          description={
            <>
              O nome de cada envio é o <code>name</code> do hidden (HTML) ou <code>nameStart</code>{' '}
              e <code>nameEnd</code> (React): use os nomes que o servidor espera.{' '}
              <code>data-eds-min</code> e <code>data-eds-max</code> (ou <code>min</code> e{' '}
              <code>max</code>) limitam o calendário.
            </>
          }
          html={nomesHtml}
          react={{ Component: Nomes, source: nomesSource }}
        />
        <Example
          title="Obrigatório e validação"
          description={
            <>
              Os dois campos têm <code>required</code> (no React, o <code>required</code> do{' '}
              <code>Field</code>). Clique em Solicitar vazio: o navegador bloqueia. Digite um fim
              anterior ao início (&quot;A data final deve ser igual ou posterior à inicial.&quot;)
              ou um período maior que 30 dias para ver as mensagens. No React, o erro visível vem do{' '}
              <code>error</code> do Field. Dias bloqueados podem ficar no meio do período, mas não
              ser início ou fim.
            </>
          }
          html={validacaoHtml}
          react={{ Component: Validacao, source: validacaoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>DateRangePicker</code> repassa os atributos de <code>&lt;div&gt;</code>, mescla{' '}
          <code>className</code> e o <code>ref</code> vai para o <strong>grupo</strong> (
          <code>role=&quot;group&quot;</code>). Dentro de um <code>Field</code>, o rótulo nomeia o
          grupo, o clique nele foca o campo inicial e o <code>id</code> vai para esse campo. É
          controlado (<code>value</code> e <code>onChange</code>) ou não (<code>defaultValue</code>
          ).
        </p>
        <PropsTable
          caption="Props de DateRangePicker"
          rows={[
            {
              name: 'value / defaultValue',
              type: '{ start: string | null; end: string | null }',
              description: 'Período em ISO (controlado) ou inicial.',
            },
            {
              name: 'onChange',
              type: '(range: { start, end }) => void',
              description: 'Início ou fim mudou, inclusive ao limpar (null).',
            },
            {
              name: 'min / max',
              type: 'string',
              description: 'Menor e maior data permitidas, em ISO.',
            },
            {
              name: 'isDateDisabled',
              type: '(date: Date) => boolean',
              description: 'Bloqueia dias específicos.',
            },
            {
              name: 'disableWeekends',
              type: 'boolean',
              description: 'Bloqueia sábados e domingos.',
            },
            {
              name: 'maxDays',
              type: 'number',
              description: 'Período máximo, em dias corridos, contando início e fim.',
            },
            {
              name: 'nameStart / nameEnd',
              type: 'string',
              description: (
                <>
                  <code>name</code> dos <code>input[type=hidden]</code> de início e fim (ISO).
                </>
              ),
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho, igual ao do Input.',
            },
            {
              name: 'required / disabled',
              type: 'boolean',
              description: 'Valem para os dois campos. Dentro de um Field, o required dele vale.',
            },
            {
              name: 'invalid / valid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid</code> / <code>data-valid</code> nos dois campos. Dentro de um
                  Field com <code>error</code> já é automático.
                </>
              ),
            },
            {
              name: 'placeholder / locale',
              type: 'string',
              default: "'dd/mm/aaaa' / 'pt-BR'",
              description: 'Dica de formato e idioma dos nomes de mês e dia.',
            },
            {
              name: 'texts',
              type: 'DateRangePickerTexts',
              description: (
                <>
                  Os do DatePicker, mais <code>startLabel</code> (&quot;Data inicial&quot;),{' '}
                  <code>endLabel</code>, <code>separator</code> (&quot;até&quot;),{' '}
                  <code>endBeforeStart</code>, <code>maxDays</code>, <code>startStatus</code>,{' '}
                  <code>periodStatus</code>, <code>rangeStart</code> e <code>rangeEnd</code>.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Atributos e eventos (HTML)">
        <ClassTable
          caption="Atributos data-eds-* do DateRangePicker"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-daterange',
              effect: (
                <>
                  No <code>.eds-datepicker.eds-daterange</code>: liga o período. Precisa de dois
                  campos de texto, um botão <code>.eds-datepicker-toggle</code> e dois hidden.
                </>
              ),
            },
            {
              name: 'data-eds-max-days',
              effect: 'Período máximo em dias corridos, contando início e fim.',
            },
            {
              name: 'data-eds-min / -max / -disabled-dates / -disable-weekends',
              effect: (
                <>
                  Como no <a href={toHref('/componentes/date-picker')}>DatePicker</a>.
                </>
              ),
            },
          ]}
        />
        <p>
          Dispara <code>eds:daterange-change</code> quando o início ou o fim aceito muda, com{' '}
          <code>detail.start</code> e <code>detail.end</code> (ISO ou <code>null</code>).
        </p>
        <CodeBlock code={eventos} label="Código JavaScript: evento do DateRangePicker" />
      </Section>

      <Section title="Classes CSS">
        <p>
          Reaproveita tudo do <a href={toHref('/componentes/date-picker')}>DatePicker</a>.
          Acrescenta:
        </p>
        <ClassTable
          caption="Classes e atributos de DateRangePicker"
          rows={[
            {
              name: '.eds-daterange',
              effect: 'No .eds-datepicker: dois campos lado a lado com o separador e um só botão.',
            },
            { name: '.eds-daterange-sep', effect: 'O separador ("até"), decorativo.' },
            {
              name: '.eds-calendar-day[data-range="start|middle|end|single"]',
              effect:
                'Faixa contínua: início e fim em cor de ação, meio em cor sutil. single: só o início escolhido, ou início igual ao fim.',
            },
            {
              name: '.eds-calendar-day[data-range-preview]',
              effect:
                'Prévia do período entre o início e o dia sob o ponteiro ou foco; não é aria-selected.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Estrutura:</strong> o conjunto é um <code>role=&quot;group&quot;</code> nomeado
            pelo rótulo (&quot;Período do relatório&quot;), e cada campo tem o seu nome (&quot;Data
            inicial&quot;, &quot;Data final&quot;). O botão abre um diálogo, como no DatePicker.
          </li>
          <li>
            <strong>Escolha do período:</strong> o primeiro Enter ou clique é o início; o segundo, o
            fim. A região de status diz &quot;Início: 03/03/2026. Escolha a data final.&quot; e, ao
            fechar, &quot;Período: 03/03/2026 a 15/03/2026.&quot;. Todos os dias do período têm{' '}
            <code>aria-selected=&quot;true&quot;</code> e o nome do dia acrescenta &quot;início do
            período&quot; ou &quot;fim do período&quot;.
          </li>
          <li>
            <strong>Sem depender de cor:</strong> início e fim são sólidos e a faixa do meio tem
            marcação própria; em alto contraste, a faixa continua distinta. A prévia é só um reforço
            visual.
          </li>
          <li>
            <strong>Teclado:</strong> o mesmo da grade do{' '}
            <a href={toHref('/componentes/date-picker')}>DatePicker</a> (setas, Home/End,
            PageUp/PageDown, Shift+PageUp/PageDown, Enter ou Espaço, Esc). A prévia segue o foco.
            Dias além do período máximo ficam indisponíveis e avisam.
          </li>
          <li>
            <strong>Validação:</strong> campo inválido, fim antes do início, fora de min/max ou além
            do máximo: <code>aria-invalid</code> mais mensagem de validade. Um campo só preenchido
            (sem <code>required</code>) pede o outro.
          </li>
          <li>
            <strong>Esc em Modal:</strong> fecha só o calendário, sem fechar o diálogo em volta.
          </li>
        </ul>
      </Section>
    </>
  );
}
