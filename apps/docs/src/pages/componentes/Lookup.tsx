import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/lookup/basico';
import basicoHtml from '../../examples/lookup/basico.html?raw';
import basicoSource from '../../examples/lookup/basico.tsx?raw';
import Cadastrar from '../../examples/lookup/cadastrar';
import cadastrarHtml from '../../examples/lookup/cadastrar.html?raw';
import cadastrarSource from '../../examples/lookup/cadastrar.tsx?raw';
import Estados from '../../examples/lookup/estados';
import estadosHtml from '../../examples/lookup/estados.html?raw';
import estadosSource from '../../examples/lookup/estados.tsx?raw';

export default function LookupPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de código com a descrição ao lado e a busca num modal. Quem conhece o código digita e
        confere a descrição; quem não conhece abre a busca e escolhe numa tabela. É o padrão de
        sistemas de gestão para escolher cliente, produto, unidade ou conta.
      </p>

      <UseCases
        use={[
          'Para escolher um registro de uma lista grande, em que o código é conhecido ou a busca precisa de mais de uma coluna.',
          'Quando a descrição precisa estar visível depois da escolha (para conferir o que foi selecionado).',
        ]}
        avoid={[
          'Para listas curtas (até uns 15 itens): use o Select.',
          'Para escolher pelo nome sem código nem descrição a conferir depois: use o Combobox.',
        ]}
      />

      <p className="docs-muted">
        O diálogo de busca usa o tamanho grande do Modal (<code>.eds-modal-lg</code>) e, abaixo de
        768px de viewport, ocupa a tela inteira (<code>.eds-modal:has(.eds-lookup-results)</code>,
        com a aparência de <code>.eds-modal-full</code>); a tabela de resultados não rola na
        horizontal, e as colunas secundárias saem com <code>.eds-table-hide-narrow</code>.
      </p>

      <Section title="Exemplos">
        <Example
          title="Cliente, com autocompletar e busca em modal"
          description="Digite parte do código ou do nome (aur, 11) e escolha na lista com as setas e Enter; o botão abre a busca avançada no modal. Digitar o código e sair do campo também resolve a descrição. As consultas desta página vão a um serviço fictício local; no seu sistema, data-eds-source aponta para a sua API."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Cadastrar novo"
          description="Sem resultado, a lista termina em “Cadastrar novo…”; escolher dispara eds:lookup-create (React: onCreate) com o texto digitado. O app abre o seu cadastro e devolve o resultado. Digite zzz: na aba React o exemplo mostra o cadastro; na aba HTML só o evento é disparado (não há cadastro de exemplo)."
          html={cadastrarHtml}
          react={{ Component: Cadastrar, source: cadastrarSource }}
        />
        <Example
          title="Estados: resolvido e inexistente"
          description="Código inexistente mostra o erro visível, ligado ao campo por aria-describedby, e a descrição volta ao traço."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="HTML puro">
        <p>
          O <code>@efds-ui/behavior</code> liga <code>[data-eds-lookup]</code>. Nenhuma consulta é
          feita sem a fonte que você configurar; o diálogo de busca é criado sozinho (ou use o seu,
          com <code>[data-eds-lookup-search]</code> e <code>tbody[data-eds-lookup-results]</code>).
        </p>
        <ClassTable
          caption="Atributos e eventos"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-source="/api/clientes?q="',
              effect:
                'URL da busca; o texto digitado (codificado) é acrescentado, ou entra no lugar de {q}. Resposta: JSON [{ code, description }] ou { items: [...] }.',
            },
            {
              name: 'data-eds-lookup-resolve="/api/cliente?codigo="',
              effect:
                'URL de um código (ou {code}); 404 = não existe. Sem ela, a busca da fonte é usada e vale o código exato.',
            },
            {
              name: 'script[type="application/json"][data-eds-lookup-items]',
              effect:
                'Dentro do .eds-lookup: lista local em JSON, [{ "code", "description" }] (sem rede).',
            },
            {
              name: 'data-eds-lookup-dialog',
              effect:
                'Id de um <dialog> seu (com [data-eds-lookup-search] e tbody[data-eds-lookup-results]).',
            },
            {
              name: 'data-eds-lookup-title',
              effect: 'Título do diálogo (padrão: o nome do botão).',
            },
            {
              name: 'data-eds-lookup-columns=\'[{"key":"cidade","label":"Cidade"}]\'',
              effect:
                'Colunas da tabela (padrão: código e descrição). "hideNarrow": true esconde a coluna quando a tabela do diálogo fica estreita (ver .eds-table-hide-narrow).',
            },
            {
              name: 'data-eds-lookup-autocomplete="false"',
              effect:
                'Desliga o autocompletar no campo (ligado quando há lista local ou fonte). A lista busca por código ou nome, no padrão combobox, com a mesma fonte do diálogo.',
            },
            {
              name: 'data-eds-lookup-create="Cadastrar novo…"',
              effect:
                'Liga a opção final de cadastro quando nada é encontrado (texto vazio usa o padrão). data-eds-lookup-create-always a mostra também com resultados.',
            },
            {
              name: 'data-eds-min-chars',
              effect: 'Mínimo de caracteres para buscar no autocompletar (padrão 1).',
            },
            {
              name: 'eds:lookup-create',
              effect:
                'Evento cancelável ao escolher “Cadastrar novo…”: detail { text }. O app abre o cadastro e devolve o resultado com EDS.lookup(el).setValue({ code, description }) (também clear() e getValue()).',
            },
            {
              name: 'eds:lookup-change',
              effect:
                'Ao resolver ou escolher: detail { code, description, item }; item é null quando o código não existe ou foi apagado.',
            },
          ]}
        />
      </Section>

      <Section title="Campo obrigatório">
        <p>
          Com <code>required</code>, o aviso de campo obrigatório que o formulário mostra ao recusar
          o envio some assim que o campo fica válido: ao escolher pelo autocompletar ou pelo
          diálogo, ao confirmar um código digitado e por <code>EDS.lookup(el).setValue(...)</code>.
          Em React, escolher pela lista ou pelo diálogo avisa o <code>useFormValidation</code> (o
          erro de <code>errorOf</code> some sem digitar nada).
        </p>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Lookup"
          rows={[
            {
              name: 'search',
              type: '(query, signal) => Promise<LookupItem[]>',
              required: true,
              description: 'A busca do diálogo (e, sem resolve, a resolução por código exato).',
            },
            {
              name: 'resolve',
              type: '(code, signal) => Promise<LookupItem | null>',
              description: 'Descrição de um código; null = não existe.',
            },
            {
              name: 'value / defaultValue',
              type: 'string',
              description: 'Código controlado ou inicial.',
            },
            {
              name: 'onValueChange',
              type: '(code, item | null) => void',
              description: 'Depois de resolver ou escolher. Valor de fora não dispara.',
            },
            {
              name: 'columns',
              type: '{ key, label, hideNarrow? }[]',
              description:
                'Colunas do diálogo (padrão: código e descrição). hideNarrow esconde a coluna quando a tabela fica estreita (.eds-table-hide-narrow).',
            },
            {
              name: 'texts',
              type: 'Partial<LookupTexts>',
              description:
                'Textos (pt-BR). open é o nome do botão de busca (ex.: “Buscar cliente”) e title, o título do diálogo.',
            },
            { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Tamanho.' },
            {
              name: 'autocomplete',
              type: 'boolean',
              default: 'true',
              description:
                'Autocompletar por código ou nome no campo (role combobox), com a mesma search do diálogo.',
            },
            {
              name: 'onCreate / createAlways',
              type: '(text: string) => void / boolean',
              description:
                'onCreate liga a opção final “Cadastrar novo…” (texts.create) e recebe o texto digitado; createAlways a mostra também com resultados. Devolva o cadastro em value/onValueChange.',
            },
            {
              name: 'texts',
              type: 'Partial<LookupTexts>',
              description: 'Todos os textos internos (notFound, error, retry, loading, select...).',
            },
          ]}
        />
        <p>
          O componente nunca chama a rede: <code>search</code> e <code>resolve</code> são suas.
        </p>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Rótulo e botão:</strong> o campo tem o rótulo do <code>Field</code>; o botão de
            busca tem nome próprio (“Buscar cliente”).
          </li>
          <li>
            <strong>Descrição:</strong> é um{' '}
            <code>&lt;output aria-live=&quot;polite&quot;&gt;</code> ligado ao campo por{' '}
            <code>aria-describedby</code>; sem resultado mostra “—” e <code>data-empty</code>.
          </li>
          <li>
            <strong>Erro visível:</strong> <code>p.eds-error</code> + <code>aria-invalid</code>;
            nada só por cor.
          </li>
          <li>
            <strong>Modal:</strong> foco na busca ao abrir, contagem de resultados anunciada (“3
            resultados disponíveis.”), botão “Selecionar” com o código no nome e foco de volta ao
            campo ao escolher. Falha de rede mostra o erro com “Tentar de novo”.
          </li>
          <li>
            <strong>Autocompletar:</strong> padrão APG combobox com lista (
            <code>role=&quot;combobox&quot;</code>, <code>aria-activedescendant</code>, setas,
            Enter, Esc e Alt+↑); a contagem de resultados é anunciada depois de uma pausa na
            digitação. “Cadastrar novo…” é a última opção da lista, navegável como as demais.
          </li>
          <li>
            <strong>Enter no campo</strong> resolve o código em vez de enviar o formulário, enquanto
            o código digitado ainda não foi resolvido.
          </li>
        </ul>
        <Alert tone="info" title="Dados e LGPD">
          <p>
            Códigos e descrições vão à sua API: use HTTPS, limite o que a busca devolve ao
            necessário e não coloque dados pessoais em exemplos ou logs.
          </p>
        </Alert>
      </Section>
    </>
  );
}
