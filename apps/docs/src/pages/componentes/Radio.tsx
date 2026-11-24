import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Erro from '../../examples/radio/erro';
import erroHtml from '../../examples/radio/erro.html?raw';
import erroSource from '../../examples/radio/erro.tsx?raw';
import Prazo from '../../examples/radio/prazo';
import prazoHtml from '../../examples/radio/prazo.html?raw';
import prazoSource from '../../examples/radio/prazo.tsx?raw';

export default function RadioPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Escolhe exatamente uma opção entre poucas, todas visíveis ao mesmo tempo. Radio é a opção;
        RadioGroup é o grupo, com legenda, ajuda, erro e o estado da seleção.
      </p>

      <UseCases
        use={[
          'Para uma escolha única entre duas a cinco opções (prazo de entrega).',
          'Quando comparar as opções lado a lado ajuda a decidir.',
        ]}
        avoid={[
          <>
            Para mais de cinco opções: use <a href="/componentes/select">Select</a>.
          </>,
          <>
            Para escolher várias: use <a href="/componentes/checkbox">Checkbox</a>.
          </>,
          <>
            Para ligar ou desligar uma opção: use <a href="/componentes/switch">Switch</a>.
          </>,
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Grupo obrigatório"
          description="Em HTML, os rádios compartilham o name e cada um leva required."
          html={prazoHtml}
          react={{ Component: Prazo, source: prazoSource }}
        />
        <Example
          title="Controlado, com erro"
          description="Com value e onValueChange o grupo é controlado; o erro some quando há escolha."
          html={erroHtml}
          react={{ Component: Erro, source: erroSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>RadioGroup</code> renderiza <code>&lt;fieldset&gt;</code> com{' '}
          <code>&lt;legend&gt;</code> e controla <code>name</code>, a seleção e o{' '}
          <code>required</code> dos Radio filhos. Também aceita <code>legend</code>,{' '}
          <code>helper</code> e <code>error</code>, como o Fieldset. <code>Radio</code> aceita os
          atributos nativos de <code>&lt;input&gt;</code>.
        </p>
        <PropsTable
          caption="Props de RadioGroup"
          rows={[
            {
              name: 'legend',
              type: 'ReactNode',
              required: true,
              description: 'Pergunta ou título do grupo.',
            },
            {
              name: 'name',
              type: 'string',
              description: 'name compartilhado pelos rádios (padrão: gerado com useId).',
            },
            {
              name: 'value',
              type: 'string',
              description: 'Valor selecionado (controlado).',
            },
            {
              name: 'defaultValue',
              type: 'string',
              description: 'Valor inicial (não controlado).',
            },
            {
              name: 'onValueChange',
              type: '(value: string) => void',
              description: 'Chamado ao escolher uma opção.',
            },
            {
              name: 'required',
              type: 'boolean',
              description: 'required real em cada rádio, mais o asterisco na legenda.',
            },
            {
              name: 'helper / error',
              type: 'ReactNode',
              description: (
                <>
                  Ajuda (descreve o fieldset) e erro (descreve cada rádio, que recebe{' '}
                  <code>aria-invalid</code>).
                </>
              ),
            },
          ]}
        />
        <PropsTable
          caption="Props de Radio"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Texto do rótulo. O input fica dentro de um label.',
            },
            {
              name: 'value',
              type: 'string',
              required: true,
              description: 'Valor da opção.',
            },
            {
              name: 'checked / defaultChecked',
              type: 'boolean',
              description: 'Só fora de um RadioGroup; dentro dele, o grupo decide.',
            },
            {
              name: 'invalid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code>. Dentro de um RadioGroup com{' '}
                  <code>error</code> já é automático.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Radio"
          rows={[
            {
              name: '.eds-radio',
              effect: 'O círculo: mesmas medidas do Checkbox, raio total, marca central.',
            },
            { name: '.eds-radio-sm / -lg', effect: 'Círculo menor e maior.' },
            { name: '.eds-check', effect: 'Rótulo clicável com alvo mínimo de 24px.' },
            { name: ':checked', effect: 'Preenchido na cor de ação, com ponto central.' },
            { name: '[aria-invalid="true"]', effect: 'Borda de perigo.' },
            { name: ':disabled', effect: 'Opacidade reduzida; o rótulo fica esmaecido.' },
            { name: '.eds-fieldset / .eds-legend', effect: 'Moldura do grupo e sua legenda.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Teclado:</strong> o grupo nativo é uma única parada de Tab; as setas movem e
              selecionam a opção, e Espaço seleciona a focada.
            </li>
            <li>
              <strong>Nome do grupo:</strong> a legenda do <code>fieldset</code> é anunciada junto
              de cada opção. Sempre informe <code>legend</code>.
            </li>
            <li>
              <strong>Obrigatório:</strong> o asterisco é visual; o RadioGroup coloca{' '}
              <code>required</code> em cada rádio.
            </li>
            <li>
              <strong>Erro:</strong> a mensagem descreve cada rádio (não o fieldset), para ser lida
              uma vez. Tem ícone e texto.
            </li>
            <li>
              <strong>Seleção:</strong> o marcado é preenchido, então não depende só da cor do
              contorno.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> opções mutuamente exclusivas e
              descritivas, e uma seleção inicial segura quando houver um padrão razoável.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
