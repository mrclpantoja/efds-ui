import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/otp/basico';
import basicoHtml from '../../examples/otp/basico.html?raw';
import basicoSource from '../../examples/otp/basico.tsx?raw';
import CampoUnico from '../../examples/otp/campo-unico';
import campoUnicoHtml from '../../examples/otp/campo-unico.html?raw';
import campoUnicoSource from '../../examples/otp/campo-unico.tsx?raw';
import Erro from '../../examples/otp/erro';
import erroHtml from '../../examples/otp/erro.html?raw';
import erroSource from '../../examples/otp/erro.tsx?raw';

export default function OtpPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Código de verificação (OTP) em células, uma por caractere. Digitar avança, Backspace volta,
        colar distribui o código inteiro e o preenchimento automático do SMS funciona.
      </p>

      <UseCases
        use={[
          'Para confirmar e-mail, telefone ou um segundo fator com código de 4 a 8 dígitos.',
          'Quando o código vem por SMS ou e-mail e a pessoa vai colar ou usar o preenchimento do celular.',
        ]}
        avoid={[
          'Para senha ou PIN secreto: use a senha (as células mostram o que se digita).',
          'Para códigos longos ou com muitos tipos de caractere: um campo de texto comum é melhor.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Seis dígitos"
          description="Cada célula tem nome (“Dígito 3 de 6”) e só a primeira leva autocomplete=one-time-code. Um hidden com o nome do campo leva o código inteiro. O evento eds:otp-complete (onComplete no React) avisa quando todas estão preenchidas."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Fallback: um campo só"
          description="Sem JS, um único input com pattern e one-time-code funciona. No HTML, com data-eds-otp no contêiner, o @eds-ui/behavior o transforma em células; o hidden recebe o código."
          html={campoUnicoHtml}
          react={{ Component: CampoUnico, source: campoUnicoSource }}
        />
        <Example
          title="Erro"
          description="aria-invalid em todas as células e a mensagem visível, ligada ao grupo por aria-describedby."
          html={erroHtml}
          react={{ Component: Erro, source: erroSource }}
        />
      </Section>

      <Section title="HTML puro">
        <ClassTable
          caption="Atributos e eventos"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-otp',
              effect:
                'No fieldset.eds-otp: liga as células. Se houver só um input.eds-otp-single, cria as células.',
            },
            {
              name: 'data-eds-otp-length',
              effect: 'Quantidade de células ao criar a partir do campo único (padrão 6).',
            },
            { name: 'data-eds-otp-name', effect: 'Nome do hidden com o código.' },
            {
              name: 'data-eds-otp-type="alphanumeric"',
              effect: 'Aceita letras (viram maiúsculas); o padrão é só dígitos.',
            },
            { name: 'eds:otp-change', effect: 'A cada alteração: detail { value }.' },
            { name: 'eds:otp-complete', effect: 'Todas as células preenchidas: detail { value }.' },
          ]}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de OtpInput"
          rows={[
            {
              name: 'legend',
              type: 'ReactNode',
              required: true,
              description: 'Nome do grupo (a <legend>).',
            },
            { name: 'length', type: 'number', default: '6', description: 'Quantidade de células.' },
            {
              name: 'name',
              type: 'string',
              description: 'Nome do hidden com o código no envio do formulário.',
            },
            {
              name: 'value / defaultValue',
              type: 'string',
              description: 'Código controlado ou inicial.',
            },
            {
              name: 'kind',
              type: "'numeric' | 'alphanumeric'",
              default: "'numeric'",
              description: 'Só dígitos ou letras e dígitos.',
            },
            {
              name: 'onChange',
              type: '(value: string) => void',
              description: 'A cada alteração (código pode estar incompleto).',
            },
            {
              name: 'onComplete',
              type: '(value: string) => void',
              description: 'Quando todas as células estão preenchidas.',
            },
            { name: 'invalid', type: 'boolean', description: 'aria-invalid em todas as células.' },
            {
              name: 'children',
              type: 'ReactNode',
              description: 'Ajuda ou erro, dentro do grupo. Ligue por aria-describedby.',
            },
            {
              name: 'texts',
              type: 'Partial<OtpTexts>',
              description: 'cell(n, total) e cellChar(n, total).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Grupo nomeado:</strong> <code>fieldset</code> + <code>legend</code>; cada célula
            tem <code>aria-label</code> com a posição.
          </li>
          <li>
            <strong>Teclado:</strong> setas, Home e End movem; Backspace numa célula vazia volta e
            apaga a anterior; Delete limpa a atual. Ao receber o foco a célula seleciona o conteúdo,
            então digitar substitui.
          </li>
          <li>
            <strong>Colar e SMS:</strong> a primeira célula não corta em 1 caractere, para o
            preenchimento automático do celular (<code>one-time-code</code>) entrar inteiro.
          </li>
          <li>
            <strong>Erro:</strong> <code>aria-invalid</code> em todas as células e texto visível
            (cor nunca sozinha).
          </li>
        </ul>
        <Alert variant="info" title="Tempo e reenvio">
          <p>
            Ofereça “Reenviar código” e diga em texto quando o código expira (WCAG 2.2.1). Validar o
            código é sempre do servidor.
          </p>
        </Alert>
      </Section>
    </>
  );
}
