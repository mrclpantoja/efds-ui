import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/agenda/basico';
import basicoHtml from '../../examples/agenda/basico.html?raw';
import basicoSource from '../../examples/agenda/basico.tsx?raw';
import Dinamica from '../../examples/agenda/dinamica';
import dinamicaHtml from '../../examples/agenda/dinamica.html?raw';
import dinamicaSource from '../../examples/agenda/dinamica.tsx?raw';

export default function AgendaPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Agenda mensal: a grade de um mês com os eventos de cada dia. Navega por mês anterior,
        próximo e hoje; em contêiner estreito vira uma lista por dia.
      </p>

      <UseCases
        use={[
          'Para mostrar prazos, reuniões e vencimentos distribuídos pelo mês.',
          'Com eventos que levam a um registro (link) ou abrem um detalhe (botão).',
        ]}
        avoid={[
          'Para escolher uma data num formulário: use DatePicker.',
          'Para arrastar ou redimensionar eventos: está fora desta versão.',
        ]}
      />

      <Section title="Exemplo">
        <Example
          title="Mês com eventos"
          description="Eventos com hora, de dia inteiro e de vários dias. Com mais de três num dia, “+N mais” abre um Popover com todos. Hoje é marcado por aria-current e pelo texto “Hoje”."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Grade montada pelo JS"
          description="Os eventos vão num JSON (HTML) ou numa prop (React) e a grade do mês é gerada a cada troca. Tente o mês seguinte: há um evento em abril."
          html={dinamicaHtml}
          react={{ Component: Dinamica, source: dinamicaSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="@efds-ui/behavior">
          <p>
            Um <code>.eds-agenda</code> com <code>data-eds-agenda</code> e o mês em{' '}
            <code>data-eds-agenda-month=&quot;2026-03&quot;</code>. Há dois modos:
          </p>
          <ul className="docs-list">
            <li>
              <strong>JS monta a grade:</strong> eventos num{' '}
              <code>&lt;script type=&quot;application/json&quot; data-eds-agenda-events&gt;</code> (
              <code>
                [{'{'}id, title, date, end?, time?, href?, tone?{'}'}]
              </code>
              ) ou de{' '}
              <code>
                data-eds-source=&quot;/api/agenda?de={'{'}from{'}'}&amp;ate={'{'}to{'}'}&quot;
              </code>
              , consultado a cada mês. Os botões <code>[data-eds-agenda-prev|next|today]</code> são
              criados se faltarem. <code>data-eds-week-start</code> (0 = domingo) e{' '}
              <code>data-eds-max-events</code> (padrão 3) ajustam a grade; nomes de mês e dia seguem
              o locale.
            </li>
            <li>
              <strong>Servidor escreve a grade</strong> (como no exemplo HTML acima) e não há dados
              no cliente: o JS não a reescreve, só liga os botões e avisa a troca de mês.
            </li>
          </ul>
          <p>
            Eventos: <code>eds:agenda-month-change</code> (
            <code>
              detail {'{'} year, month, from, to {'}'}
            </code>
            , mês de 1 a 12) e <code>eds:agenda-event-click</code> (
            <code>
              detail {'{'} id, title, date, item {'}'}
            </code>
            ).
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Agenda"
          rows={[
            {
              name: 'events',
              type: 'AgendaEvent[]',
              description:
                'id, title, date (aaaa-mm-dd), end?, time?, href?, tone?. Só os do período visível aparecem.',
            },
            {
              name: 'month / defaultMonth',
              type: 'string (aaaa-mm)',
              description: 'Mês mostrado (controlado ou inicial). Padrão: o atual.',
            },
            {
              name: 'onMonthChange',
              type: '(month: string) => void',
              description: 'Mês anterior, próximo ou hoje. Busque os eventos do novo mês aqui.',
            },
            {
              name: 'onEventClick',
              type: '(event) => void',
              description: 'Clique num evento (link ou botão).',
            },
            {
              name: 'weekStart',
              type: '0 | 1 | … | 6',
              default: '0',
              description: 'Início da semana (0 = domingo).',
            },
            {
              name: 'maxEvents',
              type: 'number',
              default: '3',
              description: 'Eventos por dia antes do “+N mais”.',
            },
            {
              name: 'loading',
              type: 'boolean',
              default: 'false',
              description: 'aria-busy e grade esmaecida.',
            },
            {
              name: 'locale',
              type: 'string',
              description: 'Idioma dos nomes de mês e dia (padrão: o do LocaleProvider).',
            },
            {
              name: 'texts',
              type: '{ previous, next, today, todayMark, grid, more, moreLabel, moreTitle, allDay, empty }',
              description: 'Textos (pt-BR por padrão).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes da Agenda"
          rows={[
            { name: 'section.eds-agenda', effect: 'A agenda; [aria-busy] esmaece a grade.' },
            {
              name: '.eds-agenda-header / -title / -nav',
              effect: 'Cabeçalho, título (aria-live) e botões de navegação.',
            },
            { name: 'table.eds-agenda-grid', effect: 'A grade (caption oculta e th scope=col).' },
            {
              name: 'td.eds-agenda-day[aria-current][data-outside]',
              effect: 'Dia; hoje e dia de outro mês.',
            },
            {
              name: '.eds-agenda-day-head / -weekday / -date / -today',
              effect:
                'Cabeçalho do dia; o nome do dia e o “Hoje” só aparecem no contêiner estreito.',
            },
            {
              name: 'ul.eds-agenda-events > li > .eds-agenda-event[data-tone]',
              effect: 'Evento (a ou button); accent, neutral, info, success, warning, danger.',
            },
            { name: '.eds-agenda-event-time / -title', effect: 'Hora e título (truncado).' },
            {
              name: '.eds-agenda-more',
              effect: 'Botão “+N mais” (popovertarget para um .eds-popover).',
            },
            { name: '.eds-agenda-empty', effect: 'Mês sem eventos, em contêiner estreito.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Tabela de verdade:</strong> cabeçalhos de coluna com{' '}
            <code>scope=&quot;col&quot;</code> e legenda oculta (“Agenda de março de 2026”). Em
            contêiner estreito a tabela vira lista por dia; o nome do dia da semana fica visível em
            cada dia.
          </li>
          <li>
            <strong>Título:</strong> em <code>aria-live=&quot;polite&quot;</code>; trocar de mês
            anuncia o novo mês.
          </li>
          <li>
            <strong>Teclado:</strong> Tab percorre Hoje, anterior, próximo e os eventos; o “+N mais”
            abre o Popover (Esc fecha e o foco volta). O nome do botão traz a data por extenso.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> hoje tem texto e marca; eventos de dia inteiro dizem
            “dia inteiro” em texto oculto.
          </li>
        </ul>
      </Section>
    </>
  );
}
