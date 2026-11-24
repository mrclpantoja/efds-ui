import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Preferencias from '../../examples/switch/preferencias';
import preferenciasHtml from '../../examples/switch/preferencias.html?raw';
import preferenciasSource from '../../examples/switch/preferencias.tsx?raw';

export default function SwitchPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Liga ou desliga uma configuração. É um{' '}
        <code>&lt;input type=&quot;checkbox&quot; role=&quot;switch&quot;&gt;</code> nativo: o
        estado é ligado ou desligado, nunca uma ação.
      </p>

      <UseCases
        use={[
          'Para uma configuração com efeito imediato (modo automático, relatório semanal).',
          'Quando o rótulo descreve o estado ligado: "Relatório semanal", não "Ativar relatório".',
        ]}
        avoid={[
          <>
            Para uma escolha que só vale ao enviar o formulário: use{' '}
            <a href="/componentes/checkbox">Checkbox</a>.
          </>,
          'Para escolher entre duas opções com nomes próprios (Mensal ou Anual): use Radio.',
          'Para disparar uma ação: use Button.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Preferências"
          description="Ligado, desligado e desabilitado, agrupados por um Fieldset."
          html={preferenciasHtml}
          react={{ Component: Preferencias, source: preferenciasSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Switch</code> aceita os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>type</code>, <code>size</code> e <code>role</code>). <code>ref</code>,{' '}
          <code>className</code> e as demais props vão para o <code>input</code>, dentro de um{' '}
          <code>label</code>.
        </p>
        <PropsTable
          caption="Props de Switch"
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
              description: 'Texto do rótulo. Descreva o estado ligado, não uma ação.',
            },
            {
              name: 'invalid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code> (borda de perigo no trilho).
                </>
              ),
            },
            {
              name: 'checked / defaultChecked',
              type: 'boolean',
              description: 'Controlado ou não controlado, como no input nativo.',
            },
            {
              name: 'onChange',
              type: 'ChangeEventHandler<HTMLInputElement>',
              description: 'Chamado ao alternar; leia event.target.checked.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Switch"
          rows={[
            {
              name: '.eds-switch',
              effect: 'Trilho com um botão deslizante, desenhado em CSS sobre o checkbox.',
            },
            { name: '.eds-switch-sm / -lg', effect: 'Trilho menor e maior.' },
            { name: '.eds-check', effect: 'Rótulo clicável com alvo mínimo de 24px.' },
            {
              name: ':checked',
              effect: 'Trilho na cor de ação e botão deslocado ao fim (invertido em RTL).',
            },
            { name: '[aria-invalid="true"]', effect: 'Borda de perigo no trilho.' },
            { name: ':disabled', effect: 'Opacidade reduzida; o rótulo fica esmaecido.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Papel:</strong> <code>role=&quot;switch&quot;</code> faz o leitor de tela
              anunciar &quot;ligado&quot; e &quot;desligado&quot;, em vez de &quot;marcado&quot;.
            </li>
            <li>
              <strong>Teclado:</strong> Tab foca; Espaço alterna (nativo).
            </li>
            <li>
              <strong>Rótulo estável:</strong> não troque o texto ao alternar (&quot;Ativar&quot; e
              depois &quot;Desativar&quot;): o estado já é anunciado.
            </li>
            <li>
              <strong>Estado sem cor:</strong> a posição do botão deslizante também indica o estado;
              em alto contraste, o trilho usa as cores do sistema.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> como o efeito é imediato, confirme o
              resultado quando ele não for visível (por exemplo, com um Toast).
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
