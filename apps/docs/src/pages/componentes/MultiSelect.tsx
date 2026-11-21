import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Limite from '../../examples/multi-select/limite';
import limiteHtml from '../../examples/multi-select/limite.html?raw';
import limiteSource from '../../examples/multi-select/limite.tsx?raw';
import Local from '../../examples/multi-select/local';
import localHtml from '../../examples/multi-select/local.html?raw';
import localSource from '../../examples/multi-select/local.tsx?raw';
import Obrigatorio from '../../examples/multi-select/obrigatorio';
import obrigatorioHtml from '../../examples/multi-select/obrigatorio.html?raw';
import obrigatorioSource from '../../examples/multi-select/obrigatorio.tsx?raw';
import Remoto from '../../examples/multi-select/remoto';
import remotoHtml from '../../examples/multi-select/remoto.html?raw';
import remotoSource from '../../examples/multi-select/remoto.tsx?raw';
import { toHref } from '../../router';

const hiddenHtml = `<!-- Um hidden por escolha, na ordem de escolha, dentro do .eds-combobox: -->
<input type="hidden" name="cidades[]" value="poa" />
<input type="hidden" name="cidades[]" value="pel" />`;

const phpCode = `<?php
// PHP: name="cidades[]" chega como lista.
$cidades = $_POST['cidades'] ?? [];   // ['poa', 'pel']`;

const javaCode = `// Java (Spring Boot): o mesmo campo vira uma lista.
@PostMapping("/atendimento")
public String salvar(@RequestParam(name = "cidades[]", required = false) List<String> cidades) {
    servico.atualizar(cidades == null ? List.of() : cidades);
    return "redirect:/atendimento";
}`;

const json = `[
  { "value": "101", "label": "Atelier Exemplo" },
  { "value": "104", "label": "Papelaria Aurora" }
]`;

const eventos = `document.addEventListener('eds:combobox-change', (event) => {
  // No múltiplo: arrays, na ordem de escolha
  const { values, labels } = event.detail;
  console.log(values, labels);   // ['poa', 'pel'], ['Porto Alegre', 'Pelotas']
});`;

export default function MultiSelectPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo para escolher <strong>várias</strong> opções de uma lista que filtra enquanto se
        digita. O que já foi escolhido aparece como etiquetas removíveis dentro do campo. É o{' '}
        <a href={toHref('/componentes/combobox')}>Combobox</a> com seleção múltipla.
      </p>

      <UseCases
        use={[
          'Para escolher várias opções entre muitas (dezenas ou milhares), onde digitar é mais rápido que rolar.',
          'Quando as opções vêm do servidor e não cabem todas no HTML: busca remota.',
        ]}
        avoid={[
          <>
            Para poucas opções (até uns sete itens): use{' '}
            <a href={toHref('/componentes/checkbox')}>Checkbox</a> em um{' '}
            <a href={toHref('/componentes/fieldset')}>Fieldset</a>, que dispensa JavaScript e mostra
            tudo de uma vez.
          </>,
          <>
            Para escolher uma opção só: use <a href={toHref('/componentes/combobox')}>Combobox</a>{' '}
            ou <a href={toHref('/componentes/select')}>Select</a>.
          </>,
          'Para texto livre com várias entradas (palavras-chave, e-mails): o MultiSelect só aceita opções da lista.',
        ]}
      />

      <Section title="Exemplos">
        <Alert variant="info" title="HTML: precisa do @efds-ui/behavior">
          <p>
            O teclado, o filtro, as etiquetas e os valores enviados são JavaScript: no HTML vêm do{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a>, que liga o{' '}
            <code>.eds-combobox</code> com <code>data-eds-multiple</code>. Os previews HTML abaixo
            estão ligados a ele; no React, o <code>MultiSelect</code> faz tudo sozinho.
          </p>
        </Alert>
        <Example
          title="Lista local"
          description={
            <>
              Digite (&quot;po&quot;, &quot;pas&quot;) ou use as setas. Enter ou clique{' '}
              <strong>alterna</strong> a opção e a lista continua aberta; Backspace com o campo
              vazio remove a última etiqueta. O valor de cada escolha vai em um{' '}
              <code>input[type=hidden]</code> com <code>name=&quot;cidades[]&quot;</code>.
            </>
          }
          html={localHtml}
          react={{ Component: Local, source: localSource }}
        />
        <p>No servidor, cada escolha chega como um item da lista:</p>
        <CodeBlock code={hiddenHtml} label="Código HTML: os valores enviados" />
        <CodeBlock code={phpCode} label="Código PHP: receber cidades[]" />
        <CodeBlock code={javaCode} label="Código Java: receber cidades[]" />
        <Example
          title="Limite de escolhas"
          description="Com data-eds-max-selected (HTML) ou maxSelected (React), ao chegar no limite as demais opções ficam indisponíveis e o status avisa. Remover uma etiqueta libera as opções."
          html={limiteHtml}
          react={{ Component: Limite, source: limiteSource }}
        />
        <Example
          title="Obrigatório"
          description={
            <>
              Com <code>aria-required=&quot;true&quot;</code> (HTML) ou <code>required</code>{' '}
              (React), enviar sem escolha é bloqueado com &quot;Escolha ao menos uma opção.&quot;. O
              campo de texto nunca tem o <code>required</code> nativo: a validade vem das etiquetas,
              não do texto digitado. Clique em Salvar sem escolher nada.
            </>
          }
          html={obrigatorioHtml}
          react={{ Component: Obrigatorio, source: obrigatorioSource }}
        />
      </Section>

      <Section title="Fonte remota">
        <p>
          Igual ao <a href={toHref('/componentes/combobox')}>Combobox</a>: aponte o{' '}
          <code>.eds-combobox</code> para um endereço com <code>data-eds-source</code> e o popup
          nasce vazio. A resposta é a mesma lista JSON (<code>value</code> e <code>label</code>). As
          escolhas já feitas <strong>continuam como etiquetas</strong> mesmo quando a próxima busca
          não as devolve.
        </p>
        <CodeBlock code={json} label="Código JSON: resposta da busca remota" />
        <CodeBlock code={remotoHtml} label="Código HTML: fonte remota" />
        <p>
          Ao <strong>editar</strong> um cadastro, o servidor renderiza os hidden já escolhidos; sem
          opção na lista, o rótulo da etiqueta vem de uma etiqueta existente ou do próprio valor. No
          React, passe os rótulos em <code>selectedLabels</code>.
        </p>
        <Example
          title="Busca remota (React)"
          description="No React, você busca: onInputChange recebe o texto, loading mostra o carregamento e filter={false} desliga o filtro local. Aqui a busca é simulada com uma base fictícia (Pa, Ate, Com…). Não há preview HTML da fonte remota porque este site não tem servidor."
          react={{ Component: Remoto, source: remotoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>MultiSelect</code> aceita os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>type</code>, <code>role</code> e <code>list</code>), repassa <code>ref</code> (para
          o campo de texto) e mescla <code>className</code>. Dentro de um <code>Field</code>,{' '}
          <code>id</code>, rótulo e descrições vêm dele. É controlado (<code>value</code> e{' '}
          <code>onChange</code>) ou não (<code>defaultValue</code>).
        </p>
        <PropsTable
          caption="Props de MultiSelect"
          rows={[
            {
              name: 'options',
              type: '{ value: string; label: string; disabled?: boolean }[]',
              required: true,
              description: 'Opções. Já filtradas pelo consumidor, se filter={false}.',
            },
            {
              name: 'value / defaultValue',
              type: 'string[]',
              description: 'Valores escolhidos (controlado) ou iniciais, na ordem de escolha.',
            },
            {
              name: 'onChange',
              type: '(values: string[], options: ComboboxOption[]) => void',
              description: 'Escolha ou remoção: os valores e as opções, na ordem de escolha.',
            },
            {
              name: 'onInputChange',
              type: '(text: string) => void',
              description: 'Texto digitado mudou: use para buscar no servidor.',
            },
            {
              name: 'filter',
              type: 'boolean | (option, text) => boolean',
              default: 'true',
              description: (
                <>
                  Filtro local &quot;contém&quot;, sem acento nem caixa. <code>false</code> quando o
                  consumidor já filtra.
                </>
              ),
            },
            {
              name: 'loading / error',
              type: 'boolean / ReactNode',
              description: (
                <>
                  Carregamento (com <code>aria-busy</code> no popup) e mensagem de falha da busca.
                </>
              ),
            },
            {
              name: 'maxSelected',
              type: 'number',
              description: 'Limite de escolhas; as demais opções ficam aria-disabled.',
            },
            {
              name: 'selectedLabels',
              type: 'Record<string, string>',
              description:
                'Rótulos de valores controlados cuja opção ainda não está em options (edição com busca remota).',
            },
            {
              name: 'name',
              type: 'string',
              description: (
                <>
                  Nome dos <code>input[type=hidden]</code>, um por escolha. Use{' '}
                  <code>cidades[]</code> se o servidor espera lista.
                </>
              ),
            },
            {
              name: 'required',
              type: 'boolean',
              description: (
                <>
                  <code>aria-required</code> e validade nativa enquanto não houver escolha. Dentro
                  de um Field, o <code>required</code> dele vale.
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
              name: 'texts',
              type: 'Partial<MultiSelectTexts>',
              description: (
                <>
                  Textos internos, para outro idioma: <code>empty</code>, <code>loading</code>,{' '}
                  <code>list</code> (nome da lista de opções), <code>tags</code> (nome da lista de
                  etiquetas), <code>remove(label)</code> (botão de remover), <code>status</code>,{' '}
                  <code>loadingStatus</code>, <code>selected</code>, <code>removed</code>,{' '}
                  <code>max</code> e <code>required</code> (mensagem de validade).
                </>
              ),
            },
            {
              name: 'readOnly',
              type: 'boolean',
              description:
                'Somente leitura: a lista não abre e as escolhas não mudam (o remover das etiquetas fica desabilitado); o campo segue focável e lido.',
            },
          ]}
        />
      </Section>

      <Section title="Atributos e eventos (HTML)">
        <ClassTable
          caption="Atributos data-eds-* do MultiSelect"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-multiple',
              effect: (
                <>
                  No <code>.eds-combobox</code>: liga o modo múltiplo.
                </>
              ),
            },
            {
              name: 'data-eds-name',
              effect: (
                <>
                  Nome dos hidden gerados (ganha <code>[]</code> se faltar). Sem ele, vale o{' '}
                  <code>name</code> do hidden inicial.
                </>
              ),
            },
            {
              name: 'data-eds-max-selected',
              effect: 'Limite de escolhas.',
            },
            {
              name: 'data-eds-source / data-eds-min-chars',
              effect: 'Busca remota, como no Combobox.',
            },
          ]}
        />
        <p>
          O <code>.eds-combobox</code> dispara <code>eds:combobox-change</code> a cada escolha ou
          remoção. No modo múltiplo o <code>detail</code> traz <code>values</code> e{' '}
          <code>labels</code> (arrays). <code>input</code> e <code>change</code> também sobem do{' '}
          <code>.eds-combobox</code>.
        </p>
        <CodeBlock code={eventos} label="Código JavaScript: evento do MultiSelect" />
      </Section>

      <Section title="Classes CSS">
        <p>
          O MultiSelect reaproveita o popup, a lista e as opções do{' '}
          <a href={toHref('/componentes/combobox')}>Combobox</a>. Acrescenta:
        </p>
        <ClassTable
          caption="Classes e atributos de MultiSelect"
          rows={[
            {
              name: '.eds-combobox-multiple',
              effect: 'No .eds-combobox: modo múltiplo. Com -sm e -lg para os tamanhos.',
            },
            {
              name: '.eds-combobox-control',
              effect:
                'A caixa do campo (borda, raio e anel de foco do Input): cresce em altura quando as etiquetas quebram de linha. aria-invalid do input interno é refletido.',
            },
            { name: '.eds-combobox-tags', effect: 'A lista de etiquetas (hidden sem escolhas).' },
            {
              name: '.eds-combobox-tag',
              effect: 'Etiqueta: fundo sutil, raio pequeno, nome com reticências quando longo.',
            },
            {
              name: '.eds-combobox-tag-remove',
              effect: 'Botão quadrado com o ícone de remover; foco visível.',
            },
            {
              name: '.eds-combobox-input',
              effect: 'O texto digitado: sem borda, ocupa o espaço que sobra.',
            },
            {
              name: '[aria-multiselectable="true"] [aria-selected="true"]',
              effect: 'Na lista: opção escolhida, com caixa de seleção marcada à esquerda.',
            },
            {
              name: '[data-active]',
              effect:
                'Opção destacada pelo teclado ou ponteiro (no múltiplo, aria-selected é a escolha).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Padrão:</strong> combobox com lista, igual ao Combobox, com{' '}
            <code>aria-multiselectable=&quot;true&quot;</code> na lista. O foco nunca sai do campo
            de texto; o destaque é apontado por <code>aria-activedescendant</code>. Cada opção diz
            se está escolhida por <code>aria-selected</code>, e a caixa de seleção do visual não
            depende de cor.
          </li>
          <li>
            <strong>Teclado:</strong> digitar filtra e abre; ↓/↑ movem o destaque; Enter alterna a
            opção e a lista continua aberta (o texto digitado é limpo); Backspace com o campo vazio
            remove a última etiqueta; Esc fecha e, fechado, limpa só o texto (nunca as etiquetas);
            Tab sai.
          </li>
          <li>
            <strong>Etiquetas:</strong> cada uma tem um botão &quot;Remover Pelotas&quot; na ordem
            de Tab, antes do campo. Depois de remover, o foco vai ao botão que ocupa a mesma
            posição, senão ao campo.
          </li>
          <li>
            <strong>Anúncio:</strong> uma região <code>role=&quot;status&quot;</code> diz
            &quot;Pelotas: selecionado. 3 itens selecionados.&quot; ou &quot;Pelotas: removido. 2
            itens selecionados.&quot; (texto sem gênero), além do número de resultados e do limite
            de escolhas.
          </li>
          <li>
            <strong>Obrigatório e erro:</strong> <code>aria-required</code> no campo, mensagem de
            validade &quot;Escolha ao menos uma opção.&quot; e, no erro, <code>aria-invalid</code>{' '}
            com a mensagem em <code>aria-describedby</code>.
          </li>
          <li>
            <strong>Esc dentro de um Modal:</strong> fecha só a lista (ou limpa o texto), sem fechar
            o diálogo.
          </li>
        </ul>
      </Section>
    </>
  );
}
