import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Erro from '../../examples/fieldset/erro';
import erroHtml from '../../examples/fieldset/erro.html?raw';
import erroSource from '../../examples/fieldset/erro.tsx?raw';
import Notificacoes from '../../examples/fieldset/notificacoes';
import notificacoesHtml from '../../examples/fieldset/notificacoes.html?raw';
import notificacoesSource from '../../examples/fieldset/notificacoes.tsx?raw';

export default function FieldsetPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Agrupa controles relacionados (Checkbox, Radio, Switch) sob uma legenda, com ajuda e erro do
        grupo. É o <code>fieldset</code> nativo, com a legenda como nome do grupo.
      </p>

      <UseCases
        use={[
          'Para um conjunto de Checkbox ou Switch que respondem à mesma pergunta.',
          'Para um grupo de rádios (com RadioGroup, que já usa o Fieldset).',
          'Para um erro ou uma ajuda que vale para o grupo inteiro.',
        ]}
        avoid={[
          <>
            Para um único campo de texto ou Select: use <a href="/componentes/field">Field</a>.
          </>,
          'Para dividir um formulário longo em seções visuais: use títulos e Cards.',
          'Para um Checkbox isolado (um aceite): o próprio rótulo basta.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Grupo de opções"
          description="A legenda nomeia o grupo; a ajuda descreve o fieldset."
          html={notificacoesHtml}
          react={{ Component: Notificacoes, source: notificacoesSource }}
        />
        <Example
          title="Erro do grupo"
          description="O erro descreve o controle, não o fieldset, para não ser lido duas vezes."
          html={erroHtml}
          react={{ Component: Erro, source: erroSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Fieldset</code> aceita os atributos nativos de <code>fieldset</code> (como{' '}
          <code>disabled</code>), repassa <code>ref</code> e mescla <code>className</code>. Os
          controles filhos recebem <code>aria-invalid</code> e a descrição do erro. Para rádios, use{' '}
          <a href="/componentes/radio">RadioGroup</a>.
        </p>
        <PropsTable
          caption="Props de Fieldset"
          rows={[
            {
              name: 'legend',
              type: 'ReactNode',
              required: true,
              description: 'Título do grupo (legend).',
            },
            {
              name: 'helper',
              type: 'ReactNode',
              description: 'Ajuda do grupo: descreve o fieldset (aria-describedby).',
            },
            {
              name: 'error',
              type: 'ReactNode',
              description: (
                <>
                  Erro do grupo: cada controle filho recebe{' '}
                  <code>aria-invalid=&quot;true&quot;</code> e a descrição.
                </>
              ),
            },
            {
              name: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Checkbox, Switch ou outros controles do grupo.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Fieldset"
          rows={[
            {
              name: '.eds-fieldset',
              effect: 'Coluna sem borda nem margem, com espaçamento pequeno entre os itens.',
            },
            { name: '.eds-legend', effect: 'Legenda: tamanho label, peso medium.' },
            {
              name: '.eds-legend[data-required]',
              effect: 'Asterisco vermelho. É só visual: exige required nos controles.',
            },
            {
              name: '.eds-check',
              effect: 'Rótulo clicável de Checkbox, Radio e Switch (alvo mínimo de 24px).',
            },
            {
              name: '.eds-helper / .eds-error',
              effect: 'Ajuda e erro do grupo, com ícone no erro.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Nome do grupo:</strong> o leitor de tela anuncia a legenda ao entrar no grupo,
              dando contexto a cada opção (&quot;Notificações, E-mail, caixa de seleção&quot;).
            </li>
            <li>
              <strong>Erro sem leitura dupla:</strong> a descrição do erro vai nos controles, e a
              ajuda vai no fieldset.
            </li>
            <li>
              <strong>Obrigatório:</strong> o asterisco da legenda é visual; o grupo de rádios
              precisa de <code>required</code> em cada rádio (o RadioGroup faz isso).
            </li>
            <li>
              <strong>Desabilitar o grupo:</strong> <code>disabled</code> no Fieldset desabilita
              todos os controles do grupo, que saem da ordem de Tab.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> legendas curtas e específicas, e um erro
              que diga o que fazer.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
