import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/divider/basico';
import basicoHtml from '../../examples/divider/basico.html?raw';
import basicoSource from '../../examples/divider/basico.tsx?raw';
import Rotulo from '../../examples/divider/rotulo';
import rotuloHtml from '../../examples/divider/rotulo.html?raw';
import rotuloSource from '../../examples/divider/rotulo.tsx?raw';
import Vertical from '../../examples/divider/vertical';
import verticalHtml from '../../examples/divider/vertical.html?raw';
import verticalSource from '../../examples/divider/vertical.tsx?raw';

export default function DividerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Linha que separa partes do conteúdo: horizontal, vertical ou com um rótulo no meio (“ou”).
        Sem margem própria: o espaço vem do gap do contêiner.
      </p>

      <UseCases
        use={[
          'Para separar seções de uma tela ou de um cartão.',
          'Com rótulo, entre alternativas (“Entrar com e-mail” ou “Entrar com certificado”).',
          'Vertical, entre ações de uma barra.',
        ]}
        avoid={[
          'Só para dar espaço: use o gap do Stack.',
          'Para separar linhas de tabela ou itens de lista: o Table e a lista já têm as suas bordas.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Horizontal"
          description="O <hr> já é role=separator. strong usa a borda forte, para separar seções."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Com rótulo"
          description="Sem role: o texto “ou” é lido no fluxo, e as linhas ficam ocultas do leitor de tela."
          html={rotuloHtml}
          react={{ Component: Rotulo, source: rotuloSource }}
        />
        <Example
          title="Vertical"
          description="Estica à altura da linha. Em span leva role=separator e aria-orientation=vertical (ou aria-hidden, se for só visual)."
          html={verticalHtml}
          react={{ Component: Vertical, source: verticalSource }}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Divider"
          rows={[
            {
              name: 'orientation',
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: 'Direção da linha.',
            },
            { name: 'label', type: 'ReactNode', description: 'Texto no meio (só horizontal).' },
            { name: 'strong', type: 'boolean', default: 'false', description: 'Borda forte.' },
            {
              name: 'decorative',
              type: 'boolean',
              default: 'false',
              description: 'Só visual: aria-hidden, sem role.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do Divider"
          rows={[
            { name: 'hr.eds-divider', effect: 'Linha horizontal.' },
            { name: '.eds-divider-strong', effect: 'Borda forte.' },
            { name: '.eds-divider-vertical', effect: 'Vertical (span com role=separator).' },
            { name: '.eds-divider > .eds-divider-label', effect: 'Linha, texto, linha.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            Separador de conteúdo é anunciado (<code>role=&quot;separator&quot;</code>); o puramente
            visual leva <code>aria-hidden=&quot;true&quot;</code>.
          </li>
          <li>Com rótulo não há role: o texto faz parte do fluxo de leitura.</li>
        </ul>
      </Section>
    </>
  );
}
