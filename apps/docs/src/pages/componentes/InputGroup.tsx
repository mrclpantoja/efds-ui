import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/input-group/basico';
import basicoHtml from '../../examples/input-group/basico.html?raw';
import basicoSource from '../../examples/input-group/basico.tsx?raw';
import Carregando from '../../examples/input-group/carregando';
import carregandoHtml from '../../examples/input-group/carregando.html?raw';
import carregandoSource from '../../examples/input-group/carregando.tsx?raw';
import NumeroBasico from '../../examples/number-input/basico';
import numeroBasicoHtml from '../../examples/number-input/basico.html?raw';
import numeroBasicoSource from '../../examples/number-input/basico.tsx?raw';
import NumeroEstados from '../../examples/number-input/estados';
import numeroEstadosHtml from '../../examples/number-input/estados.html?raw';
import numeroEstadosSource from '../../examples/number-input/estados.tsx?raw';

export default function InputGroupPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        <strong>InputGroup</strong> junta um campo a um prefixo, sufixo ou botão numa borda só.{' '}
        <strong>NumberInput</strong> é o campo numérico com botões − e + e teclado de spinbutton.
      </p>

      <UseCases
        use={[
          'InputGroup: unidade ou símbolo junto do valor (R$, kg, @), botão colado ao campo, spinner de busca.',
          'NumberInput: quantidades e valores pequenos que se ajustam por passo (itens, parcelas, dias).',
        ]}
        avoid={[
          'NumberInput para códigos, telefone ou documentos: use um campo de texto com máscara.',
          'Prefixo ou sufixo para informação essencial: ela precisa estar também no rótulo ou na ajuda.',
        ]}
      />

      <Section title="InputGroup">
        <Example
          title="Prefixo, sufixo e botão"
          description="Só CSS. O foco e o erro pintam o grupo inteiro; os estados são lidos do campo filho direto (aria-invalid, data-valid, readonly, disabled). Tamanhos: .eds-input-group-sm e -lg."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Carregando"
          description="Spinner num .eds-input-group-text e aria-busy no grupo (é o que a busca de CEP usa). O anúncio fica numa região role=status à parte."
          html={carregandoHtml}
          react={{ Component: Carregando, source: carregandoSource }}
        />
      </Section>

      <Section title="NumberInput">
        <Example
          title="Com mínimo, máximo e passo"
          description="O campo é type=text com inputmode, no padrão spinbutton (role, aria-valuenow, -min e -max). Os botões ficam fora do Tab (os teclados já têm as setas) e se desabilitam nos limites. Segurar o botão repete."
          html={numeroBasicoHtml}
          react={{ Component: NumeroBasico, source: numeroBasicoSource }}
        />
        <Example
          title="Tamanhos, decimais e estados"
          description="Com casas decimais usa a máscara numero (vírgula; milhar com ponto). Um valor digitado fora da faixa é ajustado ao sair do campo e anunciado."
          html={numeroEstadosHtml}
          react={{ Component: NumeroEstados, source: numeroEstadosSource }}
        />
      </Section>

      <Section title="Teclado do NumberInput">
        <ClassTable
          caption="Teclas"
          headers={['Tecla', 'Efeito']}
          rows={[
            {
              name: '↑ / ↓',
              effect: 'Soma ou subtrai um passo (de um campo vazio, parte do mínimo ou de 0).',
            },
            { name: 'PageUp / PageDown', effect: 'Dez passos.' },
            { name: 'Home / End', effect: 'Mínimo e máximo (só quando definidos).' },
            {
              name: 'Enter / sair do campo',
              effect: 'Confirma: lê o texto, ajusta à faixa e avisa a mudança.',
            },
          ]}
        />
      </Section>

      <Section title="HTML puro">
        <ClassTable
          caption="Atributos e eventos"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-number',
              effect: 'No .eds-number: liga os botões e o teclado (@eds-ui/behavior).',
            },
            {
              name: 'min, max, step (no input) ou data-eds-number-min/-max/-step',
              effect:
                'Faixa e passo (padrão 1). Os atributos do input valem mesmo com type="text".',
            },
            {
              name: 'data-eds-number-decimals',
              effect: 'Casas decimais (padrão: as do passo). Com decimais, usa a máscara numero.',
            },
            {
              name: 'data-eds-number-unmask',
              effect: 'Um hidden com o mesmo name leva o valor limpo (1234.50).',
            },
            {
              name: 'data-eds-number-dec / -inc',
              effect: 'Os botões (padrão: o primeiro e o último button).',
            },
            {
              name: 'eds:number-change',
              effect: 'Ao confirmar: detail { value: number | null, text }.',
            },
          ]}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de InputGroup"
          rows={[
            {
              name: 'prefix / suffix',
              type: 'ReactNode',
              description:
                'Texto vira .eds-input-group-text; um nó (ex.: Button com .eds-input-group-button) entra como veio.',
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho do grupo.',
            },
            { name: 'children', type: 'ReactNode', required: true, description: 'O campo.' },
          ]}
        />
        <PropsTable
          caption="Props de NumberInput"
          rows={[
            {
              name: 'value / defaultValue',
              type: 'number | null',
              description: 'Valor controlado ou inicial; null é vazio.',
            },
            {
              name: 'onChange',
              type: '(value: number | null) => void',
              description: 'Ao confirmar (sair, Enter, setas, botões), nunca a cada tecla.',
            },
            { name: 'min / max / step', type: 'number', description: 'Faixa e passo (padrão 1).' },
            {
              name: 'decimals',
              type: 'number',
              description: 'Casas decimais (padrão: as do passo).',
            },
            { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Tamanho.' },
            {
              name: 'unmask',
              type: 'boolean',
              description: 'Com name, um hidden leva o valor limpo.',
            },
            {
              name: 'texts',
              type: 'Partial<NumberInputTexts>',
              description: 'decrement, increment e adjusted(value).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Spinbutton:</strong> <code>role=&quot;spinbutton&quot;</code> com{' '}
            <code>aria-valuenow</code>, <code>aria-valuemin</code> e <code>aria-valuemax</code>; o
            teclado faz tudo, os botões são para o mouse e o toque.
          </li>
          <li>
            <strong>Botões nomeados:</strong> “Diminuir” e “Aumentar”, fora da ordem de Tab.
          </li>
          <li>
            <strong>Ajuste anunciado:</strong> “Valor ajustado para 99.” quando um valor digitado
            sai da faixa.
          </li>
          <li>
            <strong>Prefixo e sufixo:</strong> são só visuais. Diga a unidade também no rótulo
            (“Valor, em reais”) quando ela importar.
          </li>
          <li>
            <strong>Alvo de toque:</strong> os botões e o campo respeitam a altura mínima de toque
            do core (44 px nos dispositivos de toque).
          </li>
        </ul>
      </Section>
    </>
  );
}
