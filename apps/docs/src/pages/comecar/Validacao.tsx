import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import Formulario from '../../examples/validacao/formulario';
import formularioHtml from '../../examples/validacao/formulario.html?raw';
import formularioSource from '../../examples/validacao/formulario.tsx?raw';
import Validadores from '../../examples/validacao/validadores';
import validadoresHtml from '../../examples/validacao/validadores.html?raw';
import validadoresSource from '../../examples/validacao/validadores.tsx?raw';

export default function ValidacaoPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Validação de formulários em português do Brasil, sem dependência: validadores de CPF, CNPJ
        (inclusive o alfanumérico de 2026), CEP, telefone, e-mail, PIS, título de eleitor, placa e
        data, ligados à validação nativa do navegador, com erro visível junto do campo e um{' '}
        <a href={toHref('/componentes/error-summary')}>resumo de erros</a> no topo. É a mesma lógica
        no HTML (<code>data-eds-validate</code>) e no React (<code>validate</code> e{' '}
        <code>useFormValidation</code>).
      </p>

      <Section title="Como funciona">
        <ul className="docs-list">
          <li>
            <strong>Sobre a validação nativa:</strong> o validador vira{' '}
            <code>setCustomValidity</code>, então <code>checkValidity()</code>,{' '}
            <code>required</code>, <code>minlength</code> e <code>pattern</code> convivem com ele, e
            o Wizard também o enxerga.
          </li>
          <li>
            <strong>Quando o erro aparece:</strong> ao sair do campo e ao enviar, nunca enquanto se
            digita pela primeira vez. Depois do primeiro erro, ele acompanha a digitação e some ao
            ficar válido (<code>aria-invalid</code> e <code>p.eds-error</code> ligado por{' '}
            <code>aria-describedby</code>).
          </li>
          <li>
            <strong>Envio recusado:</strong> o formulário não é enviado, o foco vai ao resumo de
            erros (ou ao primeiro campo inválido, se não houver resumo) e cada link do resumo leva o
            foco ao campo. Botão com <code>formnovalidate</code> (rascunho) envia sem validar.
          </li>
          <li>
            <strong>Sem JavaScript:</strong> o navegador ainda valida <code>required</code> e{' '}
            <code>pattern</code> com o balão nativo; com o JS ligado, o balão dá lugar ao erro
            visível.
          </li>
          <li>
            <strong>Campo vazio é válido:</strong> o validador só confere quando há valor; use{' '}
            <code>required</code> para exigir preenchimento.
          </li>
        </ul>
      </Section>

      <Section title="Exemplos">
        <Example
          title="Formulário com resumo de erros"
          description="Envie vazio, ou com o CPF 529.982.247-24 (dígito errado), e depois corrija: o resumo acompanha. 529.982.247-25 é válido."
          html={formularioHtml}
          react={{ Component: Formulario, source: formularioSource }}
        />
        <Example
          title="Todos os validadores"
          description="Digite um valor inválido e saia do campo. Os valores de ajuda são fictícios, gerados por algoritmo."
          html={validadoresHtml}
          react={{ Component: Validadores, source: validadoresSource }}
        />
      </Section>

      <Section title="Validadores">
        <ClassTable
          caption="Valores de data-eds-validate (HTML) e da prop validate (React)"
          headers={['Nome', 'O que confere']}
          rows={[
            {
              name: 'cpf',
              effect:
                '11 dígitos com os dois verificadores corretos; recusa sequências repetidas (111.111.111-11).',
            },
            {
              name: 'cnpj',
              effect:
                '14 posições com os dois verificadores corretos, numérico ou alfanumérico (as 12 primeiras aceitam letras).',
            },
            { name: 'cpf-cnpj', effect: 'CPF ou CNPJ, pelo tamanho.' },
            { name: 'cep', effect: '8 dígitos, com ou sem hífen; recusa 00000-000.' },
            {
              name: 'telefone',
              effect:
                'Fixo (8 dígitos) ou celular (9 dígitos, começa em 9), com DDD existente; aceita +55. data-eds-validate-tipo="fixo|celular" restringe.',
            },
            {
              name: 'email',
              effect:
                'Pragmático: uma @, parte local e domínio bem formados, TLD de letras. Não confirma que a caixa existe.',
            },
            { name: 'pis', effect: 'PIS, PASEP ou NIS: 11 dígitos com verificador.' },
            {
              name: 'titulo',
              effect: 'Título de eleitor: 12 dígitos, UF de 01 a 28 e os dois verificadores.',
            },
            { name: 'placa', effect: 'Padrão antigo (ABC-1234) ou Mercosul (ABC1D23).' },
            {
              name: 'data',
              effect:
                'dd/mm/aaaa ou ISO, com calendário real (bissexto, 30 e 31 dias). Os atributos min e max do campo definem a faixa.',
            },
          ]}
        />
        <Alert variant="warning" title="O validador confere o formato, não a pessoa">
          <p>
            Dígito verificador correto não prova que o documento existe ou é de quem preenche: a
            conferência de verdade é do servidor. Valide sempre também no servidor.
          </p>
        </Alert>
      </Section>

      <Section title="HTML puro">
        <ClassTable
          caption="Atributos e evento"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-validate="cpf"',
              effect:
                'No input, select ou textarea. O formulário passa a mostrar erro visível (novalidate por JS).',
            },
            {
              name: 'data-eds-validate-message',
              effect: 'Texto de erro do validador neste campo (troca o padrão).',
            },
            {
              name: 'data-eds-error',
              effect:
                'Texto de erro das restrições nativas (required, minlength, pattern) neste campo.',
            },
            {
              name: 'form[data-eds-validate-form]',
              effect:
                'Liga o erro visível a um formulário que só usa required, minlength e pattern (sem data-eds-validate).',
            },
            {
              name: '[data-eds-error-summary]',
              effect:
                'Resumo de erros dentro do form, ou data-eds-error-summary="id-do-form", ou um form vizinho. Ver o componente Resumo de erros.',
            },
            {
              name: 'eds:form-invalid',
              effect:
                'No form, a cada envio recusado. detail { fields: [{ element, id, name, label, message }] }.',
            },
            {
              name: 'configure({ messages })',
              effect:
                'Troca os textos (validateCpf, validateRequired, errorSummaryTitleMany...). Veja Idiomas e textos.',
            },
          ]}
        />
        <p>
          As funções puras também existem sem DOM, em <code>@efds-ui/behavior/validate</code>:{' '}
          <code>isCpf</code>, <code>isCnpj</code>, <code>isCpfOuCnpj</code>, <code>isCep</code>,{' '}
          <code>isTelefone</code>, <code>isEmail</code>, <code>isDataValida</code>,{' '}
          <code>isIntervaloDatas</code>, <code>isPis</code>, <code>isTituloEleitor</code> e{' '}
          <code>isPlaca</code>; elas aceitam o valor com ou sem máscara. No{' '}
          <code>eds-behavior.js</code> as mesmas funções ficam em <code>EDS.isCpf</code> etc. A
          validação por atributos só existe nele (completo): o <code>eds-behavior-core.js</code> não
          a inclui, para manter-se pequeno.
        </p>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Input"
          rows={[
            {
              name: 'validate',
              type: "'cpf' | 'cnpj' | 'cpf-cnpj' | 'cep' | 'telefone' | 'email' | 'pis' | 'titulo' | 'placa' | 'data'",
              description:
                'Validador brasileiro; vira a validade nativa do campo. Sem mostrar erro sozinho: use useFormValidation com Field error.',
            },
            {
              name: 'validateMessage',
              type: 'string',
              description: 'Texto de erro do validador neste campo.',
            },
          ]}
        />
        <PropsTable
          caption="useFormValidation(opções)"
          rows={[
            {
              name: 'onSubmit',
              type: '(event) => void',
              description:
                'Envio com tudo válido, no lugar do onSubmit do form. Chame event.preventDefault() para não enviar o form nativo.',
            },
            {
              name: 'onInvalid',
              type: '(errors) => void',
              description: 'Envio recusado, com os campos inválidos na ordem do documento.',
            },
            {
              name: 'texts',
              type: 'Partial<ValidationMessages>',
              description:
                'Textos das restrições nativas e dos validadores (pt-BR por padrão), para outro idioma.',
            },
            {
              name: 'formProps',
              type: 'objeto',
              description:
                'Retorno. Espalhe no <form>: noValidate, ref e os ouvintes de envio, saída do campo e edição.',
            },
            {
              name: 'errorOf(name)',
              type: '(name: string) => string | undefined',
              description: 'Retorno. Erro do campo pelo name (ou id), para error do Field.',
            },
            {
              name: 'summaryProps',
              type: '{ errors, focusKey, ref }',
              description: 'Retorno. Espalhe no ErrorSummary.',
            },
            {
              name: 'validate()',
              type: '() => boolean',
              description: 'Retorno. Valida agora (por exemplo, antes de avançar uma etapa).',
            },
          ]}
        />
        <p>
          O hook não guarda os valores dos campos: ele lê a validade nativa dos controles do{' '}
          <code>&lt;form&gt;</code>, então funciona com campos controlados ou não e com qualquer
          biblioteca de estado. Campos que mostram o próprio erro (Combobox, DatePicker...) entram
          no resumo e no <code>errorOf</code> como os demais. Use{' '}
          <a href={toHref('/componentes/field')}>Field</a> com{' '}
          <code>error=&#123;errorOf(name)&#125;</code>.
        </p>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>3.3.1 e 3.3.3:</strong> o erro é texto visível, junto do campo, diz o que
            corrigir, e a cor nunca é o único sinal (o resumo e o <code>p.eds-error</code> têm ícone
            e texto).
          </li>
          <li>
            <strong>Foco:</strong> ao recusar o envio, o foco vai ao resumo (que nomeia o problema e
            lista os campos); sem resumo, ao primeiro campo inválido. Os links levam o foco ao
            campo, não só rolam.
          </li>
          <li>
            <strong>Sem ruído:</strong> nada é anunciado a cada tecla; o erro entra em{' '}
            <code>aria-describedby</code> e <code>aria-invalid</code> e é lido ao focar o campo.
            Quando o último erro é corrigido, uma região de status avisa discretamente.
          </li>
          <li>
            <strong>Botão de envio:</strong> nunca fica desabilitado como forma de validação. Clicar
            nele não perde o clique por causa de um erro que empurra o layout (a validação de saída
            do campo espera o clique).
          </li>
        </ul>
      </Section>
    </>
  );
}
