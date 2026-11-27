import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import Basico from '../../examples/format/basico';
import basicoHtml from '../../examples/format/basico.html?raw';
import basicoSource from '../../examples/format/basico.tsx?raw';

export default function FormatadoresPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Funções puras para exibir moeda, número, data, tempo relativo, CPF, CNPJ, telefone e CEP no
        padrão brasileiro. No HTML, o atributo <code>data-eds-format</code> aplica a mesma função;
        no React, as funções são exportadas por <code>@efds-ui/react</code> (sem componente). A
        entrada de dados com máscara está em{' '}
        <a href={toHref('/comecar/mascara')}>Máscara de entrada</a>.
      </p>

      <Section title="Exemplo">
        <Example
          title="Formatadores"
          description="O texto interno do HTML é o fallback (sem JS ou se o valor não for reconhecido). Datas só com dia são locais, sem deslocar por fuso. O CPF aparece sempre mascarado (***.456.789-**); valores fictícios."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="Funções">
        <ClassTable
          caption="@efds-ui/behavior/format (e @efds-ui/react)"
          headers={['Função', 'Resultado']}
          rows={[
            {
              name: 'formatCurrency(1280.5, { currency, decimals, locale })',
              effect: 'R$ 1.280,50 (padrão BRL).',
            },
            { name: 'formatNumber(1234567.891, { decimals, locale })', effect: '1.234.567,891.' },
            {
              name: 'formatDate(valor, { style: "short" | "medium" | "long", locale })',
              effect: '15/03/2026; "long": 15 de março de 2026.',
            },
            { name: 'formatDateTime(valor, { style, locale })', effect: '15/03/2026 14:05.' },
            {
              name: 'formatRelative(valor, { now, locale })',
              effect: 'há 5 minutos, em 3 dias, ontem.',
            },
            {
              name: 'formatCpf / formatCnpj / formatCpfCnpj',
              effect:
                '123.456.789-00; 12.345.678/0001-90 (aceita o CNPJ alfanumérico). Sem o tamanho certo, devolve o texto como veio.',
            },
            {
              name: 'formatPhone / formatCep',
              effect: '(11) 98765-4321 (ignora o 55); 90010-100.',
            },
            {
              name: 'maskCpf(valor)',
              effect: '***.456.789-** (LGPD). Sem 11 dígitos devolve "", nunca o original.',
            },
            {
              name: 'parseNumber(texto) / parseDate(texto)',
              effect:
                'Número ("1.280,50") e timestamp ("31/12/2025" ou ISO) a partir do texto; null se não reconhece.',
            },
          ]}
        />
        <p>
          Valor ausente ou irreconhecível vira <code>&quot;&quot;</code>, nunca “NaN” nem “Invalid
          Date”. Todas aceitam <code>locale</code> (BCP 47); o padrão é o do <code>configure</code>.
        </p>
      </Section>

      <Section title="HTML puro">
        <ClassTable
          caption="data-eds-format (compilação completa, eds-behavior.js)"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-format="currency|number|date|datetime|relative|cpf|cnpj|cpf-cnpj|phone|cep|cpf-mask"',
              effect:
                'Formata o data-value (ou o texto do elemento) no init. Em <time>, preenche datetime.',
            },
            {
              name: 'data-eds-format-currency / -decimals / -style / -locale',
              effect: 'Opções da função correspondente.',
            },
          ]}
        />
        <p>
          Sem o behavior, use as funções direto:{' '}
          <code>import &#123; formatCurrency &#125; from &quot;@efds-ui/behavior/format&quot;</code>
          . Para colunas de números, a classe <code>.eds-text-tabular</code> alinha os algarismos.
        </p>
      </Section>

      <Section title="Cuidados">
        <Alert tone="warning" title="LGPD">
          <p>
            Mostre CPF e telefone só quando necessário e prefira <code>maskCpf</code> em listas e
            relatórios. Documentação, testes e logs usam valores fictícios.
          </p>
        </Alert>
        <ul className="docs-list">
          <li>
            <strong>Tempo relativo</strong> é calculado uma vez; ofereça a data completa em{' '}
            <code>title</code> ou em <code>&lt;time datetime&gt;</code> para quem precisa dela.
          </li>
          <li>
            <strong>Formatar não valida:</strong> um CPF formatado não é um CPF válido.
          </li>
        </ul>
      </Section>
    </>
  );
}
