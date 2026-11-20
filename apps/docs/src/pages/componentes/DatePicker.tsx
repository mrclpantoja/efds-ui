import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/date-picker/basico';
import basicoHtml from '../../examples/date-picker/basico.html?raw';
import basicoSource from '../../examples/date-picker/basico.tsx?raw';
import Bloqueios from '../../examples/date-picker/bloqueios';
import bloqueiosHtml from '../../examples/date-picker/bloqueios.html?raw';
import bloqueiosSource from '../../examples/date-picker/bloqueios.tsx?raw';
import Desabilitado from '../../examples/date-picker/desabilitado';
import desabilitadoHtml from '../../examples/date-picker/desabilitado.html?raw';
import desabilitadoSource from '../../examples/date-picker/desabilitado.tsx?raw';
import Limites from '../../examples/date-picker/limites';
import limitesHtml from '../../examples/date-picker/limites.html?raw';
import limitesSource from '../../examples/date-picker/limites.tsx?raw';
import Obrigatorio from '../../examples/date-picker/obrigatorio';
import obrigatorioHtml from '../../examples/date-picker/obrigatorio.html?raw';
import obrigatorioSource from '../../examples/date-picker/obrigatorio.tsx?raw';
import Tamanhos from '../../examples/date-picker/tamanhos';
import tamanhosHtml from '../../examples/date-picker/tamanhos.html?raw';
import tamanhosSource from '../../examples/date-picker/tamanhos.tsx?raw';
import { toHref } from '../../router';

const hiddenHtml = `<!-- O campo de texto não tem name (não é enviado).
     O hidden leva o valor em ISO aaaa-mm-dd, ou vazio se a data for inválida: -->
<input type="hidden" name="vencimento" value="2026-03-15" />`;

const phpCode = `<?php
// PHP: o campo chega em ISO (aaaa-mm-dd), vazio se não informado.
$texto = $_POST['vencimento'] ?? '';
$vencimento = DateTimeImmutable::createFromFormat('!Y-m-d', $texto);
if ($vencimento === false) {
    // vazio ou inválido: responda com erro de validação
}`;

const javaCode = `// Java (Spring Boot): LocalDate lê o ISO sem configuração.
@PostMapping("/titulos")
public String salvar(
        @RequestParam(name = "vencimento", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vencimento) {
    if (vencimento == null) { /* erro de validação */ }
    servico.agendar(vencimento);
    return "redirect:/titulos";
}`;

const eventos = `document.addEventListener('eds:date-change', (event) => {
  // Só quando o valor aceito muda. value é ISO (ou null); date é um Date local.
  const { value, date } = event.detail;
  console.log(value, date);   // '2026-03-15', Date(15/03/2026 00:00 local)
});`;

const reactDatas = `// React: ISO como valor público; Date local (sem fuso) como segundo argumento.
<DatePicker
  value={vencimento}                 // string ISO ou null
  onChange={(iso, date) => setVencimento(iso)}
/>`;

const textos = `import { configure } from '@eds-ui/behavior';

configure({ locale: 'pt-BR', messages: { dateToday: 'Hoje', dateClose: 'Fechar' } });`;

export default function DatePickerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de data com calendário próprio: o usuário digita (com máscara dd/mm/aaaa) ou abre uma
        grade de dias para escolher. Funciona igual em todos os navegadores e permite bloquear
        datas.
      </p>

      <UseCases
        use={[
          'Quando a data precisa ter o mesmo formato (dd/mm/aaaa) e o mesmo calendário em todos os navegadores.',
          'Quando há regras: data mínima e máxima, feriados, fins de semana, agenda cheia.',
          'Em formulários de cadastro e agendamento, onde o usuário digita a data de cabeça e também precisa consultar o calendário.',
        ]}
        avoid={[
          <>
            Quando um campo simples basta: a{' '}
            <a href={toHref('/componentes/date-input')}>data nativa</a> (
            <code>type=&quot;date&quot;</code>) não precisa de JavaScript, é leve e nos celulares
            costuma ser melhor. Prefira-a se não há bloqueios nem exigência de formato.
          </>,
          <>
            Para escolher início e fim: use o{' '}
            <a href={toHref('/componentes/date-range-picker')}>DateRangePicker</a>.
          </>,
          <>
            Para hora ou mês: use o campo nativo (<code>time</code>, <code>month</code>).
          </>,
          'Sem JavaScript no HTML: o componente vira só um campo de texto, sem calendário e sem a máscara.',
        ]}
      />

      <Section title="Exemplos">
        <Alert variant="info" title="HTML: precisa do @eds-ui/behavior">
          <p>
            O calendário, a máscara e a validação são JavaScript: no HTML vêm do{' '}
            <a href={toHref('/comecar/comportamento')}>@eds-ui/behavior</a>, que liga o{' '}
            <code>.eds-datepicker</code> com <code>data-eds-datepicker</code> e monta o conteúdo do{' '}
            <code>.eds-calendar</code> (o markup só traz o contêiner vazio). Os previews HTML abaixo
            estão ligados a ele; no React, o <code>DatePicker</code> faz tudo sozinho.
          </p>
        </Alert>
        <Example
          title="Básico"
          description={
            <>
              Clique no ícone de calendário (ou Alt+↓ no campo) e navegue com as setas; Enter
              escolhe e fecha. Ou digite: <code>15032026</code> vira <code>15/03/2026</code>, e
              colar <code>2026-03-15</code> também funciona. Se o campo estiver inválido (31/02), o
              formulário não envia.
            </>
          }
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <p>
          O que o servidor recebe é o campo <code>hidden</code>, sempre em ISO, independentemente do
          que o usuário digitou:
        </p>
        <CodeBlock code={hiddenHtml} label="Código HTML: o valor enviado" />
        <CodeBlock code={phpCode} label="Código PHP: receber a data" />
        <CodeBlock code={javaCode} label="Código Java: receber a data" />
        <Example
          title="Mínimo e máximo"
          description={
            <>
              <code>data-eds-min</code> e <code>data-eds-max</code> (HTML) ou <code>min</code> e{' '}
              <code>max</code> (React), em ISO. Dias fora do intervalo ficam indisponíveis, os
              botões de mês e os selects não saem dele, e digitar uma data fora dá &quot;Escolha uma
              data entre 01/01/2026 e 31/12/2026.&quot;.
            </>
          }
          html={limitesHtml}
          react={{ Component: Limites, source: limitesSource }}
        />
        <Example
          title="Datas bloqueadas e fins de semana"
          description={
            <>
              Em HTML, <code>data-eds-disabled-dates</code> (lista ISO separada por vírgula) e{' '}
              <code>data-eds-disable-weekends</code>. No React, <code>isDateDisabled(date)</code> e{' '}
              <code>disableWeekends</code>. Um dia bloqueado recebe foco pelo teclado, mas não é
              escolhido (o leitor de tela diz &quot;data indisponível&quot;), e fica riscado.
              Digitar uma data bloqueada dá &quot;Data indisponível.&quot;.
            </>
          }
          html={bloqueiosHtml}
          react={{ Component: Bloqueios, source: bloqueiosSource }}
        />
        <Example
          title="Obrigatório e erro"
          description={
            <>
              O primeiro campo é obrigatório: <code>required</code> no campo de texto (HTML) ou no{' '}
              <code>Field</code> (React). No HTML, clique em Salvar sem preencher e o navegador
              bloqueia o envio; o campo de baixo mostra um erro de servidor já renderizado (
              <code>aria-invalid</code> + <code>.eds-error</code> ligado por{' '}
              <code>aria-describedby</code>). No React, o erro visível vem do <code>error</code> do
              Field. O erro nunca é só a cor da borda.
            </>
          }
          html={obrigatorioHtml}
          react={{ Component: Obrigatorio, source: obrigatorioSource }}
        />
        <Example
          title="Tamanhos"
          description="sm, md (padrão, sem classe) e lg, iguais ao Input. O botão de calendário acompanha."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Desabilitado"
          description="Campo e botão desabilitados: o calendário não abre e o valor não é enviado."
          html={desabilitadoHtml}
          react={{ Component: Desabilitado, source: desabilitadoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>DatePicker</code> aceita os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>type</code>, <code>min</code>, <code>max</code>, <code>name</code>,{' '}
          <code>role</code> e <code>pattern</code>, que ele controla), repassa <code>ref</code>{' '}
          (para o campo de texto) e mescla <code>className</code>. Dentro de um <code>Field</code>,{' '}
          <code>id</code>, rótulo, descrições, <code>required</code> e erro vêm dele. É controlado (
          <code>value</code> e <code>onChange</code>) ou não (<code>defaultValue</code>). As datas
          são locais, sem fuso: o valor público é a string ISO <code>aaaa-mm-dd</code>.
        </p>
        <PropsTable
          caption="Props de DatePicker"
          rows={[
            {
              name: 'value / defaultValue',
              type: 'string | null',
              description: (
                <>
                  Data em ISO <code>aaaa-mm-dd</code> (controlado) ou inicial. <code>null</code> ou{' '}
                  <code>&quot;&quot;</code> = nenhuma.
                </>
              ),
            },
            {
              name: 'onChange',
              type: '(iso: string | null, date: Date | null) => void',
              description:
                'Escolha, digitação aceita ou limpeza. date é um Date local (meia-noite), sem fuso.',
            },
            {
              name: 'min / max',
              type: 'string',
              description: 'Menor e maior data permitidas, em ISO.',
            },
            {
              name: 'isDateDisabled',
              type: '(date: Date) => boolean',
              description: 'Bloqueia dias específicos (feriados, agenda cheia).',
            },
            {
              name: 'disableWeekends',
              type: 'boolean',
              description: 'Bloqueia sábados e domingos.',
            },
            {
              name: 'name',
              type: 'string',
              description: (
                <>
                  Gera um <code>input[type=hidden]</code> com o ISO (vazio se inválido) para envio
                  em formulário. O campo de texto não é enviado.
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
              name: 'invalid / valid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code> /{' '}
                  <code>data-valid=&quot;true&quot;</code>. Dentro de um Field com{' '}
                  <code>error</code> já é automático.
                </>
              ),
            },
            {
              name: 'required / disabled / readOnly',
              type: 'boolean',
              description: (
                <>
                  Nativos do campo de texto. Com <code>disabled</code> ou <code>readOnly</code> o
                  botão de calendário também fica inativo.
                </>
              ),
            },
            {
              name: 'placeholder',
              type: 'string',
              default: "'dd/mm/aaaa'",
              description: 'Dica de formato. A máscara continua dd/mm/aaaa.',
            },
            {
              name: 'locale',
              type: 'string',
              default: "'pt-BR'",
              description:
                'Idioma dos nomes de mês e dia (Intl). A semana começa no domingo; a máscara não muda.',
            },
            {
              name: 'texts',
              type: 'DatePickerTexts',
              description: (
                <>
                  Textos internos: <code>toggle</code>, <code>dialog</code>, <code>invalid</code>,{' '}
                  <code>outOfRange</code>, <code>selected</code>, <code>unavailable</code>,{' '}
                  <code>today</code>, <code>close</code>, <code>previousMonth</code>,{' '}
                  <code>nextMonth</code>, <code>month</code> e <code>year</code>, para outro idioma.
                </>
              ),
            },
          ]}
        />
        <CodeBlock code={reactDatas} label="Código React: valor controlado" />
      </Section>

      <Section title="Atributos e eventos (HTML)">
        <ClassTable
          caption="Atributos data-eds-* do DatePicker"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-datepicker',
              effect: (
                <>
                  No <code>.eds-datepicker</code>: liga o DatePicker.
                </>
              ),
            },
            { name: 'data-eds-min / data-eds-max', effect: 'Limites em ISO (aaaa-mm-dd).' },
            {
              name: 'data-eds-disabled-dates',
              effect: (
                <>
                  Lista de datas ISO bloqueadas, separadas por vírgula:{' '}
                  <code>2026-11-20,2026-12-25</code>. Lido a cada uso: o servidor pode trocar.
                </>
              ),
            },
            { name: 'data-eds-disable-weekends', effect: 'Bloqueia sábados e domingos.' },
          ]}
        />
        <p>
          O <code>.eds-datepicker</code> dispara <code>eds:date-change</code> quando o valor aceito
          muda, com <code>detail.value</code> (ISO ou <code>null</code>) e <code>detail.date</code>{' '}
          (<code>Date</code> local ou <code>null</code>). O hidden também dispara <code>input</code>{' '}
          e <code>change</code>.
        </p>
        <CodeBlock code={eventos} label="Código JavaScript: evento do DatePicker" />
        <p>
          Os textos (nomes dos botões, mensagens de validade, anúncios, idioma dos meses) são
          configuráveis em um só lugar:
        </p>
        <CodeBlock code={textos} label="Código TypeScript: textos do calendário" />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de DatePicker"
          rows={[
            {
              name: '.eds-datepicker',
              effect: 'Contêiner: campo de texto, botão, hidden, calendário e status.',
            },
            {
              name: '.eds-datepicker-input',
              effect: 'No input de texto: reserva o espaço do botão à direita. Use com .eds-input.',
            },
            {
              name: '.eds-datepicker-toggle',
              effect:
                'Botão de calendário dentro do campo (ghost, ícone desenhado pelo CSS quando vazio, alvo de 28px, foco visível).',
            },
            {
              name: '.eds-calendar',
              effect:
                'Diálogo do calendário, popover="manual" posicionado por --_calendar-x e --_calendar-y (definidos pelo JS).',
            },
            {
              name: '.eds-calendar-header / -title / -nav',
              effect: 'Cabeçalho: botões de mês anterior e próximo e o título (mês e ano).',
            },
            { name: '.eds-calendar-jump', effect: 'Selects de mês e ano.' },
            {
              name: '.eds-calendar-grid / -weekday / -day',
              effect: 'Grade de 7 colunas, cabeçalho dos dias da semana e célula de dia.',
            },
            {
              name: '.eds-calendar-day[aria-selected="true"]',
              effect: 'Dia escolhido: fundo de ação e texto sobre ação.',
            },
            {
              name: '.eds-calendar-day[aria-current="date"]',
              effect: 'Hoje: contorno e peso, não só cor.',
            },
            {
              name: '.eds-calendar-day[aria-disabled="true"]',
              effect: 'Dia indisponível: texto esmaecido e riscado.',
            },
            { name: '.eds-calendar-footer', effect: 'Botões Hoje e Fechar.' },
            {
              name: '.eds-input-sm / .eds-input-lg',
              effect: 'No input de texto: tamanhos; o botão acompanha.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Padrão:</strong> APG &quot;Date Picker Dialog&quot;. O campo de texto continua
            sendo um campo de texto (digitar é sempre possível); o botão tem{' '}
            <code>aria-haspopup=&quot;dialog&quot;</code>, <code>aria-expanded</code> e{' '}
            <code>aria-controls</code>; o calendário é um diálogo nomeado, com a grade em{' '}
            <code>role=&quot;grid&quot;</code>.
          </li>
          <li>
            <strong>Nome do dia:</strong> o número visível vem primeiro, e o nome acessível traz a
            data completa (&quot;15 de março de 2026, domingo&quot;). Hoje tem{' '}
            <code>aria-current=&quot;date&quot;</code>; o escolhido, <code>aria-selected</code>; o
            indisponível, <code>aria-disabled</code>, que além da cor leva texto riscado.
          </li>
          <li>
            <strong>Título do mês:</strong> é uma região <code>aria-live=&quot;polite&quot;</code>:
            ao trocar de mês (botões, selects ou teclado), o leitor de tela fala o novo mês e ano.
          </li>
          <li>
            <strong>Foco:</strong> ao abrir, vai para o dia escolhido, senão hoje (ou o mais próximo
            dentro do mínimo e máximo). Esc fecha, devolve o foco ao botão e{' '}
            <strong>não fecha um Modal em volta</strong>. Clicar fora fecha sem mover o foco. Tab
            circula dentro do calendário.
          </li>
          <li>
            <strong>Validação e erro:</strong> inválida, fora do intervalo ou bloqueada:{' '}
            <code>aria-invalid</code> mais a mensagem de validade (e o hidden vazio). A mensagem é
            anunciada pelo status; mantenha também o <code>.eds-error</code> visível no Field.
          </li>
          <li>
            <strong>Reduzir movimento e alto contraste:</strong> sem animação com{' '}
            <code>prefers-reduced-motion</code>; em alto contraste, escolhido, hoje, foco e
            indisponível se distinguem sem cor.
          </li>
        </ul>
        <ClassTable
          caption="Teclado no calendário"
          headers={['Tecla', 'Efeito']}
          rows={[
            { name: 'Alt + ↓ (no campo)', effect: 'Abre o calendário.' },
            { name: '← / →', effect: 'Dia anterior / seguinte.' },
            { name: '↑ / ↓', effect: 'Mesmo dia da semana anterior / seguinte.' },
            { name: 'Home / End', effect: 'Domingo / sábado da semana.' },
            { name: 'PageUp / PageDown', effect: 'Mês anterior / seguinte.' },
            {
              name: 'Shift + PageUp / PageDown',
              effect: 'Ano anterior / seguinte (29/02 vira 28/02 se o ano não for bissexto).',
            },
            {
              name: 'Enter / Espaço',
              effect: 'Escolhe o dia e fecha. Num dia indisponível, avisa e não escolhe.',
            },
            { name: 'Esc', effect: 'Fecha sem mudar a data e devolve o foco ao botão.' },
            {
              name: 'Tab / Shift + Tab',
              effect: 'Circula: mês anterior, selects, grade, Hoje, Fechar.',
            },
          ]}
        />
      </Section>
    </>
  );
}
