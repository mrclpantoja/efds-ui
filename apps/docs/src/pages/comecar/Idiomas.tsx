import { useMemo, useState } from 'react';
import { defaultMessages } from '@efds-ui/behavior';
import {
  Alert,
  Field,
  Input,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

const html = `<script src="eds-behavior.js" data-eds-manual defer></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    EDS.configure({
      locale: 'en-US', // nomes de mês e dia, ordem de texto, datas e números da exportação
      messages: {
        dateChoose: 'Choose date',
        datePrevMonth: 'Previous month',
        dateNextMonth: 'Next month',
        dateToday: 'Today',
        commandTitle: 'Command palette',
        // ...só as chaves que você quer trocar
      },
    });
    EDS.init();
  });
</script>`;

const react = `import { LocaleProvider, DatePicker, CommandPalette } from '@efds-ui/react';

<LocaleProvider locale="en-US">
  {/* nomes de mês e dia, ordem de texto e exportação */}
  <DatePicker
    aria-label="Due date"
    texts={{ toggle: 'Choose date', previousMonth: 'Previous month' }}
  />
  <CommandPalette items={items} texts={{ title: 'Command palette', search: 'Search' }} />
</LocaleProvider>`;

export default function Idiomas() {
  const [query, setQuery] = useState('');
  const entries = useMemo(
    () =>
      Object.entries(defaultMessages)
        .filter(([key, text]) => {
          const q = query.trim().toLowerCase();
          return q === '' || key.toLowerCase().includes(q) || text.toLowerCase().includes(q);
        })
        .sort(([a], [b]) => a.localeCompare(b)),
    [query],
  );
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Os textos padrão estão em português do Brasil. O locale cuida das datas, dos números e da
        ordenação; os textos você troca por chave (HTML) ou por <code>texts</code> (React).
      </p>

      <Section title="O que foi decidido">
        <Alert tone="info" title="Sem pacotes de idioma por enquanto">
          <p>
            O pacote não traz mensagens em inglês ou espanhol. São mais de duzentas chaves no{' '}
            <code>@efds-ui/behavior</code> e outros textos espalhados pelos componentes React;
            entregar traduções sem revisão de falante nativo, num produto para órgãos públicos,
            seria pior do que não entregar. Em vez disso, esta página lista todas as chaves para
            você traduzir, e <code>defaultMessages</code> é exportado para servir de modelo. O que
            já segue o locale: nomes de mês e de dia (Date Picker, Agenda), ordem de texto da Table,
            datas e números da exportação e o <code>/Lang</code> do PDF. Pacotes opcionais{' '}
            <code>locales/en</code> e <code>locales/es</code> poderão entrar depois sem inflar o
            bundle principal (seriam entradas separadas).
          </p>
        </Alert>
      </Section>

      <Section title="HTML puro">
        <p>
          <code>
            EDS.configure({'{'} locale, messages {'}'})
          </code>{' '}
          pode ser chamado antes ou depois de <code>init</code>; as chaves não informadas continuam
          em português. O PageLoader também aceita <code>data-eds-loader-title</code> e{' '}
          <code>-text</code> na tag do script (veja{' '}
          <a href={toHref('/comecar/comportamento')}>Comportamento</a>).
        </p>
        <CodeBlock code={html} label="Código HTML: configurar locale e textos" />
      </Section>

      <Section title="React">
        <p>
          O <code>LocaleProvider</code> troca o locale da subárvore. Os textos de cada componente
          ficam na prop <code>texts</code> (parcial: o que não vier mantém o padrão). Cada página de
          componente lista as chaves da sua prop; textos que levam número ou nome são funções (
          <code>more: (count) =&gt; ...</code>).
        </p>
        <CodeBlock code={react} label="Código React: LocaleProvider e texts" />
      </Section>

      <Section title="Chaves do @efds-ui/behavior">
        <p>
          Valores com <code>{'{chave}'}</code> recebem o dado no lugar. O padrão é pt-BR.
        </p>
        <p>
          As chaves seguem três regras. O prefixo é o do componente (<code>combobox*</code>,{' '}
          <code>daterange*</code>, <code>table*</code>, <code>filterBar*</code>). O plural é sempre{' '}
          <code>&lt;base&gt;One</code> e <code>&lt;base&gt;Many</code>, com{' '}
          <code>&lt;base&gt;None</code> quando há texto para zero (<code>tableSelectedNone</code>,{' '}
          <code>tableSelectedOne</code>, <code>tableSelectedMany</code>). E o sufixo{' '}
          <code>Label</code> é sempre um nome acessível (lido por leitor de tela), não um texto
          visível.
        </p>
        <Field
          label="Filtrar chaves"
          helper={`${entries.length} de ${Object.keys(defaultMessages).length} chaves.`}
        >
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        {/* O ajudante do campo muda a cada tecla mas não é região viva: o resultado é anunciado aqui. */}
        <span role="status" className="eds-visually-hidden">
          {query.trim() === ''
            ? ''
            : entries.length === 0
              ? 'Nenhuma chave encontrada.'
              : `${entries.length} de ${Object.keys(defaultMessages).length} chaves.`}
        </span>
        <Table caption="Chaves de Messages e o texto padrão">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Chave</TableHeaderCell>
              <TableHeaderCell>Texto padrão (pt-BR)</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 ? (
              <TableEmpty colSpan={2}>Nenhuma chave encontrada.</TableEmpty>
            ) : null}
            {entries.map(([key, text]) => (
              <TableRow key={key}>
                <TableHeaderCell scope="row">
                  <code>{key}</code>
                </TableHeaderCell>
                <TableCell className="eds-table-wrap-text">{text}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </>
  );
}
