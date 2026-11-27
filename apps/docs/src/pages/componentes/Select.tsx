import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/select/basico';
import basicoHtml from '../../examples/select/basico.html?raw';
import basicoSource from '../../examples/select/basico.tsx?raw';
import Tamanhos from '../../examples/select/tamanhos';
import tamanhosHtml from '../../examples/select/tamanhos.html?raw';
import tamanhosSource from '../../examples/select/tamanhos.tsx?raw';

export default function SelectPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Lista suspensa para escolher uma opção entre várias. É o <code>&lt;select&gt;</code> nativo,
        com a aparência do Input: o teclado, a busca por letra e o menu do celular vêm do navegador.
      </p>

      <UseCases
        use={[
          'Para escolher uma opção entre cinco ou mais, em pouco espaço.',
          'Quando as opções são conhecidas e a lista cabe no menu nativo.',
        ]}
        avoid={[
          <>
            Para duas a quatro opções visíveis de uma vez: use{' '}
            <a href="/componentes/radio">Radio</a>.
          </>,
          'Para listas muito longas que pedem busca ou seleção múltipla: o select nativo não filtra.',
          'Para ações: use Dropdown.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Obrigatório, erro e desabilitado"
          description="Uma primeira opção desabilitada e vazia serve de instrução (Selecione)."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Tamanhos"
          description="Mesmas alturas do Input, para alinhar os dois na mesma linha."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Select</code> aceita os atributos nativos de <code>&lt;select&gt;</code> e recebe{' '}
          <code>option</code> e <code>optgroup</code> como filhos. Repassa <code>ref</code> e mescla{' '}
          <code>className</code>. Dentro de um Field, <code>id</code> e as ligações de
          acessibilidade vêm dele.
        </p>
        <PropsTable
          caption="Props de Select"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'readOnly',
              type: 'boolean',
              description:
                'Somente leitura (o select nativo não tem o atributo): a lista não abre e o valor não muda, mas o campo continua focável, é lido (aria-readonly) e vai no envio do formulário.',
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
                  <code>data-valid=&quot;true&quot;</code> (borda de sucesso).
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Select"
          rows={[
            {
              name: '.eds-select',
              effect: 'Base: aparência do Input, seta própria, largura total.',
            },
            {
              name: '.eds-select-sm / .eds-select-lg',
              effect: 'Menor ou maior que o padrão (md não tem classe).',
            },
            { name: ':focus', effect: 'Borda na cor de ação e anel de foco.' },
            {
              name: '[aria-readonly="true"]',
              effect:
                'Somente leitura: fundo suave como o Input readonly, seta atenuada, sem hover. Em HTML, o @efds-ui/behavior impede abrir a lista e mudar a escolha (o campo segue focável e vai no envio); sem o JS, só o visual muda.',
            },
            { name: '[aria-invalid="true"]', effect: 'Borda de perigo.' },
            { name: '[data-valid]', effect: 'Borda de sucesso.' },
            { name: ':disabled', effect: 'Fundo sutil, texto esmaecido.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Teclado e leitor de tela:</strong> nativos. Setas trocam a opção, e digitar
              uma letra salta para ela; por isso o efDS.ui não substitui o componente por um menu
              customizado.
            </li>
            <li>
              <strong>Nome e erro:</strong> <code>label</code> associado (Field) e{' '}
              <code>aria-invalid</code> com mensagem em <code>aria-describedby</code>.
            </li>
            <li>
              <strong>Opção inicial:</strong> uma opção vazia desabilitada (&quot;Selecione&quot;)
              com <code>required</code> obriga a escolha; sem <code>required</code>, deixe-a
              selecionável para permitir limpar.
            </li>
            <li>
              <strong>Seta:</strong> desenhada em CSS, acompanha o texto e o modo de alto contraste.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
