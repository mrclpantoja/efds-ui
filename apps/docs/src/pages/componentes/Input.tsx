import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Estados from '../../examples/input/estados';
import estadosHtml from '../../examples/input/estados.html?raw';
import estadosSource from '../../examples/input/estados.tsx?raw';
import MascaraDocumentos from '../../examples/input/mascara-documentos';
import mascaraDocumentosHtml from '../../examples/input/mascara-documentos.html?raw';
import mascaraDocumentosSource from '../../examples/input/mascara-documentos.tsx?raw';
import MascaraMoeda from '../../examples/input/mascara-moeda';
import mascaraMoedaHtml from '../../examples/input/mascara-moeda.html?raw';
import mascaraMoedaSource from '../../examples/input/mascara-moeda.tsx?raw';
import MascaraPersonalizada from '../../examples/input/mascara-personalizada';
import mascaraPersonalizadaHtml from '../../examples/input/mascara-personalizada.html?raw';
import mascaraPersonalizadaSource from '../../examples/input/mascara-personalizada.tsx?raw';
import MascaraUnmask from '../../examples/input/mascara-unmask';
import mascaraUnmaskHtml from '../../examples/input/mascara-unmask.html?raw';
import mascaraUnmaskSource from '../../examples/input/mascara-unmask.tsx?raw';
import Tamanhos from '../../examples/input/tamanhos';
import tamanhosHtml from '../../examples/input/tamanhos.html?raw';
import tamanhosSource from '../../examples/input/tamanhos.tsx?raw';

export default function InputPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de uma linha para texto, e-mail, número, telefone e outros tipos nativos. É o{' '}
        <code>&lt;input&gt;</code> do navegador com a aparência do sistema; use sempre dentro de um
        Field.
      </p>

      <UseCases
        use={[
          'Para entradas curtas e livres: nome, e-mail, código, valor.',
          <>
            Com o <code>type</code> e o <code>inputmode</code> certos, para o teclado do celular
            ajudar.
          </>,
        ]}
        avoid={[
          <>
            Para texto longo ou de várias linhas: use <a href="/componentes/textarea">Textarea</a>.
          </>,
          <>
            Para escolher entre opções conhecidas: use <a href="/componentes/select">Select</a>,
            Radio ou Checkbox.
          </>,
          'Sem rótulo: o placeholder não substitui o label.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Tamanhos"
          description="sm, md (padrão, sem classe) e lg. A altura vem dos tokens de controle."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Erro, sucesso, somente leitura e desabilitado"
          description="Cada estado é um atributo nativo ou ARIA, nunca uma classe."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="Máscara">
        <p>
          A máscara formata o valor enquanto a pessoa digita, sem mudar o que o campo é: continua um{' '}
          <code>&lt;input&gt;</code> de texto. No HTML ela vem do atributo{' '}
          <code>data-eds-mask</code> (ligado pelo <code>@efds-ui/behavior</code>); no React, da prop{' '}
          <code>mask</code>, que emite o mesmo atributo. O valor enviado é o que aparece, com a
          máscara, a menos que você peça o valor limpo com <code>unmask</code>.
        </p>
        <Example
          title="Telefone, CPF, CNPJ e CEP"
          description={
            <>
              Os literais entram quando o próximo caractere é digitado. O telefone escolhe 8 ou 9
              dígitos sozinho e o CPF/CNPJ alterna pelo tamanho. O CNPJ aceita letras (maiúsculas
              automáticas) nas 12 primeiras posições. Colar com ou sem pontuação funciona, e o
              Backspace sobre um literal apaga o dígito anterior. A dica de formato vai no texto de
              ajuda, não no placeholder.
            </>
          }
          html={mascaraDocumentosHtml}
          react={{ Component: MascaraDocumentos, source: mascaraDocumentosSource }}
        />
        <Example
          title="Moeda e número"
          description={
            <>
              Digita-se da direita para a esquerda: o primeiro dígito vira centavo. Opções de casas
              decimais, símbolo (vazio permitido) e negativo. Ao colar, o texto é lido como número:{' '}
              <code>1234.56</code> e <code>1.234,56</code> dão o mesmo resultado.
            </>
          }
          html={mascaraMoedaHtml}
          react={{ Component: MascaraMoeda, source: mascaraMoedaSource }}
        />
        <Example
          title="Máscara personalizada"
          description={
            <>
              Num padrão, <code>0</code> é um dígito, <code>A</code> uma letra (vira maiúscula) e{' '}
              <code>*</code> uma letra ou um dígito. Os demais caracteres são literais; use uma
              barra invertida antes de <code>0</code>, <code>A</code> ou <code>*</code> para
              mostrá-los como literal.
            </>
          }
          html={mascaraPersonalizadaHtml}
          react={{ Component: MascaraPersonalizada, source: mascaraPersonalizadaSource }}
        />
        <Example
          title="Enviar só os caracteres significativos"
          description={
            <>
              Com <code>data-eds-mask-unmask</code> (HTML) ou <code>unmask</code> (React) o campo
              visível perde o <code>name</code> e um campo oculto com o mesmo <code>name</code>{' '}
              recebe o valor limpo: só os dígitos e letras, e na moeda o número com ponto decimal (
              <code>1234.56</code>). No React, <code>onValueChange</code> entrega o valor mascarado
              e o limpo.
            </>
          }
          html={mascaraUnmaskHtml}
          react={{ Component: MascaraUnmask, source: mascaraUnmaskSource }}
        />
        <ClassTable
          caption="Atributos HTML da máscara (@efds-ui/behavior)"
          rows={[
            {
              name: 'data-eds-mask="nome"',
              effect:
                'telefone, cpf, cnpj, cpf-cnpj, cep, moeda ou numero; qualquer outro valor é um padrão (0, A, *).',
            },
            {
              name: 'data-eds-mask-unmask',
              effect:
                'O campo visível perde o name e um hidden com o mesmo name recebe só os caracteres significativos. Sem name, não faz nada.',
            },
            {
              name: 'data-eds-mask-decimals',
              effect: 'Moeda e número: casas decimais, de 0 a 8. Padrão 2.',
            },
            {
              name: 'data-eds-mask-prefix',
              effect:
                'Moeda e número: símbolo antes do valor. Padrão "R$ " na moeda; vazio é permitido.',
            },
            {
              name: 'data-eds-mask-negative',
              effect: 'Moeda e número: aceita valor negativo (a tecla "-" alterna o sinal).',
            },
            {
              name: 'eds:mask-change',
              effect: 'Evento a cada alteração, com detail { value, raw }. Vale também ao colar.',
            },
          ]}
        />
        <PropsTable
          caption="Props de máscara de Input (@efds-ui/react)"
          rows={[
            {
              name: 'mask',
              type: 'InputMaskName | string',
              description: (
                <>
                  Nome de uma máscara pronta ou um padrão. Emite <code>data-eds-mask</code>,{' '}
                  <code>inputmode</code>, <code>autocomplete</code> (telefone e CEP) e{' '}
                  <code>maxlength</code> (exceto moeda e número), sem sobrescrever o que você
                  definir.
                </>
              ),
            },
            {
              name: 'maskOptions',
              type: '{ decimals?: number; prefix?: string; negative?: boolean }',
              description: 'Casas decimais, símbolo e sinal de moeda e numero.',
            },
            {
              name: 'texts',
              type: 'Partial<InputTexts>',
              description:
                'Mensagens de validação: maskInvalid (maskValidate) e validate (validate). Sem elas, valem as padrões em pt-BR.',
            },
            {
              name: 'unmask',
              type: 'boolean',
              description: (
                <>
                  Com <code>name</code>, o hidden leva o valor limpo e o campo visível não é
                  enviado.
                </>
              ),
            },
            {
              name: 'onValueChange',
              type: '(masked: string, raw: string) => void',
              description: (
                <>
                  A cada alteração. O <code>onChange</code> nativo também recebe o valor já
                  mascarado em <code>event.target.value</code>.
                </>
              ),
            },
          ]}
        />
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Não valida.</strong> A máscara só formata: não confere dígito verificador de
              CPF/CNPJ, data nem faixa. Continue validando com <code>required</code>,{' '}
              <code>pattern</code> (que vale para o texto mascarado) e no servidor.
            </li>
            <li>
              <strong>LGPD:</strong> CPF, CNPJ, telefone e endereço são dados pessoais. Os exemplos
              usam só valores fictícios; em testes, telas de documentação e logs nunca use dados
              reais, e mascare ou anonimize o que for exibido ou registrado.
            </li>
            <li>
              <strong>Servidor:</strong> com <code>unmask</code> o servidor recebe os valores
              limpos; sem ele, recebe a pontuação, e a validação precisa aceitá-la.
            </li>
            <li>
              <strong>React e behavior:</strong> não chame o <code>init</code> do behavior sobre
              markup renderizado pelo React; o <code>Input</code> já faz a máscara.
            </li>
            <li>
              <strong>Limites:</strong> o campo cheio não aceita um dígito inserido no meio (o{' '}
              <code>maxlength</code> impede, como em qualquer campo); selecione o dígito a trocar.
              Valor atribuído por script é refeito ao sair do campo ou ao enviar o formulário.
            </li>
          </ul>
        </Stack>
      </Section>

      <Section title="API React">
        <p>
          <code>Input</code> aceita todos os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>size</code> numérico, que vira o tamanho visual), repassa <code>ref</code> e mescla{' '}
          <code>className</code>. Dentro de um Field, <code>id</code>, <code>aria-describedby</code>
          , <code>aria-invalid</code> e <code>required</code> vêm dele.
        </p>
        <PropsTable
          caption="Props de Input"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'invalid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code>. Dentro de um Field com{' '}
                  <code>error</code> já é automático.
                </>
              ),
            },
            {
              name: 'valid',
              type: 'boolean',
              description: (
                <>
                  <code>data-valid=&quot;true&quot;</code> (borda de sucesso). Ignorada se houver
                  erro.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Input"
          rows={[
            {
              name: '.eds-input',
              effect: 'Base: largura total, altura de controle, borda forte, raio e tipografia.',
            },
            {
              name: '.eds-input-sm / .eds-input-lg',
              effect: 'Menor ou maior que o padrão (md não tem classe).',
            },
            {
              name: ':focus',
              effect: 'Borda na cor de ação e anel de foco, também no clique.',
            },
            {
              name: '[aria-invalid="true"]',
              effect: 'Borda de perigo. Acompanhe com uma mensagem .eds-error.',
            },
            {
              name: '[data-valid]',
              effect: 'Borda de sucesso. Acompanhe com uma mensagem .eds-success.',
            },
            { name: '[readonly]', effect: 'Fundo sutil; o valor ainda é enviado e focável.' },
            {
              name: ':disabled',
              effect: 'Fundo sutil, texto esmaecido, sem hover; não é focável nem enviado.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Nome:</strong> sempre um <code>label</code> associado (use Field). O
              placeholder não conta como rótulo e tem contraste menor.
            </li>
            <li>
              <strong>Teclado:</strong> Tab foca, e todo o comportamento é nativo do{' '}
              <code>input</code>.
            </li>
            <li>
              <strong>Erro:</strong> <code>aria-invalid</code> mais mensagem ligada por{' '}
              <code>aria-describedby</code>; o erro nunca é só a cor da borda.
            </li>
            <li>
              <strong>Foco:</strong> o anel e a mudança de borda aparecem inclusive no clique, e o
              anel respeita o modo de alto contraste.
            </li>
            <li>
              <strong>Preenchimento:</strong> use <code>autocomplete</code> (<code>name</code>,{' '}
              <code>email</code>, <code>tel</code>) nos dados do usuário logado (WCAG 1.3.5). Em
              cadastro de terceiros use <code>autocomplete=&quot;off&quot;</code>.
            </li>
            <li>
              <strong>Somente leitura × desabilitado:</strong> prefira <code>readonly</code> quando
              o usuário precisa ler ou copiar o valor.
            </li>
            <li>
              <strong>Máscara:</strong> o leitor de tela lê o valor mascarado como qualquer texto,
              sem anúncio a cada tecla. A dica de formato fica no texto de ajuda ligado por{' '}
              <code>aria-describedby</code>, nunca só no placeholder. O <code>inputmode</code> certo
              abre o teclado numérico no celular, e colar nunca é bloqueado.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
