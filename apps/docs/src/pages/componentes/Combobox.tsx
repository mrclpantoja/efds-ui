import { Alert, Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/combobox/basico';
import basicoHtml from '../../examples/combobox/basico.html?raw';
import basicoSource from '../../examples/combobox/basico.tsx?raw';
import Estados from '../../examples/combobox/estados';
import estadosHtml from '../../examples/combobox/estados.html?raw';
import estadosSource from '../../examples/combobox/estados.tsx?raw';
import Remoto from '../../examples/combobox/remoto';
import remotoHtml from '../../examples/combobox/remoto.html?raw';
import remotoSource from '../../examples/combobox/remoto.tsx?raw';
import { toHref } from '../../router';

const json = `[
  { "value": "101", "label": "Atelier Exemplo" },
  { "value": "104", "label": "Papelaria Aurora" },
  { "value": "105", "label": "Padaria Horizonte", "disabled": true }
]`;

const eventos = `document.addEventListener('eds:combobox-change', (event) => {
  // value: '' quando o usuário limpa a escolha
  const { value, label } = event.detail;
  console.log(value, label);
});`;

export default function ComboboxPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de texto com uma lista de sugestões que filtra enquanto se digita (autocomplete). O
        usuário escolhe uma opção da lista; o texto livre não é um valor. Segue o padrão{' '}
        <em>combobox com lista</em> do WAI-ARIA.
      </p>

      <UseCases
        use={[
          'Para escolher uma opção entre muitas (dezenas ou milhares), onde digitar é mais rápido que rolar.',
          'Quando as opções vêm do servidor e não cabem todas no HTML: busca remota.',
        ]}
        avoid={[
          <>
            Para poucas opções conhecidas: use <a href={toHref('/componentes/select')}>Select</a>{' '}
            (nativo, sem JavaScript) ou <a href={toHref('/componentes/radio')}>Radio</a>.
          </>,
          'Para texto livre com sugestões (e-mail, endereço): o Combobox exige uma opção da lista.',
          <>
            Para escolher várias opções: use{' '}
            <a href={toHref('/componentes/multi-select')}>MultiSelect</a> (este mesmo campo com
            etiquetas) ou, para poucas, Checkbox em um Fieldset.
          </>,
        ]}
      />

      <Section title="Exemplos">
        <Alert variant="info" title="HTML: precisa do @eds-ui/behavior">
          <p>
            O teclado, o filtro, o foco e o posicionamento do popup são JavaScript: no HTML vêm do{' '}
            <a href={toHref('/comecar/comportamento')}>@eds-ui/behavior</a>, que detecta o{' '}
            <code>.eds-combobox</code> pelo próprio markup. Os previews HTML abaixo estão ligados a
            ele; no React, o <code>Combobox</code> faz tudo sozinho.
          </p>
        </Alert>
        <Example
          title="Lista local"
          description={
            <>
              Digite (&quot;po&quot;, &quot;pas&quot;) para filtrar: &quot;contém&quot;, sem
              diferenciar maiúsculas nem acentos. Opções com <code>aria-disabled</code> são puladas
              pelas setas. O valor escolhido vai no <code>input[type=hidden]</code>.
            </>
          }
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Tamanhos, erro e desabilitado"
          description="Os tamanhos, o erro e o desabilitado são os do Input: .eds-input-sm/-lg e aria-invalid. O Field liga a mensagem de erro."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="Fonte remota">
        <p>
          Quando a lista é grande ou muda no servidor, o HTML não traz as opções: aponte o{' '}
          <code>.eds-combobox</code> para um endereço com <code>data-eds-source</code>. A cada
          digitação (com <em>debounce</em> de 300 ms) o <code>@eds-ui/behavior</code> faz um{' '}
          <code>GET</code> no endereço com o texto digitado, codificado, no fim:{' '}
          <code>/clientes/busca?q=pa</code>. A resposta é JSON:
        </p>
        <CodeBlock code={json} label="Código JSON: resposta da busca remota" />
        <ul className="docs-list">
          <li>
            <code>data-eds-min-chars</code>: mínimo de letras para buscar (padrão 2).
          </li>
          <li>
            A requisição anterior é abortada; enquanto espera, aparece{' '}
            <code>.eds-combobox-loading</code> e o popup recebe{' '}
            <code>aria-busy=&quot;true&quot;</code>. Falha de rede mostra &quot;Não foi possível
            carregar as opções.&quot; (texto configurável).
          </li>
          <li>
            A busca do Combobox <strong>não aciona o PageLoader</strong>: ela tem o próprio
            carregamento.
          </li>
        </ul>
        <CodeBlock code={remotoHtml} label="Código HTML: fonte remota" />
        <Example
          title="Busca remota (React)"
          description="No React, você busca: onInputChange recebe o texto, loading mostra o carregamento e filter={false} desliga o filtro local. Aqui a busca é simulada com uma base fictícia (Pa, Ate, Com…). Não há preview HTML da fonte remota porque este site não tem servidor."
          react={{ Component: Remoto, source: remotoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Combobox</code> aceita os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>type</code>, <code>role</code> e <code>list</code>), repassa <code>ref</code> (para
          o campo de texto) e mescla <code>className</code>. Dentro de um <code>Field</code>,{' '}
          <code>id</code>, rótulo e descrições vêm dele, como no Input. É controlado (
          <code>value</code> e <code>onChange</code>) ou não (<code>defaultValue</code>).
        </p>
        <PropsTable
          caption="Props de Combobox"
          rows={[
            {
              name: 'options',
              type: '{ value: string; label: string; disabled?: boolean }[]',
              required: true,
              description: 'Opções. Já filtradas pelo consumidor, se filter={false}.',
            },
            {
              name: 'value / defaultValue',
              type: 'string',
              description: (
                <>
                  Valor escolhido (controlado) ou inicial. <code>&apos;&apos;</code> = nenhum.
                </>
              ),
            },
            {
              name: 'onChange',
              type: '(value: string, option: ComboboxOption | null) => void',
              description: (
                <>
                  Escolha ou limpeza (<code>value === &apos;&apos;</code>).
                </>
              ),
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
                  consumidor já filtra; função para um filtro próprio.
                </>
              ),
            },
            {
              name: 'loading',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Mostra o carregamento e <code>aria-busy</code> no popup.
                </>
              ),
            },
            {
              name: 'emptyMessage / loadingMessage',
              type: 'ReactNode',
              default: "'Nenhum resultado' / 'Carregando…'",
              description: 'Textos da lista sem resultado e em busca.',
            },
            {
              name: 'listLabel',
              type: 'string',
              description: 'Nome acessível da lista. Padrão: o aria-label do campo.',
            },
            {
              name: 'statusMessage',
              type: '(count: number) => string',
              description: 'Texto anunciado (N resultados disponíveis). Troque para outro idioma.',
            },
            {
              name: 'name',
              type: 'string',
              description: (
                <>
                  Gera o <code>input[type=hidden]</code> com o valor escolhido, para enviar em um
                  formulário.
                </>
              ),
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho, igual ao do Input. O padrão não emite classe.',
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
          ]}
        />
      </Section>

      <Section title="Atributos e eventos (HTML)">
        <ClassTable
          caption="Atributos data-eds-* do Combobox"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-source',
              effect: (
                <>
                  No <code>.eds-combobox</code>: endereço da busca remota (o texto vai no fim).
                </>
              ),
            },
            {
              name: 'data-eds-min-chars',
              effect: 'No .eds-combobox: letras mínimas para buscar (padrão 2).',
            },
          ]}
        />
        <p>
          O <code>.eds-combobox</code> dispara <code>eds:combobox-change</code> ao escolher ou
          limpar. O <code>input[type=hidden]</code> também dispara <code>input</code> e{' '}
          <code>change</code>.
        </p>
        <CodeBlock code={eventos} label="Código JavaScript: evento do Combobox" />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Combobox"
          rows={[
            {
              name: '.eds-combobox',
              effect: 'Envolve o campo e o popup; desenha o chevron decorativo na ponta do campo.',
            },
            {
              name: '.eds-input (+ -sm / -lg)',
              effect: 'O campo de texto: tamanhos, erro e desabilitado vêm do Input.',
            },
            {
              name: '.eds-combobox-popup',
              effect:
                'Popover manual (top layer, escapa de overflow de Modal e Card), com a superfície do Dropdown. O JS posiciona por --_combobox-x, --_combobox-y e --_combobox-width.',
            },
            {
              name: '[data-placement="top"]',
              effect: 'No popup: abre para cima quando não cabe embaixo.',
            },
            {
              name: '.eds-combobox-listbox',
              effect: 'A lista (role=listbox); altura máxima de cerca de oito opções, com rolagem.',
            },
            {
              name: '.eds-combobox-option',
              effect: 'Opção de 40 px, como o item do Dropdown.',
            },
            {
              name: '[aria-selected="true"]',
              effect: 'Opção destacada (a do aria-activedescendant).',
            },
            { name: '[data-current]', effect: 'Opção do valor escolhido, com ícone de check.' },
            { name: '[aria-disabled="true"]', effect: 'Opção indisponível.' },
            {
              name: '.eds-combobox-empty / .eds-combobox-loading',
              effect:
                'Mensagens de sem resultado e de carregamento (hidden quando não se aplicam).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Padrão:</strong> combobox com lista e{' '}
              <code>aria-autocomplete=&quot;list&quot;</code>. O foco nunca sai do campo; a opção
              destacada é apontada por <code>aria-activedescendant</code> e{' '}
              <code>aria-selected</code>.
            </li>
            <li>
              <strong>Teclado:</strong> digitar filtra e abre; ↓ abre e avança; ↑ volta (sem dar a
              volta); Alt+↓ abre sem mover; Alt+↑ fecha; Enter escolhe a opção destacada, ou envia o
              formulário se estiver fechado; Esc fecha e, fechado, limpa o texto; Tab fecha sem
              escolher; Home e End movem o cursor no texto.
            </li>
            <li>
              <strong>Anúncio:</strong> uma região <code>role=&quot;status&quot;</code> montada
              vazia anuncia &quot;N resultados disponíveis.&quot; depois de uns 500 ms sem digitar.
              Navegar por setas não anuncia nada extra (o leitor já lê a opção).
            </li>
            <li>
              <strong>Ponteiro:</strong> o clique na opção não tira o foco do campo; perder o foco
              fecha o popup.
            </li>
            <li>
              <strong>Esc dentro de um Modal:</strong> fecha só o popup (ou limpa o texto), sem
              fechar o diálogo.
            </li>
            <li>
              <strong>Erro e rótulo:</strong> sempre com <code>label</code> associado; erro em{' '}
              <code>aria-invalid</code> com a mensagem em <code>aria-describedby</code>. A cor nunca
              é o único sinal.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
