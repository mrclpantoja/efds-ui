import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/option-card/basico';
import basicoHtml from '../../examples/option-card/basico.html?raw';
import basicoSource from '../../examples/option-card/basico.tsx?raw';

export default function OptionCardPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Cartão que o usuário escolhe como se fosse um rádio ou uma caixa de seleção, com título e
        descrição. O controle nativo é o próprio cartão: teclado, foco, formulário e leitor de tela
        funcionam como nos campos comuns.
      </p>

      <UseCases
        use={[
          'Para escolher entre poucas opções que precisam de uma frase de explicação (tipo de lançamento, plano, forma de envio).',
          'Para marcar vários itens com descrição, quando a caixa de seleção comum ficaria pobre.',
        ]}
        avoid={[
          'Para listas longas ou opções sem descrição: use Radio, Checkbox ou Select.',
          'Para navegar entre telas: o cartão não é um link nem um botão.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Rádio e caixa de seleção"
          description="O input é filho direto do label e cobre o cartão. Desabilitado e erro (aria-invalid) têm estilo próprio; a marca é opcional e, sem ela, o CSS desenha o visto no canto."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Só CSS">
          <p>
            Não há JavaScript. Coloque o grupo num <code>fieldset.eds-fieldset</code> com{' '}
            <code>legend</code>; o erro do grupo vai em um <code>p.eds-error</code> ligado a cada
            input por <code>aria-describedby</code>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de OptionCard"
          rows={[
            {
              name: 'type',
              type: "'radio' | 'checkbox'",
              required: true,
              description: 'O controle nativo do cartão.',
            },
            {
              name: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Título da opção; é o nome acessível do controle.',
            },
            { name: 'value', type: 'string', required: true, description: 'Valor da opção.' },
            {
              name: 'description',
              type: 'ReactNode',
              description: 'Texto de apoio (descreve a opção).',
            },
            {
              name: 'icon',
              type: 'ReactNode',
              description: 'Ícone decorativo à esquerda (um svg ou um IconDisc).',
            },
            {
              name: 'mark',
              type: 'ReactNode',
              description: 'Marca do estado escolhido (um svg, decorativo).',
            },
            { name: 'invalid', type: 'boolean', description: 'aria-invalid="true".' },
          ]}
        />
        <PropsTable
          caption="Props de OptionCardGroup"
          rows={[
            { name: 'legend', type: 'ReactNode', required: true, description: 'Título do grupo.' },
            {
              name: 'name / value / defaultValue / onValueChange',
              type: 'string',
              description: 'Controle dos rádios, como no RadioGroup.',
            },
            { name: 'required', type: 'boolean', description: 'required em cada rádio.' },
            {
              name: 'helper / error',
              type: 'ReactNode',
              description: 'Ajuda e erro do grupo; o erro marca cada cartão como inválido.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do cartão de opção"
          rows={[
            { name: '.eds-option-cards', effect: 'Grade de cartões (colunas automáticas).' },
            { name: '.eds-option-card', effect: 'O label do cartão; o input é filho direto.' },
            {
              name: '.eds-option-card-text / -title / -description',
              effect: 'Bloco de texto, título e apoio.',
            },
            {
              name: '.eds-option-card-icon',
              effect:
                'Ícone decorativo opcional à esquerda (aria-hidden), entre o input e o texto.',
            },
            { name: '.eds-option-card-mark', effect: 'Marca opcional do estado escolhido.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Nativo:</strong> rádio e caixa de seleção reais; setas, Espaço e o envio do
            formulário não dependem de JS.
          </li>
          <li>
            <strong>Estado sem depender de cor:</strong> o escolhido ganha borda e visto; o
            desabilitado perde o realce e o ponteiro.
          </li>
          <li>
            <strong>Foco visível</strong> no cartão inteiro e alvo de toque do tamanho do cartão.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> a <code>legend</code> do grupo e a mensagem
            de erro em texto.
          </li>
        </ul>
      </Section>
    </>
  );
}
